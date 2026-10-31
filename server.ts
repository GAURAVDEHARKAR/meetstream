import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { AccessToken } from 'livekit-server-sdk';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

// Increase json body size limit for base64 audio transcription uploads
app.use(express.json({ limit: '25mb' }));

// Initialize Gemini API client on server-side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// In-memory runtime overrides (can be updated via UI setup if not initially in .env)
let runtimeConfig = {
  livekitUrl: process.env.LIVEKIT_URL || '',
  apiKey: process.env.LIVEKIT_API_KEY || '',
  apiSecret: process.env.LIVEKIT_API_SECRET || '',
};

// Helper to get active configuration
function getConfig() {
  return {
    livekitUrl: (runtimeConfig.livekitUrl || process.env.LIVEKIT_URL || '').trim(),
    apiKey: (runtimeConfig.apiKey || process.env.LIVEKIT_API_KEY || '').trim(),
    apiSecret: (runtimeConfig.apiSecret || process.env.LIVEKIT_API_SECRET || '').trim(),
  };
}

// 1. Get LiveKit configuration status
app.get('/api/livekit/status', (req, res) => {
  const config = getConfig();
  const isConfigured = Boolean(config.livekitUrl && config.apiKey && config.apiSecret);
  
  res.json({
    configured: isConfigured,
    livekitUrl: config.livekitUrl ? config.livekitUrl.replace(/(wss?:\/\/)([^.@]+)@?/i, '$1') : '',
    hasApiKey: Boolean(config.apiKey),
    hasApiSecret: Boolean(config.apiSecret),
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

// 2. Save or update LiveKit credentials at runtime
app.post('/api/livekit/config', (req, res) => {
  try {
    const { livekitUrl, apiKey, apiSecret } = req.body;

    if (!livekitUrl || !apiKey || !apiSecret) {
      return res.status(400).json({ error: 'LiveKit URL, API Key, and API Secret are required.' });
    }

    const cleanUrl = livekitUrl.trim();
    const cleanApiKey = apiKey.trim();
    const cleanApiSecret = apiSecret.trim();

    runtimeConfig = {
      livekitUrl: cleanUrl,
      apiKey: cleanApiKey,
      apiSecret: cleanApiSecret,
    };

    // Attempt to persist to .env file
    try {
      const envPath = path.resolve(__dirname, '.env');
      let envContent = '';
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
      }

      const updateOrAddKey = (text: string, key: string, value: string) => {
        const regex = new RegExp(`^${key}=.*$`, 'm');
        if (regex.test(text)) {
          return text.replace(regex, `${key}="${value}"`);
        }
        return `${text}\n${key}="${value}"`;
      };

      envContent = updateOrAddKey(envContent, 'LIVEKIT_URL', cleanUrl);
      envContent = updateOrAddKey(envContent, 'LIVEKIT_API_KEY', cleanApiKey);
      envContent = updateOrAddKey(envContent, 'LIVEKIT_API_SECRET', cleanApiSecret);

      fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf8');
    } catch (fsErr) {
      console.warn('Could not persist to .env file, retained in memory:', fsErr);
    }

    res.json({
      success: true,
      message: 'LiveKit configuration updated successfully.',
      configured: true,
      livekitUrl: cleanUrl,
    });
  } catch (err: any) {
    console.error('Error saving LiveKit configuration:', err);
    res.status(500).json({ error: err.message || 'Failed to update configuration' });
  }
});

// 3. Generate LiveKit Access Token
app.post('/api/livekit/token', async (req, res) => {
  try {
    const { roomName, participantName, identity } = req.body;

    if (!roomName || typeof roomName !== 'string') {
      return res.status(400).json({ error: 'Meeting Room Name is required.' });
    }

    if (!participantName || typeof participantName !== 'string') {
      return res.status(400).json({ error: 'Participant Name is required.' });
    }

    const config = getConfig();

    if (!config.livekitUrl || !config.apiKey || !config.apiSecret) {
      return res.status(503).json({
        error: 'LiveKit is not configured. Please supply LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET.',
        needsConfig: true,
      });
    }

    // Clean and validate inputs
    const cleanRoomName = roomName.trim().replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
    const cleanParticipantName = participantName.trim();
    const participantIdentity =
      (identity && typeof identity === 'string' && identity.trim()) ||
      `user_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Create Access Token using livekit-server-sdk
    const at = new AccessToken(config.apiKey, config.apiSecret, {
      identity: participantIdentity,
      name: cleanParticipantName,
      // 24 hours token TTL
      ttl: 24 * 60 * 60,
    });

    // Grant room permissions
    at.addGrant({
      room: cleanRoomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();

    res.json({
      token,
      livekitUrl: config.livekitUrl,
      roomName: cleanRoomName,
      participantName: cleanParticipantName,
      identity: participantIdentity,
    });
  } catch (err: any) {
    console.error('Failed to generate token:', err);
    res.status(500).json({ error: err.message || 'Failed to generate token' });
  }
});

// 4. Audio Transcription API using Gemini (gemini-3.5-transcribe)
app.post('/api/ai/transcribe', async (req, res) => {
  try {
    const { audioData, mimeType } = req.body;

    if (!audioData) {
      return res.status(400).json({ error: 'Audio data is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not configured on the server.',
      });
    }

    const audioPart = {
      inlineData: {
        mimeType: mimeType || 'audio/webm',
        data: audioData,
      },
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [
          audioPart,
          { text: 'Transcribe this audio accurately. Return only the transcription text.' },
        ],
      },
    });

    const transcription = response.text || '';
    res.json({ transcription: transcription.trim() });
  } catch (err: any) {
    console.error('Audio transcription error:', err);
    res.status(500).json({ error: err.message || 'Failed to transcribe audio' });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const server = http.createServer(app);

  // Setup WebSocket server for Gemini Live Voice API (gemini-3.8-live)
  const wss = new WebSocketServer({ server, path: '/ws/live' });

  wss.on('connection', async (clientWs: WebSocket) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        clientWs.send(JSON.stringify({ error: 'GEMINI_API_KEY is not set on the server.' }));
        clientWs.close();
        return;
      }

      // Connect to Gemini 3.8 Live API
      const session = await ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction:
            'You are Gemini Live Voice Assistant participating in a real-time video meeting. Keep answers concise, natural, friendly, and conversational. Help the user with meeting summaries, questions, or ideas.',
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            for (const part of message.serverContent?.modelTurn?.parts ?? []) {
              if (part.inlineData?.data) {
                // Send 24kHz audio chunk back to client
                if (clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(JSON.stringify({ audio: part.inlineData.data }));
                }
              }
              if (part.text) {
                if (clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(JSON.stringify({ text: part.text }));
                }
              }
            }
            if (message.serverContent?.interrupted) {
              if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(JSON.stringify({ interrupted: true }));
              }
            }
            if (message.serverContent?.turnComplete) {
              if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(JSON.stringify({ turnComplete: true }));
              }
            }
          },
          onclose: () => {
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ closed: true }));
            }
          },
        },
      });

      clientWs.on('message', (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.audio) {
            // Stream 16kHz PCM audio chunk to Gemini Live
            session.sendRealtimeInput({
              audio: { data: parsed.audio, mimeType: 'audio/pcm;rate=16000' },
            });
          }
        } catch (err) {
          console.error('Error handling live client message:', err);
        }
      });

      clientWs.on('close', () => {
        try {
          session.close();
        } catch {}
      });
    } catch (err: any) {
      console.error('Failed to connect to Gemini Live session:', err);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(
          JSON.stringify({ error: err.message || 'Failed to start Gemini Live session' })
        );
        clientWs.close();
      }
    }
  });

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  server.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
