import React, { useState, useEffect } from 'react';
import { X, Key, Cloud, ShieldCheck, ExternalLink, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { LiveKitStatus } from '../types';
import { saveLiveKitConfig } from '../services/api';

interface LiveKitConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: LiveKitStatus | null;
  onConfigSaved: () => void;
}

export const LiveKitConfigModal: React.FC<LiveKitConfigModalProps> = ({
  isOpen,
  onClose,
  status,
  onConfigSaved,
}) => {
  const [livekitUrl, setLivekitUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (status?.livekitUrl) {
      setLivekitUrl(status.livekitUrl);
    }
  }, [status]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!livekitUrl.trim()) {
      setError('LiveKit URL is required (e.g., wss://my-project.livekit.cloud)');
      return;
    }
    if (!apiKey.trim()) {
      setError('API Key is required');
      return;
    }
    if (!apiSecret.trim()) {
      setError('API Secret is required');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await saveLiveKitConfig({
        livekitUrl: livekitUrl.trim(),
        apiKey: apiKey.trim(),
        apiSecret: apiSecret.trim(),
      });

      setSuccess('LiveKit Cloud credentials saved successfully!');
      onConfigSaved();
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to update LiveKit credentials');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden text-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">LiveKit Cloud Configuration</h2>
              <p className="text-xs text-gray-500">Real-time video & audio infrastructure</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 max-h-[80vh] overflow-y-auto space-y-5">
          {/* Status Banner */}
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 ${
              status?.configured
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            {status?.configured ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="text-sm">
              <span className="font-semibold">
                {status?.configured ? 'LiveKit Cloud is Active' : 'Configuration Required'}
              </span>
              <p className="text-xs mt-1 opacity-90 leading-relaxed">
                {status?.configured
                  ? `Connected to ${status.livekitUrl || 'LiveKit Cloud'}. Real-time video conferencing is operational.`
                  : 'To enable real-time meetings, connect your free LiveKit Cloud credentials. Tokens are generated securely server-side without exposing secrets.'}
              </p>
            </div>
          </div>

          {/* Guide Steps */}
          <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100 text-xs text-blue-900 space-y-2">
            <div className="flex items-center justify-between font-medium">
              <span>Quick Setup Guide (1-2 minutes):</span>
              <a
                href="https://cloud.livekit.io"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 font-semibold hover:underline"
              >
                Go to cloud.livekit.io <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-blue-800/90 pl-1">
              <li>Sign up or log in at <strong>cloud.livekit.io</strong> (free tier available).</li>
              <li>Create a project and open <strong>Project Settings &gt; Keys</strong>.</li>
              <li>Copy your <strong>LiveKit WebSocket URL</strong>, <strong>API Key</strong>, and <strong>API Secret</strong> below.</li>
            </ol>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{success}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                LiveKit WebSocket URL (LIVEKIT_URL)
              </label>
              <input
                type="text"
                placeholder="wss://your-project-domain.livekit.cloud"
                value={livekitUrl}
                onChange={(e) => setLivekitUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                required
              />
              <p className="text-[11px] text-gray-500 mt-1">Must start with <code>wss://</code> or <code>ws://</code></p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                API Key (LIVEKIT_API_KEY)
              </label>
              <input
                type="text"
                placeholder="APIxxxxxxxxxxxx"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                API Secret (LIVEKIT_API_SECRET)
              </label>
              <input
                type="password"
                placeholder="••••••••••••••••••••••••"
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                required
              />
              <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Never exposed to the client; used strictly by the server to sign JWT participant tokens.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4" />
                    Save &amp; Connect
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
