import React, { useState } from 'react';
import { X, Copy, Check, ShieldCheck, Link as LinkIcon, Radio } from 'lucide-react';

interface MeetingInfoPanelProps {
  roomCode: string;
  onClose: () => void;
}

export const MeetingInfoPanel: React.FC<MeetingInfoPanelProps> = ({ roomCode, onClose }) => {
  const [copied, setCopied] = useState(false);
  const fullMeetingLink = `${window.location.origin}?room=${roomCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullMeetingLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full sm:w-80 md:w-96 bg-[#202124] text-white h-full border-l border-white/10 flex flex-col z-30 shadow-2xl animate-fade-in">
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-white/10">
        <h3 className="text-base font-semibold text-gray-100">Meeting details</h3>
        <button
          onClick={onClose}
          className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body */}
      <div className="p-5 space-y-6 flex-1 overflow-y-auto">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            <LinkIcon className="w-3.5 h-3.5 text-blue-400" />
            <span>Joining info</span>
          </div>
          <div className="bg-[#2d3033] p-3 rounded-xl border border-white/10 space-y-2">
            <p className="text-xs text-gray-300 break-all font-mono selection:bg-blue-600">
              {fullMeetingLink}
            </p>
            <button
              onClick={handleCopy}
              className="w-full py-2 px-3 rounded-lg bg-[#3c4043] hover:bg-[#474b50] text-xs font-semibold text-[#8ab4f8] flex items-center justify-center gap-2 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Joining info copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy joining info</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            <span>Connection Architecture</span>
          </div>
          <div className="bg-[#2d3033] p-3.5 rounded-xl border border-white/10 space-y-2 text-xs text-gray-300">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Room Name:</span>
              <span className="font-mono text-white">{roomCode}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Signaling:</span>
              <span className="text-emerald-400 font-medium">LiveKit Cloud Edge</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Media Pipeline:</span>
              <span>WebRTC SFU Forwarding</span>
            </div>
          </div>
        </div>

        <div className="p-3.5 bg-blue-950/40 border border-blue-800/40 rounded-xl text-xs text-blue-200/90 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-blue-100">End-to-End Encrypted Media</span>
            <p className="text-[11px] leading-relaxed text-blue-200/80">
              Only participants with valid cryptographically signed JWT tokens can join this meeting room.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
