import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { WhiteboardStroke } from '../types';

/**
 * Persists whiteboard strokes to Firestore for the room.
 * Debounced or called upon stroke completion.
 */
export async function saveWhiteboardToFirestore(
  roomCode: string,
  strokes: WhiteboardStroke[]
): Promise<void> {
  if (!auth.currentUser) {
    // If user is not authenticated with Firebase, we gracefully bypass remote db persistence
    // and rely on LiveKit real-time data channel synchronization.
    return;
  }

  try {
    const docRef = doc(db, 'meetings', roomCode, 'whiteboard', 'current');
    await setDoc(
      docRef,
      {
        roomCode,
        strokes: strokes.slice(-200), // Keep the latest 200 strokes to prevent unbounded document sizes
        lastModifiedBy: auth.currentUser.displayName || auth.currentUser.email || auth.currentUser.uid,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Could not save whiteboard to Firestore:', err);
  }
}

/**
 * Fetches existing whiteboard strokes from Firestore when joining a room.
 */
export async function loadWhiteboardFromFirestore(
  roomCode: string
): Promise<WhiteboardStroke[] | null> {
  if (!auth.currentUser) return null;

  try {
    const docRef = doc(db, 'meetings', roomCode, 'whiteboard', 'current');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data.strokes)) {
        return data.strokes as WhiteboardStroke[];
      }
    }
  } catch (err) {
    console.warn('Could not fetch whiteboard from Firestore:', err);
  }
  return null;
}
