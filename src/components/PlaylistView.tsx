import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Play,
  Pause,
  Heart,
  Clock,
  MoreHorizontal,
  Download,
  Loader2,
  Cloud,
  Music2,
  Trash2,
} from 'lucide-react';
import TopNav from './TopNav';
import TrackCover from './TrackCover';
import ConnectionManager from './ConnectionManager';
import TrackRow from './shared/TrackRow';
import { usePlayer, type Track } from '../context/PlayerContext';
import { usePlaylists } from '../context/PlaylistContext';
import { getAllTracks } from '../services/db';

interface PlaylistViewProps {
  playlistId?: string | null;
}

export const PlaylistView: React.FC<PlaylistViewProps> = ({ playlistId }) => {
  const {
    currentTrack,
    isPlaying,
    isBuffering,
    playTrack,
    setQueue,
    likedTrackIds,
  } = usePlayer();

  const { allPlaylists, getPlaylistTracks, removeTrackFromPlaylist, removePlaylist, toggleFavoritePlaylist } = usePlaylists();

  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConnectionManager, setShowConnectionManager] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const playlist = useMemo(() => 
    playlistId ? allPlaylists.find(p => p.id === playlistId) : null
  , [allPlaylists, playlistId]);

  const isFavorite = playlist?.isFavorite || false;

  const handleToggleFavorite = () => {
    if (playlistId) {
      toggleFavoritePlaylist(playlistId);
    }
  };

  const loadTracks = useCallback(async () => {
    setLoading(true);
    try {
      if (playlistId === 'liked-songs') {
        const stored = await getAllTracks();
        const mapped: Track[] = stored
          .filter(t => likedTrackIds.includes(t.id))
          .map((t) => ({
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
      } else if (playlistId) {
        const pTracks = await getPlaylistTracks(playlistId);
        setTracks(pTracks);
      } else {
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
      }
    } catch (err) {
      console.error('[PlaylistView] Failed to load tracks:', err);
    } finally {
      setLoading(false);
    }
  }, [playlistId, getPlaylistTracks, likedTrackIds]);

  useEffect(() => {
    loadTracks();
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

  const handleRemoveTrack = async (trackId: string) => {
    if (playlistId) {
      const track = tracks.find(t => t.id === trackId);
      await removeTrackFromPlaylist(playlistId, trackId, track?.title);
      loadTracks();
    }
  };

  const handleDeletePlaylist = async () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (playlistId) {
      await removePlaylist(playlistId);
      // Parent will handle navigation via state change
    }
    setShowDeleteConfirm(false);
  };

  const headerInfo = useMemo(() => {
    if (playlistId === 'liked-songs') {
      const firstTrack = tracks[0];
      return {
        title: 'Liked Songs',
        description: 'Your favorite tracks',
        type: 'Playlist',
        coverUrl: firstTrack?.coverUrl || 'https://images.unsplash.com/photo-1558503142-6e118ba82d3b?w=300&h=300&fit=crop',
        coverBlob: firstTrack?.coverBlob,
      };
    }
    if (playlist) {
      const firstTrack = tracks[0];
      return {
        title: playlist.name,
        description: playlist.description || 'User Playlist',
        type: 'Playlist',
        coverUrl: firstTrack?.coverUrl || playlist.coverUrl || 'https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=300&h=300&fit=crop',
        coverBlob: firstTrack?.coverBlob,
      };
    }
    return {
      title: 'My Library',
      description: 'Synced from Dropbox',
      type: 'Your Dropbox Library',
      coverUrl: tracks[0]?.coverUrl || 'https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=300&h=300&fit=crop',
      coverBlob: tracks[0]?.coverBlob,
    };
  }, [playlist, tracks, playlistId]);

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      <div className={`relative bg-gradient-to-b ${playlistId ? 'from-purple-900/40' : 'from-blue-900/40'} to-primary/10`}>
        <TopNav />

        <div className="px-8 pb-8 pt-4 flex flex-col md:flex-row items-start md:items-end gap-8">
          <div className="w-52 h-52 flex-shrink-0 shadow-2xl transition-transform hover:scale-[1.02] duration-300">
            <TrackCover
              coverUrl={headerInfo.coverUrl}
              coverBlob={headerInfo.coverBlob}
              alt={headerInfo.title}
              className="w-full h-full object-cover rounded-lg shadow-2xl"
            />
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold text-text-primary uppercase tracking-[0.2em]">
              {headerInfo.type}
            </span>
            <h1 className="text-5xl md:text-7xl font-black text-text-primary tracking-tight">
              {headerInfo.title}
            </h1>
            <p className="text-text-secondary font-medium">
              {headerInfo.description}
            </p>
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <span className="text-text-primary font-bold">Strixwave</span>
              <span>•</span>
              <span className="tabular-nums">{tracks.length} songs</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-8 py-8 flex items-center gap-8">
        <button
          onClick={handlePlayAll}
          disabled={tracks.length === 0}
          className="w-14 h-14 rounded-full bg-accent flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-xl disabled:opacity-50 disabled:scale-100"
        >
          {isPlaying && tracks.some(t => t.id === currentTrack?.id) ? (
            <Pause size={28} className="fill-primary text-primary" />
          ) : (
            <Play size={28} className="fill-primary text-primary ml-1" />
          )}
        </button>
        <button 
          onClick={handleToggleFavorite}
          className={`transition-colors ${isFavorite ? 'text-accent' : 'text-text-secondary hover:text-accent'}`}
        >
          <Heart size={32} fill={isFavorite ? 'currentColor' : 'none'} />
        </button>
        
        {playlistId && playlistId !== 'liked-songs' && (
          <button 
            onClick={handleDeletePlaylist}
            className="text-text-secondary hover:text-red-500 transition-colors"
            title="Delete Playlist"
          >
            <Trash2 size={24} />
          </button>
        )}

        <button className="text-text-secondary hover:text-text-primary transition-colors ml-auto">
          <Download size={24} />
        </button>
      </div>

      <div className="px-8 pb-32 md:pb-12" ref={containerRef}>
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
                  onRemoveTrack={playlistId && playlistId !== 'liked-songs' ? handleRemoveTrack : undefined}
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
              {playlistId ? 'This playlist is empty' : 'Your library is empty'}
            </h3>
            <p className="text-text-secondary max-w-sm mb-10 leading-relaxed">
              {playlistId 
                ? 'Add some songs to this playlist from your library to start listening.'
                : 'Connect your Dropbox account and sync your music to start streaming your personal library.'}
            </p>
            {!playlistId && (
              <button
                onClick={() => setShowConnectionManager(true)}
                className="flex items-center gap-3 px-10 py-4 rounded-full bg-accent hover:bg-accent-hover text-primary font-bold transition-all hover:scale-105 shadow-xl shadow-accent/20"
              >
                <Cloud size={24} />
                <span>Connect Dropbox</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-surface rounded-xl p-6 w-full max-w-sm border border-red-500/20 shadow-2xl relative z-[101]">
            <h3 className="text-lg font-bold text-text-primary mb-2">Delete Playlist?</h3>
            <p className="text-text-secondary mb-6 text-sm">
              Are you sure you want to delete <span className="text-text-primary font-medium">{headerInfo.title}</span>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-500 text-white rounded-lg font-bold hover:scale-105 transition-transform"
              >
                Delete
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

export default PlaylistView;
