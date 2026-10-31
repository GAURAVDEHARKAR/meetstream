import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  useTracks,
  useParticipants,
  useConnectionState,
  useRoomContext,
  useLocalParticipant,
} from '@livekit/components-react';
import { Track, RoomEvent, ConnectionState, LocalVideoTrack } from 'livekit-client';
import { TrackReferenceOrPlaceholder, isTrackReference } from '@livekit/components-core';
import {
  Wifi,
  WifiOff,
  ShieldCheck,
  AlertTriangle,
  MonitorUp,
  Split,
} from 'lucide-react';

import { ParticipantGridTile } from './ParticipantGridTile';
import { MeetingToolbar } from './MeetingToolbar';
import { MeetingInfoPanel } from './MeetingInfoPanel';
import { ParticipantsPanel } from './ParticipantsPanel';
import { ChatPanel } from './ChatPanel';
import { ReactionsOverlay } from './ReactionsOverlay';
import { GeminiLiveVoiceModal } from './GeminiLiveVoiceModal';
import { BreakoutHostModal } from './BreakoutHostModal';
import { BreakoutTransitionBanner } from './BreakoutTransitionBanner';
import { WhiteboardPanel } from './WhiteboardPanel';
import { FloatingReaction, BreakoutSessionState, BreakoutRoomDefinition } from '../types';
import { BlurLevel, setTrackBackgroundBlur } from '../services/videoProcessor';
import { syncBreakoutSessionToFirestore, subscribeToBreakoutSession } from '../services/breakoutSync';

interface MeetingStageProps {
  roomCode: string;
  mainRoomCode?: string;
  initialBlur?: BlurLevel;
  onLeave: () => void;
  onOpenSettings: () => void;
  onSwitchRoom?: (targetRoomCode: string) => void;
}

