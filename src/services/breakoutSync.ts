import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { BreakoutSessionState } from '../types';

/**
 * Save or update the active breakout session in Firestore
 */
export async function syncBreakoutSessionToFirestore(
  mainRoomCode: string,
  session: BreakoutSessionState
): Promise<void> {
  const cleanRoom = mainRoomCode.toLowerCase().trim();
  const path = `meetings/${cleanRoom}/breakouts/active`;

  try {
    const docRef = doc(db, 'meetings', cleanRoom, 'breakouts', 'active');
    await setDoc(docRef, {
      mainRoomCode: cleanRoom,
      hostId: session.hostIdentity,
      status: session.status,
      rooms: session.rooms,
      endsAt: session.endsAt || null,
      broadcastMessage: session.broadcastMessage || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

/**
 * Listen for active breakout session changes in Firestore
 */
export function subscribeToBreakoutSession(
  mainRoomCode: string,
  onUpdate: (session: BreakoutSessionState | null) => void
): () => void {
  const cleanRoom = mainRoomCode.toLowerCase().trim();
  const path = `meetings/${cleanRoom}/breakouts/active`;
  const docRef = doc(db, 'meetings', cleanRoom, 'breakouts', 'active');

  const unsubscribe = onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        onUpdate({
          id: snapshot.id,
          mainRoomCode: data.mainRoomCode,
          hostIdentity: data.hostId,
          status: data.status,
          rooms: data.rooms || [],
          durationMinutes: 10,
          endsAt: data.endsAt || undefined,
          broadcastMessage: data.broadcastMessage || undefined,
          createdAt: Date.now(),
        });
      } else {
        onUpdate(null);
      }
    },
    (err) => {
      // Gracefully handle if permission is restricted or offline
      console.warn('Breakout subscription notice:', err.message);
    }
  );

  return unsubscribe;
}
