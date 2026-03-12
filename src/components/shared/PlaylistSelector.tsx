import React, { useState, useMemo } from 'react';
import { Search, Plus, ListMusic, Check, Music2 } from 'lucide-react';
import { usePlaylists } from '../../context/PlaylistContext';

interface PlaylistSelectorProps {
  trackId: string;
  trackTitle?: string;
  onClose: () => void;
}

export const PlaylistSelector: React.FC<PlaylistSelectorProps> = ({ 
  trackId, 
  trackTitle, 
  onClose 
}) => {
  const { playlists, addTrackToPlaylist, createPlaylist } = usePlaylists();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const filteredPlaylists = useMemo(() => {
    return playlists.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [playlists, searchQuery]);

  const handleAddToPlaylist = async (playlistId: string, playlistName: string) => {
    await addTrackToPlaylist(playlistId, trackId, trackTitle);
    onClose();
  };

  const handleCreateAndAdd = async () => {
    if (!newPlaylistName.trim()) return;
    const newPlaylist = await createPlaylist(newPlaylistName.trim());
    await addTrackToPlaylist(newPlaylist.id, trackId, trackTitle);
    onClose();
  };

  return (
    <div className="flex flex-col w-64 bg-surface border border-divider rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-divider/50 bg-surface-hover/30">
        <h3 className="text-xs font-bold text-text-primary uppercase tracking-widest">
          Add to Playlist
        </h3>
      </div>

      {/* Search Input */}
      <div className="p-2 border-b border-divider/30">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            placeholder="Search playlists..."
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-hover text-text-primary text-xs pl-9 pr-3 py-2 rounded-lg outline-none focus:ring-1 focus:ring-accent/50 transition-all"
          />
        </div>
      </div>

      {/* Playlist List */}
      <div className="max-h-60 overflow-y-auto custom-scrollbar py-1">
        {filteredPlaylists.length > 0 ? (
          filteredPlaylists.map((p) => {
            const isAlreadyIn = p.trackIds.includes(trackId);
            return (
              <button
                key={p.id}
                disabled={isAlreadyIn}
                onClick={() => handleAddToPlaylist(p.id, p.name)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  isAlreadyIn 
                    ? 'opacity-50 cursor-default' 
                    : 'hover:bg-accent/10 text-text-secondary hover:text-accent group'
                }`}
              >
                <div className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 ${
                  isAlreadyIn ? 'bg-accent/10 text-accent' : 'bg-surface-hover group-hover:bg-accent/20'
                }`}>
                  {isAlreadyIn ? <Check size={16} /> : <ListMusic size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-[10px] opacity-70">{p.trackIds.length} tracks</p>
                </div>
              </button>
            );
          })
        ) : searchQuery ? (
          <div className="px-4 py-8 text-center">
            <Music2 size={24} className="mx-auto mb-2 text-text-secondary/30" />
            <p className="text-xs text-text-secondary">No playlists match "{searchQuery}"</p>
          </div>
        ) : null}
      </div>

      {/* Create New Section */}
      <div className="mt-auto border-t border-divider/50 p-2 bg-surface-hover/20">
        {isCreating ? (
          <div className="space-y-2 animate-in slide-in-from-bottom-2 duration-200">
            <input
              type="text"
              placeholder="Playlist name"
              autoFocus
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateAndAdd()}
              className="w-full bg-surface text-text-primary text-xs px-3 py-2 rounded-lg border border-accent/30 outline-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setIsCreating(false)}
                className="flex-1 py-1.5 text-[10px] font-bold text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAndAdd}
                disabled={!newPlaylistName.trim()}
                className="flex-1 py-1.5 bg-accent text-primary text-[10px] font-bold rounded-lg hover:scale-105 transition-transform disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsCreating(true)}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-accent hover:bg-accent/10 rounded-lg transition-all"
          >
            <Plus size={16} />
            <span>Create New Playlist</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default PlaylistSelector;
