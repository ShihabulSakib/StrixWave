import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import useAudioEngine from '../hooks/useAudioEngine';
import type { OutputDevice } from '../hooks/useAudioEngine';

// -------------------------------------------------------------------
// Track Interface (extended with dropboxPath)
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
  coverBlob?: Blob; // Added for persistence fix
  audioUrl?: string;
  dropboxPath?: string;
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
  currentTime: number;
  duration: number;
  volume: number;
  progress: number; // 0-100 percentage for backward compat

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
  setProgress: (progress: number) => void;
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

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

// -------------------------------------------------------------------
// Provider
// -------------------------------------------------------------------

export const PlayerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const engine = useAudioEngine();

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

  // -------------------------------------------------------------------
  // Wire engine's onTrackEnd to advance queue
  // -------------------------------------------------------------------

  useEffect(() => {
    engine.onTrackEnd(() => {
      advanceQueue();
    });
  }, [queue, queueIndex, shuffle, repeat]);

  const advanceQueue = useCallback(() => {
    if (queue.length === 0) return;

    if (repeat === 'one') {
      // Replay current
      const track = queue[queueIndex];
      if (track?.dropboxPath) {
        const next = getNextTrack();
        engine.playTrack(track.dropboxPath, next?.dropboxPath);
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
    if (track?.dropboxPath) {
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
      
      // If we got here via gapless handoff, the engine already started playing 'track'.
      // We just need to tell it about the NEXT track.
      if (engine.isPlaying) {
        if (upcomingNext?.dropboxPath) {
           engine.updateNextTrack(upcomingNext.dropboxPath);
        }
      } else {
        // If it wasn't gapless (e.g. manually skipped), we play it normally.
        engine.playTrack(track.dropboxPath, upcomingNext?.dropboxPath);
      }
    }
  }, [queue, queueIndex, shuffle, repeat, engine, generateShuffleOrder, getNextTrack]);

  // -------------------------------------------------------------------
  // Trigger pre-fetch when nextTrack changes
  // -------------------------------------------------------------------

  useEffect(() => {
    if (nextTrack?.dropboxPath) {
      engine.prefetchNextTrack(nextTrack.dropboxPath);
      engine.updateNextTrack(nextTrack.dropboxPath);
    }
  }, [nextTrack?.id, engine]);

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

      if (track.dropboxPath) {
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
        engine.playTrack(track.dropboxPath, next?.dropboxPath);
      } else {
        // Mock track — just update UI state
        console.log('Playing track:', track.title, '| No dropboxPath — mock mode');
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
    if (track?.dropboxPath) {
      const next = getNextTrack();
      engine.playTrack(track.dropboxPath, next?.dropboxPath);
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
        if (track.dropboxPath) {
          const next = tracks[startIndex + 1];
          engine.playTrack(track.dropboxPath, next?.dropboxPath);
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

  // Backward compat: progress as percentage
  const progress = engine.duration > 0 ? engine.currentTime : 0;

  return (
    <PlayerContext.Provider
      value={{
        isPlaying: engine.isPlaying,
        isBuffering: engine.isBuffering,
        currentTrack,
        currentTime: engine.currentTime,
        duration: engine.duration,
        volume: engine.volume * 100, // 0-100 for UI
        progress,

        queue,
        queueIndex,
        nextTrack,
        shuffle,
        repeat,

        searchQuery,
        isPlayerExpanded,
        isQueueOpen,

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
        setProgress: (p: number) => engine.seek(p), // backward compat
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
      }}
    >
      {children}
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

export default PlayerContext;
