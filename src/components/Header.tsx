import React, { useState, useEffect } from 'react';
import { Video, Settings, HelpCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { LiveKitStatus } from '../types';
import { AuthButton } from './AuthButton';

interface HeaderProps {
  status: LiveKitStatus | null;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
}

export const Header: React.FC<HeaderProps> = ({ status, onOpenSettings, onOpenHelp }) => {
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      const dateStr = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
      setCurrentTime(`${timeStr} • ${dateStr}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="w-full bg-white border-b border-gray-200/80 sticky top-0 z-40 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-teal-400 p-0.5 shadow-sm">
            <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center">
              <Video className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-gray-900 text-lg tracking-tight">MeetStream</span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">
                LiveKit
              </span>
            </div>
          </div>
        </div>

        {/* Right Actions & Clock */}
        <div className="flex items-center gap-3 sm:gap-4">
          <span className="hidden md:inline-block text-sm text-gray-500 font-medium tracking-tight">
            {currentTime}
          </span>

          {/* LiveKit Cloud Status Pill */}
          <button
            onClick={onOpenSettings}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              status?.configured
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
            }`}
            title={status?.configured ? 'LiveKit Cloud is connected' : 'Click to configure LiveKit Cloud'}
          >
            {status?.configured ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="hidden sm:inline">LiveKit Cloud Active</span>
                <span className="sm:hidden">Active</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden sm:inline">Setup LiveKit</span>
                <span className="sm:hidden">Setup</span>
              </>
            )}
          </button>

          {/* Help Button */}
          <button
            onClick={onOpenHelp}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
            title="Meeting Help & Information"
            aria-label="Help"
          >
            <HelpCircle className="w-5 h-5" />
          </button>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
            title="LiveKit Cloud Settings"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>

          {/* Google Firebase Authentication */}
          <AuthButton />
        </div>
      </div>
    </header>
  );
};
