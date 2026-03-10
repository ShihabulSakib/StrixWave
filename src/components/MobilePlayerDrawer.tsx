import React, { useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  ChevronDown,
  ListMusic,
  X,
  GripVertical,
  Loader2,
  Music2,
} from 'lucide-react';
import { usePlayer, type Track } from '../context/PlayerContext';
import TrackCover from './TrackCover';
import DeviceSelector from './shared/DeviceSelector';
import VolumeSlider from './shared/VolumeSlider';
import { formatTime, getNextRepeatMode, getSeekFraction, getTouchSeekFraction } from '../lib/audio-utils';

export const MobilePlayerDrawer: React.FC = () => {
  const {
    isPlaying,
    isBuffering,
    currentTrack,
    isPlayerExpanded,
    volume,
    currentTime,
    duration,
    queue,
    queueIndex,
    shuffle,
    repeat,
    outputDevices,
    selectedDevice,
    togglePlay,
    togglePlayerExpansion,
    setVolume,
    seekTo,
    skipNext,
    skipPrev,
    setShuffle,
    setRepeat,
    removeFromQueue,
    playTrack,
    setQueue,
    setOutputDevice,
    enumerateDevices,
  } = usePlayer();

  const [showQueue, setShowQueue] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  if (!currentTrack) return null;
  if (!isPlayerExpanded) return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const pct = getSeekFraction(e, e.currentTarget as HTMLDivElement);
    seekTo(pct * duration);
  };

  const handleTouchSeek = (e: React.TouchEvent<HTMLDivElement>) => {
    const pct = getTouchSeekFraction(e, e.currentTarget as HTMLDivElement);
    seekTo(pct * duration);
  };

  const cycleRepeat = () => {
    setRepeat(getNextRepeatMode(repeat));
  };

  const handleQueueTrackClick = (track: Track, index: number) => {
    setQueue(queue, index);
    setShowQueue(false);
  };

  // Queue items (upcoming only)
  const upcomingQueue = queue.slice(queueIndex + 1);

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-primary/95 backdrop-blur-lg"
        onClick={togglePlayerExpansion}
      />

      {/* Drawer Content */}
      <div className="relative h-full flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <button
            onClick={togglePlayerExpansion}
            className="p-2 text-text-secondary hover:text-text-primary transition-colors"
          >
            <ChevronDown size={28} />
          </button>
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            {showQueue ? 'Queue' : 'Now Playing'}
          </span>
          <div className="p-2 w-10" />
        </div>

        {showQueue ? (
          /* ===== Queue View ===== */
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {/* Now Playing */}
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 px-2">
                Now Playing
              </h3>
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-accent/10 border border-accent/20">
                <TrackCover
                  coverUrl={currentTrack.coverUrl}
                  coverBlob={currentTrack.coverBlob}
                  alt={currentTrack.title}
                  className="w-12 h-12 rounded object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-accent font-medium text-sm truncate">{currentTrack.title}</p>
                  <p className="text-text-secondary text-xs truncate">{currentTrack.artist}</p>
                </div>
                {isBuffering ? (
                  <Loader2 size={16} className="animate-spin text-accent" />
                ) : isPlaying ? (
                  <div className="flex items-center gap-0.5">
                    <div className="w-1 h-3 bg-accent rounded-full animate-pulse" />
                    <div className="w-1 h-4 bg-accent rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                    <div className="w-1 h-2 bg-accent rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                  </div>
                ) : null}
              </div>
            </div>

            {/* Upcoming */}
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 px-2">
              Next Up ({upcomingQueue.length})
            </h3>

            {upcomingQueue.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
                <Music2 size={40} className="mb-3 opacity-40" />
                <p className="text-sm">Queue is empty</p>
                <p className="text-xs mt-1">Sync your library to add tracks</p>
              </div>
            ) : (
              <div className="space-y-1">
                {upcomingQueue.map((track, idx) => {
                  const actualIndex = queueIndex + 1 + idx;
                  return (
                    <div
                      key={`${track.id}-${actualIndex}`}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-hover transition-colors group"
                    >
                      <GripVertical size={16} className="text-text-secondary/40 flex-shrink-0" />
                      <div
                        className="w-10 h-10 flex-shrink-0 cursor-pointer"
                        onClick={() => handleQueueTrackClick(track, actualIndex)}
                      >
                        <TrackCover
                          coverUrl={track.coverUrl}
                          coverBlob={track.coverBlob}
                          alt={track.title}
                          className="w-full h-full rounded object-cover"
                        />
                      </div>
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => handleQueueTrackClick(track, actualIndex)}
                      >
                        <p className="text-text-primary text-sm font-medium truncate">{track.title}</p>
                        <p className="text-text-secondary text-xs truncate">{track.artist}</p>
                      </div>
                      <span className="text-text-secondary text-xs flex-shrink-0">{track.duration}</span>
                      <button
                        onClick={() => removeFromQueue(actualIndex)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-text-secondary hover:text-text-primary transition-all flex-shrink-0"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* ===== Player View ===== */
          <>
            {/* Album Art - Large */}
            <div className="flex-1 flex items-center justify-center px-8">
              <div className="relative w-full max-w-sm">
                <TrackCover
                  coverUrl={currentTrack.coverUrl}
                  coverBlob={currentTrack.coverBlob}
                  alt={currentTrack.title}
                  className="w-full aspect-square rounded-lg shadow-2xl object-cover"
                />
                {isBuffering && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg">
                    <Loader2 size={48} className="animate-spin text-accent" />
                  </div>
                )}
              </div>
            </div>

            {/* Track Info */}
            <div className="px-6 py-4 flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <h2 className="text-2xl font-bold text-text-primary truncate">
                  {currentTrack.title}
                </h2>
                <p className="text-text-secondary text-lg truncate">{currentTrack.artist}</p>
              </div>
              <button
                onClick={() => setIsLiked(!isLiked)}
                className={`p-2 transition-colors ${isLiked ? 'text-accent' : 'text-text-secondary hover:text-accent'}`}
              >
                <Heart size={24} fill={isLiked ? 'currentColor' : 'none'} />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="px-6 mb-4">
              <div
                className="h-1.5 bg-surface-hover rounded-full cursor-pointer"
                onClick={handleSeek}
                onTouchMove={handleTouchSeek}
              >
                <div
                  className="h-full bg-accent rounded-full relative"
                  style={{ width: `${progressPercent}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-text-primary rounded-full shadow-md" />
                </div>
              </div>
              <div className="flex justify-between mt-2 text-xs text-text-secondary">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center justify-between px-6 mb-6">
              <button
                onClick={() => setShuffle(!shuffle)}
                className={`transition-colors ${shuffle ? 'text-accent' : 'text-text-secondary hover:text-text-primary'}`}
              >
                <Shuffle size={24} />
              </button>
              <button
                onClick={skipPrev}
                className="text-text-primary hover:text-accent transition-colors"
              >
                <SkipBack size={32} className="fill-current" />
              </button>
              <button
                onClick={togglePlay}
                className="w-16 h-16 rounded-full bg-accent flex items-center justify-center hover:scale-105 transition-transform shadow-lg"
              >
                {isBuffering ? (
                  <Loader2 size={32} className="animate-spin text-primary" />
                ) : isPlaying ? (
                  <Pause size={32} className="fill-primary text-primary" />
                ) : (
                  <Play size={32} className="fill-primary text-primary ml-1" />
                )}
              </button>
              <button
                onClick={skipNext}
                className="text-text-primary hover:text-accent transition-colors"
              >
                <SkipForward size={32} className="fill-current" />
              </button>
              <button
                onClick={cycleRepeat}
                className={`transition-colors ${repeat !== 'off' ? 'text-accent' : 'text-text-secondary hover:text-text-primary'}`}
              >
                {repeat === 'one' ? <Repeat1 size={24} /> : <Repeat size={24} />}
              </button>
            </div>

            <div className="flex items-center justify-between px-6 pb-8">
              {/* Output Device Menu (Drawer) */}
              <DeviceSelector
                outputDevices={outputDevices}
                selectedDevice={selectedDevice}
                onSelect={setOutputDevice}
                onRefresh={enumerateDevices}
                iconSize={28}
                showClose
                position="bottom-left"
              />
              <VolumeSlider
                volume={volume}
                onVolumeChange={setVolume}
                iconSize={20}
                widthClass="flex-1 max-w-xs mx-4"
              />
              <button
                onClick={() => setShowQueue(true)}
                className={`transition-colors ${showQueue ? 'text-accent' : 'text-text-secondary hover:text-text-primary'}`}
              >
                <ListMusic size={24} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MobilePlayerDrawer;
