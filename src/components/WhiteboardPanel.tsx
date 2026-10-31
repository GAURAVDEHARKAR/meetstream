import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useRoomContext, useLocalParticipant } from '@livekit/components-react';
import { RoomEvent } from 'livekit-client';
import {
  Pen,
  Highlighter,
  Eraser,
  Square,
  Circle,
  Minus,
  MoveRight,
  Type,
  Undo2,
  Redo2,
  Trash2,
  Download,
  Users,
  X,
  Maximize2,
  Minimize2,
  Grid,
  Sparkles,
} from 'lucide-react';
import {
  WhiteboardStroke,
  WhiteboardTool,
  WhiteboardBackground,
  RemoteCursor,
} from '../types';
import { saveWhiteboardToFirestore, loadWhiteboardFromFirestore } from '../services/whiteboardSync';

interface WhiteboardPanelProps {
  roomCode: string;
  onClose: () => void;
  isStageMode?: boolean;
  onToggleExpand?: () => void;
  isExpanded?: boolean;
}

const PALETTE = [
  { name: 'Black', value: '#1f2937' },
  { name: 'Blue', value: '#1a73e8' },
  { name: 'Red', value: '#ea4335' },
  { name: 'Green', value: '#1e8e3e' },
  { name: 'Yellow', value: '#f9ab00' },
  { name: 'Purple', value: '#9334e6' },
  { name: 'Teal', value: '#00897b' },
  { name: 'White', value: '#ffffff' },
];

const SIZES = [
  { label: 'Fine', value: 2 },
  { label: 'Medium', value: 5 },
  { label: 'Thick', value: 10 },
  { label: 'Marker', value: 18 },
];

const USER_COLORS = [
  '#f87171', '#fb923c', '#fbbf24', '#34d399', '#60a5fa', '#818cf8', '#c084fc', '#f472b6',
];

