import React from 'react';
import { VideoTrack, useIsSpeaking } from '@livekit/components-react';
import { TrackReferenceOrPlaceholder, isTrackReference } from '@livekit/components-core';
import { Track } from 'livekit-client';
import { MicOff, Pin, PinOff, MonitorUp, Volume2, Sparkles } from 'lucide-react';
import { BlurLevel } from '../services/videoProcessor';

interface ParticipantGridTileProps {
  trackRef: TrackReferenceOrPlaceholder;
  isLocal: boolean;
  isPinned: boolean;
  blurLevel?: BlurLevel;
  onTogglePin: () => void;
  onCycleBlur?: () => void;
}

const AVATAR_COLORS = [
  'from-blue-600 to-indigo-600',
  'from-teal-600 to-emerald-600',
  'from-purple-600 to-pink-600',
  'from-amber-600 to-orange-600',
  'from-rose-600 to-red-600',
  'from-cyan-600 to-blue-600',
];

function getAvatarColor(nameOrId: string): string {
  let hash = 0;
  for (let i = 0; i < nameOrId.length; i++) {
    hash = nameOrId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

export const ParticipantGridTile: React.FC<ParticipantGridTileProps> = ({
  trackRef,
  isLocal,
  isPinned,
  blurLevel = 'off',
  onTogglePin,
  onCycleBlur,
}) => {
  const participant = trackRef.participant;
  const isSpeaking = useIsSpeaking(participant);

  const isScreenShare = trackRef.source === Track.Source.ScreenShare;
  const hasRealTrack = isTrackReference(trackRef) && trackRef.publication && !trackRef.publication.isMuted;
  const isCameraTrack = trackRef.source === Track.Source.Camera;

  const displayName = participant.name || participant.identity || 'Participant';
  const initial = displayName.charAt(0).toUpperCase() || 'P';
  const avatarGradient = getAvatarColor(participant.identity || displayName);

  // Check microphone state:
  const isMicMuted = !participant.isMicrophoneEnabled;
  const isBlurActive = isLocal && blurLevel !== 'off';

  return (
    <div
      className={`group relative w-full h-full min-h-[160px] bg-[#3c4043] rounded-2xl overflow-hidden transition-all duration-200 select-none flex items-center justify-center ${
        isSpeaking && !isScreenShare ? 'ring-2 ring-[#8ab4f8] shadow-lg' : 'hover:ring-1 hover:ring-white/20'
      }`}
    >
      {/* Video Content */}
      {hasRealTrack ? (
        <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
          <VideoTrack
            trackRef={trackRef as any}
            className={`w-full h-full object-cover ${
              isCameraTrack && isLocal ? 'scale-x-[-1]' : ''
            }`}
          />
        </div>
      ) : (
        /* Video Off Avatar Placeholder */
        <div className="w-full h-full flex flex-col items-center justify-center bg-[#2d3033] relative">
          <div
            className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr ${avatarGradient} flex items-center justify-center text-white text-2xl sm:text-3xl font-semibold shadow-md transition-transform duration-300 ${
              isSpeaking ? 'scale-110 ring-4 ring-[#8ab4f8]/50 ring-offset-4 ring-offset-[#2d3033]' : ''
            }`}
          >
            {initial}
          </div>
          <p className="text-xs text-gray-300 font-medium mt-3">
            {isLocal ? 'You' : displayName}
          </p>
        </div>
      )}

      {/* Screen Share Tag if this is a screen share track */}
      {isScreenShare && (
        <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md text-amber-300 px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 border border-amber-500/30 z-10">
          <MonitorUp className="w-3.5 h-3.5" />
          <span>{displayName}&apos;s Screen</span>
        </div>
      )}

      {/* Local Background Blur Badge */}
      {isBlurActive && (
        <button
          onClick={onCycleBlur}
          className="absolute top-3 left-3 bg-blue-600/80 backdrop-blur-md text-white hover:bg-blue-600 px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1.5 border border-blue-400/40 z-10 shadow transition-colors"
          title="Click to cycle background blur effect"
        >
          <Sparkles className="w-3 h-3 text-blue-200" />
          <span>Blur: {blurLevel === 'heavy' ? 'Heavy' : 'Slight'}</span>
        </button>
      )}

      {/* Pin Button (Visible on hover or when pinned) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onTogglePin();
        }}
        className={`absolute top-3 right-3 p-2 rounded-full transition-all duration-150 z-20 ${
          isPinned
            ? 'bg-blue-600 text-white shadow-md'
            : 'bg-black/50 hover:bg-black/80 text-gray-200 opacity-0 group-hover:opacity-100'
        }`}
        title={isPinned ? 'Unpin' : 'Pin to center'}
      >
        {isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
      </button>

      {/* Bottom Bar: Participant Name Badge & Microphone status */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
        <div className="flex items-center gap-2 bg-[#202124]/80 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs font-medium text-white max-w-[85%] border border-white/10 shadow-sm">
          {/* Speaking Wave or Muted Mic */}
          {isMicMuted ? (
            <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center shrink-0">
              <MicOff className="w-2.5 h-2.5 text-white" />
            </div>
          ) : isSpeaking ? (
            <div className="flex items-center gap-0.5 shrink-0 text-emerald-400">
              <Volume2 className="w-3.5 h-3.5 animate-pulse" />
            </div>
          ) : null}

          <span className="truncate">
            {displayName} {isLocal && '(You)'}
          </span>
        </div>
      </div>
    </div>
  );
};
