import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { useNotification } from '../components/NotificationProvider';
import { 
  Playlist, 
  getAllPlaylists, 
  upsertPlaylist, 
  deletePlaylist, 
  getTracksByIds 
} from '../services/db';
import { Track, usePlayer } from './PlayerContext';

const LIKED_SONGS_ID = 'liked-songs';

interface PlaylistContextType {
  playlists: Playlist[];
  allPlaylists: Playlist[]; // Includes virtual ones
  loading: boolean;
  createPlaylist: (name: string, description?: string) => Promise<Playlist>;
  updatePlaylist: (playlist: Playlist) => Promise<void>;
  removePlaylist: (id: string) => Promise<void>;
  toggleFavoritePlaylist: (id: string) => Promise<void>;
  addTrackToPlaylist: (playlistId: string, trackId: string, trackTitle?: string) => Promise<void>;
  removeTrackFromPlaylist: (playlistId: string, trackId: string, trackTitle?: string) => Promise<void>;
  getPlaylistTracks: (playlistId: string) => Promise<Track[]>;
  refreshPlaylists: () => Promise<void>;
}

const PlaylistContext = createContext<PlaylistContextType | undefined>(undefined);

export const PlaylistProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const { success, info } = useNotification();
  const { likedTrackIds } = usePlayer();

  const allPlaylists = useMemo(() => {
    const likedSongs: Playlist = {
      id: LIKED_SONGS_ID,
      name: 'Liked Songs',
      description: 'Your favorite tracks',
      trackIds: likedTrackIds,
      isFavorite: true,
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Sort playlists: Favorites first, then by updatedAt
    const sorted = [...playlists].sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return b.updatedAt.localeCompare(a.updatedAt);
    });

    return [likedSongs, ...sorted];
  }, [playlists, likedTrackIds]);

  const refreshPlaylists = useCallback(async () => {
    setLoading(true);
    try {
      const all = await getAllPlaylists();
      setPlaylists(all);
    } catch (err) {
      console.error('[PlaylistContext] Failed to load playlists:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshPlaylists();
  }, [refreshPlaylists]);

  const createPlaylist = async (name: string, description?: string) => {
    const newPlaylist: Playlist = {
      id: crypto.randomUUID(),
      name,
      description,
      trackIds: [],
      isFavorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await upsertPlaylist(newPlaylist);
    await refreshPlaylists();
    success(`Playlist "${name}" created`);
    return newPlaylist;
  };

  const updatePlaylist = async (playlist: Playlist) => {
    if (playlist.id === LIKED_SONGS_ID) return; // Cannot update virtual playlist directly
    const updated = { ...playlist, updatedAt: new Date().toISOString() };
    await upsertPlaylist(updated);
    await refreshPlaylists();
  };

  const removePlaylist = async (id: string) => {
    if (id === LIKED_SONGS_ID) {
      info('The "Liked Songs" playlist cannot be deleted');
      return;
    }
    const playlist = playlists.find(p => p.id === id);
    await deletePlaylist(id);
    await refreshPlaylists();
    if (playlist) info(`Playlist "${playlist.name}" removed`);
  };

  const toggleFavoritePlaylist = async (id: string) => {
    if (id === LIKED_SONGS_ID) return;
    const playlist = playlists.find(p => p.id === id);
    if (!playlist) return;

    const isFav = !playlist.isFavorite;
    await updatePlaylist({ ...playlist, isFavorite: isFav });
    if (isFav) {
      success(`Added "${playlist.name}" to favorites`);
    } else {
      info(`Removed "${playlist.name}" from favorites`);
    }
  };

  const addTrackToPlaylist = async (playlistId: string, trackId: string, trackTitle?: string) => {
    if (playlistId === LIKED_SONGS_ID) {
      // Handled by PlayerContext toggleLike usually, but for completeness:
      // However, we don't have access to toggleLike here easily without creating a circular dependency
      // or moving toggleLike to a better place. For now, let's assume UI uses toggleLike for this.
      return;
    }
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return;
    
    if (!playlist.trackIds.includes(trackId)) {
      const updatedTrackIds = [...playlist.trackIds, trackId];
      await updatePlaylist({ ...playlist, trackIds: updatedTrackIds });
      success(`${trackTitle || 'Track'} added to "${playlist.name}"`);
    } else {
      info(`Already in "${playlist.name}"`);
    }
  };

  const removeTrackFromPlaylist = async (playlistId: string, trackId: string, trackTitle?: string) => {
    if (playlistId === LIKED_SONGS_ID) return;
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return;
    
    const updatedTrackIds = playlist.trackIds.filter(id => id !== trackId);
    await updatePlaylist({ ...playlist, trackIds: updatedTrackIds });
    info(`${trackTitle || 'Track'} removed from "${playlist.name}"`);
  };

  const getPlaylistTracks = useCallback(async (playlistId: string): Promise<Track[]> => {
    let trackIds: string[] = [];
    if (playlistId === LIKED_SONGS_ID) {
      trackIds = likedTrackIds;
    } else {
      const playlist = playlists.find(p => p.id === playlistId);
      if (!playlist) return [];
      trackIds = playlist.trackIds;
    }
    
    const storedTracks = await getTracksByIds(trackIds);
    // Map StoredTrack to Track interface used in PlayerContext
    return storedTracks.map(t => ({
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
  }, [likedTrackIds, playlists]);

  return (
    <PlaylistContext.Provider
      value={{
        playlists,
        allPlaylists,
        loading,
        createPlaylist,
        updatePlaylist,
        removePlaylist,
        toggleFavoritePlaylist,
        addTrackToPlaylist,
        removeTrackFromPlaylist,
        getPlaylistTracks,
        refreshPlaylists,
      }}
    >
      {children}
    </PlaylistContext.Provider>
  );
};

export const usePlaylists = () => {
  const context = useContext(PlaylistContext);
  if (!context) {
    throw new Error('usePlaylists must be used within a PlaylistProvider');
  }
  return context;
};
