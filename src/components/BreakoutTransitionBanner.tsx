import React, { useState, useEffect } from 'react';
import {
  Split,
  ArrowRight,
  Clock,
  Home,
  HelpCircle,
  Megaphone,
  X,
  AlertTriangle,
} from 'lucide-react';
import { BreakoutSessionState, BreakoutRoomDefinition } from '../types';

interface BreakoutTransitionBannerProps {
  session: BreakoutSessionState | null;
  currentRoomCode: string;
  mainRoomCode: string;
  participantIdentity: string;
  isHost: boolean;
  onJoinBreakoutRoom: (room: BreakoutRoomDefinition) => void;
  onReturnToMain: () => void;
  onRequestHelp: () => void;
}

export const BreakoutTransitionBanner: React.FC<BreakoutTransitionBannerProps> = ({
  session,
  currentRoomCode,
  mainRoomCode,
  participantIdentity,
  isHost,
  onJoinBreakoutRoom,
  onReturnToMain,
  onRequestHelp,
}) => {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [hasDismissedInvite, setHasDismissedInvite] = useState(false);
  const [helpRequested, setHelpRequested] = useState(false);

  const isInBreakout = currentRoomCode !== mainRoomCode;
  const isSessionActive = session && session.status === 'active';

  // Find assigned room for this participant
  const assignedRoom = session?.rooms.find((r) =>
    r.assignedParticipantIdentities.includes(participantIdentity)
  );

  // Current breakout room object
  const currentBreakoutRoom = session?.rooms.find(
    (r) => r.livekitRoomName === currentRoomCode
  );

  // Countdown timer calculation
  useEffect(() => {
    if (!session?.endsAt) return;

    const interval = setInterval(() => {
      const diff = Math.max(0, session.endsAt! - Date.now());
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [session?.endsAt]);

  if (!session || session.status === 'ended') return null;

  // 1. Inside a Breakout Room Banner
  if (isInBreakout) {
    return (
      <div className="absolute top-16 inset-x-4 sm:inset-x-8 z-30 flex flex-col gap-2 items-center pointer-events-none">
        {/* Host Broadcast Message notification */}
        {session.broadcastMessage && (
          <div className="pointer-events-auto w-full max-w-lg bg-blue-600/90 text-white px-4 py-2.5 rounded-2xl shadow-xl backdrop-blur-md border border-blue-400/40 flex items-center gap-3 animate-fade-in text-xs">
            <Megaphone className="w-4 h-4 shrink-0 text-blue-200" />
            <div className="flex-1">
              <span className="font-semibold block text-[10px] uppercase text-blue-200">
                Host Announcement
              </span>
              <span>{session.broadcastMessage}</span>
            </div>
          </div>
        )}

        {/* Top persistent breakout session bar */}
        <div className="pointer-events-auto bg-[#202124]/90 backdrop-blur-md border border-white/10 px-4 py-2 rounded-2xl shadow-xl flex items-center gap-3 sm:gap-4 text-xs text-white">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold">
              {currentBreakoutRoom?.name || 'Breakout Room'}
            </span>
          </div>

          {timeLeft && (
            <div className="flex items-center gap-1 font-mono text-gray-300 bg-white/5 px-2 py-0.5 rounded-lg">
              <Clock className="w-3 h-3 text-amber-400" />
              <span>{timeLeft}</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            {/* Ask for help button */}
            <button
              onClick={() => {
                onRequestHelp();
                setHelpRequested(true);
                setTimeout(() => setHelpRequested(false), 4000);
              }}
              disabled={helpRequested}
              className="px-2.5 py-1 bg-white/10 hover:bg-white/15 rounded-lg text-gray-200 font-medium transition-colors flex items-center gap-1 text-[11px]"
            >
              <HelpCircle className="w-3 h-3" />
              <span>{helpRequested ? 'Host Notified' : 'Ask for Help'}</span>
            </button>

            {/* Return to main room */}
            <button
              onClick={onReturnToMain}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-1.5 shadow text-[11px]"
            >
              <Home className="w-3 h-3" />
              <span>Return to Main</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. In Main Room and has been assigned to a Breakout Room (Invite dialog)
  if (!isInBreakout && isSessionActive && assignedRoom && !hasDismissedInvite) {
    return (
      <div className="absolute top-16 inset-x-4 sm:inset-x-8 z-30 flex justify-center pointer-events-none">
        <div className="pointer-events-auto w-full max-w-md bg-[#282a2d] border border-blue-500/50 rounded-3xl p-5 shadow-2xl text-white animate-fade-in space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-400">
              <Split className="w-5 h-5" />
              <span className="font-semibold text-sm text-white">
                Breakout Room Invitation
              </span>
            </div>
            <button
              onClick={() => setHasDismissedInvite(true)}
              className="text-gray-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-gray-300 leading-relaxed">
            The host has invited you to join <strong>{assignedRoom.name}</strong> for small group discussion.
          </p>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={() => setHasDismissedInvite(true)}
              className="px-3.5 py-2 text-xs text-gray-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
            >
              Stay in Main
            </button>
            <button
              onClick={() => onJoinBreakoutRoom(assignedRoom)}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow transition-colors flex items-center gap-1.5"
            >
              <span>Join Breakout Room</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
