import React, { useState, useEffect } from 'react';
import { LiveKitRoom, RoomAudioRenderer } from '@livekit/components-react';
import { Loader2, AlertCircle, ArrowLeft, Key, RefreshCw } from 'lucide-react';
import { getMeetingToken } from '../services/api';
import { MeetingStage } from './MeetingStage';
import { TokenResponse } from '../types';
import { BlurLevel } from '../services/videoProcessor';

interface MeetingRoomProps {
  roomCode: string;
  participantName: string;
  initialVideo: boolean;
  initialAudio: boolean;
  initialBlur?: BlurLevel;
  startWithScreenShare?: boolean;
  onLeave: () => void;
  onOpenSettings: () => void;
}

export const MeetingRoom: React.FC<MeetingRoomProps> = ({
  roomCode,
  participantName,
  initialVideo,
  initialAudio,
  initialBlur = 'off',
  startWithScreenShare = false,
  onLeave,
  onOpenSettings,
}) => {
  const [currentRoomCode, setCurrentRoomCode] = useState(roomCode);
  const [tokenData, setTokenData] = useState<TokenResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsConfig, setNeedsConfig] = useState(false);

  const fetchToken = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setNeedsConfig(false);

      const data = await getMeetingToken({
        roomName: currentRoomCode,
        participantName,
      });

      setTokenData(data);
    } catch (err: any) {
      console.error('Failed to get token:', err);
      setError(err.message || 'Unable to join meeting');
      if (err.needsConfig) {
        setNeedsConfig(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchToken();
  }, [currentRoomCode, participantName]);

  const handleSwitchRoom = (targetRoomName: string) => {
    if (targetRoomName === currentRoomCode) return;
    setCurrentRoomCode(targetRoomName);
  };

  // Loading state
  if (isLoading) {
    const isBreakout = currentRoomCode !== roomCode;
    return (
      <div className="min-h-screen bg-[#202124] text-white flex flex-col items-center justify-center p-6 space-y-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="w-3 h-3 rounded-full bg-blue-500 animate-ping" />
          </div>
        </div>
        <div className="text-center space-y-1">
          <h2 className="text-lg font-medium text-gray-100">
            {isBreakout ? 'Joining breakout session...' : 'Joining meeting...'}
          </h2>
          <p className="text-xs text-gray-400 font-mono">
            {isBreakout ? `Breakout: ${currentRoomCode}` : `Room: ${currentRoomCode}`}
          </p>
        </div>
      </div>
    );
  }

  // Error state / Needs LiveKit configuration
  if (error || !tokenData) {
    return (
      <div className="min-h-screen bg-[#202124] text-white flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#282a2d] rounded-2xl p-6 border border-white/10 shadow-2xl space-y-5 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
            <AlertCircle className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-white">Could not connect to meeting</h3>
            <p className="text-xs text-gray-300 leading-relaxed">{error}</p>
          </div>

          {needsConfig && (
            <div className="bg-amber-950/40 border border-amber-800/60 rounded-xl p-3.5 text-xs text-amber-200 text-left space-y-2">
              <span className="font-semibold block text-amber-100">LiveKit Cloud setup required</span>
              <p className="text-amber-200/90 leading-relaxed">
                Connect your LiveKit Cloud project URL and keys to start the real-time room. Free tier accounts are available at cloud.livekit.io.
              </p>
              <button
                onClick={onOpenSettings}
                className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Key className="w-3.5 h-3.5" />
                <span>Configure LiveKit Cloud Now</span>
              </button>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={onLeave}
              className="flex-1 py-2.5 px-4 rounded-xl border border-white/10 hover:bg-white/5 text-gray-300 text-xs font-medium transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <button
              onClick={fetchToken}
              className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <LiveKitRoom
      key={tokenData.roomName}
      token={tokenData.token}
      serverUrl={tokenData.livekitUrl}
      connect={true}
      video={initialVideo}
      audio={initialAudio}
      screen={startWithScreenShare}
      data-lk-theme="default"
      onDisconnected={onLeave}
      onError={(err) => {
        console.error('LiveKit room connection error:', err);
        setError(err.message || 'Connection lost');
      }}
      className="w-full h-screen bg-[#202124]"
    >
      {/* Audio renderer ensures all remote participants' audio plays automatically */}
      <RoomAudioRenderer />

      {/* Main meeting layout stage with breakout transitions */}
      <MeetingStage
        roomCode={currentRoomCode}
        mainRoomCode={roomCode}
        initialBlur={initialBlur}
        onLeave={onLeave}
        onOpenSettings={onOpenSettings}
        onSwitchRoom={handleSwitchRoom}
      />
    </LiveKitRoom>
  );
};
