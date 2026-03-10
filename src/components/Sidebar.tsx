import React, { useState } from 'react';
import { Plus, Heart, Music2, Loader2, ListMusic } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { usePlaylists } from '../context/PlaylistContext';
import { navItems } from '../lib/navItems';
import ConnectionManager from './ConnectionManager';

interface SidebarProps {
  isExpanded?: boolean;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onPlaylistSelect?: (id: string) => void;
  selectedPlaylistId?: string | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  isExpanded = true,
  activeTab = 'home',
  onTabChange,
  onPlaylistSelect,
  selectedPlaylistId
}) => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { playlists, allPlaylists, createPlaylist, toggleFavoritePlaylist } = usePlaylists();
  const [showConnectionManager, setShowConnectionManager] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const handleCreatePlaylist = () => {
    setNewPlaylistName(`My Playlist #${playlists.length + 1}`);
    setShowCreateModal(true);
  };

  const submitCreate = async () => {
    if (newPlaylistName.trim()) {
      const newPlaylist = await createPlaylist(newPlaylistName.trim());
      if (onPlaylistSelect) {
        onPlaylistSelect(newPlaylist.id);
      }
      setNewPlaylistName('');
      setShowCreateModal(false);
    }
  };

  return (
    <>
      <aside className="hidden md:flex flex-col bg-surface w-64 h-full overflow-hidden border-r border-divider/10">
        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => onTabChange && onTabChange(item.id)}
              className={`flex items-center gap-4 w-full px-4 py-3 rounded-md transition-all duration-200 ${
                activeTab === item.id
                  ? 'bg-surface-hover text-text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover/50'
              }`}
            >
              <item.icon size={22} className={activeTab === item.id ? 'text-accent' : ''} />
              <span className="font-semibold text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Divider */}
        <div className="mx-4 border-t border-divider/50" />

        {/* Dropbox Connection */}
        <div className="px-4 pt-4 space-y-2">
          {authLoading ? (
            <div className="flex items-center gap-3 px-4 py-3 text-text-secondary bg-surface-hover/30 rounded-md">
              <Loader2 size={18} className="animate-spin text-accent" />
              <span className="text-sm">Connecting...</span>
            </div>
          ) : (
            <button
              onClick={() => setShowConnectionManager(true)}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-md transition-all duration-300 group ${
                isAuthenticated
                  ? 'bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20'
                  : 'bg-accent hover:bg-accent-hover text-primary font-bold shadow-lg shadow-accent/20'
              }`}
            >
              <Music2 size={20} className="group-hover:scale-110 transition-transform" />
              <span className="text-sm font-bold tracking-tight">
                {isAuthenticated ? 'Sync Library' : 'Connect Dropbox'}
              </span>
            </button>
          )}
        </div>

        {/* Library Actions */}
        <div className="p-4 space-y-1">
          <button
            onClick={handleCreatePlaylist}
            className="flex items-center gap-4 w-full px-4 py-3 rounded-md transition-all duration-200 text-text-secondary hover:text-text-primary hover:bg-surface-hover/50 group"
          >
            <div className="w-6 h-6 rounded bg-text-secondary/20 flex items-center justify-center group-hover:bg-accent group-hover:text-primary transition-colors">
              <Plus size={16} strokeWidth={3} />
            </div>
            <span className="font-semibold text-sm">Create Playlist</span>
          </button>
        </div>

        {/* Divider */}
        <div className="mx-4 border-t border-divider/50" />

        {/* Playlist List */}
        <div className="flex-1 overflow-y-auto px-4 py-2 custom-scrollbar">
          <div className="flex items-center justify-between px-4 py-2 mb-1">
            <span className="text-[11px] font-bold text-text-secondary uppercase tracking-[0.1em]">
              Your Library
            </span>
            <ListMusic size={14} className="text-text-secondary/50" />
          </div>
          
          <div className="space-y-0.5">
            {allPlaylists.map((playlist) => {
              const isLikedSongs = playlist.id === 'liked-songs';
              const isSelected = selectedPlaylistId === playlist.id;

              return (
                <button
                  key={playlist.id}
                  onClick={() => onPlaylistSelect && onPlaylistSelect(playlist.id)}
                  className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-md transition-all duration-200 group ${
                    isSelected
                      ? 'bg-surface-hover text-accent font-semibold'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover/40'
                  }`}
                >
                  <div className={`w-10 h-10 rounded flex items-center justify-center shadow-sm transition-transform group-hover:scale-105 flex-shrink-0 ${
                    isSelected ? 'bg-accent/20 text-accent' : 
                    isLikedSongs ? 'bg-gradient-to-br from-indigo-600 to-purple-400 text-white' : 
                    'bg-surface-hover text-text-secondary'
                  }`}>
                    {isLikedSongs ? (
                      <Heart size={18} fill="currentColor" />
                    ) : playlist.coverUrl ? (
                      <img src={playlist.coverUrl} alt="" className="w-full h-full object-cover rounded" />
                    ) : (
                      <Music2 size={18} />
                    )}
                  </div>
                  <div className="flex flex-col items-start min-w-0">
                    <span className="text-sm truncate w-full flex items-center gap-1.5">
                      {playlist.name}
                      {playlist.isFavorite && !isLikedSongs && (
                        <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                      )}
                    </span>
                    <span className="text-[10px] text-text-secondary opacity-70">
                      {isLikedSongs ? 'Auto-generated' : 'Playlist'} • {playlist.trackIds.length} songs
                    </span>
                  </div>
                </button>
              );
            })}
            
            {allPlaylists.length === 0 && (
              <div className="px-4 py-8 text-center">
                <p className="text-xs text-text-secondary/60 italic">No playlists yet</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Create Playlist Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-surface rounded-xl p-6 w-full max-w-sm border border-accent/20 shadow-2xl relative z-[101]">
            <h3 className="text-lg font-bold text-text-primary mb-4">Create Playlist</h3>
            <input
              type="text"
              autoFocus
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitCreate()}
              placeholder="Playlist name"
              className="w-full bg-surface-hover text-text-primary px-4 py-3 rounded-lg outline-none focus:ring-1 focus:ring-accent mb-6"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewPlaylistName('');
                }}
                className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={submitCreate}
                disabled={!newPlaylistName.trim()}
                className="px-4 py-2 bg-text-primary text-primary rounded-lg font-bold hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connection Manager Modal */}
      <ConnectionManager
        isOpen={showConnectionManager}
        onClose={() => setShowConnectionManager(false)}
      />
    </>
  );
};

export default Sidebar;
