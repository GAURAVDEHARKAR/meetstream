import React from 'react';
import { FloatingReaction } from '../types';

interface ReactionsOverlayProps {
  reactions: FloatingReaction[];
}

export const ReactionsOverlay: React.FC<ReactionsOverlayProps> = ({ reactions }) => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
      {reactions.map((r) => (
        <div
          key={r.id}
          className="absolute bottom-20 flex flex-col items-center animate-reaction-float"
          style={{
            left: `${r.x}%`,
          }}
        >
          <span className="text-4xl filter drop-shadow-md select-none">{r.emoji}</span>
          <span className="text-[10px] font-medium bg-black/60 text-white px-2 py-0.5 rounded-full mt-1 backdrop-blur-sm shadow">
            {r.senderName}
          </span>
        </div>
      ))}
      <style>{`
        @keyframes reactionFloat {
          0% {
            transform: translateY(0) scale(0.6);
            opacity: 0;
          }
          15% {
            transform: translateY(-30px) scale(1.2);
            opacity: 1;
          }
          50% {
            transform: translateY(-160px) scale(1);
            opacity: 0.95;
          }
          100% {
            transform: translateY(-320px) scale(0.8);
            opacity: 0;
          }
        }
        .animate-reaction-float {
          animation: reactionFloat 3.2s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
      `}</style>
    </div>
  );
};
