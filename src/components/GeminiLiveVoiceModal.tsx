import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, MicOff, Volume2, Sparkles, Loader2, AlertCircle } from 'lucide-react';

interface GeminiLiveVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Convert Float32Array PCM to 16-bit PCM base64 string
function pcmFloat32ToBase64(float32Array: Float32Array): string {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const uint8 = new Uint8Array(int16Array.buffer);
  let binary = '';
  for (let i = 0; i < uint8.byteLength; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  return btoa(binary);
}

// Convert base64 24kHz 16-bit PCM to AudioBuffer
function base64PcmToAudioBuffer(
  audioCtx: AudioContext,
  base64: string,
  sampleRate = 24000
): AudioBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const int16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / 32768.0;
  }
  const buffer = audioCtx.createBuffer(1, float32.length, sampleRate);
  buffer.copyToChannel(float32, 0);
  return buffer;
}

export const GeminiLiveVoiceModal: React.FC<GeminiLiveVoiceModalProps> = ({ isOpen, onClose }) => {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'speaking' | 'listening' | 'error'>('connecting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [transcriptSnippets, setTranscriptSnippets] = useState<string[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scheduledTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setStatus('connecting');
    setErrorMessage(null);
    setTranscriptSnippets([]);

    async function initLiveVoice() {
      try {
        // Setup WebSocket
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/live`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        // Output AudioContext at 24kHz for Gemini Live model audio
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const outputCtx = new AudioCtx({ sampleRate: 24000 });
        outputAudioCtxRef.current = outputCtx;
        scheduledTimeRef.current = outputCtx.currentTime;

        // Input AudioContext at 16kHz for mic input streaming
        const inputCtx = new AudioCtx({ sampleRate: 16000 });
        inputAudioCtxRef.current = inputCtx;

        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = micStream;

        const source = inputCtx.createMediaStreamSource(micStream);
        // ScriptProcessor captures 16kHz PCM chunks
        const processor = inputCtx.createScriptProcessor(2048, 1, 1);
        source.connect(processor);
        processor.connect(inputCtx.destination);

        processor.onaudioprocess = (e) => {
          if (!isMounted || isMicMuted || ws.readyState !== WebSocket.OPEN) return;
          const channelData = e.inputBuffer.getChannelData(0);
          const base64Audio = pcmFloat32ToBase64(channelData);
          ws.send(JSON.stringify({ audio: base64Audio }));
        };

        ws.onopen = () => {
          if (!isMounted) return;
          setStatus('listening');
        };

        ws.onmessage = async (event) => {
          if (!isMounted) return;
          try {
            const data = JSON.parse(event.data);
            if (data.error) {
              setErrorMessage(data.error);
              setStatus('error');
              return;
            }

            if (data.interrupted) {
              // Clear currently scheduled audio playback
              activeSourcesRef.current.forEach((src) => {
                try {
                  src.stop();
                } catch {}
              });
              activeSourcesRef.current = [];
              scheduledTimeRef.current = outputCtx.currentTime;
              setStatus('listening');
            }

            if (data.text) {
              setTranscriptSnippets((prev) => [...prev.slice(-4), data.text]);
            }

            if (data.audio) {
              setStatus('speaking');
              const buffer = base64PcmToAudioBuffer(outputCtx, data.audio, 24000);
              const sourceNode = outputCtx.createBufferSource();
              sourceNode.buffer = buffer;
              sourceNode.connect(outputCtx.destination);

              const now = outputCtx.currentTime;
              const startTime = Math.max(now, scheduledTimeRef.current);
              sourceNode.start(startTime);
              scheduledTimeRef.current = startTime + buffer.duration;

              activeSourcesRef.current.push(sourceNode);
              sourceNode.onended = () => {
                activeSourcesRef.current = activeSourcesRef.current.filter((s) => s !== sourceNode);
                if (activeSourcesRef.current.length === 0) {
                  setStatus('listening');
                }
              };
            }
          } catch (err) {
            console.error('Error handling live audio response:', err);
          }
        };

        ws.onerror = () => {
          if (!isMounted) return;
          setErrorMessage('Could not establish connection to Gemini Live server.');
          setStatus('error');
        };

        ws.onclose = () => {
          if (!isMounted) return;
        };
      } catch (err: any) {
        if (!isMounted) return;
        setErrorMessage(err.message || 'Microphone access or live connection error');
        setStatus('error');
      }
    }

    initLiveVoice();

    return () => {
      isMounted = false;
      if (wsRef.current) wsRef.current.close();
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (inputAudioCtxRef.current) inputAudioCtxRef.current.close().catch(() => {});
      if (outputAudioCtxRef.current) outputAudioCtxRef.current.close().catch(() => {});
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-[#202124] text-white rounded-3xl shadow-2xl border border-white/10 overflow-hidden flex flex-col items-center p-6 text-center space-y-6">
        {/* Top Header */}
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-semibold text-gray-200">Gemini 3.8 Live Voice</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Animated AI Voice Orb */}
        <div className="relative my-4 flex items-center justify-center">
          <div
            className={`w-36 h-36 rounded-full flex items-center justify-center transition-all duration-500 ${
              status === 'speaking'
                ? 'bg-gradient-to-tr from-blue-500 via-indigo-500 to-teal-400 shadow-[0_0_50px_rgba(99,102,241,0.6)] scale-105 animate-pulse'
                : status === 'listening'
                ? 'bg-gradient-to-tr from-blue-600/40 via-indigo-600/40 to-slate-700/60 ring-4 ring-blue-500/30'
                : 'bg-gray-800'
            }`}
          >
            {status === 'connecting' ? (
              <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />
            ) : status === 'speaking' ? (
              <Volume2 className="w-14 h-14 text-white animate-bounce" />
            ) : status === 'listening' ? (
              <Mic className="w-12 h-12 text-blue-300" />
            ) : (
              <AlertCircle className="w-12 h-12 text-red-400" />
            )}
          </div>
        </div>

        {/* Status text */}
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-white">
            {status === 'connecting' && 'Connecting to Gemini Live...'}
            {status === 'listening' && 'Listening... Speak naturally'}
            {status === 'speaking' && 'Gemini is speaking...'}
            {status === 'error' && 'Connection Error'}
          </h3>
          <p className="text-xs text-gray-400 max-w-xs mx-auto">
            {status === 'listening' && 'Ask meeting questions, brainstorm ideas, or ask for a recap in real time.'}
            {status === 'speaking' && 'You can interrupt Gemini anytime simply by speaking.'}
            {status === 'error' && errorMessage}
          </p>
        </div>

        {/* Live spoken preview snippets */}
        {transcriptSnippets.length > 0 && (
          <div className="w-full p-3 bg-white/5 rounded-xl border border-white/5 text-xs text-blue-200 text-left max-h-24 overflow-y-auto">
            {transcriptSnippets.map((snip, i) => (
              <span key={i} className="inline block mr-1">
                {snip}
              </span>
            ))}
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => setIsMicMuted(!isMicMuted)}
            className={`p-3.5 rounded-full transition-all ${
              isMicMuted
                ? 'bg-red-500 text-white'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            title={isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-full shadow transition-colors"
          >
            End Conversation
          </button>
        </div>
      </div>
    </div>
  );
};
