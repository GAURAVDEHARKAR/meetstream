import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  MonitorOff,
  PhoneOff,
  Info,
  Users,
  MessageSquare,
  Smile,
  Hand,
  Settings,
  Maximize2,
  Minimize2,
  Sparkles,
  Bot,
  SlidersHorizontal,
  Split,
  PenTool,
} from 'lucide-react';
import { useLocalParticipant } from '@livekit/components-react';
import { BlurLevel } from '../services/videoProcessor';

interface MeetingToolbarProps {
  roomCode: string;
  onLeave: () => void;
  activePanel: 'info' | 'participants' | 'chat' | null;
  onTogglePanel: (panel: 'info' | 'participants' | 'chat') => void;
  unreadChatCount: number;
  participantCount: number;
  onSendReaction: (emoji: string) => void;
  onOpenSettings: () => void;
  blurLevel: BlurLevel;
  onSetBlurLevel: (level: BlurLevel) => void;
  onOpenGeminiLive: () => void;
  onOpenBreakoutModal: () => void;
  isWhiteboardOpen?: boolean;
  onToggleWhiteboard?: () => void;
  isHost?: boolean;
  hasActiveBreakout?: boolean;
}

const EMOJIS = ['👏', '👍', '❤️', '😂', '😮', '🎉', '🔥', '🙌'];

