import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, Heart, Clock, MoreHorizontal, Download, Loader2, Cloud, Music2, ListMusic } from 'lucide-react';
import TopNav from './TopNav';
import TrackCover from './TrackCover';
import ConnectionManager from './ConnectionManager';
import { usePlayer, type Track } from '../context/PlayerContext';
import { usePlaylists } from '../context/PlaylistContext';
import { getAllTracks } from '../services/db';

const ROW_HEIGHT = 56;
const HEADER_THRESHOLD = 320;

interface TrackRowDataProps {
  displayTracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  isBuffering: boolean;
  hoveredTrack: string | null;
  handleTrackClick: (index: number) => void;
  setHoveredTrack: (id: string | null) => void;
}

const TrackRow = ({
  index,
  style,
  displayTracks,
  currentTrack,
  isPlaying,
  isBuffering,
  hoveredTrack,
  handleTrackClick,
  setHoveredTrack,
}: {
  index: number;
  style: React.CSSProperties;
} & TrackRowDataProps) => {
  const { playlists, addTrackToPlaylist } = usePlaylists();
  const { isTrackLiked, toggleLike } = usePlayer();
  const [showAddMenu, setShowAddMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowAddMenu(false);
      }
    };
    if (showAddMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAddMenu]);

  const track = displayTracks[index];
  if (!track) return null;
  const isActive = currentTrack?.id === track.id;

  return (
    <div
      style={style}
      className={`group flex items-center md:grid md:grid-cols-[auto_1fr_1fr_auto] gap-3 md:gap-4 px-2 md:px-4 py-1.5 rounded-md hover:bg-surface-hover transition-colors cursor-pointer ${
        isActive ? 'bg-surface-hover' : ''
      }`}
      onClick={() => handleTrackClick(index)}
      onMouseEnter={() => setHoveredTrack(track.id)}
      onMouseLeave={() => setHoveredTrack(null)}
    >
      <div className="hidden md:flex w-8 items-center justify-center text-text-secondary">
        {isActive && isBuffering ? (
          <Loader2 size={16} className="animate-spin text-accent" />
        ) : isActive && isPlaying ? (
          <div className="w-4 h-4 flex items-center justify-center gap-0.5">
            <div className="w-1 h-3 bg-accent rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
            <div className="w-1 h-4 bg-accent rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
            <div className="w-1 h-2 bg-accent rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
          </div>
        ) : hoveredTrack === track.id ? (
          <Play size={16} className="fill-current text-text-primary" />
        ) : (
          <span className={isActive ? 'text-accent' : ''}>{index + 1}</span>
        )}
      </div>

      <div className="flex items-center gap-3 min-w-0 flex-1 md:flex-none">
        <TrackCover
          coverUrl={track.coverUrl}
          coverBlob={track.coverBlob}
          alt={track.title}
          className="w-12 h-12 md:w-10 md:h-10 rounded object-cover shadow-sm"
        />
        <div className="min-w-0">
          <p className={`font-semibold truncate ${isActive ? 'text-accent' : 'text-text-primary'}`}>
            {track.title}
          </p>
          <p className="text-text-secondary text-xs truncate group-hover:text-text-primary transition-colors">
            {track.artist}
          </p>
        </div>
      </div>

      <div className="hidden md:flex items-center text-text-secondary text-sm truncate">
        {track.album}
      </div>

      <div className="flex items-center justify-end gap-2 md:gap-4 text-text-secondary text-sm ml-auto">
        <button
          className={`transition-all hidden md:block ${isTrackLiked(track.id) ? 'text-accent opacity-100' : 'text-text-primary hover:text-accent opacity-0 group-hover:opacity-100'}`}
          onClick={(e) => {
            e.stopPropagation();
            toggleLike(track.id, track.title);
          }}
        >
          <Heart size={16} fill={isTrackLiked(track.id) ? 'currentColor' : 'none'} />
        </button>
        <span className="w-10 text-right hidden md:block tabular-nums">{track.duration}</span>
        
        <div className="flex items-center gap-1 relative" ref={menuRef}>
          <button
            className="text-text-secondary hover:text-text-primary transition-all p-2 md:p-1 md:opacity-0 md:group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              setShowAddMenu(!showAddMenu);
            }}
          >
            <MoreHorizontal size={20} className="md:w-4 md:h-4" />
          </button>

          {showAddMenu && (
            <div className="absolute right-0 bottom-full mb-2 w-48 bg-surface border border-divider rounded-md shadow-xl z-50 py-1 overflow-hidden">
              <div className="px-3 py-2 text-[10px] font-bold text-text-secondary uppercase border-b border-divider/50 mb-1">
                Add to playlist
              </div>
              <div className="max-h-48 overflow-y-auto custom-scrollbar">
                {playlists.map(p => (
                  <button
                    key={p.id}
                    className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors truncate"
                    onClick={(e) => {
                      e.stopPropagation();
                      addTrackToPlaylist(p.id, track.id, track.title);
                      setShowAddMenu(false);
                    }}
                  >
                    {p.name}
                  </button>
                ))}
                {playlists.length === 0 && (
                  <div className="px-3 py-2 text-[10px] text-text-secondary italic">
                    No playlists found
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const YourLibrary: React.FC<{ onPlaylistSelect?: (id: string) => void }> = ({ onPlaylistSelect }) => {
  const {
    currentTrack,
    isPlaying,
    isBuffering,
    playTrack,
    setQueue,
  } = usePlayer();

  const { allPlaylists, getPlaylistTracks } = usePlaylists();
  
  const [activeTab, setActiveTab] = useState<'songs' | 'playlists'>('songs');

  const [hoveredTrack, setHoveredTrack] = useState<string | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConnectionManager, setShowConnectionManager] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const rowProps = {
    displayTracks: tracks,
    currentTrack,
    isPlaying,
    isBuffering,
    hoveredTrack,
    handleTrackClick,
    setHoveredTrack,
  };

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
                      index={index}
                      style={{}}
                      displayTracks={tracks}
                      currentTrack={currentTrack}
                      isPlaying={isPlaying}
                      isBuffering={isBuffering}
                      hoveredTrack={hoveredTrack}
                      handleTrackClick={handleTrackClick}
                      setHoveredTrack={setHoveredTrack}
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
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
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
            
            {allPlaylists.length === 1 && (
              <div className="col-span-full py-20 flex flex-col items-center justify-center text-center">
                <ListMusic size={48} className="text-text-secondary/20 mb-4" />
                <h3 className="text-lg font-bold text-text-primary mb-2">No Custom Playlists</h3>
                <p className="text-sm text-text-secondary max-w-xs">Create playlists from the sidebar or by clicking the 'More' options on any track.</p>
              </div>
            )}
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
