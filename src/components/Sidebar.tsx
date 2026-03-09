import React, { useState } from 'react';
import { Home, Search, Library, Plus, Heart, Music2, Cloud, RefreshCw, Check, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import DiscoveryEngine from '../services/DiscoveryEngine';
import { getAllTracks } from '../services/db';
import { usePlayer } from '../context/PlayerContext';

interface SidebarProps {
  isExpanded?: boolean;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

const navItems = [
  { id: 'home', icon: Home, label: 'Home' },
  { id: 'search', icon: Search, label: 'Search' },
  { id: 'library', icon: Library, label: 'Your Library' },
];

const libraryItems = [
  { icon: Plus, label: 'Create Playlist', active: false },
  { icon: Heart, label: 'Liked Songs', active: false },
];

export const Sidebar: React.FC<SidebarProps> = ({ 
  isExpanded = true,
  activeTab = 'home',
  onTabChange 
}) => {
  const { isAuthenticated, isLoading: authLoading, login, logout } = useAuth();
  const { setQueue } = usePlayer();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncCount, setSyncCount] = useState<number | null>(null);

  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncCount(0);

    try {
      const engine = DiscoveryEngine.getInstance();
      const tracks = await engine.scanFolder('', (found, scanning) => {
        setSyncCount(found);
        if (!scanning) setIsSyncing(false);
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
      console.error('[Sidebar] Sync failed:', err);
      setIsSyncing(false);
    }
  };

  return (
    <aside className="hidden md:flex flex-col bg-surface w-60 h-full overflow-hidden">
      {/* Navigation */}
      <nav className="p-4 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.label}
            onClick={() => onTabChange && onTabChange(item.id)}
            className={`flex items-center gap-4 w-full px-4 py-3 rounded-md transition-all duration-200 ${
              activeTab === item.id
                ? 'bg-surface-hover text-text-primary'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover/50'
            }`}
          >
            <item.icon size={22} className={activeTab === item.id ? 'text-accent' : ''} />
            <span className="font-medium text-sm">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Divider */}
      <div className="mx-4 border-t border-divider" />

      {/* Dropbox Connection */}
      <div className="px-4 pt-4 space-y-2">
        {authLoading ? (
          <div className="flex items-center gap-3 px-4 py-3 text-text-secondary">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Connecting...</span>
          </div>
        ) : isAuthenticated ? (
          <>
            {/* Connected state */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-md bg-accent/10 border border-accent/20">
              <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center">
                <Check size={14} className="text-accent" />
              </div>
              <span className="text-sm font-medium text-accent">Dropbox Connected</span>
            </div>

            {/* Sync Library Button */}
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-md transition-all duration-200 bg-surface-hover/50 hover:bg-surface-hover text-text-primary disabled:opacity-60"
            >
              <RefreshCw size={18} className={isSyncing ? 'animate-spin text-accent' : ''} />
              <span className="text-sm font-medium">
                {isSyncing
                  ? `Scanning... (${syncCount})`
                  : syncCount !== null
                  ? `Sync Library (${syncCount})`
                  : 'Sync Library'}
              </span>
            </button>
          </>
        ) : (
          /* Connect Dropbox button */
          <button
            onClick={login}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-md transition-all duration-200 bg-accent hover:bg-accent-hover text-primary font-medium group"
          >
            <Cloud size={20} className="group-hover:scale-110 transition-transform" />
            <span className="text-sm">Connect Dropbox</span>
          </button>
        )}
      </div>

      {/* Divider */}
      <div className="mx-4 mt-4 border-t border-divider" />

      {/* Library */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {libraryItems.map((item) => (
          <button
            key={item.label}
            className="flex items-center gap-4 w-full px-4 py-3 rounded-md transition-all duration-200 text-text-secondary hover:text-text-primary hover:bg-surface-hover/50"
          >
            <item.icon size={22} />
            <span className="font-medium text-sm">{item.label}</span>
          </button>
        ))}

        {/* Playlist List */}
        <div className="mt-6 space-y-2">
          <div className="px-4 py-2 text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Playlists
          </div>
          {[
            'Midnight Vibes',
            'Amber Dreams',
            'Cobalt Nights',
            'Focus Flow',
            'Synthwave Mix',
            'Lo-Fi Chill'
          ].map((playlist) => (
            <button
              key={playlist}
              className="flex items-center gap-3 w-full px-4 py-2 rounded-md transition-all duration-200 text-text-secondary hover:text-text-primary hover:bg-surface-hover/50"
            >
              <div className="w-10 h-10 bg-surface-hover rounded flex items-center justify-center">
                <Music2 size={16} className="text-text-secondary" />
              </div>
              <span className="font-medium text-sm truncate">{playlist}</span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
