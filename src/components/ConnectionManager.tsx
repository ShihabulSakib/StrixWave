import React, { useState, useCallback } from 'react';
import { Cloud, RefreshCw, X, Music2, HardDrive, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import DiscoveryEngine from '../services/DiscoveryEngine';
import { usePlayer } from '../context/PlayerContext';
import { useOverlayHistory } from '../hooks/useHistoryHook';

interface ConnectionManagerProps {
  /** Whether the modal overlay is open */
  isOpen: boolean;
  /** Close callback */
  onClose: () => void;
}

interface ProviderProgress {
  found: number;
  syncing: boolean;
}

export const ConnectionManager: React.FC<ConnectionManagerProps> = ({ isOpen, onClose }) => {
  const { isProviderAuthenticated, login, logout } = useAuth();
  useOverlayHistory(isOpen, onClose);

  const [syncProgress, setSyncProgress] = useState<Record<string, ProviderProgress>>({
    'dropbox': { found: 0, syncing: false },
    'google-drive': { found: 0, syncing: false },
  });

  const handleSync = useCallback(async (providerId: string) => {
    if (syncProgress[providerId].syncing) return;
    
    setSyncProgress(prev => ({
      ...prev,
      [providerId]: { ...prev[providerId], syncing: true, found: 0 }
    }));

    try {
      const engine = DiscoveryEngine.getInstance();
      const tracks = await engine.scanFolder(providerId, '', (found, scanning) => {
        setSyncProgress(prev => ({
          ...prev,
          [providerId]: { found, syncing: scanning }
        }));
      });

      if (tracks.length > 0) {
        window.dispatchEvent(new CustomEvent('library-synced'));
      }
    } catch (err) {
      console.error(`[ConnectionManager] Sync failed for ${providerId}:`, err);
      setSyncProgress(prev => ({
        ...prev,
        [providerId]: { ...prev[providerId], syncing: false }
      }));
    }
  }, [syncProgress]);

  if (!isOpen) return null;

  const providers = [
    { 
      id: 'dropbox', 
      name: 'Dropbox', 
      icon: <Cloud size={24} />,
      color: 'text-[#0061FF]',
      bgColor: 'bg-[#0061FF]/10'
    },
    { 
      id: 'google-drive', 
      name: 'Google Drive', 
      icon: <HardDrive size={24} />,
      color: 'text-[#34A853]',
      bgColor: 'bg-[#34A853]/10'
    },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md animate-fade-in"
        onClick={onClose}
      />

      {/* Modal / Bottom Sheet */}
      <div className="relative bg-surface border-t md:border border-divider w-full max-w-lg mx-auto overflow-hidden animate-slide-up rounded-t-3xl md:rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Mobile Pull Indicator */}
        <div className="md:hidden w-12 h-1.5 bg-white/10 rounded-full mx-auto mt-4 mb-2" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-divider/50">
          <div className="flex flex-col">
            <h2 className="text-xl font-bold text-text-primary tracking-tight">Cloud Sources</h2>
            <p className="text-xs text-text-secondary font-medium opacity-70">Connect and sync your music libraries</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-text-secondary hover:text-text-primary transition-all rounded-full hover:bg-white/5 active:scale-95"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 overflow-y-auto space-y-4 custom-scrollbar">
          {providers.map((provider) => {
            const isAuth = isProviderAuthenticated(provider.id);
            const progress = syncProgress[provider.id];

            return (
              <div 
                key={provider.id} 
                className={`group relative p-5 rounded-2xl transition-all duration-300 border ${
                  isAuth 
                    ? 'bg-surface-hover/40 border-accent/20' 
                    : 'bg-white/[0.02] border-divider/50 hover:border-divider'
                }`}
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl ${provider.bgColor} ${provider.color} flex items-center justify-center shadow-inner`}>
                      {provider.icon}
                    </div>
                    <div className="flex flex-col">
                      <h3 className="font-bold text-text-primary text-base">{provider.name}</h3>
                      <div className="flex items-center gap-1.5">
                        {isAuth ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-accent uppercase tracking-wider">
                            <CheckCircle2 size={10} /> Connected
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-text-secondary uppercase tracking-wider opacity-50">
                            <AlertCircle size={10} /> Not linked
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {isAuth ? (
                    <button
                      onClick={() => logout(provider.id)}
                      className="text-[11px] font-bold text-text-secondary hover:text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-400/10 transition-all uppercase tracking-widest"
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      onClick={() => login(provider.id)}
                      className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-primary text-sm font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-accent/20"
                    >
                      Connect
                    </button>
                  )}
                </div>

                {isAuth && (
                  <div className="space-y-3">
                    <button
                      onClick={() => handleSync(provider.id)}
                      disabled={progress.syncing}
                      className={`flex items-center justify-center gap-3 w-full py-3 rounded-xl text-sm font-bold transition-all ${
                        progress.syncing 
                          ? 'bg-accent/10 text-accent' 
                          : 'bg-white/5 hover:bg-white/10 text-text-primary active:scale-[0.98]'
                      }`}
                    >
                      {progress.syncing ? (
                        <>
                          <RefreshCw size={18} className="animate-spin" />
                          <span>Scanning Library...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw size={18} />
                          <span>Sync All Tracks</span>
                        </>
                      )}
                    </button>
                    
                    {/* Progress indicator */}
                    {(progress.syncing || progress.found > 0) && (
                      <div className="pt-2">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">
                            {progress.syncing ? 'Analyzing Metadata' : 'Last Sync Summary'}
                          </span>
                          <span className="text-xs font-mono font-bold text-accent">
                            {progress.found} Tracks
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full bg-accent transition-all duration-500 ${progress.syncing ? 'animate-pulse' : ''}`}
                            style={{ width: progress.syncing ? '100%' : '100%' }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="p-6 bg-white/[0.02] border-t border-divider/30">
          <p className="text-[11px] text-text-secondary text-center leading-relaxed max-w-[280px] mx-auto opacity-60 font-medium">
            Your music stays in your cloud. Strixwave only caches metadata and temporary streaming links.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ConnectionManager;
