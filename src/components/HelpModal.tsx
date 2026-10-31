import React from 'react';
import { X, Users, Video, ShieldCheck, ExternalLink, Copy, Check } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden text-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
              <Users className="w-4 h-4" />
            </div>
            <h2 className="text-base font-semibold text-gray-900">How to use MeetStream</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-sm">
          {/* Multi-user testing guide */}
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">
                1
              </span>
              <span>Testing with multiple participants</span>
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed pl-7">
              You can test real two-way audio and video immediately:
            </p>
            <ol className="list-disc list-inside text-xs text-gray-600 pl-7 space-y-1.5">
              <li>Start or join a meeting in this window.</li>
              <li>Copy the meeting link from the bottom toolbar or meeting info.</li>
              <li>Open a <strong>second browser window</strong> (or an <strong>Incognito tab</strong> or a phone).</li>
              <li>Paste the link, enter a different name, and join.</li>
              <li>Both participants will stream video and audio through LiveKit Cloud simultaneously!</li>
            </ol>
          </div>

          {/* Screen Sharing & Controls */}
          <div className="space-y-2 pt-2 border-t border-gray-100">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">
                2
              </span>
              <span>In-meeting features</span>
            </h3>
            <ul className="text-xs text-gray-600 pl-7 space-y-1 list-disc list-inside">
              <li><strong>Mic &amp; Camera toggles:</strong> Use toolbar or hotkeys <kbd className="px-1.5 py-0.5 bg-gray-100 border rounded text-[10px]">M</kbd> and <kbd className="px-1.5 py-0.5 bg-gray-100 border rounded text-[10px]">V</kbd>.</li>
              <li><strong>Present Screen:</strong> Click the Present icon to share your screen or application window.</li>
              <li><strong>Live Chat &amp; Reactions:</strong> Send real-time text messages and emoji reactions to all participants.</li>
              <li><strong>Pinning:</strong> Hover over any participant to pin them to the center stage.</li>
            </ul>
          </div>

          {/* LiveKit Cloud */}
          <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-600 space-y-1.5">
            <div className="flex items-center justify-between font-semibold text-gray-800">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                LiveKit Cloud WebRTC
              </span>
              <a
                href="https://cloud.livekit.io"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline flex items-center gap-1"
              >
                livekit.io <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              LiveKit SFU edge servers route video and audio packets dynamically with sub-100ms latency.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