export const WhiteboardPanel: React.FC<WhiteboardPanelProps> = ({
  roomCode,
  onClose,
  isStageMode = false,
  onToggleExpand,
  isExpanded = false,
}) => {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Drawing state
  const [strokes, setStrokes] = useState<WhiteboardStroke[]>([]);
  const [redoStack, setRedoStack] = useState<WhiteboardStroke[]>([]);
  const [activeTool, setActiveTool] = useState<WhiteboardTool>('pen');
  const [activeColor, setActiveColor] = useState<string>('#1a73e8');
  const [activeSize, setActiveSize] = useState<number>(5);
  const [bgStyle, setBgStyle] = useState<WhiteboardBackground>('blank');
  const [showCursors, setShowCursors] = useState(true);

  // Active drawing in-progress
  const isDrawingRef = useRef(false);
  const currentPointsRef = useRef<{ x: number; y: number }[]>([]);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);

  // Text tool inline input state
  const [textInput, setTextInput] = useState<{
    visible: boolean;
    x: number; // percentage
    y: number; // percentage
    pixelX: number;
    pixelY: number;
    text: string;
  }>({ visible: false, x: 0, y: 0, pixelX: 0, pixelY: 0, text: '' });

  // Remote collaborative cursors
  const [remoteCursors, setRemoteCursors] = useState<Map<string, RemoteCursor>>(new Map());

  // Throttling for cursor broadcasts
  const lastCursorBroadcastRef = useRef<number>(0);
  const lastStrokeUpdateBroadcastRef = useRef<number>(0);

  // Assign a distinct color to local user for cursor display
  const localColor = useRef(
    USER_COLORS[Math.abs((localParticipant.identity || 'user').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % USER_COLORS.length]
  ).current;

  // Track strokes ref to prevent stale closures in event handlers
  const strokesRef = useRef<WhiteboardStroke[]>(strokes);
  useEffect(() => {
    strokesRef.current = strokes;
  }, [strokes]);

  // Request sync from peers or load from Firestore upon mount
  useEffect(() => {
    let isMounted = true;

    const initBoard = async () => {
      // 1. Try loading from Firestore
      const saved = await loadWhiteboardFromFirestore(roomCode);
      if (saved && saved.length > 0 && isMounted) {
        setStrokes(saved);
      }

      // 2. Broadcast sync request to connected peers in room via LiveKit
      if (room && localParticipant) {
        try {
          const req = new TextEncoder().encode(
            JSON.stringify({ type: 'WB_REQUEST_SYNC', sender: localParticipant.identity })
          );
          localParticipant.publishData(req, { reliable: true, topic: 'whiteboard' });
        } catch (e) {
          console.warn('Could not request whiteboard sync:', e);
        }
      }
    };

    initBoard();

    return () => {
      isMounted = false;
    };
  }, [roomCode, room, localParticipant]);

  // Handle incoming LiveKit data channel events
  useEffect(() => {
    if (!room) return;

    const handleDataReceived = (payload: Uint8Array, participant?: any, _kind?: any, topic?: string) => {
      if (topic === 'whiteboard') {
        try {
          const text = new TextDecoder().decode(payload);
          const data = JSON.parse(text);

          switch (data.type) {
            case 'WB_STROKE_ADDED': {
              const newStroke: WhiteboardStroke = data.stroke;
              setStrokes((prev) => {
                if (prev.some((s) => s.id === newStroke.id)) return prev;
                return [...prev, newStroke];
              });
              break;
            }

            case 'WB_CLEAR': {
              setStrokes([]);
              setRedoStack([]);
              break;
            }

            case 'WB_UNDO': {
              const strokeId = data.strokeId;
              setStrokes((prev) => prev.filter((s) => s.id !== strokeId));
              break;
            }

            case 'WB_REQUEST_SYNC': {
              // Respond to late-joiners with our current strokes snapshot
              if (strokesRef.current.length > 0 && localParticipant) {
                const response = new TextEncoder().encode(
                  JSON.stringify({
                    type: 'WB_SYNC_RESPONSE',
                    strokes: strokesRef.current,
                  })
                );
                localParticipant.publishData(response, { reliable: true, topic: 'whiteboard' });
              }
              break;
            }

            case 'WB_SYNC_RESPONSE': {
              if (Array.isArray(data.strokes) && data.strokes.length > 0) {
                setStrokes((prev) => {
                  const existingIds = new Set(prev.map((s) => s.id));
                  const merged = [...prev];
                  for (const s of data.strokes) {
                    if (!existingIds.has(s.id)) {
                      merged.push(s);
                      existingIds.add(s.id);
                    }
                  }
                  return merged;
                });
              }
              break;
            }
          }
        } catch (err) {
          console.error('Error parsing whiteboard data packet:', err);
        }
      }

      if (topic === 'whiteboard-cursor') {
        try {
          const text = new TextDecoder().decode(payload);
          const cursor: RemoteCursor = JSON.parse(text);
          if (cursor && cursor.identity !== localParticipant.identity) {
            setRemoteCursors((prev) => {
              const next = new Map(prev);
              next.set(cursor.identity, { ...cursor, lastActive: Date.now() });
              return next;
            });
          }
        } catch {
          // ignore corrupted cursor packets
        }
      }
    };

    room.on(RoomEvent.DataReceived, handleDataReceived);
    return () => {
      room.off(RoomEvent.DataReceived, handleDataReceived);
    };
  }, [room, localParticipant]);

  // Clean up stale cursors (older than 4 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setRemoteCursors((prev) => {
        let changed = false;
        const next = new Map(prev);
        for (const [id, c] of next.entries()) {
          if (now - c.lastActive > 4000) {
            next.delete(id);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Broadcast helper
  const broadcastWhiteboardEvent = useCallback(
    (event: any, reliable: boolean = true) => {
      if (!room || !localParticipant) return;
      try {
        const payload = new TextEncoder().encode(JSON.stringify(event));
        localParticipant.publishData(payload, {
          reliable,
          topic: reliable ? 'whiteboard' : 'whiteboard-cursor',
        });
      } catch (err) {
        console.warn('Failed to broadcast whiteboard event:', err);
      }
    },
    [room, localParticipant]
  );

  // Redraw canvas whenever strokes or background change
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Render background pattern
    if (bgStyle === 'dark') {
      ctx.fillStyle = '#1e1f22';
      ctx.fillRect(0, 0, width, height);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
    }

    if (bgStyle === 'dots') {
      ctx.fillStyle = '#cbd5e1';
      const gap = 24;
      for (let x = gap; x < width; x += gap) {
        for (let y = gap; y < height; y += gap) {
          ctx.beginPath();
          ctx.arc(x, y, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (bgStyle === 'grid') {
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      const gap = 30;
      for (let x = gap; x < width; x += gap) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = gap; y < height; y += gap) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    } else if (bgStyle === 'ruled') {
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      const gap = 28;
      for (let y = gap; y < height; y += gap) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }

    // Render each committed stroke
    strokes.forEach((stroke) => {
      renderStroke(ctx, stroke, width, height);
    });
  }, [strokes, bgStyle]);

  // Render a single stroke onto context
  const renderStroke = (
    ctx: CanvasRenderingContext2D,
    stroke: WhiteboardStroke,
    width: number,
    height: number
  ) => {
    ctx.save();
    ctx.strokeStyle = stroke.color;
    ctx.fillStyle = stroke.color;
    ctx.lineWidth = stroke.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (stroke.tool === 'highlighter') {
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = stroke.size * 2.5;
    } else {
      ctx.globalAlpha = 1.0;
    }

    const pts = stroke.points.map((p) => ({
      x: p.x * width,
      y: p.y * height,
    }));

    if (pts.length === 0) {
      ctx.restore();
      return;
    }

    if (stroke.tool === 'pen' || stroke.tool === 'highlighter' || stroke.tool === 'eraser') {
      if (stroke.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = stroke.size * 3;
      }

      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      if (pts.length === 1) {
        ctx.arc(pts[0].x, pts[0].y, ctx.lineWidth / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.stroke();
      }
    } else if (stroke.tool === 'rectangle' && pts.length >= 2) {
      const p1 = pts[0];
      const p2 = pts[pts.length - 1];
      const w = p2.x - p1.x;
      const h = p2.y - p1.y;
      ctx.beginPath();
      ctx.rect(p1.x, p1.y, w, h);
      ctx.stroke();
    } else if (stroke.tool === 'circle' && pts.length >= 2) {
      const p1 = pts[0];
      const p2 = pts[pts.length - 1];
      const rx = Math.abs(p2.x - p1.x) / 2;
      const ry = Math.abs(p2.y - p1.y) / 2;
      const cx = Math.min(p1.x, p2.x) + rx;
      const cy = Math.min(p1.y, p2.y) + ry;
      ctx.beginPath();
      ctx.ellipse(cx, cy, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (stroke.tool === 'line' && pts.length >= 2) {
      const p1 = pts[0];
      const p2 = pts[pts.length - 1];
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    } else if (stroke.tool === 'arrow' && pts.length >= 2) {
      const p1 = pts[0];
      const p2 = pts[pts.length - 1];
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      // Arrowhead
      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      const headLen = Math.max(12, stroke.size * 2.5);
      ctx.beginPath();
      ctx.moveTo(p2.x, p2.y);
      ctx.lineTo(
        p2.x - headLen * Math.cos(angle - Math.PI / 6),
        p2.y - headLen * Math.sin(angle - Math.PI / 6)
      );
      ctx.moveTo(p2.x, p2.y);
      ctx.lineTo(
        p2.x - headLen * Math.cos(angle + Math.PI / 6),
        p2.y - headLen * Math.sin(angle + Math.PI / 6)
      );
      ctx.stroke();
    } else if (stroke.tool === 'text' && stroke.text) {
      ctx.font = `600 ${Math.max(16, stroke.size * 3.5)}px system-ui, sans-serif`;
      ctx.fillText(stroke.text, pts[0].x, pts[0].y);
    }

    ctx.restore();
  };

  // Resize canvas to match container's physical pixel width
  const updateCanvasDimensions = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const width = Math.floor(rect.width);
    const height = Math.floor(rect.height);

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = Math.max(100, width);
      canvas.height = Math.max(100, height);
      redrawCanvas();
    }
  }, [redrawCanvas]);

  useEffect(() => {
    updateCanvasDimensions();
    const handleResize = () => updateCanvasDimensions();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateCanvasDimensions]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Normalization helper
  const getNormalizedPoint = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
    };
  };

  // Broadcast cursor movements
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const norm = getNormalizedPoint(e);

    // Throttle cursor broadcast to ~40ms
    const now = Date.now();
    if (now - lastCursorBroadcastRef.current > 40) {
      lastCursorBroadcastRef.current = now;
      broadcastWhiteboardEvent(
        {
          identity: localParticipant.identity,
          name: localParticipant.name || 'Anonymous',
          x: norm.x,
          y: norm.y,
          color: localColor,
          tool: activeTool,
          lastActive: now,
        },
        false
      );
    }

    // If drawing, update live stroke preview
    if (!isDrawingRef.current) return;

    currentPointsRef.current.push(norm);

    // Live canvas preview
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // For freehand pen / eraser / highlighter, draw increment immediately
    if (activeTool === 'pen' || activeTool === 'highlighter' || activeTool === 'eraser') {
      const pts = currentPointsRef.current;
      if (pts.length >= 2) {
        ctx.save();
        ctx.strokeStyle = activeColor;
        ctx.fillStyle = activeColor;
        ctx.lineWidth = activeSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (activeTool === 'highlighter') {
          ctx.globalAlpha = 0.35;
          ctx.lineWidth = activeSize * 2.5;
        } else if (activeTool === 'eraser') {
          ctx.globalCompositeOperation = 'destination-out';
          ctx.lineWidth = activeSize * 3;
        }

        const p1 = pts[pts.length - 2];
        const p2 = pts[pts.length - 1];
        ctx.beginPath();
        ctx.moveTo(p1.x * canvas.width, p1.y * canvas.height);
        ctx.lineTo(p2.x * canvas.width, p2.y * canvas.height);
        ctx.stroke();
        ctx.restore();
      }
    } else {
      // Shapes need redrawing base strokes + preview shape
      redrawCanvas();
      const tempStroke: WhiteboardStroke = {
        id: 'preview',
        tool: activeTool,
        color: activeColor,
        size: activeSize,
        points: currentPointsRef.current,
        timestamp: Date.now(),
      };
      renderStroke(ctx, tempStroke, canvas.width, canvas.height);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return; // Primary left button only
    const norm = getNormalizedPoint(e);

    // Handle text placement tool
    if (activeTool === 'text') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      setTextInput({
        visible: true,
        x: norm.x,
        y: norm.y,
        pixelX: e.clientX - rect.left,
        pixelY: e.clientY - rect.top,
        text: '',
      });
      return;
    }

    isDrawingRef.current = true;
    startPointRef.current = norm;
    currentPointsRef.current = [norm];

    // If starting a pen stroke, draw a dot
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx && (activeTool === 'pen' || activeTool === 'highlighter')) {
        ctx.save();
        ctx.fillStyle = activeColor;
        if (activeTool === 'highlighter') ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.arc(
          norm.x * canvas.width,
          norm.y * canvas.height,
          activeSize / 2,
          0,
          Math.PI * 2
        );
        ctx.fill();
        ctx.restore();
      }
    }
  };

  const handleMouseUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    if (currentPointsRef.current.length === 0) return;

    // Create completed stroke object
    const newStroke: WhiteboardStroke = {
      id: `stroke_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tool: activeTool,
      color: activeColor,
      size: activeSize,
      points: [...currentPointsRef.current],
      authorName: localParticipant.name || 'Anonymous',
      authorId: localParticipant.identity,
      timestamp: Date.now(),
    };

    const nextStrokes = [...strokes, newStroke];
    setStrokes(nextStrokes);
    setRedoStack([]); // Clear redo upon new action

    // Broadcast stroke to room peers
    broadcastWhiteboardEvent({ type: 'WB_STROKE_ADDED', stroke: newStroke }, true);

    // Persist to Firestore
    saveWhiteboardToFirestore(roomCode, nextStrokes);

    currentPointsRef.current = [];
    startPointRef.current = null;
  };

  // Commit typed text
  const handleCommitText = () => {
    if (!textInput.text.trim()) {
      setTextInput((prev) => ({ ...prev, visible: false }));
      return;
    }

    const textStroke: WhiteboardStroke = {
      id: `text_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tool: 'text',
      color: activeColor,
      size: activeSize,
      points: [{ x: textInput.x, y: textInput.y }],
      text: textInput.text.trim(),
      authorName: localParticipant.name || 'Anonymous',
      authorId: localParticipant.identity,
      timestamp: Date.now(),
    };

    const nextStrokes = [...strokes, textStroke];
    setStrokes(nextStrokes);
    setRedoStack([]);

    broadcastWhiteboardEvent({ type: 'WB_STROKE_ADDED', stroke: textStroke }, true);
    saveWhiteboardToFirestore(roomCode, nextStrokes);

    setTextInput({ visible: false, x: 0, y: 0, pixelX: 0, pixelY: 0, text: '' });
  };

  // Undo action
  const handleUndo = () => {
    if (strokes.length === 0) return;
    const last = strokes[strokes.length - 1];
    const nextStrokes = strokes.slice(0, -1);
    setStrokes(nextStrokes);
    setRedoStack((prev) => [...prev, last]);

    broadcastWhiteboardEvent({ type: 'WB_UNDO', strokeId: last.id }, true);
    saveWhiteboardToFirestore(roomCode, nextStrokes);
  };

  // Redo action
  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const restored = redoStack[redoStack.length - 1];
    const nextRedo = redoStack.slice(0, -1);
    const nextStrokes = [...strokes, restored];
    setStrokes(nextStrokes);
    setRedoStack(nextRedo);

    broadcastWhiteboardEvent({ type: 'WB_STROKE_ADDED', stroke: restored }, true);
    saveWhiteboardToFirestore(roomCode, nextStrokes);
  };

  // Clear Board
  const handleClear = () => {
    if (strokes.length === 0) return;
    if (window.confirm('Clear the entire whiteboard for everyone in this meeting?')) {
      setStrokes([]);
      setRedoStack([]);
      broadcastWhiteboardEvent({ type: 'WB_CLEAR' }, true);
      saveWhiteboardToFirestore(roomCode, []);
    }
  };

  // Download high-resolution PNG
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create an offscreen canvas to guarantee clean export
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    // Background
    if (bgStyle === 'dark') {
      ctx.fillStyle = '#1e1f22';
      ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    }

    // Render strokes
    strokes.forEach((stroke) => {
      renderStroke(ctx, stroke, exportCanvas.width, exportCanvas.height);
    });

    const link = document.createElement('a');
    link.download = `whiteboard-${roomCode}-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  };

  // Keyboard shortcut listener for Ctrl+Z and Ctrl+Y
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [strokes, redoStack]);

  return (
    <div className="relative w-full h-full flex flex-col bg-[#202124] text-white select-none overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
      {/* Top Header Bar */}
      <div className="h-12 px-4 bg-[#282a2d] border-b border-white/10 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Pen className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-semibold text-gray-100 flex items-center gap-2">
              Collaborative Whiteboard
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                Live Sync
              </span>
            </h2>
          </div>
        </div>

        {/* Top Controls: Cursors toggle, Background selector, Export, Maximize, Close */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Cursors Toggle */}
          <button
            onClick={() => setShowCursors(!showCursors)}
            className={`p-1.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border ${
              showCursors
                ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
                : 'bg-white/5 border-transparent text-gray-400 hover:text-white'
            }`}
            title="Toggle remote collaborative cursors"
          >
            <Users className="w-3.5 h-3.5" />
            <span className="hidden md:inline">
              {remoteCursors.size > 0 ? `${remoteCursors.size} active` : 'Cursors'}
            </span>
          </button>

          {/* Background selector */}
          <div className="flex items-center bg-white/5 rounded-lg p-0.5 border border-white/5">
            {(['blank', 'dots', 'grid', 'ruled', 'dark'] as WhiteboardBackground[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setBgStyle(mode)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium capitalize transition-colors ${
                  bgStyle === mode
                    ? 'bg-white/20 text-white font-semibold'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
                title={`Canvas theme: ${mode}`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Export PNG */}
          <button
            onClick={handleDownload}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
            title="Download drawing as PNG"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Expand / Minimize if stage mode */}
          {onToggleExpand && (
            <button
              onClick={onToggleExpand}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
              title={isExpanded ? 'Restore stage size' : 'Expand full screen'}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}

          {/* Close */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-300 transition-colors"
            title="Close Whiteboard"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Drawing Stage Area */}
      <div className="relative flex-1 w-full h-full overflow-hidden" ref={containerRef}>
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className={`w-full h-full touch-none select-none ${
            activeTool === 'eraser'
              ? 'cursor-cell'
              : activeTool === 'text'
              ? 'cursor-text'
              : 'cursor-crosshair'
          }`}
        />

        {/* Remote Live Collaborative Cursors */}
        {showCursors &&
          Array.from(remoteCursors.values()).map((cursor) => {
            const canvas = canvasRef.current;
            if (!canvas) return null;
            const left = cursor.x * canvas.width;
            const top = cursor.y * canvas.height;

            return (
              <div
                key={cursor.identity}
                className="absolute pointer-events-none transition-all duration-75 ease-out z-30"
                style={{
                  transform: `translate(${left}px, ${top}px)`,
                }}
              >
                {/* Arrow pointer */}
                <svg
                  className="w-4 h-4 drop-shadow"
                  viewBox="0 0 24 24"
                  fill={cursor.color}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                >
                  <path d="M3 3l7 18 3-7 7-3L3 3z" />
                </svg>
                {/* Participant badge */}
                <span
                  className="px-2 py-0.5 rounded-md text-[10px] font-semibold text-white shadow-md whitespace-nowrap block mt-0.5"
                  style={{ backgroundColor: cursor.color }}
                >
                  {cursor.name}
                </span>
              </div>
            );
          })}

        {/* Text Input Popup when clicking with Text Tool */}
        {textInput.visible && (
          <div
            className="absolute z-40 bg-[#282a2d] border border-blue-500 rounded-lg p-2 shadow-2xl flex items-center gap-2"
            style={{
              left: `${textInput.pixelX}px`,
              top: `${textInput.pixelY}px`,
            }}
          >
            <input
              type="text"
              autoFocus
              placeholder="Type note or text..."
              value={textInput.text}
              onChange={(e) => setTextInput((prev) => ({ ...prev, text: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCommitText();
                if (e.key === 'Escape') setTextInput((prev) => ({ ...prev, visible: false }));
              }}
              className="bg-[#202124] text-white px-2.5 py-1 text-sm rounded outline-none border border-white/20 focus:border-blue-400 w-48"
            />
            <button
              onClick={handleCommitText}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors"
            >
              Add
            </button>
            <button
              onClick={() => setTextInput((prev) => ({ ...prev, visible: false }))}
              className="p-1 text-gray-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Floating Google Meet Drawing Toolbar */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 p-1.5 bg-[#282a2d]/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl">
          {/* Tool buttons */}
          <div className="flex items-center gap-1 pr-1 border-r border-white/10">
            <button
              onClick={() => setActiveTool('pen')}
              className={`p-2 rounded-xl transition-all ${
                activeTool === 'pen'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
              title="Pen (P)"
            >
              <Pen className="w-4 h-4" />
            </button>

            <button
              onClick={() => setActiveTool('highlighter')}
              className={`p-2 rounded-xl transition-all ${
                activeTool === 'highlighter'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
              title="Highlighter (H)"
            >
              <Highlighter className="w-4 h-4" />
            </button>

            <button
              onClick={() => setActiveTool('eraser')}
              className={`p-2 rounded-xl transition-all ${
                activeTool === 'eraser'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
              title="Eraser (E)"
            >
              <Eraser className="w-4 h-4" />
            </button>

            <button
              onClick={() => setActiveTool('rectangle')}
              className={`p-2 rounded-xl transition-all ${
                activeTool === 'rectangle'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
              title="Rectangle"
            >
              <Square className="w-4 h-4" />
            </button>

            <button
              onClick={() => setActiveTool('circle')}
              className={`p-2 rounded-xl transition-all ${
                activeTool === 'circle'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
              title="Circle / Ellipse"
            >
              <Circle className="w-4 h-4" />
            </button>

            <button
              onClick={() => setActiveTool('line')}
              className={`p-2 rounded-xl transition-all ${
                activeTool === 'line'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
              title="Line"
            >
              <Minus className="w-4 h-4" />
            </button>

            <button
              onClick={() => setActiveTool('arrow')}
              className={`p-2 rounded-xl transition-all ${
                activeTool === 'arrow'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
              title="Arrow"
            >
              <MoveRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => setActiveTool('text')}
              className={`p-2 rounded-xl transition-all ${
                activeTool === 'text'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
              title="Add text note"
            >
              <Type className="w-4 h-4" />
            </button>
          </div>

          {/* Color palette */}
          <div className="flex items-center gap-1 px-1 border-r border-white/10">
            {PALETTE.map((c) => (
              <button
                key={c.name}
                onClick={() => setActiveColor(c.value)}
                className={`w-6 h-6 rounded-full transition-transform ${
                  activeColor === c.value
                    ? 'ring-2 ring-white scale-110 shadow-sm'
                    : 'hover:scale-105 opacity-80 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: c.value,
                  border: c.value === '#ffffff' ? '1px solid #4b5563' : 'none',
                }}
                title={c.name}
              />
            ))}
          </div>

          {/* Stroke Width Selector */}
          <div className="flex items-center gap-1 px-1 border-r border-white/10">
            {SIZES.map((s) => (
              <button
                key={s.label}
                onClick={() => setActiveSize(s.value)}
                className={`p-1.5 rounded-lg flex items-center justify-center transition-colors ${
                  activeSize === s.value ? 'bg-white/20' : 'hover:bg-white/10'
                }`}
                title={`Stroke: ${s.label}`}
              >
                <span
                  className="rounded-full bg-white"
                  style={{
                    width: `${Math.max(4, s.value)}px`,
                    height: `${Math.max(4, s.value)}px`,
                  }}
                />
              </button>
            ))}
          </div>

          {/* Undo / Redo / Clear actions */}
          <div className="flex items-center gap-1 pl-1">
            <button
              onClick={handleUndo}
              disabled={strokes.length === 0}
              className="p-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>

            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="p-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4" />
            </button>

            <button
              onClick={handleClear}
              disabled={strokes.length === 0}
              className="p-2 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Clear Board"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
