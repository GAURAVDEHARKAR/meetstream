import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { LandingPage } from './components/LandingPage';
import { PreJoinRoom } from './components/PreJoinRoom';
import { MeetingRoom } from './components/MeetingRoom';
import { PostMeeting } from './components/PostMeeting';
import { LiveKitConfigModal } from './components/LiveKitConfigModal';
import { HelpModal } from './components/HelpModal';
import { getLiveKitStatus, sanitizeRoomCode } from './services/api';
import { LiveKitStatus } from './types';
import { BlurLevel } from './services/videoProcessor';

type AppView = 'landing' | 'prejoin' | 'meeting' | 'left';

export default function App() {
  const [view, setView] = useState<AppView>('landing');
  const [roomCode, setRoomCode] = useState<string>('');
  const [participantName, setParticipantName] = useState<string>('');
  const [initialVideo, setInitialVideo] = useState(true);
  const [initialAudio, setInitialAudio] = useState(true);
  const [blurLevel, setBlurLevel] = useState<BlurLevel>('off');
  const [startWithScreenShare, setStartWithScreenShare] = useState(false);

  const [status, setStatus] = useState<LiveKitStatus | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Load status from backend
  const loadStatus = async () => {
    const s = await getLiveKitStatus();
    setStatus(s);
  };

  useEffect(() => {
    loadStatus();
  }, []);

  // Check URL query parameters for direct room joins (e.g. ?room=abc-defg-hij)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      const clean = sanitizeRoomCode(roomParam);
      if (clean) {
        setRoomCode(clean);
        setView('prejoin');
      }
    }
  }, []);

  // Update browser URL query without reloading
  const updateUrlRoom = (code: string | null) => {
    try {
      const url = new URL(window.location.href);
      if (code) {
        url.searchParams.set('room', code);
      } else {
        url.searchParams.delete('room');
      }
      window.history.replaceState({}, '', url.toString());
    } catch {
      // fallback
    }
  };

  const handleStartMeeting = (code: string, isInstant: boolean) => {
    const clean = sanitizeRoomCode(code);
    setRoomCode(clean);
    updateUrlRoom(clean);

    if (isInstant) {
      // In instant meeting mode, check if we have stored name; otherwise prejoin
      const savedName = localStorage.getItem('meet_participant_name');
      if (savedName) {
        setParticipantName(savedName);
        setView('meeting');
        return;
      }
    }
    setView('prejoin');
  };

  const handleJoinFromPreJoin = (params: {
    participantName: string;
    initialVideo: boolean;
    initialAudio: boolean;
    startWithScreenShare?: boolean;
    initialBlur?: BlurLevel;
  }) => {
    setParticipantName(params.participantName);
    setInitialVideo(params.initialVideo);
    setInitialAudio(params.initialAudio);
    if (params.initialBlur) {
      setBlurLevel(params.initialBlur);
    }
    setStartWithScreenShare(Boolean(params.startWithScreenShare));
    setView('meeting');
  };

  const handleLeaveMeeting = () => {
    setView('left');
  };

  const handleRejoin = () => {
    setView('prejoin');
  };

  const handleReturnHome = () => {
    setRoomCode('');
    updateUrlRoom(null);
    setView('landing');
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans antialiased selection:bg-blue-100 selection:text-blue-900">
      {/* Settings Modal (Always accessible) */}
      <LiveKitConfigModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        status={status}
        onConfigSaved={loadStatus}
      />

      {/* Help Modal */}
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

      {/* 1. Landing View */}
      {view === 'landing' && (
        <div className="min-h-screen flex flex-col">
          <Header
            status={status}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenHelp={() => setIsHelpOpen(true)}
          />
          <main className="flex-1">
            <LandingPage
              onStartMeeting={handleStartMeeting}
              status={status}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />
          </main>
        </div>
      )}

      {/* 2. PreJoin / Green Room View */}
      {view === 'prejoin' && (
        <PreJoinRoom
          roomCode={roomCode}
          initialName={participantName}
          onJoin={handleJoinFromPreJoin}
          onBack={handleReturnHome}
          status={status}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      )}

      {/* 3. In-Meeting View (Google Meet Dark Theme) */}
      {view === 'meeting' && (
        <MeetingRoom
          roomCode={roomCode}
          participantName={participantName || 'Guest'}
          initialVideo={initialVideo}
          initialAudio={initialAudio}
          initialBlur={blurLevel}
          startWithScreenShare={startWithScreenShare}
          onLeave={handleLeaveMeeting}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      )}

      {/* 4. Left Meeting View */}
      {view === 'left' && (
        <PostMeeting
          roomCode={roomCode}
          onRejoin={handleRejoin}
          onHome={handleReturnHome}
        />
      )}
    </div>
  );
}
