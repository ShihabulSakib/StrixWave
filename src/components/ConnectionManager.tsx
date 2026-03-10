/**
 * ConnectionManager — Universal Dropbox Sync Hub
 *
 * Extracted from Sidebar.tsx so it can be triggered from
 * TopNav (all viewports), empty states, or any other entry point.
 * Solves the "Mobile Sync Gap" identified in the audit.
 */

import React, { useState, useCallback } from 'react';
import { Cloud, RefreshCw, Check, Loader2, X, Music2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import DiscoveryEngine from '../services/DiscoveryEngine';
import { usePlayer } from '../context/PlayerContext';

interface ConnectionManagerProps {
  /** Whether the modal overlay is open */
  isOpen: boolean;
  /** Close callback */
  onClose: () => void;
}

export const ConnectionManager: React.FC<ConnectionManagerProps> = ({ isOpen, onClose }) => {
  const { isAuthenticated, isLoading: authLoading, login, logout } = useAuth();
  const { setQueue } = usePlayer();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncCount, setSyncCount] = useState<number | null>(null);
  const [syncComplete, setSyncComplete] = useState(false);

  const handleSync = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncCount(0);
    setSyncComplete(false);

    try {
      const engine = DiscoveryEngine.getInstance();
      const tracks = await engine.scanFolder('', (found, scanning) => {
        setSyncCount(found);
        if (!scanning) {
          setIsSyncing(false);
          setSyncComplete(true);
        }
      });

      // Load synced tracks into the queue context
      if (tracks.length > 0) {
        const contextTracks = tracks.map((t) => ({
          id: t.id,
          title: t.title,
          artist: t.artist,
          album: t.album,
          duration: t.duration,
          durationSeconds: t.durationSeconds,
          addedDate: t.addedDate,
          coverUrl: t.coverUrl,
          coverBlob: t.coverBlob,
          dropboxPath: t.dropboxPath,
        }));
        setQueue(contextTracks, 0);
      }
    } catch (err) {
      console.error('[ConnectionManager] Sync failed:', err);
      setIsSyncing(false);
    }
  }, [isSyncing, setQueue]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-surface rounded-xl shadow-2xl border border-divider w-full max-w-md mx-4 overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-divider">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
              <Cloud size={20} className="text-accent" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary">Dropbox Sync</h2>
              <p className="text-xs text-text-secondary">Connect & sync your music library</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-text-secondary hover:text-text-primary transition-colors rounded-lg hover:bg-surface-hover"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {authLoading ? (
            <div className="flex flex-col items-center py-8">
              <Loader2 size={32} className="animate-spin text-accent mb-3" />
              <p className="text-text-secondary text-sm">Connecting to Dropbox...</p>
            </div>
          ) : isAuthenticated ? (
            <div className="space-y-4">
              {/* Connected Badge */}
              <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-accent/10 border border-accent/20">
                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                  <Check size={16} className="text-accent" />
                </div>
                <div className="flex-1">
                  <span className="text-sm font-semibold text-accent">Connected to Dropbox</span>
                  <p className="text-xs text-text-secondary mt-0.5">Your account is linked</p>
                </div>
              </div>

              {/* Sync Button */}
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="flex items-center justify-center gap-3 w-full px-4 py-4 rounded-lg transition-all duration-200 bg-accent hover:bg-accent-hover text-primary font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <RefreshCw size={20} className={isSyncing ? 'animate-spin' : ''} />
                <span>
                  {isSyncing
                    ? `Scanning... (${syncCount} tracks found)`
                    : syncComplete
                    ? `Sync Complete! (${syncCount} tracks)`
                    : 'Sync Library Now'}
                </span>
              </button>

              {/* Sync progress indicator */}
              {isSyncing && (
                <div className="flex items-center gap-2 px-2">
                  <div className="flex-1 h-1 bg-surface-hover rounded-full overflow-hidden">
                    <div className="h-full bg-accent rounded-full animate-pulse" style={{ width: '60%' }} />
                  </div>
                  <span className="text-xs text-text-secondary">{syncCount} found</span>
                </div>
              )}

              {/* Disconnect option */}
              <button
                onClick={logout}
                className="w-full text-center text-sm text-text-secondary hover:text-text-primary transition-colors py-2"
              >
                Disconnect Dropbox
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center py-4">
              <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mb-4">
                <Music2 size={36} className="text-accent" />
              </div>
              <h3 className="text-lg font-bold text-text-primary mb-2">Stream Your Music</h3>
              <p className="text-text-secondary text-sm text-center mb-6 max-w-xs">
                Connect your Dropbox account to sync and stream your personal music library from any device.
              </p>
              <button
                onClick={login}
                className="flex items-center gap-3 px-8 py-4 rounded-lg bg-accent hover:bg-accent-hover text-primary font-semibold transition-all hover:scale-105 shadow-lg"
              >
                <Cloud size={22} />
                <span>Connect Dropbox</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConnectionManager;
