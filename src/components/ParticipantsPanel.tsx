import React, { useState } from 'react';
import { X, Search, Mic, MicOff, Video, VideoOff, MonitorUp, Shield, Volume2 } from 'lucide-react';
import { useParticipants, useLocalParticipant } from '@livekit/components-react';

interface ParticipantsPanelProps {
  onClose: () => void;
}

export const ParticipantsPanel: React.FC<ParticipantsPanelProps> = ({ onClose }) => {
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const [search, setSearch] = useState('');

  const filtered = participants.filter((p) => {
    const name = p.name || p.identity || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="w-full sm:w-80 md:w-96 bg-[#202124] text-white h-full border-l border-white/10 flex flex-col z-30 shadow-2xl animate-fade-in">
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-gray-100">People</h3>
          <span className="text-xs bg-[#3c4043] text-gray-300 px-2 py-0.5 rounded-full font-medium">
            {participants.length}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Search Input */}
      <div className="p-4 border-b border-white/10">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search for people"
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#2d3033] border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Participants List */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/5 p-2">
        {filtered.map((p) => {
          const isLocal = p.identity === localParticipant.identity;
          const name = p.name || p.identity || 'Participant';
          const isMicMuted = !p.isMicrophoneEnabled;
          const isCamMuted = !p.isCameraEnabled;
          const isSharing = p.isScreenShareEnabled;
          const isSpeaking = p.isSpeaking;

          return (
            <div
              key={p.identity}
              className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors"
            >
              {/* Left: Avatar & Name */}
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-9 h-9 rounded-full bg-blue-600/30 border flex items-center justify-center font-semibold text-sm text-blue-300 shrink-0 ${
                    isSpeaking ? 'border-emerald-400 ring-2 ring-emerald-400/40' : 'border-white/10'
                  }`}
                >
                  {name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-gray-200 truncate">{name}</p>
                    {isLocal && (
                      <span className="text-[10px] text-gray-400 shrink-0">(You)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {isSpeaking && (
                      <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                        <Volume2 className="w-3 h-3" /> Speaking
                      </span>
                    )}
                    {isSharing && (
                      <span className="text-[10px] text-amber-400 flex items-center gap-1">
                        <MonitorUp className="w-3 h-3" /> Presenting
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Media Track Status Icons */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Mic Icon */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center ${
                    isMicMuted ? 'text-red-400 bg-red-950/40' : 'text-gray-300 bg-white/5'
                  }`}
                  title={isMicMuted ? 'Microphone is off' : 'Microphone is on'}
                >
                  {isMicMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                </div>

                {/* Camera Icon */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center ${
                    isCamMuted ? 'text-red-400 bg-red-950/40' : 'text-gray-300 bg-white/5'
                  }`}
                  title={isCamMuted ? 'Camera is off' : 'Camera is on'}
                >
                  {isCamMuted ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-8 text-xs text-gray-400">
            No participants found matching &quot;{search}&quot;
          </div>
        )}
      </div>
    </div>
  );
};
