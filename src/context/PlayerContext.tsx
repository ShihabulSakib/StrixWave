import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode, useMemo } from 'react';
import { useNotification } from '../components/NotificationProvider';
import useAudioEngine from '../hooks/useAudioEngine';
import type { OutputDevice } from '../hooks/useAudioEngine';
import { getTracksByIds } from '../services/db';

// -------------------------------------------------------------------
// Track Interface (aligned with StoredTrack)
// -------------------------------------------------------------------

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: string;
  durationSeconds: number;
  addedDate: string;
  coverUrl: string;
  coverBlob?: Blob;
  audioUrl?: string;
  providerId: string;
  providerPath: string;
  fileSize?: number;
}

// -------------------------------------------------------------------
// Player Context Type
// -------------------------------------------------------------------

type RepeatMode = 'off' | 'one' | 'all';

interface PlayerContextType {
  // Playback state
  isPlaying: boolean;
  isBuffering: boolean;
  currentTrack: Track | null;
  volume: number;

  // Queue
  queue: Track[];
  queueIndex: number;
  nextTrack: Track | null;
  shuffle: boolean;
  repeat: RepeatMode;

  // UI state
  searchQuery: string;
  isPlayerExpanded: boolean;
  isQueueOpen: boolean;

  // Liked state
  likedTrackIds: string[];
  toggleLike: (trackId: string, trackTitle?: string) => void;
  isTrackLiked: (trackId: string) => boolean;

  // Audio output
  outputDevices: OutputDevice[];
  selectedDevice: string;
  enumerateDevices: () => Promise<void>;

  // Actions
  togglePlay: () => void;
  playTrack: (track: Track) => void;
  pauseTrack: () => void;
  setSearchQuery: (query: string) => void;
  togglePlayerExpansion: () => void;
  toggleQueue: () => void;
  setVolume: (volume: number) => void;
  seekTo: (seconds: number) => void;
  skipNext: () => void;
  skipPrev: () => void;
  setQueue: (tracks: Track[], startIndex?: number) => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  reorderQueue: (from: number, to: number) => void;
  setShuffle: (on: boolean) => void;
  setRepeat: (mode: RepeatMode) => void;
  setOutputDevice: (deviceId: string) => void;
}

interface PlayerProgressContextType {
  currentTime: number;
  duration: number;
  progress: number;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);
const PlayerProgressContext = createContext<PlayerProgressContextType | undefined>(undefined);

// -------------------------------------------------------------------
// Provider
// -------------------------------------------------------------------

