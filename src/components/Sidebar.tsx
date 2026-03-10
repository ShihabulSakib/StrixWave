import React, { useState } from 'react';
import { Plus, Heart, Music2, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { usePlayer } from '../context/PlayerContext';
import { navItems } from '../lib/navItems';
import ConnectionManager from './ConnectionManager';

interface SidebarProps {
  isExpanded?: boolean;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

const libraryItems = [
  { icon: Plus, label: 'Create Playlist', active: false },
  { icon: Heart, label: 'Liked Songs', active: false },
];

export const Sidebar: React.FC<SidebarProps> = ({ 
  isExpanded = true,
  activeTab = 'home',
  onTabChange 
}) => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [showConnectionManager, setShowConnectionManager] = useState(false);

  return (
    <>
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

        {/* Dropbox Connection — delegates to ConnectionManager modal */}
        <div className="px-4 pt-4 space-y-2">
          {authLoading ? (
            <div className="flex items-center gap-3 px-4 py-3 text-text-secondary">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">Connecting...</span>
            </div>
          ) : (
            <button
              onClick={() => setShowConnectionManager(true)}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-md transition-all duration-200 ${
                isAuthenticated
                  ? 'bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20'
                  : 'bg-accent hover:bg-accent-hover text-primary font-medium'
              }`}
            >
              <Music2 size={20} />
              <span className="text-sm font-medium">
                {isAuthenticated ? 'Sync Library' : 'Connect Dropbox'}
              </span>
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

      {/* Connection Manager Modal */}
      <ConnectionManager
        isOpen={showConnectionManager}
        onClose={() => setShowConnectionManager(false)}
      />
    </>
  );
};

export default Sidebar;
