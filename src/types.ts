export interface LiveKitStatus {
  configured: boolean;
  livekitUrl: string;
  hasApiKey: boolean;
  hasApiSecret: boolean;
  hasGeminiKey?: boolean;
}

export interface TokenResponse {
  token: string;
  livekitUrl: string;
  roomName: string;
  participantName: string;
  identity: string;
}

export interface ChatMessage {
  id: string;
  senderName: string;
  senderId: string;
  text: string;
  timestamp: number;
  isLocal: boolean;
}

export interface FloatingReaction {
  id: string;
  emoji: string;
  senderName: string;
  x: number;
}

export interface BreakoutRoomDefinition {
  id: string;
  name: string;
  livekitRoomName: string;
  assignedParticipantIdentities: string[];
}

export interface BreakoutSessionState {
  id: string;
  mainRoomCode: string;
  hostIdentity: string;
  status: 'idle' | 'active' | 'closing' | 'ended';
  rooms: BreakoutRoomDefinition[];
  durationMinutes: number;
  endsAt?: number;
  broadcastMessage?: string;
  createdAt: number;
}

export type WhiteboardTool =
  | 'pen'
  | 'highlighter'
  | 'eraser'
  | 'rectangle'
  | 'circle'
  | 'line'
  | 'arrow'
  | 'text';

export type WhiteboardBackground = 'blank' | 'dots' | 'grid' | 'ruled' | 'dark';

export interface WhiteboardStroke {
  id: string;
  tool: WhiteboardTool;
  color: string;
  size: number;
  points: { x: number; y: number }[]; // Normalized coordinates 0.0 - 1.0
  text?: string;
  isFilled?: boolean;
  authorName?: string;
  authorId?: string;
  timestamp: number;
}

export interface RemoteCursor {
  identity: string;
  name: string;
  x: number; // Normalized coordinates 0.0 - 1.0
  y: number;
  color: string;
  tool: WhiteboardTool;
  lastActive: number;
}
