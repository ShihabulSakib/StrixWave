/**
 * useAudioEngine — MSE-Based Gapless Audio Engine
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import StorageManager from '../services/storage/StorageManager';
import { StoredTrack } from '../services/db';

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

// Constants
const PREFETCH_THRESHOLD_SECONDS = 30;
const SKIP_DEBOUNCE_MS = 300;
const CHUNK_SIZE = 256 * 1024;
const BUFFER_CLEANUP_INTERVAL_MS = 60_000;
const BUFFER_KEEP_BEHIND_SECONDS = 30;
const BUFFER_HARD_CAP_BYTES = 50 * 1024 * 1024;

const MSE_SUPPORTED = (() => {
  if (typeof MediaSource === 'undefined') return false;
  const types = ['audio/mpeg', 'audio/mp4', 'audio/webm'];
  return types.some(t => MediaSource.isTypeSupported(t));
})();

function getMimeForExtension(path: string): string | null {
  const ext = path.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'mp3': return 'audio/mpeg';
    case 'm4a':
    case 'aac': return 'audio/mp4; codecs="mp4a.40.2"';
    case 'opus':
    case 'webm': return 'audio/webm; codecs="opus"';
    default: return null;
  }
}

export function useAudioEngine() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaSourceRef = useRef<MediaSource | null>(null);
  const sourceBufferRef = useRef<SourceBuffer | null>(null);
  const nextTrackBufferRef = useRef<{
    path: string;
    chunks: ArrayBuffer[];
    mime: string;
  } | null>(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.7);

  const lastSkipTime = useRef(0);
  const prefetchedPath = useRef<string | null>(null);
  const onTrackEndCallback = useRef<(() => void) | null>(null);
  const currentTrackPath = useRef<string | null>(null);
  const usingMSE = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const bufferCleanupInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const totalBytesAppended = useRef(0);
  const isMobile = useRef(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));

  const cleanupMSE = useCallback(() => {
    if (bufferCleanupInterval.current) {
      clearInterval(bufferCleanupInterval.current);
      bufferCleanupInterval.current = null;
    }
    totalBytesAppended.current = 0;
    if (mediaSourceRef.current) {
      try {
        if (mediaSourceRef.current.readyState === 'open') {
          mediaSourceRef.current.endOfStream();
        }
      } catch { /* ignore */ }
      mediaSourceRef.current = null;
    }
    sourceBufferRef.current = null;
    nextTrackBufferRef.current = null;
  }, []);

  useEffect(() => {
    audioRef.current = new Audio();
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      audioRef.current = null;
      cleanupMSE();
    };
  }, [cleanupMSE]);

  useEffect(() => {
    if (audioRef.current && !isMobile.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const startBufferCleanup = useCallback(() => {
    if (bufferCleanupInterval.current) {
      clearInterval(bufferCleanupInterval.current);
    }
    bufferCleanupInterval.current = setInterval(() => {
      const sb = sourceBufferRef.current;
      const audio = audioRef.current;
      const ms = mediaSourceRef.current;
      if (!sb || !audio || !ms || ms.readyState !== 'open' || sb.updating) return;
      try {
        const removeEnd = audio.currentTime - BUFFER_KEEP_BEHIND_SECONDS;
        if (removeEnd > 0 && sb.buffered.length > 0 && sb.buffered.start(0) < removeEnd) {
          sb.remove(sb.buffered.start(0), removeEnd);
        }
      } catch (err) {
        console.warn('[AudioEngine] Buffer cleanup error:', err);
      }
    }, BUFFER_CLEANUP_INTERVAL_MS);
  }, []);

  const streamWithMSE = useCallback(
    async (track: StoredTrack, mime: string, autoplay: boolean): Promise<void> => {
      const audio = audioRef.current;
      if (!audio) return;
      setIsBuffering(true);
      cleanupMSE();
      abortControllerRef.current?.abort();
      const abort = new AbortController();
      abortControllerRef.current = abort;

      return new Promise<void>((resolve, reject) => {
        const initMSE = async () => {
          try {
            const ms = new MediaSource();
            mediaSourceRef.current = ms;
            audio.src = URL.createObjectURL(ms);
            usingMSE.current = true;
            await new Promise<void>((res) => {
              ms.addEventListener('sourceopen', () => res(), { once: true });
            });
            if (abort.signal.aborted) { reject(new Error('Aborted')); return; }
            const sb = ms.addSourceBuffer(mime);
            sourceBufferRef.current = sb;
            totalBytesAppended.current = 0;
            startBufferCleanup();

            const storage = StorageManager.getInstance();
            const provider = storage.getProvider(track.providerId);
            let currentLink = await storage.getTemporaryLink(track.providerId, track.providerPath);
            const headers = (await provider?.getHeaders?.()) || {};

            if (abort.signal.aborted) { reject(new Error('Aborted')); return; }
            let offset = 0;
            let firstChunkLoaded = false;

            const fetchNextChunk = async (retryCount = 0) => {
              if (abort.signal.aborted) return;
              if (totalBytesAppended.current >= BUFFER_HARD_CAP_BYTES) {
                const removeEnd = audio.currentTime - BUFFER_KEEP_BEHIND_SECONDS;
                if (removeEnd > 0 && !sb.updating && sb.buffered.length > 0) {
                  try {
                    sb.remove(sb.buffered.start(0), removeEnd);
                    await new Promise<void>((res) => {
                      sb.addEventListener('updateend', () => res(), { once: true });
                    });
                    totalBytesAppended.current = 0;
                  } catch { /* ignore */ }
                }
              }
              try {
                const response = await fetch(currentLink, {
                  headers: { ...headers, Range: `bytes=${offset}-${offset + CHUNK_SIZE - 1}` },
                });
                if (abort.signal.aborted) return;
                if (response.status === 403 && retryCount < 1) {
                  const provider = storage.getProvider(track.providerId);
                  provider?.invalidateLink(track.providerPath);
                  currentLink = await storage.getTemporaryLink(track.providerId, track.providerPath);
                  return fetchNextChunk(retryCount + 1);
                }
                if (!response.ok && response.status !== 206) {
                  if (ms.readyState === 'open') {
                    const waitForUpdate = () => new Promise<void>((res) => {
                      if (!sb.updating) { res(); return; }
                      sb.addEventListener('updateend', () => res(), { once: true });
                    });
                    await waitForUpdate();
                    ms.endOfStream();
                  }
                  return;
                }
                const data = await response.arrayBuffer();
                if (abort.signal.aborted) return;
                const contentRange = response.headers.get('Content-Range');
                let totalSize = Infinity;
                if (contentRange) {
                  const match = contentRange.match(/\/(\d+)/);
                  if (match) totalSize = parseInt(match[1], 10);
                }
                if (sb.updating) {
                  await new Promise<void>((res) => {
                    sb.addEventListener('updateend', () => res(), { once: true });
                  });
                }
                if (abort.signal.aborted) return;
                sb.appendBuffer(data);
                totalBytesAppended.current += data.byteLength;
                await new Promise<void>((res) => {
                  sb.addEventListener('updateend', () => res(), { once: true });
                });
                if (!firstChunkLoaded) {
                  firstChunkLoaded = true;
                  setIsBuffering(false);
                  if (autoplay) {
                    await audio.play();
                    setIsPlaying(true);
                  }
                  resolve();
                }
                offset += data.byteLength;
                if (offset >= totalSize) {
                  if (ms.readyState === 'open') {
                    const waitForUpdate = () => new Promise<void>((res) => {
                      if (!sb.updating) { res(); return; }
                      sb.addEventListener('updateend', () => res(), { once: true });
                    });
                    await waitForUpdate();
                    ms.endOfStream();
                  }
                  return;
                }
                fetchNextChunk();
              } catch (err) {
                if (abort.signal.aborted) return;
                if (!firstChunkLoaded) reject(err);
              }
            };
            fetchNextChunk();
          } catch (err) {
            setIsBuffering(false);
            reject(err);
          }
        };
        initMSE();
      });
    },
    [cleanupMSE, startBufferCleanup]
  );

  const loadDirectURL = useCallback(
    async (track: StoredTrack, autoplay: boolean): Promise<void> => {
      const audio = audioRef.current;
      if (!audio) return;
      setIsBuffering(true);
      usingMSE.current = false;
      try {
        const storage = StorageManager.getInstance();
        const provider = storage.getProvider(track.providerId);
        const link = await storage.getTemporaryLink(track.providerId, track.providerPath);
        const headers = (await provider?.getHeaders?.()) || {};

        if (audio.src === link && !audio.error) {
          if (autoplay && audio.paused) {
            await audio.play();
            setIsPlaying(true);
          }
          return;
        }

        if (Object.keys(headers).length > 0) {
          const response = await fetch(link, { headers });
          const blob = await response.blob();
          audio.src = URL.createObjectURL(blob);
        } else {
          audio.src = link;
        }

        audio.load();
        await new Promise<void>((resolve, reject) => {
          const onCanPlay = () => {
            audio.removeEventListener('canplay', onCanPlay);
            audio.removeEventListener('error', onError);
            resolve();
          };
          const onError = () => {
            audio.removeEventListener('canplay', onCanPlay);
            audio.removeEventListener('error', onError);
            reject(new Error(`Failed to load audio: ${track.providerPath}`));
          };
          audio.addEventListener('canplay', onCanPlay);
          audio.addEventListener('error', onError);
        });
        if (autoplay) {
          await audio.play();
          setIsPlaying(true);
        }
      } catch (err) {
        console.error('[AudioEngine] loadDirectURL failed:', err);
        throw err;
      } finally {
        setIsBuffering(false);
      }
    },
    []
  );

  const prefetchNextTrack = useCallback(
    async (nextTrack: StoredTrack) => {
      if (!nextTrack) return;
      const trackKey = `${nextTrack.providerId}:${nextTrack.providerPath}`;
      if (prefetchedPath.current === trackKey) return;
      prefetchedPath.current = trackKey;
      try {
        const storage = StorageManager.getInstance();
        const provider = storage.getProvider(nextTrack.providerId);
        const mime = getMimeForExtension(nextTrack.providerPath);
        const headers = (await provider?.getHeaders?.()) || {};

        if (mime && MSE_SUPPORTED && MediaSource.isTypeSupported(mime)) {
          const link = await storage.getTemporaryLink(nextTrack.providerId, nextTrack.providerPath);
          const response = await fetch(link, {
            headers: { ...headers, Range: `bytes=0-${CHUNK_SIZE - 1}` },
          });
          if (response.ok || response.status === 206) {
            const data = await response.arrayBuffer();
            nextTrackBufferRef.current = {
              path: nextTrack.providerPath,
              chunks: [data],
              mime,
            };
          }
        } else {
          await storage.getTemporaryLink(nextTrack.providerId, nextTrack.providerPath);
        }
      } catch (err) {
        console.warn('[AudioEngine] Pre-fetch failed:', err);
        prefetchedPath.current = null;
      }
    },
    []
  );

  const wirePlayerEvents = useCallback(
    (nextTrack?: StoredTrack) => {
      const audio = audioRef.current;
      if (!audio) return () => { };
      let currentNextTrack = nextTrack;
      const onTimeUpdate = () => {
        setCurrentTime(audio.currentTime);
        if (currentNextTrack && audio.duration && audio.duration - audio.currentTime < PREFETCH_THRESHOLD_SECONDS) {
          prefetchNextTrack(currentNextTrack);
        }
      };
      const onDurationChange = () => {
        if (audio.duration && isFinite(audio.duration)) setDuration(audio.duration);
      };
      const onLoadedMetadata = () => {
        if (audio.duration && isFinite(audio.duration)) setDuration(audio.duration);
      };
      const onEnded = () => {
        if (onTrackEndCallback.current) onTrackEndCallback.current();
      };
      const onWaiting = () => setIsBuffering(true);
      const onCanPlay = () => setIsBuffering(false);
      const onPlay = () => setIsPlaying(true);
      const onPause = () => setIsPlaying(false);
      audio.ontimeupdate = onTimeUpdate;
      audio.ondurationchange = onDurationChange;
      audio.onloadedmetadata = onLoadedMetadata;
      audio.onended = onEnded;
      audio.onwaiting = onWaiting;
      audio.oncanplay = onCanPlay;
      audio.onplay = onPlay;
      audio.onpause = onPause;
      return (newNextTrack: StoredTrack) => {
        currentNextTrack = newNextTrack;
      };
    },
    [prefetchNextTrack]
  );

  const nextPathUpdater = useRef<((track: StoredTrack) => void) | null>(null);

  const playTrack = useCallback(
    async (track: StoredTrack, nextTrack?: StoredTrack) => {
      const trackKey = `${track.providerId}:${track.providerPath}`;
      currentTrackPath.current = trackKey;
      prefetchedPath.current = null;
      setCurrentTime(0);
      setDuration(0);
      const storage = StorageManager.getInstance();
      const provider = storage.getProvider(track.providerId);
      if (provider && !provider.isLinkFresh(track.providerPath)) {
        provider.invalidateLink(track.providerPath);
      }
      const mime = getMimeForExtension(track.providerPath);
      const canUseMSE = mime && MSE_SUPPORTED && MediaSource.isTypeSupported(mime);
      nextPathUpdater.current = wirePlayerEvents(nextTrack);
      if (canUseMSE) {
        await streamWithMSE(track, mime!, true);
      } else {
        await loadDirectURL(track, true);
      }
    },
    [streamWithMSE, loadDirectURL, wirePlayerEvents]
  );

  const updateNextTrack = useCallback((nextTrack: StoredTrack) => {
    if (nextPathUpdater.current) {
      nextPathUpdater.current(nextTrack);
    }
  }, []);

  const play = useCallback(async () => {
    const audio = audioRef.current;
    if (audio && audio.src) {
      await audio.play();
      setIsPlaying(true);
    }
  }, []);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const setVolume = useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    setVolumeState(clamped);
    if (!isMobile.current && audioRef.current) {
      audioRef.current.volume = clamped;
    }
  }, []);

  const canSkip = useCallback((): boolean => {
    const now = Date.now();
    if (now - lastSkipTime.current < SKIP_DEBOUNCE_MS) return false;
    lastSkipTime.current = now;
    return true;
  }, []);

  const onTrackEnd = useCallback((cb: () => void) => {
    onTrackEndCallback.current = cb;
  }, []);

  const stop = useCallback(() => {
    abortControllerRef.current?.abort();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    cleanupMSE();
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    currentTrackPath.current = null;
    prefetchedPath.current = null;
  }, [cleanupMSE]);

  return {
    currentTime,
    duration,
    isBuffering,
    isPlaying,
    volume,
    isMobile: isMobile.current,
    playTrack,
    updateNextTrack,
    play,
    pause,
    seek,
    stop,
    setVolume,
    canSkip,
    onTrackEnd,
    prefetchNextTrack,
  };
}

export default useAudioEngine;