export const PlayerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const engine = useAudioEngine();
  const { success, info } = useNotification();

  // Queue state
  const [queue, setQueueState] = useState<Track[]>([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>('off');

  // Current track (derived from queue)
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);

  // Liked tracks state
  const [likedTrackIds, setLikedTrackIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('strixwave-liked-tracks');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const isTrackLiked = useCallback((trackId: string) => {
    return likedTrackIds.includes(trackId);
  }, [likedTrackIds]);

  const toggleLike = useCallback((trackId: string, trackTitle?: string) => {
    setLikedTrackIds(prev => {
      const isLiked = prev.includes(trackId);
      let next;
      if (isLiked) {
        next = prev.filter(id => id !== trackId);
        info(trackTitle ? `Removed ${trackTitle} from Liked Songs` : 'Removed from Liked Songs');
      } else {
        next = [...prev, trackId];
        success(trackTitle ? `Added ${trackTitle} to Liked Songs` : 'Added to Liked Songs');
      }
      try {
        localStorage.setItem('strixwave-liked-tracks', JSON.stringify(next));
      } catch (err) {
        console.error('Failed to save liked tracks', err);
      }
      return next;
    });
  }, [info, success]);

  // L03: Validate liked track IDs against IndexedDB — prune orphans
  useEffect(() => {
    if (likedTrackIds.length === 0) return;

    let cancelled = false;
    const validateLikedTracks = async () => {
      try {
        const existingTracks = await getTracksByIds(likedTrackIds);
        const existingIds = new Set(existingTracks.map(t => t.id));
        const validIds = likedTrackIds.filter(id => existingIds.has(id));

        if (!cancelled && validIds.length !== likedTrackIds.length) {
          console.log(`[PlayerContext] Pruned ${likedTrackIds.length - validIds.length} orphaned liked track IDs`);
          setLikedTrackIds(validIds);
          localStorage.setItem('strixwave-liked-tracks', JSON.stringify(validIds));
        }
      } catch (err) {
        console.warn('[PlayerContext] Failed to validate liked tracks:', err);
      }
    };

    validateLikedTracks();
    return () => { cancelled = true; };
  }, []); // Run once on mount to clean up orphans

  // Shuffle order
  const shuffleOrder = useRef<number[]>([]);

  // Derive nextTrack
  const getNextTrack = useCallback((): Track | null => {
    if (queue.length === 0) return null;

    if (repeat === 'one') return currentTrack;

    let nextIdx: number;
    if (shuffle) {
      const currentShuffleIdx = shuffleOrder.current.indexOf(queueIndex);
      const nextShuffleIdx = currentShuffleIdx + 1;
      if (nextShuffleIdx >= shuffleOrder.current.length) {
        return repeat === 'all' ? queue[shuffleOrder.current[0]] : null;
      }
      nextIdx = shuffleOrder.current[nextShuffleIdx];
    } else {
      nextIdx = queueIndex + 1;
      if (nextIdx >= queue.length) {
        return repeat === 'all' ? queue[0] : null;
      }
    }

    return queue[nextIdx] || null;
  }, [queue, queueIndex, shuffle, repeat, currentTrack]);

  const nextTrack = getNextTrack();

  // -------------------------------------------------------------------
  // Generate shuffle order
  // -------------------------------------------------------------------

  const generateShuffleOrder = useCallback((length: number, currentIdx: number) => {
    const indices = Array.from({ length }, (_, i) => i).filter((i) => i !== currentIdx);
    // Fisher-Yates shuffle
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    // Current track is always first in shuffle
    shuffleOrder.current = [currentIdx, ...indices];
  }, []);

  const advanceQueue = useCallback(() => {
    if (queue.length === 0) return;

    if (repeat === 'one') {
      // Replay current
      const track = queue[queueIndex];
      if (track?.providerPath) {
        const next = getNextTrack();
        engine.playTrack(track as any, next as any);
      }
      return;
    }

    let nextIdx: number;
    if (shuffle) {
      const currentShuffleIdx = shuffleOrder.current.indexOf(queueIndex);
      const nextShuffleIdx = currentShuffleIdx + 1;
      if (nextShuffleIdx >= shuffleOrder.current.length) {
        if (repeat === 'all') {
          generateShuffleOrder(queue.length, queueIndex);
          nextIdx = shuffleOrder.current[0];
        } else {
          engine.stop();
          return;
        }
      } else {
        nextIdx = shuffleOrder.current[nextShuffleIdx];
      }
    } else {
      nextIdx = queueIndex + 1;
      if (nextIdx >= queue.length) {
        if (repeat === 'all') {
          nextIdx = 0;
        } else {
          engine.stop();
          return;
        }
      }
    }

    setQueueIndex(nextIdx);
    const track = queue[nextIdx];
    setCurrentTrack(track);

    // Update engine with the next-next track for prefetching
    if (track?.providerPath) {
      // We need the track after this one for prefetching
      let upcomingNext: Track | null = null;
      if (shuffle) {
        const currentShuffleIdx = shuffleOrder.current.indexOf(nextIdx);
        const nextShuffleIdx = currentShuffleIdx + 1;
        if (nextShuffleIdx < shuffleOrder.current.length) {
          upcomingNext = queue[shuffleOrder.current[nextShuffleIdx]];
        } else if (repeat === 'all') {
          upcomingNext = queue[shuffleOrder.current[0]];
        }
      } else {
        const upcomingIdx = nextIdx + 1;
        if (upcomingIdx < queue.length) {
          upcomingNext = queue[upcomingIdx];
        } else if (repeat === 'all') {
          upcomingNext = queue[0];
        }
      }
      
      // Always play the new track normaly. 
      // The engine handles the internal state if it's already playing.
      engine.playTrack(track as any, upcomingNext as any);
    }
  }, [queue, queueIndex, shuffle, repeat, engine, generateShuffleOrder, getNextTrack]);

  // -------------------------------------------------------------------
  // Wire engine's onTrackEnd to advance queue
  // -------------------------------------------------------------------

  useEffect(() => {
    engine.onTrackEnd(() => {
      advanceQueue();
    });
  }, [queue, queueIndex, shuffle, repeat, advanceQueue, engine]);

  // -------------------------------------------------------------------
  // Trigger pre-fetch when nextTrack changes
  // -------------------------------------------------------------------

  useEffect(() => {
    if (nextTrack?.providerPath) {
      engine.prefetchNextTrack(nextTrack as any);
      engine.updateNextTrack(nextTrack as any);
    }
  }, [nextTrack?.id, nextTrack?.providerPath, engine]);

  // -------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------

  const togglePlay = useCallback(() => {
    if (engine.isPlaying) {
      engine.pause();
    } else {
      engine.play();
    }
  }, [engine]);

  const playTrack = useCallback(
    (track: Track) => {
      setCurrentTrack(track);

      if (track.providerPath) {
        // Find track in queue or add it
        const idx = queue.findIndex((t) => t.id === track.id);
        if (idx >= 0) {
          setQueueIndex(idx);
        } else {
          // Add to end of queue
          const newQueue = [...queue, track];
          setQueueState(newQueue);
          setQueueIndex(newQueue.length - 1);
        }

        const next = getNextTrack();
        engine.playTrack(track as any, next as any);
      } else {
        // Mock track — just update UI state
        console.log('Playing track:', track.title, '| No providerPath — mock mode');
      }
    },
    [queue, engine, getNextTrack]
  );

  const pauseTrack = useCallback(() => {
    engine.pause();
  }, [engine]);

  const seekTo = useCallback(
    (seconds: number) => {
      engine.seek(seconds);
    },
    [engine]
  );

  const skipNext = useCallback(() => {
    if (!engine.canSkip()) return; // 300ms debounce
    advanceQueue();
  }, [engine, advanceQueue]);

  const skipPrev = useCallback(() => {
    if (!engine.canSkip()) return;

    // If >3 seconds into the track, restart it
    if (engine.currentTime > 3) {
      engine.seek(0);
      return;
    }

    // Otherwise go to previous
    let prevIdx: number;
    if (shuffle) {
      const currentShuffleIdx = shuffleOrder.current.indexOf(queueIndex);
      if (currentShuffleIdx <= 0) {
        engine.seek(0);
        return;
      }
      prevIdx = shuffleOrder.current[currentShuffleIdx - 1];
    } else {
      prevIdx = queueIndex - 1;
      if (prevIdx < 0) {
        engine.seek(0);
        return;
      }
    }

    setQueueIndex(prevIdx);
    const track = queue[prevIdx];
    setCurrentTrack(track);
    if (track?.providerPath) {
      const next = getNextTrack();
      engine.playTrack(track as any, next as any);
    }
  }, [engine, queue, queueIndex, shuffle, getNextTrack]);

  const setQueue = useCallback(
    (tracks: Track[], startIndex = 0) => {
      setQueueState(tracks);
      setQueueIndex(startIndex);
      if (shuffle) {
        generateShuffleOrder(tracks.length, startIndex);
      }
      const track = tracks[startIndex];
      if (track) {
        setCurrentTrack(track);
        if (track.providerPath) {
          const next = tracks[startIndex + 1];
          engine.playTrack(track as any, next as any);
        }
      }
    },
    [engine, shuffle, generateShuffleOrder]
  );

  const addToQueue = useCallback((track: Track) => {
    setQueueState((prev) => [...prev, track]);
  }, []);

  const removeFromQueue = useCallback(
    (index: number) => {
      setQueueState((prev) => {
        const next = [...prev];
        next.splice(index, 1);
        return next;
      });
      // Adjust queueIndex if needed
      if (index < queueIndex) {
        setQueueIndex((prev) => prev - 1);
      }
    },
    [queueIndex]
  );

  const reorderQueue = useCallback((from: number, to: number) => {
    setQueueState((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  const handleSetShuffle = useCallback(
    (on: boolean) => {
      setShuffle(on);
      if (on && queue.length > 0) {
        generateShuffleOrder(queue.length, queueIndex);
      }
    },
    [queue.length, queueIndex, generateShuffleOrder]
  );

  const handleSetVolume = useCallback(
    (vol: number) => {
      // vol comes in as 0-100 from UI, engine expects 0-1
      engine.setVolume(vol / 100);
    },
    [engine]
  );

  const togglePlayerExpansion = useCallback(() => {
    setIsPlayerExpanded((prev) => !prev);
  }, []);

  const toggleQueue = useCallback(() => {
    setIsQueueOpen((prev) => !prev);
  }, []);

  // Stable context value
  const playerContextValue = useMemo(() => ({
    isPlaying: engine.isPlaying,
    isBuffering: engine.isBuffering,
    currentTrack,
    volume: engine.volume * 100, // 0-100 for UI

    queue,
    queueIndex,
    nextTrack,
    shuffle,
    repeat,

    searchQuery,
    isPlayerExpanded,
    isQueueOpen,

    likedTrackIds,
    toggleLike,
    isTrackLiked,

    outputDevices: engine.outputDevices,
    selectedDevice: engine.selectedDevice,
    enumerateDevices: engine.enumerateDevices,

    togglePlay,
    playTrack,
    pauseTrack,
    setSearchQuery,
    togglePlayerExpansion,
    toggleQueue,
    setVolume: handleSetVolume,
    seekTo,
    skipNext,
    skipPrev,
    setQueue,
    addToQueue,
    removeFromQueue,
    reorderQueue,
    setShuffle: handleSetShuffle,
    setRepeat,
    setOutputDevice: engine.setOutputDevice,
  }), [
    engine.isPlaying,
    engine.isBuffering,
    currentTrack,
    engine.volume,
    queue,
    queueIndex,
    nextTrack,
    shuffle,
    repeat,
    searchQuery,
    isPlayerExpanded,
    isQueueOpen,
    likedTrackIds,
    toggleLike,
    isTrackLiked,
    engine.outputDevices,
    engine.selectedDevice,
    engine.enumerateDevices,
    togglePlay,
    playTrack,
    pauseTrack,
    togglePlayerExpansion,
    toggleQueue,
    handleSetVolume,
    seekTo,
    skipNext,
    skipPrev,
    setQueue,
    addToQueue,
    removeFromQueue,
    reorderQueue,
    handleSetShuffle,
    engine.setOutputDevice
  ]);

  // Fast context value
  const playerProgressValue = useMemo(() => {
    // Fallback to metadata duration if engine duration isn't available yet
    const engineDuration = engine.duration;
    const fallbackDuration = currentTrack?.durationSeconds || 0;
    
    const displayDuration = (engineDuration && isFinite(engineDuration) && engineDuration > 0)
      ? engineDuration
      : fallbackDuration;

    return {
      currentTime: engine.currentTime,
      duration: displayDuration,
      progress: displayDuration > 0 ? (engine.currentTime / displayDuration) * 100 : 0,
    };
  }, [engine.currentTime, engine.duration, currentTrack]);

  return (
    <PlayerContext.Provider value={playerContextValue}>
      <PlayerProgressContext.Provider value={playerProgressValue}>
        {children}
      </PlayerProgressContext.Provider>
    </PlayerContext.Provider>
  );
};

export const usePlayer = (): PlayerContextType => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
};

export const usePlayerProgress = (): PlayerProgressContextType => {
  const context = useContext(PlayerProgressContext);
  if (!context) {
    throw new Error('usePlayerProgress must be used within a PlayerProvider');
  }
  return context;
};

export default PlayerContext;
