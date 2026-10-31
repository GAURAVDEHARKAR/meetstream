import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  MessageSquare,
  Loader2,
  Sparkles,
  Mic,
  Square,
  Smile,
  Copy,
  Check,
  Volume2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { useChat, useLocalParticipant } from '@livekit/components-react';
import { transcribeAudio } from '../services/api';

interface ChatPanelProps {
  onClose: () => void;
  onMessageReceived?: () => void;
}

const QUICK_EMOJIS = ['👍', '👏', '❤️', '😂', '🎉', '🔥', '💡', '✅'];

export const ChatPanel: React.FC<ChatPanelProps> = ({ onClose, onMessageReceived }) => {
  const { chatMessages, send, isSending } = useChat();
  const { localParticipant } = useLocalParticipant();

  const [inputText, setInputText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Audio recording & Gemini transcription state
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribeError, setTranscribeError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(chatMessages.length);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (chatMessages.length > prevCountRef.current) {
      onMessageReceived?.();
    }
    prevCountRef.current = chatMessages.length;
  }, [chatMessages, onMessageReceived]);

  // Clean up any active recording on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (recordingStreamRef.current) {
        recordingStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || isSending) return;

    try {
      setInputText('');
      await send(text);
      inputRef.current?.focus();
    } catch (err) {
      console.error('Failed to send chat message:', err);
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const insertEmoji = (emoji: string) => {
    setInputText((prev) => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  // Start microphone recording for Gemini Audio Transcription
  const handleStartRecording = async () => {
    try {
      setTranscribeError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingStreamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '',
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType || 'audio/webm',
        });

        // Release hardware mic track
        stream.getTracks().forEach((t) => t.stop());

        if (audioBlob.size > 0) {
          await processTranscription(audioBlob);
        }
      };

      mediaRecorder.start(250);
      setIsRecordingAudio(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Failed to access microphone for recording:', err);
      setTranscribeError(
        err.name === 'NotAllowedError'
          ? 'Microphone permission denied. Allow mic access in browser settings.'
          : 'Could not access microphone.'
      );
    }
  };

  // Stop recording and send to Gemini 3.5 Transcribe
  const handleStopRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecordingAudio(false);
  };

  const handleCancelRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (recordingStreamRef.current) {
      recordingStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    audioChunksRef.current = [];
    setIsRecordingAudio(false);
    setRecordingSeconds(0);
  };

  const processTranscription = async (blob: Blob) => {
    try {
      setIsTranscribing(true);
      setTranscribeError(null);

      const text = await transcribeAudio(blob);

      if (text) {
        setInputText((prev) => (prev ? `${prev} ${text}` : text));
      } else {
        setTranscribeError('No clear speech detected in audio.');
      }
    } catch (err: any) {
      console.error('Transcription failed:', err);
      setTranscribeError(err.message || 'Transcription failed. Please check Gemini API key.');
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <div className="w-full sm:w-80 md:w-96 bg-[#202124] text-white h-full border-l border-white/10 flex flex-col z-30 shadow-2xl animate-fade-in select-none">
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-[#8ab4f8] flex items-center justify-center">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-100">In-call messages</h3>
            <p className="text-[10px] text-gray-400">LiveKit Real-time Chat</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          title="Close chat"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Notice Banner */}
      <div className="bg-[#2d3033]/80 px-4 py-2 border-b border-white/5 text-[11px] text-gray-300 flex items-start gap-2">
        <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
        <span className="leading-snug">
          Messages can only be seen by people in the call and disappear when the call ends.
        </span>
      </div>

      {/* Transcription Error Alert */}
      {transcribeError && (
        <div className="mx-3 mt-2 p-2.5 bg-red-950/70 border border-red-800/80 rounded-xl text-xs text-red-200 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-[11px]">
            <span>{transcribeError}</span>
          </div>
          <button
            onClick={() => setTranscribeError(null)}
            className="text-red-400 hover:text-white text-xs"
          >
            &times;
          </button>
        </div>
      )}

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 select-text">
        {chatMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-200">No messages yet</p>
              <p className="text-xs text-gray-400 max-w-[210px] leading-relaxed">
                Send a message or use voice transcription to share notes with everyone in this call.
              </p>
            </div>
          </div>
        ) : (
          chatMessages.map((msg, idx) => {
            const isLocal = msg.from?.identity === localParticipant.identity;
            const senderName = msg.from?.name || msg.from?.identity || 'Participant';
            const initial = senderName.charAt(0).toUpperCase();
            const messageId = msg.id || `${msg.timestamp}_${idx}`;
            const timeStr = new Date(msg.timestamp).toLocaleTimeString([], {
              hour: 'numeric',
              minute: '2-digit',
            });

            return (
              <div
                key={messageId}
                className={`group flex flex-col ${isLocal ? 'items-end' : 'items-start'}`}
              >
                {/* Sender & Timestamp */}
                <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px]">
                  {!isLocal && (
                    <span className="w-4 h-4 rounded-full bg-blue-600/40 text-[9px] text-blue-200 flex items-center justify-center font-bold">
                      {initial}
                    </span>
                  )}
                  <span className="font-semibold text-gray-300">
                    {isLocal ? 'You' : senderName}
                  </span>
                  <span className="text-[10px] text-gray-500">{timeStr}</span>
                </div>

                {/* Message Bubble + Copy Action on hover */}
                <div className="relative group/bubble max-w-[85%]">
                  <div
                    className={`px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed break-words shadow-sm ${
                      isLocal
                        ? 'bg-blue-600 text-white rounded-br-xs'
                        : 'bg-[#3c4043] text-gray-100 rounded-bl-xs'
                    }`}
                  >
                    {msg.message}
                  </div>

                  {/* Copy button on hover */}
                  <button
                    onClick={() => handleCopyMessage(messageId, msg.message)}
                    className="absolute -top-2.5 -right-2 p-1 rounded-md bg-[#282a2d] border border-white/20 text-gray-300 hover:text-white opacity-0 group-hover/bubble:opacity-100 transition-opacity shadow"
                    title="Copy message"
                  >
                    {copiedId === messageId ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Audio Recording Active Floating Strip */}
      {isRecordingAudio && (
        <div className="mx-3 mb-2 p-3 bg-red-950/80 border border-red-800 rounded-2xl flex items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <span className="text-xs font-semibold text-red-200">
              Recording audio: {recordingSeconds}s
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancelRecording}
              className="px-2.5 py-1 text-xs text-gray-300 hover:text-white rounded hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleStopRecording}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>Transcribe</span>
            </button>
          </div>
        </div>
      )}

      {/* Transcribing Loader State */}
      {isTranscribing && (
        <div className="mx-3 mb-2 p-2.5 bg-blue-950/70 border border-blue-800/80 rounded-xl flex items-center gap-2 text-xs text-blue-200">
          <Loader2 className="w-4 h-4 animate-spin text-blue-400 shrink-0" />
          <span>Transcribing voice with Gemini (gemini-3.5-transcribe)...</span>
        </div>
      )}

      {/* Bottom Input Area */}
      <div className="p-3 border-t border-white/10 bg-[#282a2d] space-y-2">
        {/* Emoji Quick Picker Strip (when open) */}
        {showEmojiPicker && (
          <div className="flex items-center gap-1.5 p-1.5 bg-[#3c4043] rounded-xl border border-white/10 overflow-x-auto">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => insertEmoji(emoji)}
                className="w-7 h-7 rounded hover:bg-white/10 text-base flex items-center justify-center hover:scale-110 transition-transform"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSend} className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-1.5 bg-[#3c4043] rounded-xl px-3 py-1.5 border border-white/5 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
            {/* Quick Emoji toggle */}
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`p-1 rounded-lg text-gray-400 hover:text-white transition-colors ${
                showEmojiPicker ? 'text-[#8ab4f8]' : ''
              }`}
              title="Add emoji"
            >
              <Smile className="w-4 h-4" />
            </button>

            {/* Input field */}
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isRecordingAudio ? 'Recording audio...' : 'Send a message to everyone'}
              disabled={isRecordingAudio || isTranscribing}
              className="flex-1 bg-transparent text-xs sm:text-sm text-white placeholder-gray-400 focus:outline-none py-1.5"
            />

            {/* Voice to Text Transcription Microphone Button */}
            {!isRecordingAudio ? (
              <button
                type="button"
                onClick={handleStartRecording}
                disabled={isTranscribing}
                className="p-1.5 rounded-lg text-gray-400 hover:text-[#8ab4f8] hover:bg-white/10 transition-colors disabled:opacity-50"
                title="Transcribe speech with Gemini (gemini-3.5-transcribe)"
              >
                <Mic className="w-4 h-4" />
              </button>
            ) : null}
          </div>

          {/* Send Message Button */}
          <button
            type="submit"
            disabled={!inputText.trim() || isSending || isRecordingAudio}
            className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-[#3c4043] disabled:text-gray-500 text-white flex items-center justify-center transition-colors shadow-sm shrink-0"
            title="Send message"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>

        <div className="flex items-center justify-between text-[10px] text-gray-500 px-1 pt-0.5">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-blue-400" />
            Gemini Audio Transcribe enabled
          </span>
          <span>Press Enter to send</span>
        </div>
      </div>
    </div>
  );
};
