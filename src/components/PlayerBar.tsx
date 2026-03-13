import React, { useRef, useCallback } from 'react';
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
  Loader2,
  Music2,
} from 'lucide-react';
import { usePlayer, usePlayerProgress } from '../context/PlayerContext';
import TrackCover from './TrackCover';
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
    volume,
    shuffle,
    repeat,
    togglePlay,
    togglePlayerExpansion,
    toggleQueue,
    setVolume,
    seekTo,
    skipNext,
    skipPrev,
    setShuffle,
    setRepeat,
    isTrackLiked,
    toggleLike,
    trackTheme,
  } = usePlayer();

  const { currentTime, duration } = usePlayerProgress();

  const isLiked = currentTrack ? isTrackLiked(currentTrack.id) : false;
  const progressBarRef = useRef<HTMLDivElement>(null);

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

  // Default bar style (fallback when no track is loaded)
  const barStyle = {
    backgroundColor: currentTrack ? trackTheme.primary : '#0A192F',
    borderColor: currentTrack ? `${trackTheme.secondary}44` : 'rgba(255,255,255,0.1)',
  };

  // Mobile Mini Player
  if (isMobile) {
    return (
      <div
        onClick={togglePlayerExpansion}
        className="h-20 px-3 flex items-center justify-between cursor-pointer border-t transition-all duration-700 ease-in-out gap-2 sm:gap-3 relative z-40 w-full overflow-hidden"
        style={barStyle}
      >
        {/* Progress bar line for mobile miniplayer */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/5">
          <div className="h-full bg-accent transition-all duration-300" style={{ width: `${progressPercent}%` }} />
        </div>

        <div className="flex-1 min-w-0 flex items-center gap-2 sm:gap-3 pr-1 sm:pr-2">
          <div className="relative shrink-0">
            {currentTrack ? (
              <TrackCover
                coverUrl={currentTrack.coverUrl}
                coverBlob={currentTrack.coverBlob}
                alt={currentTrack.title}
                className="w-12 h-12 rounded-xl object-cover shadow-md"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                <Music2 size={20} className="opacity-20 text-white" />
              </div>
            )}
            {isBuffering && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl">
                <Loader2 size={16} className="animate-spin text-accent" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <p className="text-text-primary text-[15px] font-black truncate leading-tight">
              {currentTrack?.title || 'Not Playing'}
            </p>
            <p className="text-text-secondary text-[10px] truncate uppercase tracking-widest font-bold opacity-50 mt-0.5">
              {currentTrack?.artist || 'Select a track'}
            </p>
          </div>
        </div>

        {/* Action Group: Fixed hit areas for balanced spacing */}
        <div className="flex items-center shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleQueue();
            }}
            className="w-12 h-12 flex items-center justify-center text-text-primary hover:text-accent transition-all active:scale-90"
            aria-label="Open Queue"
          >
            <ListMusic size={22} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (currentTrack) togglePlay();
            }}
            className={`w-12 h-12 flex items-center justify-center text-text-primary hover:text-accent transition-all active:scale-90 ${!currentTrack ? 'opacity-20' : ''}`}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isBuffering ? (
              <Loader2 size={24} className="animate-spin text-accent" />
            ) : isPlaying ? (
              <Pause size={24} fill="currentColor" />
            ) : (
              <Play size={24} fill="currentColor" className="ml-1" />
            )}
          </button>
        </div>
      </div>
    );
  }

  // Desktop Player Bar
  return (
    <div
      className="fixed bottom-0 left-0 right-0 h-20 border-t px-4 flex items-center justify-between z-50 transition-colors duration-700 ease-in-out shadow-2xl"
      style={barStyle}
    >
      {/* Left: Track Info */}
      <div className="flex items-center gap-4 w-1/4">
        <div
          className="relative cursor-pointer group"
          onClick={togglePlayerExpansion}
        >
          {currentTrack ? (
            <TrackCover
              coverUrl={currentTrack.coverUrl}
              coverBlob={currentTrack.coverBlob}
              alt={currentTrack.title}
              className="w-14 h-14 rounded shadow-xl"
            />
          ) : (
            <div className="w-14 h-14 rounded bg-white/5 flex items-center justify-center">
              <Music2 size={24} className="opacity-20 text-white" />
            </div>
          )}
          {isBuffering && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded">
              <Loader2 size={18} className="animate-spin text-accent" />
            </div>
          )}
        </div>
        <div className="min-w-0" onClick={togglePlayerExpansion}>
          <p className="text-text-primary text-sm font-bold hover:underline cursor-pointer truncate">
            {currentTrack?.title || 'Not Playing'}
          </p>
          <p className="text-text-secondary text-[10px] uppercase tracking-widest font-bold opacity-60 hover:underline cursor-pointer truncate">
            {currentTrack?.artist || 'Select a track'}
          </p>
        </div>
        {currentTrack && (
          <button
            onClick={() => toggleLike(currentTrack.id, currentTrack.title)}
            className={`p-1 transition-colors ${isLiked ? 'text-accent' : 'text-text-secondary hover:text-text-primary'}`}
          >
            <Heart size={18} fill={isLiked ? 'currentColor' : 'none'} />
          </button>
        )}
      </div>

      {/* Center: Playback Controls */}
      <div className="flex flex-col items-center w-1/2 max-w-xl">
        <div className="flex items-center gap-6 mb-2">
          <button
            onClick={() => setShuffle(!shuffle)}
            className={`transition-colors ${shuffle ? 'text-accent' : 'text-text-secondary hover:text-text-primary'}`}
          >
            <Shuffle size={18} />
          </button>
          <button
            onClick={skipPrev}
            className="text-text-secondary hover:text-text-primary transition-all active:scale-90"
          >
            <SkipBack size={20} className="fill-current" />
          </button>
          <button
            onClick={togglePlay}
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl"
          >
            {isBuffering ? (
              <Loader2 size={18} className="animate-spin text-primary" />
            ) : isPlaying ? (
              <Pause size={20} className="fill-primary text-primary" />
            ) : (
              <Play size={20} className="fill-primary text-primary ml-0.5" />
            )}
          </button>
          <button
            onClick={skipNext}
            className="text-text-secondary hover:text-text-primary transition-all active:scale-90"
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
        <div className="w-full flex items-center gap-3 tabular-nums text-[10px] font-bold text-text-secondary opacity-60">
          <span className="w-10 text-right">
            {formatTime(currentTime)}
          </span>
          <div
            ref={progressBarRef}
            onClick={handleSeek}
            className="flex-1 h-1 bg-white/10 rounded-full group cursor-pointer relative"
          >
            <div
              className="h-full bg-white/40 rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 shadow-lg transition-opacity"
              style={{ left: `${progressPercent}%` }}
            />
          </div>
          <span className="w-10">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Right: Volume & Extra */}
      <div className="flex items-center justify-end gap-4 w-1/4">
        <button
          onClick={toggleQueue}
          className="text-text-secondary hover:text-text-primary transition-colors"
          title="Queue"
        >
          <ListMusic size={20} />
        </button>

        <VolumeSlider
          volume={volume}
          onVolumeChange={setVolume}
        />
      </div>
    </div>
  );
};

export default PlayerBar;
