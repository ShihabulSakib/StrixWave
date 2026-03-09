import React, { useState, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  Volume2,
  Volume1,
  VolumeX,
  ListMusic,
  MonitorSpeaker,
  ChevronUp,
  Loader2,
  Check,
  X,
  RefreshCw
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import TrackCover from './TrackCover';

interface PlayerBarProps {
  isMobile?: boolean;
}

export const PlayerBar: React.FC<PlayerBarProps> = ({ isMobile = false }) => {
  const {
    isPlaying,
    isBuffering,
    currentTrack,
    isPlayerExpanded,
    volume,
    currentTime,
    duration,
    shuffle,
    repeat,
    outputDevices,
    selectedDevice,
    togglePlay,
    togglePlayerExpansion,
    toggleQueue,
    setVolume,
    seekTo,
    skipNext,
    skipPrev,
    setShuffle,
    setRepeat,
    setOutputDevice,
    enumerateDevices // Assumed to be available via context if we add it, or we can use it from engine if exposed
  } = usePlayer();

  const [isLiked, setIsLiked] = useState(false);
  const [showDeviceMenu, setShowDeviceMenu] = useState(false);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const volumeBarRef = useRef<HTMLDivElement>(null);

  const formatTime = (seconds: number) => {
    if (!seconds || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Interactive seek
  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!progressBarRef.current || !duration) return;
      const rect = progressBarRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = Math.max(0, Math.min(1, x / rect.width));
      seekTo(pct * duration);
    },
    [duration, seekTo]
  );

  // Interactive volume
  const handleVolumeChange = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!volumeBarRef.current) return;
      const rect = volumeBarRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setVolume(pct);
    },
    [setVolume]
  );

  // Repeat toggle cycle
  const cycleRepeat = useCallback(() => {
    const modes: Array<'off' | 'one' | 'all'> = ['off', 'all', 'one'];
    const current = modes.indexOf(repeat);
    setRepeat(modes[(current + 1) % modes.length]);
  }, [repeat, setRepeat]);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleToggleDeviceMenu = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!showDeviceMenu) {
      // Refresh devices when opening
      enumerateDevices?.();
    }
    setShowDeviceMenu(!showDeviceMenu);
  }, [showDeviceMenu, enumerateDevices]);

  // Mobile Mini Player
  if (isMobile) {
    return (
      <>
        <div
          onClick={togglePlayerExpansion}
          className="fixed bottom-16 left-0 right-0 bg-surface border-t border-divider px-4 py-3 flex items-center justify-between z-40 cursor-pointer hover:bg-surface-hover transition-colors"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {currentTrack && (
              <>
                <div className="relative">
                  <TrackCover
                    coverUrl={currentTrack.coverUrl}
                    coverBlob={currentTrack.coverBlob}
                    alt={currentTrack.title}
                    className="w-12 h-12 rounded object-cover"
                  />
                  {isBuffering && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded">
                      <Loader2 size={16} className="animate-spin text-accent" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-text-primary text-sm font-medium truncate">{currentTrack.title}</p>
                  <p className="text-text-secondary text-xs truncate">{currentTrack.artist}</p>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Output Device Toggle (Mobile) */}
            <div className="relative">
              <button
                onClick={handleToggleDeviceMenu}
                className={`p-2 transition-colors ${showDeviceMenu ? 'text-accent' : 'text-text-secondary'}`}
              >
                <MonitorSpeaker size={20} />
              </button>
              {showDeviceMenu && (
                <div className="absolute bottom-full right-0 mb-2 w-64 bg-surface-hover rounded-lg shadow-xl border border-divider py-2 z-50 overflow-hidden">
                  <div className="px-3 py-2 text-xs font-semibold text-text-secondary uppercase tracking-wider border-b border-divider flex justify-between items-center">
                    <span>Output Devices</span>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); enumerateDevices?.(); }}
                        className="hover:text-text-primary p-1"
                      >
                        <RefreshCw size={14} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setShowDeviceMenu(false); }} className="hover:text-text-primary p-1">
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {outputDevices.length > 0 ? (
                      outputDevices.map((device) => (
                        <button
                          key={device.deviceId}
                          onClick={(e) => {
                            e.stopPropagation();
                            setOutputDevice(device.deviceId);
                            setShowDeviceMenu(false);
                          }}
                          className={`flex items-center gap-3 w-full px-3 py-2.5 text-sm transition-colors ${
                            selectedDevice === device.deviceId
                              ? 'text-accent bg-accent/10'
                              : 'text-text-primary hover:bg-surface'
                          }`}
                        >
                          <MonitorSpeaker size={14} />
                          <span className="truncate flex-1 text-left">{device.label}</span>
                          {selectedDevice === device.deviceId && <Check size={14} className="text-accent" />}
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-4 text-center text-sm text-text-secondary">
                        <MonitorSpeaker size={24} className="mx-auto mb-2 opacity-50" />
                        <p>No external devices found</p>
                        <p className="text-xs mt-1">Showing system default</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              className="p-2 text-text-primary hover:text-accent transition-colors"
            >
              {isBuffering ? (
                <Loader2 size={24} className="animate-spin text-accent" />
              ) : isPlaying ? (
                <Pause size={24} />
              ) : (
                <Play size={24} />
              )}
            </button>
          </div>
        </div>
      </>
    );
  }

  // Desktop Player Bar
  return (
    <div className="fixed bottom-0 left-0 right-0 h-20 bg-surface border-t border-divider px-4 flex items-center justify-between z-50">
      {/* Left: Track Info */}
      <div className="flex items-center gap-4 w-1/4">
        {currentTrack && (
          <>
            <div 
              className="relative cursor-pointer hover:scale-105 transition-transform"
              onClick={togglePlayerExpansion}
            >
              <TrackCover
                coverUrl={currentTrack.coverUrl}
                coverBlob={currentTrack.coverBlob}
                alt={currentTrack.title}
                className="w-14 h-14 rounded shadow-lg"
              />
              {isBuffering && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded">
                  <Loader2 size={18} className="animate-spin text-accent" />
                </div>
              )}
            </div>
            <div className="min-w-0" onClick={togglePlayerExpansion}>
              <p className="text-text-primary text-sm font-medium hover:underline cursor-pointer">
                {currentTrack.title}
              </p>
              <p className="text-text-secondary text-xs hover:underline cursor-pointer">
                {currentTrack.artist}
              </p>
            </div>
          </>
        )}
        <button
          onClick={() => setIsLiked(!isLiked)}
          className={`p-1 transition-colors ${isLiked ? 'text-accent' : 'text-text-secondary hover:text-text-primary'}`}
        >
          <Heart size={18} fill={isLiked ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Center: Playback Controls */}
      <div className="flex flex-col items-center w-1/2 max-w-xl">
        <div className="flex items-center gap-4 mb-2">
          <button
            onClick={() => setShuffle(!shuffle)}
            className={`transition-colors ${shuffle ? 'text-accent' : 'text-text-secondary hover:text-text-primary'}`}
          >
            <Shuffle size={18} />
          </button>
          <button
            onClick={skipPrev}
            className="text-text-secondary hover:text-text-primary transition-colors"
          >
            <SkipBack size={20} className="fill-current" />
          </button>
          <button
            onClick={togglePlay}
            className="w-8 h-8 rounded-full bg-text-primary flex items-center justify-center hover:scale-105 transition-transform"
          >
            {isBuffering ? (
              <Loader2 size={16} className="animate-spin text-primary" />
            ) : isPlaying ? (
              <Pause size={18} className="fill-primary text-primary" />
            ) : (
              <Play size={18} className="fill-primary text-primary ml-0.5" />
            )}
          </button>
          <button
            onClick={skipNext}
            className="text-text-secondary hover:text-text-primary transition-colors"
          >
            <SkipForward size={20} className="fill-current" />
          </button>
          <button
            onClick={cycleRepeat}
            className={`transition-colors ${repeat !== 'off' ? 'text-accent' : 'text-text-secondary hover:text-text-primary'}`}
          >
            {repeat === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}
          </button>
        </div>
        <div className="w-full flex items-center gap-2">
          <span className="text-xs text-text-secondary w-10 text-right">
            {formatTime(currentTime)}
          </span>
          <div
            ref={progressBarRef}
            onClick={handleSeek}
            className="flex-1 h-1 bg-surface-hover rounded-full group cursor-pointer"
          >
            <div
              className="h-full bg-accent rounded-full relative group-hover:bg-accent-hover transition-colors"
              style={{ width: `${progressPercent}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-text-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
          <span className="text-xs text-text-secondary w-10">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Right: Volume & Extra */}
      <div className="flex items-center justify-end gap-3 w-1/4">
        <button 
          onClick={toggleQueue}
          className="text-text-secondary hover:text-text-primary transition-colors"
        >
          <ListMusic size={18} />
        </button>

        {/* Audio Output Device Selector */}
        <div className="relative">
          <button
            onClick={handleToggleDeviceMenu}
            className={`transition-colors ${showDeviceMenu ? 'text-accent' : 'text-text-secondary hover:text-text-primary'}`}
          >
            <MonitorSpeaker size={18} />
          </button>

          {showDeviceMenu && (
            <div className="absolute bottom-full right-0 mb-2 w-64 bg-surface-hover rounded-lg shadow-xl border border-divider py-2 z-50 overflow-hidden">
              <div className="px-3 py-2 text-xs font-semibold text-text-secondary uppercase tracking-wider border-b border-divider flex justify-between items-center">
                <span>Output Devices</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); enumerateDevices?.(); }}
                  className="hover:text-text-primary p-1"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {outputDevices.length > 0 ? (
                  outputDevices.map((device) => (
                    <button
                      key={device.deviceId}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOutputDevice(device.deviceId);
                        setShowDeviceMenu(false);
                      }}
                      className={`flex items-center gap-3 w-full px-3 py-2.5 text-sm transition-colors ${
                        selectedDevice === device.deviceId
                          ? 'text-accent bg-accent/10'
                          : 'text-text-primary hover:bg-surface'
                      }`}
                    >
                      <MonitorSpeaker size={14} />
                      <span className="truncate flex-1 text-left">{device.label}</span>
                      {selectedDevice === device.deviceId && <Check size={14} className="text-accent" />}
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-4 text-center text-sm text-text-secondary">
                    <MonitorSpeaker size={20} className="mx-auto mb-2 opacity-50" />
                    <p>No external devices</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2 w-28 group">
          <button
            onClick={() => setVolume(volume === 0 ? 70 : 0)}
            className="text-text-secondary hover:text-text-primary transition-colors"
          >
            {volume === 0 ? (
              <VolumeX size={18} />
            ) : volume < 50 ? (
              <Volume1 size={18} />
            ) : (
              <Volume2 size={18} />
            )}
          </button>
          <div
            ref={volumeBarRef}
            onClick={handleVolumeChange}
            className="flex-1 h-1 bg-surface-hover rounded-full cursor-pointer"
          >
            <div
              className="h-full bg-text-secondary rounded-full group-hover:bg-accent transition-colors"
              style={{ width: `${volume}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerBar;
