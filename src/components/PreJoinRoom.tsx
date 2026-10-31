import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Copy,
  Check,
  ArrowLeft,
  Volume2,
  AlertTriangle,
  MonitorUp,
  Settings,
  Sparkles,
  User,
} from 'lucide-react';
import { LiveKitStatus } from '../types';
import { BlurLevel } from '../services/videoProcessor';

interface PreJoinRoomProps {
  roomCode: string;
  initialName?: string;
  onJoin: (params: {
    participantName: string;
    initialVideo: boolean;
    initialAudio: boolean;
    startWithScreenShare?: boolean;
    initialBlur?: BlurLevel;
  }) => void;
  onBack: () => void;
  status: LiveKitStatus | null;
  onOpenSettings: () => void;
}

export const PreJoinRoom: React.FC<PreJoinRoomProps> = ({
  roomCode,
  initialName = '',
  onJoin,
  onBack,
  status,
  onOpenSettings,
}) => {
  const [participantName, setParticipantName] = useState(() => {
    return initialName || localStorage.getItem('meet_participant_name') || '';
  });
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [prejoinBlur, setPrejoinBlur] = useState<BlurLevel>('off');
  const [copied, setCopied] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const fullMeetingLink = `${window.location.origin}?room=${roomCode}`;

  // Initialize preview stream
  useEffect(() => {
    let active = true;

    async function setupPreviewMedia() {
      try {
        setMediaError(null);
        // Request user media
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Set up audio meter
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            const audioCtx = new AudioContextClass();
            audioContextRef.current = audioCtx;
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 64;
            const source = audioCtx.createMediaStreamSource(stream);
            source.connect(analyser);

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const checkAudio = () => {
              if (!active) return;
              analyser.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
              }
              const average = sum / dataArray.length;
              // Map 0-255 to 0-100
              const normalized = Math.min(100, Math.round((average / 128) * 100));
              setAudioLevel(normalized);
              animationFrameRef.current = requestAnimationFrame(checkAudio);
            };
            checkAudio();
          }
        } catch (audioErr) {
          console.warn('Audio metering unavailable:', audioErr);
        }
      } catch (err: any) {
        console.warn('Could not acquire camera/microphone preview:', err);
        setMediaError(
          err.name === 'NotAllowedError'
            ? 'Camera/microphone access was denied. Please allow permissions in browser settings.'
            : 'Camera or microphone device not detected.'
        );
      }
    }

    setupPreviewMedia();

    return () => {
      active = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Update track enabled state when toggled
  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = videoEnabled;
      });
    }
  }, [videoEnabled]);

  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = audioEnabled;
      });
    }
  }, [audioEnabled]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(fullMeetingLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = (startWithScreen = false) => {
    const finalName = participantName.trim() || 'Guest Participant';
    localStorage.setItem('meet_participant_name', finalName);

    // Stop local preview stream so LiveKit can acquire hardware exclusive lock if needed
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }

    onJoin({
      participantName: finalName,
      initialVideo: videoEnabled,
      initialAudio: audioEnabled,
      startWithScreenShare: startWithScreen,
      initialBlur: prejoinBlur,
    });
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col justify-between">
      {/* Top Bar */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-xs font-mono text-gray-700">
            <span>Room: {roomCode}</span>
          </div>
          <button
            onClick={onOpenSettings}
            className="p-2 text-gray-500 hover:text-gray-800 rounded-full hover:bg-gray-100 transition-colors"
            title="LiveKit Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Preview Container */}
      <div className="max-w-5xl mx-auto px-4 py-8 w-full my-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Video Preview Tile */}
          <div className="lg:col-span-7 flex flex-col items-center">
            <div className="relative w-full max-w-lg aspect-[16/10] bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-gray-800 flex items-center justify-center">
              {/* Actual Video Element */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover scale-x-[-1] transition-all duration-300 ${
                  videoEnabled && !mediaError ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'
                } ${
                  prejoinBlur === 'heavy'
                    ? 'filter blur-sm scale-105'
                    : prejoinBlur === 'slight'
                    ? 'filter blur-[2px] scale-105'
                    : ''
                }`}
              />

              {/* Video Off Fallback Avatar */}
              {(!videoEnabled || mediaError) && (
                <div className="flex flex-col items-center gap-3 text-white">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-3xl font-semibold shadow-lg">
                    {participantName ? participantName.charAt(0).toUpperCase() : <User className="w-10 h-10" />}
                  </div>
                  <p className="text-xs text-gray-400">Camera is turned off</p>
                </div>
              )}

              {/* Blur status badge */}
              {videoEnabled && !mediaError && prejoinBlur !== 'off' && (
                <div className="absolute top-3 left-3 bg-blue-600/90 text-white text-[10px] font-medium px-2.5 py-1 rounded-full flex items-center gap-1 z-10 shadow">
                  <Sparkles className="w-3 h-3" />
                  <span>Blur: {prejoinBlur === 'heavy' ? 'Heavy' : 'Slight'}</span>
                </div>
              )}

              {/* Top Warning Overlay if Media Blocked */}
              {mediaError && (
                <div className="absolute top-3 inset-x-3 bg-red-950/80 border border-red-800/80 rounded-lg p-2.5 text-xs text-red-200 flex items-center gap-2 backdrop-blur-sm">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                  <span className="truncate">{mediaError}</span>
                </div>
              )}

              {/* Bottom Preview Controls Overlay */}
              <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-3 z-10">
                {/* Mic toggle */}
                <button
                  type="button"
                  onClick={() => setAudioEnabled(!audioEnabled)}
                  className={`p-3.5 rounded-full transition-all shadow-md ${
                    audioEnabled
                      ? 'bg-white/20 hover:bg-white/30 text-white backdrop-blur-md'
                      : 'bg-red-500 hover:bg-red-600 text-white'
                  }`}
                  title={audioEnabled ? 'Turn off microphone' : 'Turn on microphone'}
                >
                  {audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                </button>

                {/* Camera toggle */}
                <button
                  type="button"
                  onClick={() => setVideoEnabled(!videoEnabled)}
                  className={`p-3.5 rounded-full transition-all shadow-md ${
                    videoEnabled
                      ? 'bg-white/20 hover:bg-white/30 text-white backdrop-blur-md'
                      : 'bg-red-500 hover:bg-red-600 text-white'
                  }`}
                  title={videoEnabled ? 'Turn off camera' : 'Turn on camera'}
                >
                  {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                </button>

                {/* Background blur toggle */}
                <button
                  type="button"
                  onClick={() =>
                    setPrejoinBlur(
                      prejoinBlur === 'off' ? 'slight' : prejoinBlur === 'slight' ? 'heavy' : 'off'
                    )
                  }
                  className={`p-3.5 rounded-full transition-all shadow-md ${
                    prejoinBlur !== 'off'
                      ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-300'
                      : 'bg-white/20 hover:bg-white/30 text-white backdrop-blur-md'
                  }`}
                  title={`Background blur: ${
                    prejoinBlur === 'off' ? 'Off' : prejoinBlur === 'slight' ? 'Slight' : 'Heavy'
                  }`}
                >
                  <Sparkles className="w-5 h-5" />
                </button>
              </div>

              {/* Audio meter indicator */}
              {audioEnabled && !mediaError && (
                <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-2.5 py-1.5 rounded-full border border-white/10 text-white">
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  <div className="w-12 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 transition-all duration-75 rounded-full"
                      style={{ width: `${Math.max(5, audioLevel)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <p className="text-xs text-gray-500 mt-3 text-center">
              You can adjust audio and video settings anytime during the call
            </p>
          </div>

          {/* Right Column: Name Input & Join Action */}
          <div className="lg:col-span-5 space-y-6">
            <div>
              <h2 className="text-2xl font-normal text-gray-900 tracking-tight">Ready to join?</h2>
              <p className="text-sm text-gray-500 mt-1">No one else is here yet (or participants are waiting)</p>
            </div>

            {/* LiveKit Cloud Status alert if unconfigured */}
            {!status?.configured && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1.5">
                <div className="flex items-center gap-1.5 font-semibold text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>LiveKit Cloud Credentials Needed</span>
                </div>
                <p className="text-amber-700">
                  You need to provide your LiveKit Cloud URL &amp; Keys to establish real-time connections.
                </p>
                <button
                  onClick={onOpenSettings}
                  className="font-semibold text-blue-700 hover:underline"
                >
                  Configure LiveKit Cloud &rarr;
                </button>
              </div>
            )}

            {/* Name Input */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
                What&apos;s your name?
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={participantName}
                  onChange={(e) => setParticipantName(e.target.value)}
                  placeholder="Your display name"
                  className="w-full pl-10 pr-4 py-3 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  autoFocus
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={() => handleSubmit(false)}
                className="w-full py-3 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm shadow-sm transition-all hover:shadow active:scale-[0.99] flex items-center justify-center gap-2"
              >
                <span>Join now</span>
              </button>

              <button
                type="button"
                onClick={() => handleSubmit(true)}
                className="w-full py-3 px-6 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium text-sm transition-colors flex items-center justify-center gap-2"
              >
                <MonitorUp className="w-4 h-4 text-gray-600" />
                <span>Present</span>
              </button>
            </div>

            {/* Share Meeting Info */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
                <span>Meeting link</span>
                <span>Room: {roomCode}</span>
              </div>
              <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-200">
                <span className="text-xs font-mono text-gray-700 truncate flex-1 pl-1">
                  {fullMeetingLink}
                </span>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="p-1.5 text-gray-600 hover:text-blue-600 rounded hover:bg-gray-100 transition-colors flex items-center gap-1 text-xs font-medium"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600 font-semibold">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="py-4 text-center text-xs text-gray-400 border-t border-gray-100">
        LiveKit WebRTC Cloud • High Definition Audio &amp; Video
      </div>
    </div>
  );
};