export const MeetingStage: React.FC<MeetingStageProps> = ({
  roomCode,
  mainRoomCode = roomCode,
  initialBlur = 'off',
  onLeave,
  onOpenSettings,
  onSwitchRoom,
}) => {
  const room = useRoomContext();
  const connectionState = useConnectionState();
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();

  // Active side panel state
  const [activePanel, setActivePanel] = useState<'info' | 'participants' | 'chat' | null>(null);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  // Background blur level state
  const [blurLevel, setBlurLevel] = useState<BlurLevel>(initialBlur);

  // Gemini Live Voice Assistant modal state
  const [isGeminiLiveOpen, setIsGeminiLiveOpen] = useState(false);

  // Breakout rooms modal & state
  const [isBreakoutModalOpen, setIsBreakoutModalOpen] = useState(false);
  const [breakoutSession, setBreakoutSession] = useState<BreakoutSessionState | null>(null);

  // Interactive Whiteboard state
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);
  const [isWhiteboardExpanded, setIsWhiteboardExpanded] = useState(false);
  const [whiteboardNotification, setWhiteboardNotification] = useState<string | null>(null);

  // Pinned track identity
  const [pinnedTrackId, setPinnedTrackId] = useState<string | null>(null);

  // Floating reactions state
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);

  // Meeting duration timer
  const [meetingDuration, setMeetingDuration] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setMeetingDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDuration = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) {
      const remainingMins = mins % 60;
      return `${hrs.toString().padStart(2, '0')}:${remainingMins
        .toString()
        .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Subscribe to Firestore active breakout session for the main room
  useEffect(() => {
    const unsubscribe = subscribeToBreakoutSession(mainRoomCode, (session) => {
      setBreakoutSession(session);
      if (session?.status === 'ended' && roomCode !== mainRoomCode) {
        // Breakouts closed; auto return to main room
        onSwitchRoom?.(mainRoomCode);
      }
    });

    return () => unsubscribe();
  }, [mainRoomCode, roomCode, onSwitchRoom]);

  // Apply LiveKit Video Background Blur Processor to local camera video track
  const applyBlur = useCallback(async (level: BlurLevel) => {
    setBlurLevel(level);
    try {
      const camPub = localParticipant.getTrackPublication(Track.Source.Camera);
      const localVideoTrack = camPub?.videoTrack as LocalVideoTrack | undefined;
      await setTrackBackgroundBlur(localVideoTrack, level);
    } catch (err) {
      console.warn('Could not apply LiveKit background blur:', err);
    }
  }, [localParticipant]);

  // Re-apply background blur if local camera track restarts or changes
  useEffect(() => {
    const camPub = localParticipant.getTrackPublication(Track.Source.Camera);
    const localVideoTrack = camPub?.videoTrack as LocalVideoTrack | undefined;
    if (localVideoTrack && blurLevel !== 'off') {
      setTrackBackgroundBlur(localVideoTrack, blurLevel);
    }
  }, [localParticipant, blurLevel]);

  // Cycle blur between off -> slight -> heavy -> off
  const handleCycleBlur = () => {
    const nextLevel: BlurLevel = blurLevel === 'off' ? 'slight' : blurLevel === 'slight' ? 'heavy' : 'off';
    applyBlur(nextLevel);
  };

  // Get all camera and screen share tracks
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  // Detect active screen share track
  const activeScreenShare = useMemo(() => {
    return tracks.find((t) => t.source === Track.Source.ScreenShare && isTrackReference(t));
  }, [tracks]);

  // Determine current primary track (Screen share takes automatic priority, or manual pin)
  const primaryTrack = useMemo(() => {
    if (pinnedTrackId) {
      const pinned = tracks.find(
        (t) => `${t.participant.identity}_${t.source}` === pinnedTrackId
      );
      if (pinned) return pinned;
    }
    if (activeScreenShare) return activeScreenShare;
    return null;
  }, [tracks, pinnedTrackId, activeScreenShare]);

  // Secondary tracks when there's a primary pinned/presentation view
  const secondaryTracks = useMemo(() => {
    if (!primaryTrack) return tracks;
    return tracks.filter(
      (t) => `${t.participant.identity}_${t.source}` !== `${primaryTrack.participant.identity}_${primaryTrack.source}`
    );
  }, [tracks, primaryTrack]);

  // Add a floating emoji reaction
  const addReaction = (emoji: string, senderName: string) => {
    const newReaction: FloatingReaction = {
      id: `${Date.now()}_${Math.random()}`,
      emoji,
      senderName,
      x: 20 + Math.random() * 60,
    };
    setReactions((prev) => [...prev.slice(-15), newReaction]);

    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
    }, 3500);
  };

  // Listen for real-time reactions and breakout data packets over LiveKit data channel
  useEffect(() => {
    if (!room) return;

    const handleDataReceived = (payload: Uint8Array, participant?: any, kind?: any, topic?: string) => {
      if (topic === 'reaction') {
        try {
          const text = new TextDecoder().decode(payload);
          const data = JSON.parse(text);
          const sender = data.senderName || participant?.name || 'Someone';
          addReaction(data.emoji || '👍', sender);
        } catch (err) {
          console.error('Error handling reaction data packet:', err);
        }
      }

      if (topic === 'breakout') {
        try {
          const text = new TextDecoder().decode(payload);
          const event = JSON.parse(text);
          if (event.type === 'BREAKOUT_STARTED') {
            setBreakoutSession(event.session);
          } else if (event.type === 'BREAKOUT_BROADCAST') {
            setBreakoutSession((prev) => prev ? { ...prev, broadcastMessage: event.message } : null);
          } else if (event.type === 'BREAKOUT_ENDED') {
            setBreakoutSession(null);
            if (roomCode !== mainRoomCode) {
              onSwitchRoom?.(mainRoomCode);
            }
          }
        } catch (err) {
          console.error('Error handling breakout event packet:', err);
        }
      }

      if (topic === 'whiteboard') {
        try {
          const text = new TextDecoder().decode(payload);
          const data = JSON.parse(text);
          if (data.type === 'WB_STROKE_ADDED') {
            const author = data.stroke?.authorName || participant?.name || 'Someone';
            setWhiteboardNotification(`${author} is drawing on the Whiteboard`);
            setTimeout(() => setWhiteboardNotification(null), 5000);
          }
        } catch {
          // ignore
        }
      }
    };

    room.on(RoomEvent.DataReceived, handleDataReceived);
    return () => {
      room.off(RoomEvent.DataReceived, handleDataReceived);
    };
  }, [room, roomCode, mainRoomCode, onSwitchRoom]);

  // Broadcast a reaction to room participants
  const handleSendReaction = (emoji: string) => {
    const sender = localParticipant.name || 'You';
    addReaction(emoji, sender);
    if (room && localParticipant) {
      try {
        const payload = new TextEncoder().encode(JSON.stringify({ emoji, senderName: sender }));
        localParticipant.publishData(payload, { reliable: false, topic: 'reaction' });
      } catch (err) {
        console.warn('Could not broadcast reaction data:', err);
      }
    }
  };

  // Host: Start Breakout Rooms
  const handleStartBreakoutSession = async (newSession: BreakoutSessionState) => {
    setBreakoutSession(newSession);
    // Sync to Firestore
    await syncBreakoutSessionToFirestore(mainRoomCode, newSession);

    // Broadcast over LiveKit data channel
    if (room && localParticipant) {
      try {
        const payload = new TextEncoder().encode(
          JSON.stringify({ type: 'BREAKOUT_STARTED', session: newSession })
        );
        localParticipant.publishData(payload, { reliable: true, topic: 'breakout' });
      } catch (err) {
        console.warn('LiveKit breakout broadcast warning:', err);
      }
    }
  };

  // Host: Broadcast announcement to all rooms
  const handleBroadcastAnnouncement = async (msg: string) => {
    if (!breakoutSession) return;
    const updated = { ...breakoutSession, broadcastMessage: msg };
    setBreakoutSession(updated);
    await syncBreakoutSessionToFirestore(mainRoomCode, updated);

    if (room && localParticipant) {
      try {
        const payload = new TextEncoder().encode(
          JSON.stringify({ type: 'BREAKOUT_BROADCAST', message: msg })
        );
        localParticipant.publishData(payload, { reliable: true, topic: 'breakout' });
      } catch (err) {
        console.warn('LiveKit announcement broadcast warning:', err);
      }
    }
  };

  // Host: Extend Breakout time
  const handleExtendBreakoutTime = async (extraMinutes: number) => {
    if (!breakoutSession) return;
    const newEndsAt = (breakoutSession.endsAt || Date.now()) + extraMinutes * 60 * 1000;
    const updated = { ...breakoutSession, endsAt: newEndsAt };
    setBreakoutSession(updated);
    await syncBreakoutSessionToFirestore(mainRoomCode, updated);
  };

  // Host: End all breakout rooms
  const handleEndBreakoutSession = async () => {
    if (!breakoutSession) return;
    const ended = { ...breakoutSession, status: 'ended' as const };
    setBreakoutSession(null);
    await syncBreakoutSessionToFirestore(mainRoomCode, ended);

    if (room && localParticipant) {
      try {
        const payload = new TextEncoder().encode(
          JSON.stringify({ type: 'BREAKOUT_ENDED', mainRoomCode })
        );
        localParticipant.publishData(payload, { reliable: true, topic: 'breakout' });
      } catch (err) {
        console.warn('LiveKit end breakout broadcast warning:', err);
      }
    }

    if (roomCode !== mainRoomCode) {
      onSwitchRoom?.(mainRoomCode);
    }
  };

  // Toggle side panel
  const handleTogglePanel = (panel: 'info' | 'participants' | 'chat') => {
    setActivePanel((curr) => {
      if (curr === panel) return null;
      if (panel === 'chat') setUnreadChatCount(0);
      return panel;
    });
  };

  const getGridClasses = (count: number) => {
    if (count <= 1) return 'grid-cols-1 max-w-4xl mx-auto h-full max-h-[75vh]';
    if (count === 2) return 'grid-cols-1 md:grid-cols-2 max-w-6xl mx-auto h-full max-h-[75vh]';
    if (count <= 4) return 'grid-cols-1 sm:grid-cols-2 max-w-6xl mx-auto h-full';
    if (count <= 6) return 'grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto h-full';
    return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 max-w-7xl mx-auto h-full';
  };

  const participantList = participants.map((p) => ({
    identity: p.identity,
    name: p.name || p.identity,
  }));

  const isInBreakout = roomCode !== mainRoomCode;

  return (
    <div className="relative w-full h-screen bg-[#202124] text-white flex flex-col overflow-hidden">
      {/* Floating Reactions Overlay */}
      <ReactionsOverlay reactions={reactions} />

      {/* Breakout Transition & In-room Banner */}
      <BreakoutTransitionBanner
        session={breakoutSession}
        currentRoomCode={roomCode}
        mainRoomCode={mainRoomCode}
        participantIdentity={localParticipant.identity}
        isHost={true}
        onJoinBreakoutRoom={(target) => onSwitchRoom?.(target.livekitRoomName)}
        onReturnToMain={() => onSwitchRoom?.(mainRoomCode)}
        onRequestHelp={() => handleSendReaction('🙋')}
      />

      {/* Breakout Host Manager Modal */}
      <BreakoutHostModal
        isOpen={isBreakoutModalOpen}
        onClose={() => setIsBreakoutModalOpen(false)}
        mainRoomCode={mainRoomCode}
        hostIdentity={localParticipant.identity}
        participants={participantList}
        activeSession={breakoutSession}
        currentRoomCode={roomCode}
        onStartBreakout={handleStartBreakoutSession}
        onBroadcastMessage={handleBroadcastAnnouncement}
        onSwitchRoom={(target) => onSwitchRoom?.(target)}
        onEndBreakout={handleEndBreakoutSession}
        onExtendTime={handleExtendBreakoutTime}
      />

      {/* Gemini Live Voice Assistant Modal (gemini-3.8-live) */}
      <GeminiLiveVoiceModal
        isOpen={isGeminiLiveOpen}
        onClose={() => setIsGeminiLiveOpen(false)}
      />

      {/* Top Meeting Bar */}
      <header className="h-14 px-4 sm:px-6 flex items-center justify-between border-b border-white/5 bg-[#202124] z-10 select-none">
        {/* Left: Meeting duration & Room code */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-mono text-gray-300 tracking-wider">
              {formatDuration(meetingDuration)}
            </span>
          </div>
          <span className="text-white/20">|</span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-gray-300 font-mono">
              {isInBreakout ? `Breakout: ${roomCode}` : roomCode}
            </span>
            {isInBreakout && (
              <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded font-mono border border-purple-500/30">
                Breakout Session
              </span>
            )}
          </div>
        </div>

        {/* Center: Presentation / Screen Share notification if active */}
        {activeScreenShare && (
          <div className="flex items-center gap-2 bg-amber-500/20 border border-amber-500/40 px-3 py-1 rounded-full text-xs text-amber-300 font-medium animate-fade-in">
            <MonitorUp className="w-3.5 h-3.5" />
            <span>
              {activeScreenShare.participant.identity === localParticipant.identity
                ? 'You are presenting to everyone'
                : `${activeScreenShare.participant.name || 'Someone'} is presenting`}
            </span>
          </div>
        )}

        {/* Right: Security Badge & Connection Quality */}
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <div className="hidden md:flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[11px] text-gray-300">LiveKit Cloud Secured</span>
          </div>

          {/* Connection Status */}
          <div className="flex items-center gap-1.5">
            {connectionState === ConnectionState.Connected ? (
              <span className="flex items-center gap-1 text-emerald-400 text-xs">
                <Wifi className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Connected</span>
              </span>
            ) : connectionState === ConnectionState.Reconnecting ? (
              <span className="flex items-center gap-1 text-amber-400 text-xs">
                <AlertTriangle className="w-3.5 h-3.5 animate-spin" />
                <span>Reconnecting...</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-red-400 text-xs">
                <WifiOff className="w-3.5 h-3.5" />
                <span>Disconnected</span>
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace: Video Grid Stage + Slide-over Panel */}
      <div className="flex-1 flex overflow-hidden relative">
        <main className="flex-1 p-3 sm:p-4 flex flex-col items-center justify-center overflow-y-auto">
          {/* Whiteboard Spotlight Presentation */}
          {isWhiteboardOpen ? (
            <div className="w-full h-full flex flex-col lg:flex-row gap-3">
              {/* Large Interactive Whiteboard View */}
              <div className="flex-1 h-full min-h-[350px] relative rounded-2xl overflow-hidden shadow-2xl">
                <WhiteboardPanel
                  roomCode={roomCode}
                  onClose={() => setIsWhiteboardOpen(false)}
                  isStageMode={true}
                  isExpanded={isWhiteboardExpanded}
                  onToggleExpand={() => setIsWhiteboardExpanded(!isWhiteboardExpanded)}
                />
              </div>

              {/* Secondary Participants Strip (active while whiteboard is open, unless expanded full-screen) */}
              {!isWhiteboardExpanded && tracks.length > 0 && (
                <div className="lg:w-64 h-36 lg:h-full flex lg:flex-col gap-3 overflow-x-auto lg:overflow-y-auto shrink-0 pb-1">
                  {tracks.map((trackRef) => {
                    const trackKey = `${trackRef.participant.identity}_${trackRef.source}`;
                    const isLocal = trackRef.participant.identity === localParticipant.identity;
                    return (
                      <div
                        key={trackKey}
                        className="w-48 lg:w-full h-32 lg:h-40 shrink-0 cursor-pointer"
                        onClick={() => setPinnedTrackId(trackKey)}
                      >
                        <ParticipantGridTile
                          trackRef={trackRef}
                          isLocal={isLocal}
                          isPinned={pinnedTrackId === trackKey}
                          blurLevel={isLocal ? blurLevel : 'off'}
                          onTogglePin={() =>
                            setPinnedTrackId(pinnedTrackId === trackKey ? null : trackKey)
                          }
                          onCycleBlur={handleCycleBlur}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : primaryTrack ? (
            <div className="w-full h-full flex flex-col lg:flex-row gap-3">
              {/* Large Primary View */}
              <div className="flex-1 h-full min-h-[300px] relative rounded-2xl overflow-hidden bg-[#3c4043]">
                <ParticipantGridTile
                  trackRef={primaryTrack}
                  isLocal={primaryTrack.participant.identity === localParticipant.identity}
                  isPinned={Boolean(pinnedTrackId)}
                  blurLevel={primaryTrack.participant.identity === localParticipant.identity ? blurLevel : 'off'}
                  onTogglePin={() => setPinnedTrackId(null)}
                  onCycleBlur={handleCycleBlur}
                />
              </div>

              {/* Secondary Participants Strip */}
              {secondaryTracks.length > 0 && (
                <div className="lg:w-64 h-36 lg:h-full flex lg:flex-col gap-3 overflow-x-auto lg:overflow-y-auto shrink-0 pb-1">
                  {secondaryTracks.map((trackRef) => {
                    const trackKey = `${trackRef.participant.identity}_${trackRef.source}`;
                    const isLocal = trackRef.participant.identity === localParticipant.identity;
                    return (
                      <div
                        key={trackKey}
                        className="w-48 lg:w-full h-32 lg:h-40 shrink-0 cursor-pointer"
                        onClick={() => setPinnedTrackId(trackKey)}
                      >
                        <ParticipantGridTile
                          trackRef={trackRef}
                          isLocal={isLocal}
                          isPinned={pinnedTrackId === trackKey}
                          blurLevel={isLocal ? blurLevel : 'off'}
                          onTogglePin={() =>
                            setPinnedTrackId(pinnedTrackId === trackKey ? null : trackKey)
                          }
                          onCycleBlur={handleCycleBlur}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Adaptive Responsive Grid Layout */
            <div
              className={`w-full grid gap-3 sm:gap-4 p-2 items-center justify-center content-center ${getGridClasses(
                tracks.length
              )}`}
            >
              {tracks.map((trackRef) => {
                const trackKey = `${trackRef.participant.identity}_${trackRef.source}`;
                const isLocal = trackRef.participant.identity === localParticipant.identity;
                return (
                  <div key={trackKey} className="w-full h-full flex items-center justify-center">
                    <ParticipantGridTile
                      trackRef={trackRef}
                      isLocal={isLocal}
                      isPinned={pinnedTrackId === trackKey}
                      blurLevel={isLocal ? blurLevel : 'off'}
                      onTogglePin={() =>
                        setPinnedTrackId(pinnedTrackId === trackKey ? null : trackKey)
                      }
                      onCycleBlur={handleCycleBlur}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* Slide-over Side Panels */}
        {activePanel === 'info' && (
          <MeetingInfoPanel roomCode={roomCode} onClose={() => setActivePanel(null)} />
        )}
        {activePanel === 'participants' && (
          <ParticipantsPanel onClose={() => setActivePanel(null)} />
        )}
        {activePanel === 'chat' && (
          <ChatPanel
            onClose={() => setActivePanel(null)}
            onMessageReceived={() => {
              if (activePanel !== 'chat') {
                setUnreadChatCount((prev) => prev + 1);
              }
            }}
          />
        )}

        {/* Floating Whiteboard Activity Notification */}
        {whiteboardNotification && !isWhiteboardOpen && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-[#282a2d] border border-blue-500/50 text-white px-4 py-2 rounded-full shadow-2xl flex items-center gap-3 animate-fade-in text-xs">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
            <span>{whiteboardNotification}</span>
            <button
              onClick={() => {
                setIsWhiteboardOpen(true);
                setWhiteboardNotification(null);
              }}
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 font-semibold rounded-full text-white text-[11px] transition-colors shadow-sm"
            >
              Open Whiteboard
            </button>
            <button
              onClick={() => setWhiteboardNotification(null)}
              className="text-gray-400 hover:text-white ml-0.5 text-sm font-bold"
            >
              &times;
            </button>
          </div>
        )}
      </div>

      {/* Google Meet Bottom Toolbar */}
      <MeetingToolbar
        roomCode={roomCode}
        onLeave={onLeave}
        activePanel={activePanel}
        onTogglePanel={handleTogglePanel}
        unreadChatCount={unreadChatCount}
        participantCount={participants.length}
        onSendReaction={handleSendReaction}
        onOpenSettings={onOpenSettings}
        blurLevel={blurLevel}
        onSetBlurLevel={applyBlur}
        onOpenGeminiLive={() => setIsGeminiLiveOpen(true)}
        onOpenBreakoutModal={() => setIsBreakoutModalOpen(true)}
        isWhiteboardOpen={isWhiteboardOpen}
        onToggleWhiteboard={() => {
          setIsWhiteboardOpen((prev) => !prev);
          setWhiteboardNotification(null);
        }}
        hasActiveBreakout={Boolean(breakoutSession && breakoutSession.status === 'active')}
      />
    </div>
  );
};
