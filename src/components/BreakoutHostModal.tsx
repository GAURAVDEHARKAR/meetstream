import React, { useState } from 'react';
import {
  X,
  Split,
  Users,
  Clock,
  Send,
  Plus,
  Trash2,
  RefreshCw,
  DoorOpen,
  ArrowRight,
  ShieldCheck,
  Megaphone,
} from 'lucide-react';
import { BreakoutRoomDefinition, BreakoutSessionState } from '../types';

interface ParticipantInfo {
  identity: string;
  name: string;
}

interface BreakoutHostModalProps {
  isOpen: boolean;
  onClose: () => void;
  mainRoomCode: string;
  hostIdentity: string;
  participants: ParticipantInfo[];
  activeSession: BreakoutSessionState | null;
  currentRoomCode: string;
  onStartBreakout: (session: BreakoutSessionState) => void;
  onBroadcastMessage: (msg: string) => void;
  onSwitchRoom: (targetRoomCode: string) => void;
  onEndBreakout: () => void;
  onExtendTime: (extraMinutes: number) => void;
}

export const BreakoutHostModal: React.FC<BreakoutHostModalProps> = ({
  isOpen,
  onClose,
  mainRoomCode,
  hostIdentity,
  participants,
  activeSession,
  currentRoomCode,
  onStartBreakout,
  onBroadcastMessage,
  onSwitchRoom,
  onEndBreakout,
  onExtendTime,
}) => {
  const [numRooms, setNumRooms] = useState(2);
  const [durationMinutes, setDurationMinutes] = useState(10);
  const [roomNames, setRoomNames] = useState<string[]>(['Room 1', 'Room 2']);
  const [manualAssignments, setManualAssignments] = useState<{ [identity: string]: string }>({});
  const [broadcastText, setBroadcastText] = useState('');

  if (!isOpen) return null;

  const isActive = activeSession && activeSession.status === 'active';

  // Handle number of rooms change
  const handleRoomCountChange = (count: number) => {
    setNumRooms(count);
    const names = Array.from({ length: count }, (_, i) => roomNames[i] || `Room ${i + 1}`);
    setRoomNames(names);
  };

  // Auto assign participants
  const handleAutoAssign = () => {
    const assignments: { [identity: string]: string } = {};
    const remoteParticipants = participants.filter((p) => p.identity !== hostIdentity);
    remoteParticipants.forEach((p, idx) => {
      const roomIdx = idx % numRooms;
      assignments[p.identity] = `room-${roomIdx + 1}`;
    });
    setManualAssignments(assignments);
  };

  const handleStart = () => {
    // Generate room definitions with separate LiveKit room names
    const rooms: BreakoutRoomDefinition[] = roomNames.map((name, i) => {
      const roomId = `room-${i + 1}`;
      const assigned = Object.keys(manualAssignments).filter(
        (id) => manualAssignments[id] === roomId
      );

      // If no manual assignment was made, auto-distribute
      const finalAssigned =
        assigned.length > 0
          ? assigned
          : participants
              .filter((p) => p.identity !== hostIdentity)
              .filter((_, idx) => idx % numRooms === i)
              .map((p) => p.identity);

      return {
        id: roomId,
        name,
        livekitRoomName: `${mainRoomCode}-breakout-${i + 1}`,
        assignedParticipantIdentities: finalAssigned,
      };
    });

    const newSession: BreakoutSessionState = {
      id: `breakout_${Date.now()}`,
      mainRoomCode,
      hostIdentity,
      status: 'active',
      rooms,
      durationMinutes,
      endsAt: Date.now() + durationMinutes * 60 * 1000,
      createdAt: Date.now(),
    };

    onStartBreakout(newSession);
  };

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastText.trim()) return;
    onBroadcastMessage(broadcastText.trim());
    setBroadcastText('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in text-white select-none">
      <div className="relative w-full max-w-2xl bg-[#202124] rounded-3xl shadow-2xl border border-white/10 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-white/10 bg-[#282a2d]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/30 border border-blue-500/40 text-blue-400 flex items-center justify-center">
              <Split className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Breakout Rooms Manager</h2>
              <p className="text-xs text-gray-400">
                {isActive ? 'Session is active across LiveKit rooms' : 'Divide participants into focused discussion rooms'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {isActive ? (
            /* ACTIVE BREAKOUT SESSION MANAGEMENT */
            <div className="space-y-6">
              {/* Active Notice banner */}
              <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-sm font-semibold text-emerald-300">
                      Breakout Sessions In Progress
                    </span>
                  </div>
                  <p className="text-xs text-emerald-200/80 mt-1">
                    Participants are collaborating in separate encrypted LiveKit rooms.
                  </p>
                </div>

                <button
                  onClick={() => onExtendTime(5)}
                  className="px-3 py-1.5 bg-emerald-700/60 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+5 Mins</span>
                </button>
              </div>

              {/* Host Broadcast Message to all rooms */}
              <form onSubmit={handleSendBroadcast} className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                  <Megaphone className="w-3.5 h-3.5 text-blue-400" />
                  <span>Broadcast Announcement to All Breakout Rooms</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={broadcastText}
                    onChange={(e) => setBroadcastText(e.target.value)}
                    placeholder="e.g., Wrapping up discussion in 2 minutes!"
                    className="flex-1 bg-[#2d3033] border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={!broadcastText.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Broadcast</span>
                  </button>
                </div>
              </form>

              {/* List of Breakout Rooms & Jump in */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Rooms ({activeSession.rooms.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Main Room Card */}
                  <div
                    className={`p-3.5 rounded-2xl border transition-all ${
                      currentRoomCode === mainRoomCode
                        ? 'bg-blue-950/40 border-blue-500/60 ring-2 ring-blue-500/40'
                        : 'bg-[#282a2d] border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-gray-100">Main Room</span>
                      {currentRoomCode === mainRoomCode ? (
                        <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded font-mono">
                          Current
                        </span>
                      ) : (
                        <button
                          onClick={() => onSwitchRoom(mainRoomCode)}
                          className="text-xs font-medium text-[#8ab4f8] hover:underline flex items-center gap-1"
                        >
                          Join <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Lobby &amp; central session</p>
                  </div>

                  {/* Individual Breakout Rooms */}
                  {activeSession.rooms.map((room) => {
                    const isHere = currentRoomCode === room.livekitRoomName;
                    return (
                      <div
                        key={room.id}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          isHere
                            ? 'bg-blue-950/40 border-blue-500/60 ring-2 ring-blue-500/40'
                            : 'bg-[#282a2d] border-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm text-gray-100">{room.name}</span>
                          {isHere ? (
                            <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded font-mono">
                              You are here
                            </span>
                          ) : (
                            <button
                              onClick={() => onSwitchRoom(room.livekitRoomName)}
                              className="text-xs font-medium text-[#8ab4f8] hover:underline flex items-center gap-1"
                            >
                              Join <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-400">
                          <Users className="w-3.5 h-3.5" />
                          <span>
                            {room.assignedParticipantIdentities.length} participants assigned
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* SETUP BREAKOUT ROOMS VIEW */
            <div className="space-y-6">
              {/* Configuration Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Number of rooms */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                    Number of Rooms
                  </label>
                  <div className="flex items-center gap-2">
                    {[2, 3, 4, 5].map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => handleRoomCountChange(cnt)}
                        className={`flex-1 py-2 text-sm font-semibold rounded-xl border transition-all ${
                          numRooms === cnt
                            ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                            : 'bg-[#2d3033] border-white/10 text-gray-300 hover:bg-white/5'
                        }`}
                      >
                        {cnt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                    Session Duration
                  </label>
                  <div className="flex items-center gap-2">
                    {[5, 10, 15, 30].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setDurationMinutes(mins)}
                        className={`flex-1 py-2 text-sm font-semibold rounded-xl border transition-all ${
                          durationMinutes === mins
                            ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                            : 'bg-[#2d3033] border-white/10 text-gray-300 hover:bg-white/5'
                        }`}
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Room Names & Quick Partitioning */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Breakout Rooms &amp; Topics
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoAssign}
                    className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Auto-assign participants evenly</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {roomNames.slice(0, numRooms).map((name, i) => (
                    <div
                      key={i}
                      className="p-3 bg-[#282a2d] rounded-2xl border border-white/5 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <span className="w-6 h-6 rounded-lg bg-white/10 text-xs font-bold flex items-center justify-center text-gray-300">
                          {i + 1}
                        </span>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => {
                            const updated = [...roomNames];
                            updated[i] = e.target.value;
                            setRoomNames(updated);
                          }}
                          className="bg-transparent text-sm font-medium text-white focus:outline-none focus:border-b border-blue-500 py-0.5 flex-1"
                        />
                      </div>
                      <span className="text-xs text-gray-400 font-mono">
                        {mainRoomCode}-breakout-{i + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-blue-950/40 border border-blue-800/40 rounded-xl text-xs text-blue-200/90 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Participants will receive an instant invite banner to enter their designated LiveKit breakout room.
                  You can jump into any room or close all sessions anytime.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-[#282a2d] border-t border-white/10 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white transition-colors"
          >
            {isActive ? 'Minimize' : 'Cancel'}
          </button>

          {isActive ? (
            <button
              onClick={() => {
                onEndBreakout();
                onClose();
              }}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-md transition-all flex items-center gap-1.5"
            >
              <DoorOpen className="w-4 h-4" />
              <span>Close All Breakout Rooms</span>
            </button>
          ) : (
            <button
              onClick={() => {
                handleStart();
                onClose();
              }}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md transition-all flex items-center gap-2"
            >
              <Split className="w-4 h-4" />
              <span>Start Breakout Rooms</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
