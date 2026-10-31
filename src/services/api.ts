import { LiveKitStatus, TokenResponse } from '../types';

/**
 * Generate a random Google Meet-like room code formatted as 'xxx-yyyy-zzz'
 */
export function generateRoomCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const part1 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const part3 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${part1}-${part2}-${part3}`;
}

/**
 * Clean user-provided room string into standard alphanumeric slug
 */
export function sanitizeRoomCode(input: string): string {
  if (!input) return '';
  // If user pasted a full URL, extract the room code
  try {
    if (input.includes('://')) {
      const parsed = new URL(input);
      const queryRoom = parsed.searchParams.get('room');
      if (queryRoom) return queryRoom.toLowerCase().trim();
      const pathParts = parsed.pathname.split('/').filter(Boolean);
      if (pathParts.length > 0) return pathParts[pathParts.length - 1].toLowerCase().trim();
    }
  } catch {
    // fallback to regex
  }

  // Remove unwanted punctuation except hyphens
  return input.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
}

/**
 * Fetch configuration status from backend
 */
export async function getLiveKitStatus(): Promise<LiveKitStatus> {
  try {
    const res = await fetch('/api/livekit/status');
    if (!res.ok) {
      throw new Error(`Failed to fetch status: ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    console.warn('LiveKit status check failed:', err);
    return {
      configured: false,
      livekitUrl: '',
      hasApiKey: false,
      hasApiSecret: false,
    };
  }
}

/**
 * Save LiveKit configuration to backend
 */
export async function saveLiveKitConfig(config: {
  livekitUrl: string;
  apiKey: string;
  apiSecret: string;
}): Promise<{ success: boolean; message: string; configured: boolean; livekitUrl: string }> {
  const res = await fetch('/api/livekit/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to save configuration');
  }

  return data;
}

/**
 * Request Access Token from backend API
 */
export async function getMeetingToken(params: {
  roomName: string;
  participantName: string;
  identity?: string;
}): Promise<TokenResponse> {
  const res = await fetch('/api/livekit/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!res.ok) {
    const errorMsg = data.error || 'Failed to generate meeting token';
    const err = new Error(errorMsg) as Error & { needsConfig?: boolean };
    err.needsConfig = data.needsConfig;
    throw err;
  }

  return data;
}

/**
 * Transcribe recorded audio using Gemini audio transcription API (gemini-3.5-transcribe)
 */
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const arrayBuffer = await audioBlob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64Audio = btoa(binary);

  const res = await fetch('/api/ai/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      audioData: base64Audio,
      mimeType: audioBlob.type || 'audio/webm',
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to transcribe audio');
  }

  return data.transcription || '';
}