export const MeetingToolbar: React.FC<MeetingToolbarProps> = ({
  roomCode,
  onLeave,
  activePanel,
  onTogglePanel,
  unreadChatCount,
  participantCount,
  onSendReaction,
  onOpenSettings,
  blurLevel,
  onSetBlurLevel,
  onOpenGeminiLive,
  onOpenBreakoutModal,
  isWhiteboardOpen = false,
  onToggleWhiteboard,
  isHost = true,
  hasActiveBreakout = false,
}) => {
  const {
    localParticipant,
    isMicrophoneEnabled,
    isCameraEnabled,
    isScreenShareEnabled,
  } = useLocalParticipant();

  const [currentTime, setCurrentTime] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showBlurMenu, setShowBlurMenu] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const blurMenuRef = useRef<HTMLDivElement>(null);

  // Time formatter
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Handle outside click for popups
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
      if (blurMenuRef.current && !blurMenuRef.current.contains(e.target as Node)) {
        setShowBlurMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Hotkeys: m for mic, v for video
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'm' || e.key === 'M') {
        localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
      } else if (e.key === 'v' || e.key === 'V') {
        localParticipant.setCameraEnabled(!isCameraEnabled);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [localParticipant, isMicrophoneEnabled, isCameraEnabled]);

  const toggleMic = async () => {
    try {
      await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
    } catch (err) {
      console.error('Failed to toggle mic:', err);
    }
  };

  const toggleCamera = async () => {
    try {
      await localParticipant.setCameraEnabled(!isCameraEnabled);
    } catch (err) {
      console.error('Failed to toggle camera:', err);
    }
  };

  const toggleScreenShare = async () => {
    try {
      await localParticipant.setScreenShareEnabled(!isScreenShareEnabled);
    } catch (err) {
      console.error('Failed to toggle screen share:', err);
    }
  };

  const toggleHand = () => {
    const newState = !isHandRaised;
    setIsHandRaised(newState);
    if (newState) {
      onSendReaction('✋');
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <footer className="h-20 bg-[#202124] text-white px-4 sm:px-6 flex items-center justify-between border-t border-white/5 select-none z-20 shrink-0">
      {/* Left: Time and Room Code Pill */}
      <div className="flex items-center gap-3">
        <span className="hidden sm:inline-block text-sm font-medium text-gray-300">
          {currentTime}
        </span>
        <span className="hidden sm:inline-block text-gray-600">|</span>
        <button
          onClick={() => onTogglePanel('info')}
          className="text-xs sm:text-sm font-medium tracking-wide text-gray-300 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition-colors flex items-center gap-1.5"
          title="Meeting details and invite link"
        >
          <span>{roomCode}</span>
        </button>
      </div>

      {/* Center: Main Google Meet Control Buttons */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Microphone Toggle */}
        <button
          onClick={toggleMic}
          className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all ${
            isMicrophoneEnabled
              ? 'bg-[#3c4043] hover:bg-[#474b50] text-white'
              : 'bg-[#ea4335] hover:bg-[#d93025] text-white shadow-md'
          }`}
          title={isMicrophoneEnabled ? 'Turn off microphone (M)' : 'Turn on microphone (M)'}
          aria-label="Microphone toggle"
        >
          {isMicrophoneEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>

        {/* Camera Toggle */}
        <button
          onClick={toggleCamera}
          className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all ${
            isCameraEnabled
              ? 'bg-[#3c4043] hover:bg-[#474b50] text-white'
              : 'bg-[#ea4335] hover:bg-[#d93025] text-white shadow-md'
          }`}
          title={isCameraEnabled ? 'Turn off camera (V)' : 'Turn on camera (V)'}
          aria-label="Camera toggle"
        >
          {isCameraEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>

        {/* Background Blur Visual Effects Toggle with Popover */}
        <div className="relative" ref={blurMenuRef}>
          <button
            onClick={() => setShowBlurMenu(!showBlurMenu)}
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all ${
              blurLevel !== 'off'
                ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-400/40'
                : 'bg-[#3c4043] hover:bg-[#474b50] text-white'
            }`}
            title="Apply visual effects & background blur"
            aria-label="Background blur"
          >
            <Sparkles className="w-5 h-5" />
          </button>

          {/* Background Blur Submenu */}
          {showBlurMenu && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-64 bg-[#282a2d] border border-white/10 rounded-2xl p-2.5 shadow-2xl z-40 animate-fade-in text-xs space-y-1">
              <div className="px-3 py-1 text-gray-400 font-semibold uppercase tracking-wider text-[10px]">
                Background Blur
              </div>
              <button
                onClick={() => {
                  onSetBlurLevel('off');
                  setShowBlurMenu(false);
                }}
                className={`w-full px-3 py-2 text-left rounded-xl transition-colors flex items-center justify-between ${
                  blurLevel === 'off' ? 'bg-white/15 text-white font-semibold' : 'text-gray-300 hover:bg-white/5'
                }`}
              >
                <span>No blur (Off)</span>
                {blurLevel === 'off' && <span className="w-2 h-2 rounded-full bg-blue-400" />}
              </button>
              <button
                onClick={() => {
                  onSetBlurLevel('slight');
                  setShowBlurMenu(false);
                }}
                className={`w-full px-3 py-2 text-left rounded-xl transition-colors flex items-center justify-between ${
                  blurLevel === 'slight' ? 'bg-white/15 text-white font-semibold' : 'text-gray-300 hover:bg-white/5'
                }`}
              >
                <span>Slight blur (10px)</span>
                {blurLevel === 'slight' && <span className="w-2 h-2 rounded-full bg-blue-400" />}
              </button>
              <button
                onClick={() => {
                  onSetBlurLevel('heavy');
                  setShowBlurMenu(false);
                }}
                className={`w-full px-3 py-2 text-left rounded-xl transition-colors flex items-center justify-between ${
                  blurLevel === 'heavy' ? 'bg-white/15 text-white font-semibold' : 'text-gray-300 hover:bg-white/5'
                }`}
              >
                <span>Heavy blur (20px)</span>
                {blurLevel === 'heavy' && <span className="w-2 h-2 rounded-full bg-blue-400" />}
              </button>
              <p className="text-[10px] text-gray-400 px-3 pt-1 border-t border-white/5">
                Uses LiveKit Video TrackProcessor
              </p>
            </div>
          )}
        </div>

        {/* Screen Share Toggle */}
        <button
          onClick={toggleScreenShare}
          className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all ${
            isScreenShareEnabled
              ? 'bg-[#8ab4f8] text-[#202124] shadow-md font-bold'
              : 'bg-[#3c4043] hover:bg-[#474b50] text-white'
          }`}
          title={isScreenShareEnabled ? 'Stop presenting' : 'Present now'}
          aria-label="Screen share toggle"
        >
          {isScreenShareEnabled ? (
            <MonitorOff className="w-5 h-5" />
          ) : (
            <MonitorUp className="w-5 h-5" />
          )}
        </button>

        {/* Interactive Whiteboard Toggle */}
        <button
          onClick={onToggleWhiteboard}
          className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all ${
            isWhiteboardOpen
              ? 'bg-[#8ab4f8] text-[#202124] shadow-md font-bold'
              : 'bg-[#3c4043] hover:bg-[#474b50] text-white'
          }`}
          title={isWhiteboardOpen ? 'Close whiteboard' : 'Collaborative whiteboard'}
          aria-label="Toggle collaborative whiteboard"
        >
          <PenTool className="w-5 h-5" />
        </button>

        {/* Raise Hand Toggle */}
        <button
          onClick={toggleHand}
          className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all ${
            isHandRaised
              ? 'bg-[#fbbc04] text-[#202124] shadow-md'
              : 'bg-[#3c4043] hover:bg-[#474b50] text-white'
          }`}
          title={isHandRaised ? 'Lower hand' : 'Raise hand'}
          aria-label="Raise hand toggle"
        >
          <Hand className="w-5 h-5" />
        </button>

        {/* Emoji Reactions Trigger with Popover */}
        <div className="relative" ref={emojiPickerRef}>
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all ${
              showEmojiPicker
                ? 'bg-[#8ab4f8] text-[#202124]'
                : 'bg-[#3c4043] hover:bg-[#474b50] text-white'
            }`}
            title="Send reaction"
            aria-label="Send emoji reaction"
          >
            <Smile className="w-5 h-5" />
          </button>

          {/* Emoji Floating Palette */}
          {showEmojiPicker && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-[#282a2d] border border-white/10 rounded-full px-3 py-2 shadow-2xl flex items-center gap-1.5 z-40 animate-fade-in">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    onSendReaction(emoji);
                    setShowEmojiPicker(false);
                  }}
                  className="w-9 h-9 rounded-full hover:bg-white/10 hover:scale-125 transition-all flex items-center justify-center text-xl select-none"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Leave Call (Google Meet red rounded pill) */}
        <button
          onClick={onLeave}
          className="h-11 sm:h-12 px-5 sm:px-6 rounded-full bg-[#ea4335] hover:bg-[#d93025] text-white flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 ml-1 sm:ml-2"
          title="Leave call"
          aria-label="Leave call"
        >
          <PhoneOff className="w-5 h-5" />
          <span className="hidden md:inline font-medium text-sm">Leave</span>
        </button>
      </div>

      {/* Right: Breakout Rooms, Gemini Live Voice, Info, Participants, Chat, Fullscreen */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Breakout Rooms Button */}
        <button
          onClick={onOpenBreakoutModal}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold transition-all border ${
            hasActiveBreakout
              ? 'bg-emerald-600/30 border-emerald-400 text-emerald-200'
              : 'bg-[#3c4043] border-white/10 hover:bg-[#474b50] text-gray-200'
          }`}
          title="Breakout Rooms"
        >
          <Split className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Breakout</span>
          {hasActiveBreakout && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
        </button>

        {/* Whiteboard Activity Chip */}
        <button
          onClick={onToggleWhiteboard}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold transition-all border ${
            isWhiteboardOpen
              ? 'bg-blue-600/30 border-blue-400 text-blue-200'
              : 'bg-[#3c4043] border-white/10 hover:bg-[#474b50] text-gray-200'
          }`}
          title="Interactive Whiteboard"
        >
          <PenTool className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Whiteboard</span>
          {isWhiteboardOpen && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />}
        </button>

        {/* Gemini Live Voice Assistant (gemini-3.8-live) Button */}
        <button
          onClick={onOpenGeminiLive}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-500 text-white text-xs font-semibold hover:opacity-90 transition-opacity shadow-sm"
          title="Talk with Gemini 3.8 Live Voice Assistant"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Gemini Live</span>
        </button>

        {/* Info Panel Toggle */}
        <button
          onClick={() => onTogglePanel('info')}
          className={`p-2.5 sm:p-3 rounded-full transition-colors ${
            activePanel === 'info'
              ? 'bg-[#8ab4f8] text-[#202124]'
              : 'text-gray-300 hover:text-white hover:bg-white/10'
          }`}
          title="Meeting details"
          aria-label="Meeting details"
        >
          <Info className="w-5 h-5" />
        </button>

        {/* Participants Panel Toggle */}
        <button
          onClick={() => onTogglePanel('participants')}
          className={`relative p-2.5 sm:p-3 rounded-full transition-colors ${
            activePanel === 'participants'
              ? 'bg-[#8ab4f8] text-[#202124]'
              : 'text-gray-300 hover:text-white hover:bg-white/10'
          }`}
          title="People in call"
          aria-label="Participants list"
        >
          <Users className="w-5 h-5" />
          {participantCount > 0 && (
            <span className="absolute top-1.5 right-1.5 bg-[#8ab4f8] text-[#202124] text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {participantCount}
            </span>
          )}
        </button>

        {/* Chat Panel Toggle */}
        <button
          onClick={() => onTogglePanel('chat')}
          className={`relative p-2.5 sm:p-3 rounded-full transition-colors ${
            activePanel === 'chat'
              ? 'bg-[#8ab4f8] text-[#202124]'
              : 'text-gray-300 hover:text-white hover:bg-white/10'
          }`}
          title="In-call messages"
          aria-label="In-call messages"
        >
          <MessageSquare className="w-5 h-5" />
          {unreadChatCount > 0 && activePanel !== 'chat' && (
            <span className="absolute top-1.5 right-1.5 bg-blue-500 text-white text-[10px] font-bold px-1 min-w-4 h-4 rounded-full flex items-center justify-center animate-bounce">
              {unreadChatCount}
            </span>
          )}
        </button>

        {/* Fullscreen Toggle */}
        <button
          onClick={toggleFullscreen}
          className="hidden sm:flex p-2.5 sm:p-3 rounded-full text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
          title={isFullscreen ? 'Exit full screen' : 'Full screen'}
          aria-label="Toggle full screen"
        >
          {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
        </button>

        {/* Settings Toggle */}
        <button
          onClick={onOpenSettings}
          className="p-2.5 sm:p-3 rounded-full text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
          title="Audio & Video Settings"
          aria-label="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </footer>
  );
};
