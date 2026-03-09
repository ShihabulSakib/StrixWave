/**
 * useAudioEngine — Gapless Dual-Node Audio Engine
 *
 * Architecture:
 *   - Two persistent HTMLAudioElement nodes: Player_A and Player_B
 *   - Active/Standby model: while A plays, B is pre-warmed
 *   - On A.ended → B.play() → swap roles
 *   - Cache API stores pre-fetched chunks for instant start
 *   - Blob URL lifecycle managed with revokeObjectURL
 *   - 50MB buffer ceiling with oldest-first eviction
 *   - 300ms debounce on skip to prevent API rate limiting
 *   - Audio output device selection via setSinkId()
 *   - Mobile: volume delegates to system (no override)
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import DropboxService from '../services/DropboxService';

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

export interface AudioEngineState {
  currentTime: number;
  duration: number;
  isBuffering: boolean;
  isPlaying: boolean;
  volume: number;
  isMobile: boolean;
}

export interface OutputDevice {
  deviceId: string;
  label: string;
}

// Constants
const PREFETCH_THRESHOLD_SECONDS = 30; // Pre-fetch when <30s remaining
const SKIP_DEBOUNCE_MS = 300;
const MAX_BLOB_CACHE_BYTES = 50 * 1024 * 1024; // 50MB ceiling
const CACHE_NAME = 'strixwave-audio-cache';

// -------------------------------------------------------------------
// Hook
// -------------------------------------------------------------------

export function useAudioEngine() {
  // Two persistent audio nodes
  const playerA = useRef<HTMLAudioElement | null>(null);
  const playerB = useRef<HTMLAudioElement | null>(null);
  const activePlayer = useRef<'A' | 'B'>('A');

  // Blob URL tracking for revocation / memory management
  const blobUrls = useRef<Map<string, { url: string; size: number; createdAt: number }>>(new Map());
  const totalBlobSize = useRef(0);

  // State
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.7);

  // Debounce tracking
  const lastSkipTime = useRef(0);

  // Pre-fetch state
  const prefetchedPath = useRef<string | null>(null);
  const onTrackEndCallback = useRef<(() => void) | null>(null);

  // Mobile detection
  const isMobile = useRef(
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  );

  // Audio output devices
  const [outputDevices, setOutputDevices] = useState<OutputDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('default');

  // -------------------------------------------------------------------
  // Initialize audio nodes
  // -------------------------------------------------------------------

  useEffect(() => {
    playerA.current = new Audio();
    playerB.current = new Audio();

    // Set initial volume (skip on mobile — let system handle it)
    if (!isMobile.current) {
      playerA.current.volume = volume;
      playerB.current.volume = volume;
    }

    // Enumerate output devices
    enumerateDevices();

    return () => {
      // Cleanup
      if (playerA.current) {
        playerA.current.pause();
        playerA.current.src = '';
      }
      if (playerB.current) {
        playerB.current.pause();
        playerB.current.src = '';
      }
      playerA.current = null;
      playerB.current = null;
      revokeAllBlobUrls();
    };
  }, []);

  // -------------------------------------------------------------------
  // Active player helper
  // -------------------------------------------------------------------

  const getActivePlayer = useCallback((): HTMLAudioElement | null => {
    return activePlayer.current === 'A' ? playerA.current : playerB.current;
  }, []);

  const getStandbyPlayer = useCallback((): HTMLAudioElement | null => {
    return activePlayer.current === 'A' ? playerB.current : playerA.current;
  }, []);

  // -------------------------------------------------------------------
  // Output device management
  // -------------------------------------------------------------------

  const enumerateDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioOutputs = devices
        .filter((d) => d.kind === 'audiooutput')
        .map((d) => ({
          deviceId: d.deviceId,
          label: d.label || (d.deviceId === 'default' ? 'System Default' : `Speaker ${d.deviceId.slice(0, 8)}`),
        }));
      setOutputDevices(audioOutputs);
    } catch {
      console.warn('[AudioEngine] Could not enumerate audio devices');
    }
  }, []);

  const setOutputDevice = useCallback(async (deviceId: string) => {
    setSelectedDevice(deviceId);

    const setSink = async (el: HTMLAudioElement | null) => {
      if (el && 'setSinkId' in el) {
        try {
          await (el as any).setSinkId(deviceId);
        } catch (err) {
          console.warn('[AudioEngine] setSinkId failed:', err);
        }
      }
    };

    await setSink(playerA.current);
    await setSink(playerB.current);
  }, []);

  // -------------------------------------------------------------------
  // Blob URL management (Cache limits: 5 mobile, 15 desktop)
  // -------------------------------------------------------------------

  const trackBlobUrl = useCallback((path: string, url: string, size: number) => {
    blobUrls.current.set(path, { url, size, createdAt: Date.now() });

    const maxCacheLimit = isMobile.current ? 5 : 15;

    // Evict oldest until under ceiling
    while (blobUrls.current.size > maxCacheLimit) {
      let oldestKey = '';
      let oldestTime = Infinity;
      for (const [key, entry] of blobUrls.current) {
        if (entry.createdAt < oldestTime) {
          oldestTime = entry.createdAt;
          oldestKey = key;
        }
      }
      if (oldestKey) {
        const entry = blobUrls.current.get(oldestKey)!;
        URL.revokeObjectURL(entry.url);
        blobUrls.current.delete(oldestKey);
        console.log(`[AudioEngine] Evicted blob for "${oldestKey}"`);
      }
    }
  }, []);

  const revokeAllBlobUrls = useCallback(() => {
    for (const [, entry] of blobUrls.current) {
      URL.revokeObjectURL(entry.url);
    }
    blobUrls.current.clear();
    totalBlobSize.current = 0;
  }, []);

  // -------------------------------------------------------------------
  // Cache API helpers
  // -------------------------------------------------------------------

  const cacheChunk = useCallback(async (path: string, blob: Blob) => {
    try {
      const cache = await caches.open(CACHE_NAME);
      const response = new Response(blob);
      await cache.put(`/audio/${encodeURIComponent(path)}`, response);
    } catch (err) {
      console.warn('[AudioEngine] Cache API write failed:', err);
    }
  }, []);

  const getCachedChunk = useCallback(async (path: string): Promise<Blob | null> => {
    try {
      const cache = await caches.open(CACHE_NAME);
      const response = await cache.match(`/audio/${encodeURIComponent(path)}`);
      return response ? await response.blob() : null;
    } catch {
      return null;
    }
  }, []);

  // -------------------------------------------------------------------
  // Core: Load a track into a player node
  // -------------------------------------------------------------------

  const loadTrack = useCallback(
    async (
      player: HTMLAudioElement,
      dropboxPath: string,
      autoplay: boolean = false
    ): Promise<void> => {
      setIsBuffering(true);

      try {
        const dropbox = DropboxService.getInstance();
        const link = await dropbox.getTemporaryLink(dropboxPath);
        
        // Prevent unnecessary reload if source is same
        if (player.src === link && !player.error) {
           if (autoplay && player.paused) {
             await player.play();
             setIsPlaying(true);
           }
           return;
        }

        player.src = link;
        player.load();

        await new Promise<void>((resolve, reject) => {
          const onCanPlay = () => {
            player.removeEventListener('canplay', onCanPlay);
            player.removeEventListener('error', onError);
            resolve();
          };
          const onError = () => {
            player.removeEventListener('canplay', onCanPlay);
            player.removeEventListener('error', onError);
            reject(new Error(`Failed to load audio: ${dropboxPath}`));
          };
          player.addEventListener('canplay', onCanPlay);
          player.addEventListener('error', onError);
        });

        if (autoplay) {
          await player.play();
          setIsPlaying(true);
        }
      } catch (err) {
        console.error('[AudioEngine] loadTrack failed:', err);
        throw err;
      } finally {
        setIsBuffering(false);
      }
    },
    []
  );

  // -------------------------------------------------------------------
  // Pre-fetch next track into standby player
  // -------------------------------------------------------------------

  const prefetchNextTrack = useCallback(
    async (nextDropboxPath: string) => {
      if (!nextDropboxPath) return;
      if (prefetchedPath.current === nextDropboxPath) return; // Already pre-fetched
      
      const standby = getStandbyPlayer();
      if (!standby) return;

      // Don't prefetch if standby is somehow playing
      if (!standby.paused) return;

      prefetchedPath.current = nextDropboxPath;

      try {
        const dropbox = DropboxService.getInstance();
        const link = await dropbox.getTemporaryLink(nextDropboxPath);

        // Load into standby player (no autoplay)
        standby.autoplay = false;
        standby.src = link;
        standby.load();

        console.log(`[AudioEngine] Pre-fetched: ${nextDropboxPath}`);
      } catch (err) {
        console.warn('[AudioEngine] Pre-fetch failed:', err);
        prefetchedPath.current = null;
      }
    },
    [getStandbyPlayer]
  );

  // -------------------------------------------------------------------
  // Event wiring for active player
  // -------------------------------------------------------------------

  const wirePlayerEvents = useCallback(
    (player: HTMLAudioElement, nextTrackPath?: string) => {
      let currentNextPath = nextTrackPath;

      // Time update → report progress + trigger pre-fetch sentinel
      const onTimeUpdate = () => {
        setCurrentTime(player.currentTime);

        // Pre-fetch sentinel: <30s remaining
        if (
          currentNextPath &&
          player.duration &&
          player.duration - player.currentTime < PREFETCH_THRESHOLD_SECONDS
        ) {
          prefetchNextTrack(currentNextPath);
        }
      };

      const onDurationChange = () => {
        setDuration(player.duration || 0);
      };

      const onEnded = () => {
        // Gapless handoff
        const standby = getStandbyPlayer();
        
        // Ensure active player is stopped
        player.pause();

        if (standby && standby.src) {
          // SWAP ROLES IMMEDIATELY before notifying context
          activePlayer.current = activePlayer.current === 'A' ? 'B' : 'A';
          
          standby.play().then(() => {
            setIsPlaying(true);
            prefetchedPath.current = null;
          }).catch(err => {
            console.error('[AudioEngine] Gapless play failed:', err);
          });
          
          // Wire events for the NEW active player
          wirePlayerEvents(standby); 
        }

        // Notify PlayerContext to advance queue
        // This is now safe because roles are swapped and events are wired
        if (onTrackEndCallback.current) {
          onTrackEndCallback.current();
        }
      };

      const onWaiting = () => setIsBuffering(true);
      const onCanPlay = () => setIsBuffering(false);
      const onPlay = () => setIsPlaying(true);
      const onPause = () => setIsPlaying(false);

      // Remove old listeners from BOTH players to be safe
      if (playerA.current) {
        playerA.current.ontimeupdate = null;
        playerA.current.onended = null;
      }
      if (playerB.current) {
        playerB.current.ontimeupdate = null;
        playerB.current.onended = null;
      }

      // Set listeners for THIS player
      player.ontimeupdate = onTimeUpdate;
      player.ondurationchange = onDurationChange;
      player.onended = onEnded;
      player.onwaiting = onWaiting;
      player.oncanplay = onCanPlay;
      player.onplay = onPlay;
      player.onpause = onPause;

      return (newNextPath: string) => {
        currentNextPath = newNextPath;
      };
    },
    [getStandbyPlayer, prefetchNextTrack]
  );

  const nextPathUpdater = useRef<((path: string) => void) | null>(null);

  // -------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------

  /**
   * Play a track by its Dropbox path.
   * Loads into active player and starts playback.
   */
  const playTrack = useCallback(
    async (dropboxPath: string, nextDropboxPath?: string) => {
      const active = getActivePlayer();
      if (!active) return;

      // Check if link is still fresh
      const dropbox = DropboxService.getInstance();
      if (!dropbox.isLinkFresh(dropboxPath)) {
        dropbox.invalidateLink(dropboxPath);
      }

      await loadTrack(active, dropboxPath, true);
      nextPathUpdater.current = wirePlayerEvents(active, nextDropboxPath);
    },
    [getActivePlayer, loadTrack, wirePlayerEvents]
  );

  const updateNextTrack = useCallback((nextDropboxPath: string) => {
    if (nextPathUpdater.current) {
      nextPathUpdater.current(nextDropboxPath);
    }
  }, []);

  const play = useCallback(async () => {
    const active = getActivePlayer();
    if (active && active.src) {
      await active.play();
      setIsPlaying(true);
    }
  }, [getActivePlayer]);

  const pause = useCallback(() => {
    const active = getActivePlayer();
    if (active) {
      active.pause();
      setIsPlaying(false);
    }
  }, [getActivePlayer]);

  const seek = useCallback(
    (time: number) => {
      const active = getActivePlayer();
      if (active) {
        active.currentTime = time;
        setCurrentTime(time);
      }
    },
    [getActivePlayer]
  );

  const setVolume = useCallback(
    (vol: number) => {
      const clamped = Math.max(0, Math.min(1, vol));
      setVolumeState(clamped);

      // On mobile, don't override — let system handle volume
      if (!isMobile.current) {
        if (playerA.current) playerA.current.volume = clamped;
        if (playerB.current) playerB.current.volume = clamped;
      }
    },
    []
  );

  /**
   * Skip with 300ms debounce to prevent API rate limiting.
   * Returns true if skip was allowed, false if debounced.
   */
  const canSkip = useCallback((): boolean => {
    const now = Date.now();
    if (now - lastSkipTime.current < SKIP_DEBOUNCE_MS) {
      console.warn('[AudioEngine] Skip debounced');
      return false;
    }
    lastSkipTime.current = now;
    return true;
  }, []);

  /**
   * Register a callback for when the active track ends.
   * Used by PlayerContext to advance the queue.
   */
  const onTrackEnd = useCallback((cb: () => void) => {
    onTrackEndCallback.current = cb;
  }, []);

  /**
   * Stop playback and clean up.
   */
  const stop = useCallback(() => {
    playerA.current?.pause();
    playerB.current?.pause();
    if (playerA.current) playerA.current.src = '';
    if (playerB.current) playerB.current.src = '';
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    revokeAllBlobUrls();
  }, [revokeAllBlobUrls]);

  return {
    // State
    currentTime,
    duration,
    isBuffering,
    isPlaying,
    volume,
    isMobile: isMobile.current,

    // Playback
    playTrack,
    updateNextTrack,
    play,
    pause,
    seek,
    stop,
    setVolume,
    canSkip,
    onTrackEnd,

    // Pre-fetch
    prefetchNextTrack,

    // Output device
    outputDevices,
    selectedDevice,
    setOutputDevice,
    enumerateDevices,
  };
}

export default useAudioEngine;
