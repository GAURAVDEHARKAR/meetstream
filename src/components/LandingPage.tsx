import React, { useState, useRef, useEffect } from 'react';
import {
  Video,
  Keyboard,
  Link as LinkIcon,
  Plus,
  Copy,
  Check,
  ArrowRight,
  ShieldCheck,
  Users,
  MonitorUp,
  Sparkles,
  ChevronDown,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { generateRoomCode, sanitizeRoomCode } from '../services/api';
import { LiveKitStatus } from '../types';

interface LandingPageProps {
  onStartMeeting: (roomCode: string, isInstant: boolean) => void;
  status: LiveKitStatus | null;
  onOpenSettings: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartMeeting,
  status,
  onOpenSettings,
}) => {
  const [meetingInput, setMeetingInput] = useState('');
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [createdLaterLink, setCreatedLaterLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowNewMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Carousel auto-rotate
  useEffect(() => {
    const timer = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % 3);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const handleCreateInstant = () => {
    setShowNewMenu(false);
    const roomCode = generateRoomCode();
    onStartMeeting(roomCode, true);
  };

  const handleCreateForLater = () => {
    setShowNewMenu(false);
    const roomCode = generateRoomCode();
    const fullUrl = `${window.location.origin}?room=${roomCode}`;
    setCreatedLaterLink(fullUrl);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = sanitizeRoomCode(meetingInput);
    if (clean) {
      onStartMeeting(clean, false);
    }
  };

  const handleCopyLink = () => {
    if (createdLaterLink) {
      navigator.clipboard.writeText(createdLaterLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const carouselItems = [
    {
      title: 'Get a link that you can share',
      description: 'Click New meeting to get a link that you can send to people that you want to meet with.',
      badge: 'LiveKit Cloud',
      visual: (
        <div className="relative w-full h-56 bg-gradient-to-br from-blue-900 via-indigo-950 to-slate-900 rounded-2xl p-6 flex flex-col justify-between overflow-hidden shadow-inner text-white border border-blue-800/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-medium text-blue-200">LiveKit Real-time Cloud</span>
            </div>
            <span className="text-xs font-mono bg-blue-800/60 px-2 py-1 rounded">HD 1080p</span>
          </div>
          <div className="grid grid-cols-2 gap-3 my-auto">
            <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/60 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-indigo-500/30 flex items-center justify-center font-bold text-indigo-300">
                A
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-100">Alex Morgan</p>
                <p className="text-[10px] text-emerald-400">Speaking...</p>
              </div>
            </div>
            <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/60 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-teal-500/30 flex items-center justify-center font-bold text-teal-300">
                S
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-100">Sarah Chen</p>
                <p className="text-[10px] text-slate-400">Microphone on</p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-blue-200/80 pt-2 border-t border-slate-800">
            <span>Adaptive WebRTC Grid</span>
            <span className="font-mono">Global Edge Routing</span>
          </div>
        </div>
      ),
    },
    {
      title: 'Present tabs, slides & your screen',
      description: 'Share your entire screen or a specific application window during meetings with low-latency streaming.',
      badge: 'Screen Sharing',
      visual: (
        <div className="relative w-full h-56 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-6 flex flex-col justify-between overflow-hidden shadow-inner text-white border border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MonitorUp className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold text-amber-300">Screen Presentation Active</span>
            </div>
            <span className="text-[11px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/40">
              60 FPS
            </span>
          </div>
          <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800 my-auto">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <span className="text-[10px] text-slate-400 font-mono ml-2">Project Roadmap &amp; Architecture.pdf</span>
            </div>
            <div className="space-y-1.5 py-1">
              <div className="w-3/4 h-2 bg-indigo-500/40 rounded" />
              <div className="w-1/2 h-2 bg-blue-500/30 rounded" />
              <div className="w-5/6 h-2 bg-slate-700/60 rounded" />
            </div>
          </div>
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>High-definition track forwarding</span>
            <span>Ultra-low delay</span>
          </div>
        </div>
      ),
    },
    {
      title: 'Your meeting is secure & private',
      description: 'Rooms are encrypted in transit and secured with cryptographic JWT authentication tokens.',
      badge: 'Enterprise Security',
      visual: (
        <div className="relative w-full h-56 bg-gradient-to-br from-teal-950 via-slate-900 to-blue-950 rounded-2xl p-6 flex flex-col justify-between overflow-hidden shadow-inner text-white border border-teal-800/40">
          <div className="flex items-center gap-2 text-teal-300">
            <ShieldCheck className="w-5 h-5 text-teal-400" />
            <span className="text-xs font-semibold">End-to-End Media Security</span>
          </div>
          <div className="text-center my-auto space-y-2">
            <div className="w-12 h-12 mx-auto rounded-full bg-teal-500/20 border border-teal-400/40 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-teal-300" />
            </div>
            <p className="text-sm font-semibold text-white">Cryptographically Signed Access</p>
            <p className="text-xs text-teal-200/80 max-w-xs mx-auto">
              Server-generated JWT tokens prevent unauthorized room intrusion.
            </p>
          </div>
          <div className="text-[11px] text-teal-300/80 flex items-center justify-between border-t border-teal-900/60 pt-2">
            <span>LiveKit Cloud Protocol</span>
            <span className="font-mono">TLS 1.3 / DTLS-SRTP</span>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-between bg-white">
      {/* Main Hero Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16 w-full my-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left Column: Call to Action */}
          <div className="lg:col-span-7 space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200/80">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Powered by LiveKit Cloud Infrastructure</span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-normal text-gray-900 tracking-tight leading-[1.15]">
                Premium video meetings.
                <br />
                <span className="font-semibold text-blue-600">Now free for everyone.</span>
              </h1>
              <p className="text-lg text-gray-600 font-normal leading-relaxed max-w-xl">
                Start instant video meetings, invite coworkers and friends, share your screen, and collaborate in real-time with crystal-clear audio and responsive HD video.
              </p>
            </div>

            {/* LiveKit Setup Hint if unconfigured */}
            {!status?.configured && (
              <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-xl flex items-start gap-3 max-w-xl text-xs text-amber-800">
                <div className="p-1 rounded-md bg-amber-200/60 shrink-0 text-amber-900">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <span className="font-bold">LiveKit Cloud credentials not yet added</span>
                  <p className="text-amber-700">
                    To connect live two-way WebRTC video calls, connect your free project credentials in one step.
                  </p>
                  <button
                    onClick={onOpenSettings}
                    className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline pt-0.5"
                  >
                    Configure LiveKit Now <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Actions: New meeting & Join code */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2 max-w-xl">
              {/* New Meeting Dropdown Button */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowNewMenu(!showNewMenu)}
                  className="w-full sm:w-auto px-5 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-sm transition-all hover:shadow active:scale-[0.99]"
                >
                  <Video className="w-4 h-4" />
                  <span>New meeting</span>
                  <ChevronDown className="w-4 h-4 ml-0.5 opacity-80" />
                </button>

                {/* Dropdown Menu */}
                {showNewMenu && (
                  <div className="absolute left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-30 animate-fade-in text-gray-800">
                    <button
                      onClick={handleCreateForLater}
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-3 transition-colors"
                    >
                      <LinkIcon className="w-4 h-4 text-gray-500" />
                      <div>
                        <div className="font-medium text-gray-900">Create a meeting for later</div>
                        <div className="text-xs text-gray-500">Get a link you can share</div>
                      </div>
                    </button>
                    <button
                      onClick={handleCreateInstant}
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-3 transition-colors"
                    >
                      <Plus className="w-4 h-4 text-gray-500" />
                      <div>
                        <div className="font-medium text-gray-900">Start an instant meeting</div>
                        <div className="text-xs text-gray-500">Join room immediately</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* Join Input & Button */}
              <form onSubmit={handleJoin} className="flex-1 flex items-center gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Keyboard className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={meetingInput}
                    onChange={(e) => setMeetingInput(e.target.value)}
                    placeholder="Enter a code or link"
                    className="w-full pl-10 pr-3 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 placeholder:text-gray-400 bg-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!meetingInput.trim()}
                  className="px-5 py-3 rounded-lg font-medium text-sm transition-colors disabled:text-gray-400 disabled:bg-gray-100 enabled:text-blue-600 enabled:hover:bg-blue-50 enabled:hover:text-blue-700"
                >
                  Join
                </button>
              </form>
            </div>

            {/* Created For Later Popover/Card */}
            {createdLaterLink && (
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 max-w-xl space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <LinkIcon className="w-4 h-4 text-blue-600" />
                    <span>Here&apos;s your joining info</span>
                  </div>
                  <button
                    onClick={() => setCreatedLaterLink(null)}
                    className="text-xs text-gray-500 hover:text-gray-800"
                  >
                    Dismiss
                  </button>
                </div>
                <p className="text-xs text-gray-600">
                  Send this link to people you want to meet with. Be sure to save it so you can use it later, too.
                </p>
                <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-200">
                  <span className="text-xs font-mono text-gray-700 truncate flex-1 pl-1">
                    {createdLaterLink}
                  </span>
                  <button
                    onClick={handleCopyLink}
                    className="p-1.5 text-gray-500 hover:text-blue-600 rounded hover:bg-gray-100 transition-colors flex items-center gap-1 text-xs font-medium"
                    title="Copy meeting link"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span className="text-emerald-600 font-semibold">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => {
                      const clean = sanitizeRoomCode(createdLaterLink);
                      onStartMeeting(clean, false);
                    }}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    Join meeting now <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-gray-100 max-w-xl">
              <p className="text-xs text-gray-500 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Meetings are end-to-end media encrypted. Up to 100 participants per room.
                </span>
              </p>
            </div>
          </div>

          {/* Right Column: Visual Feature Showcase Carousel */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center">
            <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-xl border border-gray-100/80">
              {/* Carousel Visual */}
              <div className="transition-all duration-500 ease-in-out">
                {carouselItems[carouselIndex].visual}
              </div>

              {/* Text Info */}
              <div className="text-center mt-6 space-y-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  {carouselItems[carouselIndex].title}
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed min-h-[3rem]">
                  {carouselItems[carouselIndex].description}
                </p>
              </div>

              {/* Carousel Dots */}
              <div className="flex items-center justify-center gap-2 mt-4">
                {carouselItems.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCarouselIndex(i)}
                    className={`h-2 rounded-full transition-all ${
                      i === carouselIndex ? 'w-6 bg-blue-600' : 'w-2 bg-gray-300 hover:bg-gray-400'
                    }`}
                    aria-label={`Slide ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <footer className="border-t border-gray-100 py-6 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <span>MeetStream Video Conferencing</span>
            <span>•</span>
            <span>LiveKit Cloud WebRTC Architecture</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={onOpenSettings} className="hover:text-gray-800 transition-colors">
              Configure LiveKit
            </button>
            <a
              href="https://cloud.livekit.io"
              target="_blank"
              rel="noreferrer"
              className="hover:text-blue-600 flex items-center gap-1 transition-colors"
            >
              LiveKit Cloud <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
