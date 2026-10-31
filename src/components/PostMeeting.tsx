import React, { useState } from 'react';
import { Home, RefreshCw, Star, CheckCircle, Video } from 'lucide-react';

interface PostMeetingProps {
  roomCode: string;
  onRejoin: () => void;
  onHome: () => void;
}

export const PostMeeting: React.FC<PostMeetingProps> = ({
  roomCode,
  onRejoin,
  onHome,
}) => {
  const [rating, setRating] = useState<number | null>(null);
  const [feedbackSent, setFeedbackSent] = useState(false);

  const handleRating = (score: number) => {
    setRating(score);
    setFeedbackSent(true);
    setTimeout(() => {
      // transient toast
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col justify-between">
      {/* Top Bar */}
      <div className="px-6 py-4 flex items-center gap-3 border-b border-gray-100">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
          <Video className="w-4 h-4" />
        </div>
        <span className="font-semibold text-gray-900 tracking-tight">MeetStream</span>
      </div>

      {/* Main Container */}
      <div className="max-w-md mx-auto px-6 py-12 text-center space-y-6 my-auto">
        <div className="space-y-2">
          <h1 className="text-3xl font-normal text-gray-900 tracking-tight">
            You left the meeting
          </h1>
          <p className="text-sm text-gray-500 font-mono">Room: {roomCode}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={onRejoin}
            className="w-full sm:w-auto px-6 py-2.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-blue-600 font-medium text-sm transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Rejoin</span>
          </button>
          <button
            onClick={onHome}
            className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>Return to home screen</span>
          </button>
        </div>

        {/* Audio / Video Quality Rating */}
        <div className="pt-6 border-t border-gray-100 space-y-3">
          <p className="text-xs font-medium text-gray-600">
            {feedbackSent
              ? 'Thank you for your feedback!'
              : 'How was the audio and video quality?'}
          </p>
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => handleRating(star)}
                disabled={feedbackSent}
                className={`p-1.5 rounded-full transition-transform hover:scale-110 ${
                  rating !== null && star <= rating
                    ? 'text-amber-400'
                    : 'text-gray-300 hover:text-amber-400'
                }`}
                aria-label={`Rate ${star} star`}
              >
                <Star
                  className={`w-6 h-6 ${
                    rating !== null && star <= rating ? 'fill-amber-400' : ''
                  }`}
                />
              </button>
            ))}
          </div>
          {feedbackSent && (
            <p className="text-xs text-emerald-600 flex items-center justify-center gap-1 font-medium">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Feedback recorded</span>
            </p>
          )}
        </div>
      </div>

      <div className="py-4 text-center text-xs text-gray-400 border-t border-gray-100">
        LiveKit Cloud • Google Meet Alternative
      </div>
    </div>
  );
};
