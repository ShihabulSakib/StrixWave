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
  ListMusic,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import TrackCover from './TrackCover';
import DeviceSelector from './shared/DeviceSelector';
import VolumeSlider from './shared/VolumeSlider';
import { formatTime, getNextRepeatMode, getSeekFraction } from '../lib/audio-utils';

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
    enumerateDevices,
    isTrackLiked,
    toggleLike,
  } = usePlayer();

  const isLiked = currentTrack ? isTrackLiked(currentTrack.id) : false;
  const progressBarRef = useRef<HTMLDivElement>(null);

  // Interactive seek
  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!progressBarRef.current || !duration) return;
      const pct = getSeekFraction(e, progressBarRef.current);
      seekTo(pct * duration);
    },
    [duration, seekTo]
  );

  const cycleRepeat = useCallback(() => {
    setRepeat(getNextRepeatMode(repeat));
  }, [repeat, setRepeat]);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Mobile Mini Player
  if (isMobile) {
    return (
      <>
        <div
          onClick={togglePlayerExpansion}
          className="fixed bottom-0 left-0 right-0 bg-surface/80 backdrop-blur-md border-t border-divider px-4 py-3 flex items-center justify-between z-40 cursor-pointer hover:bg-surface-hover/90 transition-colors"
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
            <DeviceSelector
              outputDevices={outputDevices}
              selectedDevice={selectedDevice}
              onSelect={setOutputDevice}
              onRefresh={enumerateDevices}
              iconSize={20}
              showClose
              position="bottom-right"
            />
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
          onClick={() => currentTrack && toggleLike(currentTrack.id, currentTrack.title)}
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
        <DeviceSelector
          outputDevices={outputDevices}
          selectedDevice={selectedDevice}
          onSelect={setOutputDevice}
          onRefresh={enumerateDevices}
        />

        {/* Volume */}
        <VolumeSlider
          volume={volume}
          onVolumeChange={setVolume}
        />
      </div>
    </div>
  );
};

export default PlayerBar;
