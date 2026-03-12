import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, Heart, Clock, MoreHorizontal, Download, Loader2, Cloud, Music2, ListMusic, Plus } from 'lucide-react';
import TopNav from './TopNav';
import TrackCover from './TrackCover';
import ConnectionManager from './ConnectionManager';
import TrackRow from './shared/TrackRow';
import { usePlayer, type Track } from '../context/PlayerContext';
import { usePlaylists } from '../context/PlaylistContext';
import { getAllTracks } from '../services/db';

const ROW_HEIGHT = 56;
const HEADER_THRESHOLD = 320;

export const YourLibrary: React.FC<{ onPlaylistSelect?: (id: string) => void }> = ({ onPlaylistSelect }) => {
  const {
    currentTrack,
    isPlaying,
    isBuffering,
    playTrack,
    setQueue,
  } = usePlayer();

  const { allPlaylists, getPlaylistTracks, createPlaylist, playlists } = usePlaylists();
  
  const [activeTab, setActiveTab] = useState<'songs' | 'playlists'>('songs');

  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConnectionManager, setShowConnectionManager] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

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

  const loadTracks = useCallback(async () => {
    setLoading(true);
    try {
      const stored = await getAllTracks();
      const mapped: Track[] = stored.map((t) => ({
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
      setTracks(mapped);
    } catch (err) {
      console.error('[YourLibrary] Failed to load tracks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTracks();

    // Listen for library sync events
    window.addEventListener('library-synced', loadTracks);
    return () => window.removeEventListener('library-synced', loadTracks);
  }, [loadTracks]);

  const handleTrackClick = useCallback(
    (index: number) => {
      setQueue(tracks, index);
    },
    [tracks, setQueue]
  );

  const handlePlayAll = useCallback(() => {
    if (tracks.length > 0) {
      setQueue(tracks, 0);
    }
  }, [tracks, setQueue]);

  const headerInfo = {
    title: 'Your Library',
    description: 'Synced from Dropbox',
    type: 'Collection',
    coverUrl: tracks[0]?.coverUrl || 'https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=300&h=300&fit=crop',
    coverBlob: tracks[0]?.coverBlob,
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      <div className={`relative bg-gradient-to-b from-blue-900/40 to-primary/10`}>
        <TopNav />
        
        {/* Sibling Tab Layout */}
        <div className="px-6 md:px-8 pt-4 pb-2">
          <div className="flex items-center gap-1 bg-surface-hover/80 p-1 md:p-1.5 rounded-xl w-full max-w-sm mx-auto md:mx-0 backdrop-blur-sm border border-white/5 shadow-inner">
            <button
              onClick={() => setActiveTab('songs')}
              className={`flex-1 py-1.5 md:py-2 text-sm font-semibold rounded-lg transition-all duration-300 ${
                activeTab === 'songs' 
                  ? 'bg-[#FFB100] text-[#0A192F] shadow-md scale-[1.02]' 
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
              }`}
            >
              Songs
            </button>
            <button
              onClick={() => setActiveTab('playlists')}
              className={`flex-1 py-1.5 md:py-2 text-sm font-semibold rounded-lg transition-all duration-300 ${
                activeTab === 'playlists' 
                  ? 'bg-[#FFB100] text-[#0A192F] shadow-md scale-[1.02]' 
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
              }`}
            >
              Playlists
            </button>
          </div>
        </div>

        {activeTab === 'songs' && (
          <div className="px-6 md:px-8 pb-8 pt-4 flex flex-col md:flex-row items-start md:items-end gap-6 md:gap-8">
            <div className="w-36 h-36 md:w-52 md:h-52 flex-shrink-0 shadow-2xl transition-transform hover:scale-[1.02] duration-300">
              <TrackCover
                coverUrl={headerInfo.coverUrl}
                coverBlob={headerInfo.coverBlob}
                alt={headerInfo.title}
                className="w-full h-full object-cover rounded-xl shadow-2xl"
              />
            </div>

            <div className="flex flex-col gap-2 md:gap-3">
              <h1 className="text-4xl md:text-7xl font-black text-text-primary tracking-tight">
                {headerInfo.title}
              </h1>
              <div className="flex items-center gap-2 text-sm text-text-secondary mt-1">
                <span className="text-text-primary font-bold">Strixwave</span>
                <span>•</span>
                <span className="tabular-nums">{tracks.length} songs</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {activeTab === 'songs' ? (
        <>
          <div className="px-6 md:px-8 py-6 flex items-center gap-6 md:gap-8">
            <button
              onClick={handlePlayAll}
              disabled={tracks.length === 0}
              className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-accent flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-xl disabled:opacity-50 disabled:scale-100"
            >
              {isPlaying && tracks.some(t => t.id === currentTrack?.id) ? (
                <Pause size={24} className="fill-primary text-primary md:w-7 md:h-7" />
              ) : (
                <Play size={24} className="fill-primary text-primary ml-1 md:w-7 md:h-7" />
              )}
            </button>
            <button className="text-text-secondary hover:text-accent transition-colors">
              <Heart size={28} className="md:w-8 md:h-8" />
            </button>
          </div>

          <div className="px-6 md:px-8 pb-32 md:pb-12" ref={containerRef}>
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={40} className="animate-spin text-accent" />
              </div>
            ) : tracks.length > 0 ? (
              <>
                <div className="hidden md:grid grid-cols-[auto_1fr_1fr_auto] gap-4 px-4 py-3 text-text-secondary text-[11px] font-bold uppercase tracking-widest border-b border-divider/10 mb-4 sticky top-0 bg-primary/80 backdrop-blur-md z-10">
                  <span className="w-8 text-center">#</span>
                  <span>Title</span>
                  <span>Album</span>
                  <span className="text-right pr-4">
                    <Clock size={16} />
                  </span>
                </div>

                <div className="space-y-1">
                  {tracks.map((track, index) => (
                    <TrackRow
                      key={track.id}
                      track={track}
                      index={index}
                      isActive={currentTrack?.id === track.id}
                      isPlaying={isPlaying}
                      isBuffering={isBuffering}
                      onTrackClick={handleTrackClick}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-24 h-24 bg-surface-hover rounded-3xl flex items-center justify-center mb-8 rotate-3 shadow-inner">
                  <Music2 size={48} className="text-text-secondary/40 -rotate-3" />
                </div>
                <h3 className="text-2xl font-bold text-text-primary mb-3">
                  Your library is empty
                </h3>
                <p className="text-text-secondary max-w-sm mb-10 leading-relaxed">
                  Connect your Dropbox account and sync your music to start streaming your personal library.
                </p>
                <button
                  onClick={() => setShowConnectionManager(true)}
                  className="flex items-center gap-3 px-10 py-4 rounded-full bg-accent hover:bg-accent-hover text-primary font-bold transition-all hover:scale-105 shadow-xl shadow-accent/20"
                >
                  <Cloud size={24} />
                  <span>Connect Dropbox</span>
                </button>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="px-6 md:px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-text-primary">All Playlists</h2>
            <button
              onClick={handleCreatePlaylist}
              className="flex items-center gap-2 px-4 py-2 bg-accent/10 hover:bg-accent/20 text-accent rounded-full transition-all duration-300 text-sm font-bold border border-accent/20"
            >
              <Plus size={18} />
              <span>Create Playlist</span>
            </button>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
            {/* Create New Playlist Card */}
            <div 
              onClick={handleCreatePlaylist}
              className="group cursor-pointer bg-surface/40 hover:bg-surface p-3 md:p-4 rounded-xl transition-all duration-300 border border-white/5 hover:border-accent/20 flex flex-col items-center justify-center aspect-square md:aspect-auto"
            >
              <div className="aspect-square w-full rounded-lg mb-4 overflow-hidden shadow-lg flex items-center justify-center relative bg-surface-hover group-hover:bg-accent/10 transition-colors">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 group-hover:bg-accent/20 transition-all duration-300 text-text-secondary group-hover:text-accent">
                  <Plus size={32} strokeWidth={3} />
                </div>
              </div>
              <h3 className="font-bold text-text-primary text-center text-sm md:text-base">
                Create New
              </h3>
              <p className="text-[10px] md:text-xs text-text-secondary text-center mt-1">
                New Playlist
              </p>
            </div>

            {allPlaylists.map(playlist => {
              const isLikedSongs = playlist.id === 'liked-songs';
              
              return (
                <div 
                  key={playlist.id}
                  onClick={() => onPlaylistSelect && onPlaylistSelect(playlist.id)}
                  className="group cursor-pointer bg-surface/40 hover:bg-surface p-3 md:p-4 rounded-xl transition-all duration-300 border border-white/5 hover:border-accent/20"
                >
                  <div className={`aspect-square w-full rounded-lg mb-4 overflow-hidden shadow-lg flex items-center justify-center relative ${
                    isLikedSongs ? 'bg-gradient-to-br from-indigo-600 to-purple-400' : 'bg-surface-hover'
                  }`}>
                    {isLikedSongs ? (
                      <Heart size={40} className="text-white drop-shadow-md group-hover:scale-110 transition-transform duration-300" fill="currentColor" />
                    ) : playlist.coverUrl ? (
                      <img src={playlist.coverUrl} alt={playlist.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <ListMusic size={40} className="text-text-secondary/40 group-hover:scale-110 transition-transform duration-300" />
                    )}
                    {/* Play Overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-accent shadow-xl flex items-center justify-center scale-90 group-hover:scale-100 transition-transform duration-300">
                        <Play size={20} className="fill-primary text-primary ml-1" />
                      </div>
                    </div>
                  </div>
                  <h3 className="font-semibold text-text-primary truncate text-base mb-1 flex items-center gap-2">
                    {playlist.name}
                    {playlist.isFavorite && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent/20 text-accent font-bold uppercase tracking-wider">
                        Fav
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-text-secondary truncate">
                    {isLikedSongs ? `${playlist.trackIds.length} liked songs` : `${playlist.trackIds.length} tracks`}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

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

      <ConnectionManager
        isOpen={showConnectionManager}
        onClose={() => setShowConnectionManager(false)}
      />
    </div>
  );
};

export default YourLibrary;
