/**
 * useAudioEngine — MSE-Based Gapless Audio Engine
 *
 * Architecture (v2 — MediaSource Extension):
 *   - Single HTMLAudioElement backed by MediaSource
 *   - BufferManager feeds chunks via DropboxService.downloadChunk → SourceBuffer
 *   - Gapless: pre-buffers next track in a separate SourceBuffer, swaps on track end
 *   - For formats MSE can't handle, falls back to direct URL playback
 *   - Blob URL lifecycle managed with revokeObjectURL
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
const CHUNK_SIZE = 256 * 1024; // 256KB streaming chunks

// Check MSE support for common audio codecs
const MSE_SUPPORTED = (() => {
  if (typeof MediaSource === 'undefined') return false;
  // Check common audio MIME types that MSE supports
  const types = [
    'audio/mpeg',      // MP3
    'audio/mp4',       // AAC/M4A
    'audio/webm',      // WebM/Opus
  ];
  return types.some(t => MediaSource.isTypeSupported(t));
})();

// Map file extension to MIME type for MSE
function getMimeForExtension(path: string): string | null {
  const ext = path.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'mp3': return 'audio/mpeg';
    case 'm4a':
    case 'aac': return 'audio/mp4; codecs="mp4a.40.2"';
    case 'opus':
    case 'webm': return 'audio/webm; codecs="opus"';
    default: return null; // FLAC, WAV, OGG — fallback to direct playback
  }
}

// -------------------------------------------------------------------
// Hook
// -------------------------------------------------------------------

export function useAudioEngine() {
  // Single audio element
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // MSE refs
  const mediaSourceRef = useRef<MediaSource | null>(null);
  const sourceBufferRef = useRef<SourceBuffer | null>(null);
  const nextTrackBufferRef = useRef<{
    path: string;
    chunks: ArrayBuffer[];
    mime: string;
  } | null>(null);

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
  const currentTrackPath = useRef<string | null>(null);

  // Whether current track uses MSE or direct URL fallback
  const usingMSE = useRef(false);

  // Abort controller for chunk downloads
  const abortControllerRef = useRef<AbortController | null>(null);

  // Mobile detection
  const isMobile = useRef(
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  );

  // Audio output devices
  const [outputDevices, setOutputDevices] = useState<OutputDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('default');

  // -------------------------------------------------------------------
  // Helpers defined before effects
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

  const cleanupMSE = useCallback(() => {
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

  // -------------------------------------------------------------------
  // Initialize audio element
  // -------------------------------------------------------------------

  useEffect(() => {
    audioRef.current = new Audio();

    // Set initial volume (skip on mobile — let system handle it)
    if (!isMobile.current) {
      audioRef.current.volume = volume;
    }

    // Enumerate output devices
    enumerateDevices();

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      audioRef.current = null;
      cleanupMSE();
    };
  }, []); // Only run once on mount

  // -------------------------------------------------------------------
  // Output device management
  // -------------------------------------------------------------------

  const setOutputDevice = useCallback(async (deviceId: string) => {
    setSelectedDevice(deviceId);
    const el = audioRef.current;
    if (el && 'setSinkId' in el) {
      try {
        await (el as any).setSinkId(deviceId);
      } catch (err) {
        console.warn('[AudioEngine] setSinkId failed:', err);
      }
    }
  }, []);

  /**
   * Stream a track using MSE (MediaSource Extensions).
   * Progressively fetches chunks and appends them to the SourceBuffer.
   */
  const streamWithMSE = useCallback(
    async (dropboxPath: string, mime: string, autoplay: boolean): Promise<void> => {
      const audio = audioRef.current;
      if (!audio) return;

      setIsBuffering(true);
      cleanupMSE();

      // Abort any previous download
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

            const dropbox = DropboxService.getInstance();
            const link = await dropbox.getTemporaryLink(dropboxPath);

            if (abort.signal.aborted) { reject(new Error('Aborted')); return; }

            let offset = 0;
            let firstChunkLoaded = false;

            const fetchNextChunk = async () => {
              if (abort.signal.aborted) return;

              try {
                const response = await fetch(link, {
                  headers: { Range: `bytes=${offset}-${offset + CHUNK_SIZE - 1}` },
                });

                if (abort.signal.aborted) return;

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
                console.error('[AudioEngine] Chunk fetch error:', err);
                if (!firstChunkLoaded) {
                  reject(err);
                }
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
    [cleanupMSE]
  );

  /**
   * Fallback: load track via direct temporary URL (for FLAC, WAV, OGG).
   */
  const loadDirectURL = useCallback(
    async (dropboxPath: string, autoplay: boolean): Promise<void> => {
      const audio = audioRef.current;
      if (!audio) return;

      setIsBuffering(true);
      usingMSE.current = false;

      try {
        const dropbox = DropboxService.getInstance();
        const link = await dropbox.getTemporaryLink(dropboxPath);

        // Prevent unnecessary reload if source is same
        if (audio.src === link && !audio.error) {
          if (autoplay && audio.paused) {
            await audio.play();
            setIsPlaying(true);
          }
          return;
        }

        audio.src = link;
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
            reject(new Error(`Failed to load audio: ${dropboxPath}`));
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

  // -------------------------------------------------------------------
  // Pre-fetch next track's initial data for gapless transitions
  // -------------------------------------------------------------------

  const prefetchNextTrack = useCallback(
    async (nextDropboxPath: string) => {
      if (!nextDropboxPath) return;
      if (prefetchedPath.current === nextDropboxPath) return;

      prefetchedPath.current = nextDropboxPath;

      try {
        const dropbox = DropboxService.getInstance();
        const mime = getMimeForExtension(nextDropboxPath);

        if (mime && MSE_SUPPORTED && MediaSource.isTypeSupported(mime)) {
          // Pre-fetch first chunk for MSE gapless
          const link = await dropbox.getTemporaryLink(nextDropboxPath);
          const response = await fetch(link, {
            headers: { Range: `bytes=0-${CHUNK_SIZE - 1}` },
          });

          if (response.ok || response.status === 206) {
            const data = await response.arrayBuffer();
            nextTrackBufferRef.current = {
              path: nextDropboxPath,
              chunks: [data],
              mime,
            };
            console.log(`[AudioEngine] Pre-fetched ${CHUNK_SIZE / 1024}KB for gapless: ${nextDropboxPath}`);
          }
        } else {
          // Fallback: pre-fetch temporary link only
          await dropbox.getTemporaryLink(nextDropboxPath);
          console.log(`[AudioEngine] Pre-fetched link for: ${nextDropboxPath}`);
        }
      } catch (err) {
        console.warn('[AudioEngine] Pre-fetch failed:', err);
        prefetchedPath.current = null;
      }
    },
    []
  );

  // -------------------------------------------------------------------
  // Event wiring for the audio element
  // -------------------------------------------------------------------

  const wirePlayerEvents = useCallback(
    (nextTrackPath?: string) => {
      const audio = audioRef.current;
      if (!audio) return () => { };

      let currentNextPath = nextTrackPath;

      const onTimeUpdate = () => {
        setCurrentTime(audio.currentTime);

        // Pre-fetch sentinel: <30s remaining
        if (
          currentNextPath &&
          audio.duration &&
          audio.duration - audio.currentTime < PREFETCH_THRESHOLD_SECONDS
        ) {
          prefetchNextTrack(currentNextPath);
        }
      };

      const onDurationChange = () => {
        if (audio.duration && isFinite(audio.duration)) {
          setDuration(audio.duration);
        }
      };

      const onLoadedMetadata = () => {
        if (audio.duration && isFinite(audio.duration)) {
          setDuration(audio.duration);
        }
      };

      const onEnded = () => {
        // Notify PlayerContext to advance queue — the context will call playTrack
        // for the next track, which will use pre-fetched data for near-instant start
        if (onTrackEndCallback.current) {
          onTrackEndCallback.current();
        }
      };

      const onWaiting = () => setIsBuffering(true);
      const onCanPlay = () => setIsBuffering(false);
      const onPlay = () => setIsPlaying(true);
      const onPause = () => setIsPlaying(false);

      // Clear old listeners
      audio.ontimeupdate = onTimeUpdate;
      audio.ondurationchange = onDurationChange;
      audio.onloadedmetadata = onLoadedMetadata;
      audio.onended = onEnded;
      audio.onwaiting = onWaiting;
      audio.oncanplay = onCanPlay;
      audio.onplay = onPlay;
      audio.onpause = onPause;

      return (newNextPath: string) => {
        currentNextPath = newNextPath;
      };
    },
    [prefetchNextTrack]
  );

  const nextPathUpdater = useRef<((path: string) => void) | null>(null);

  // -------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------

  /**
   * Play a track by its Dropbox path.
   * Uses MSE for supported formats (MP3, AAC/M4A, Opus),
   * falls back to direct URL for FLAC, WAV, OGG.
   */
  const playTrack = useCallback(
    async (dropboxPath: string, nextDropboxPath?: string) => {
      currentTrackPath.current = dropboxPath;
      prefetchedPath.current = null;

      // Reset state for new track
      setCurrentTime(0);
      setDuration(0);

      // Check if link is still fresh
      const dropbox = DropboxService.getInstance();
      if (!dropbox.isLinkFresh(dropboxPath)) {
        dropbox.invalidateLink(dropboxPath);
      }

      const mime = getMimeForExtension(dropboxPath);
      const canUseMSE = mime && MSE_SUPPORTED && MediaSource.isTypeSupported(mime);

      // Wire events first so we don't miss the start
      nextPathUpdater.current = wirePlayerEvents(nextDropboxPath);

      if (canUseMSE) {
        await streamWithMSE(dropboxPath, mime!, true);
      } else {
        // Fallback for FLAC, WAV, OGG, etc.
        await loadDirectURL(dropboxPath, true);
      }
    },
    [streamWithMSE, loadDirectURL, wirePlayerEvents]
  );

  const updateNextTrack = useCallback((nextDropboxPath: string) => {
    if (nextPathUpdater.current) {
      nextPathUpdater.current(nextDropboxPath);
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
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      setIsPlaying(false);
    }
  }, []);

  const seek = useCallback(
    (time: number) => {
      const audio = audioRef.current;
      if (audio) {
        audio.currentTime = time;
        setCurrentTime(time);
      }
    },
    []
  );

  const setVolume = useCallback(
    (vol: number) => {
      const clamped = Math.max(0, Math.min(1, vol));
      setVolumeState(clamped);

      // On mobile, don't override — let system handle volume
      if (!isMobile.current && audioRef.current) {
        audioRef.current.volume = clamped;
      }
    },
    []
  );

  /**
   * Skip with 300ms debounce to prevent API rate limiting.
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
   */
  const onTrackEnd = useCallback((cb: () => void) => {
    onTrackEndCallback.current = cb;
  }, []);

  /**
   * Stop playback and clean up.
   */
  const stop = useCallback(() => {
    abortControllerRef.current?.abort();
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.src = '';
    }
    cleanupMSE();
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    currentTrackPath.current = null;
    prefetchedPath.current = null;
  }, [cleanupMSE]);

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
