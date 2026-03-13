import React, { useState, useCallback } from 'react';
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
  ChevronLeft,
  ListMusic,
  X,
  Loader2,
  Music2,
} from 'lucide-react';
import { usePlayer, usePlayerProgress, type Track } from '../context/PlayerContext';
import TrackCover from './TrackCover';
import { formatTime, getNextRepeatMode, getSeekFraction, getTouchSeekFraction } from '../lib/audio-utils';
import { useOverlayHistory } from '../hooks/useHistoryHook';

export const MobilePlayerDrawer: React.FC = () => {
  const {
    isPlaying,
    isBuffering,
    currentTrack,
    isPlayerExpanded,
    queue,
    queueIndex,
    shuffle,
    repeat,
    togglePlay,
    togglePlayerExpansion,
    seekTo,
    skipNext,
    skipPrev,
    setShuffle,
    setRepeat,
    removeFromQueue,
    setQueue,
    isTrackLiked,
    toggleLike,
    trackTheme,
  } = usePlayer();

  const { currentTime, duration } = usePlayerProgress();

  const [showQueue, setShowQueue] = useState(false);

  useOverlayHistory(isPlayerExpanded, () => {
    if (showQueue) {
      setShowQueue(false);
    } else {
      togglePlayerExpansion();
    }
  });

  if (!currentTrack || !isPlayerExpanded) return null;
  
  const isLiked = isTrackLiked(currentTrack.id);
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

  const handleQueueTrackClick = (index: number) => {
    setQueue(queue, index);
    setShowQueue(false);
  };

  // Queue items
  const previousQueue = queue.slice(0, queueIndex);
  const upcomingQueue = queue.slice(queueIndex + 1);

  const containerStyle = {
    backgroundColor: trackTheme.primary,
    color: trackTheme.isDark ? '#FFFFFF' : '#0A192F',
  };

  return (
    <div className="fixed inset-0 z-50 md:hidden overflow-hidden transition-colors duration-700 ease-in-out" style={containerStyle}>
      {/* Drawer Content */}
      <div className="relative h-full flex flex-col animate-slide-up pt-[env(safe-area-inset-top,0px)]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <button
            onClick={() => showQueue ? setShowQueue(false) : togglePlayerExpansion()}
            className="p-2 text-current opacity-70 hover:opacity-100 transition-opacity"
          >
            {showQueue ? <ChevronLeft size={28} /> : <ChevronDown size={28} />}
          </button>
          <span className="text-xs font-black uppercase tracking-widest opacity-50">
            {showQueue ? 'Queue' : 'Now Playing'}
          </span>
          <div className="p-2 w-10" />
        </div>

        {showQueue ? (
          /* ===== Queue View ===== */
          <div className="flex-1 overflow-y-auto px-4 pb-4 custom-scrollbar">
            {/* Recently Played */}
            {previousQueue.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xs font-black uppercase tracking-widest mb-4 px-2 opacity-40">
                  Recently Played
                </h3>
                <div className="space-y-1 opacity-60">
                  {previousQueue.map((track, idx) => (
                    <div
                      key={`prev-${track.id}-${idx}`}
                      className="flex items-center gap-4 px-3 py-2.5 rounded-2xl hover:bg-white/5 transition-colors"
                      onClick={() => handleQueueTrackClick(idx)}
                    >
                      <div className="w-12 h-12 flex-shrink-0">
                        <TrackCover
                          coverUrl={track.coverUrl}
                          coverBlob={track.coverBlob}
                          alt={track.title}
                          className="w-full h-full rounded-xl object-cover shadow-lg"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{track.title}</p>
                        <p className="text-[10px] uppercase font-black tracking-wider opacity-50 truncate">{track.artist}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Now Playing */}
            <div className="mb-8">
              <h3 className="text-xs font-black uppercase tracking-widest mb-4 px-2 opacity-40">
                Now Playing
              </h3>
              <div className="flex items-center gap-4 px-4 py-4 rounded-3xl bg-white/10 shadow-xl border border-white/5">
                <TrackCover
                  coverUrl={currentTrack.coverUrl}
                  coverBlob={currentTrack.coverBlob}
                  alt={currentTrack.title}
                  className="w-14 h-14 rounded-2xl object-cover shadow-2xl"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-black text-base truncate">{currentTrack.title}</p>
                  <p className="text-xs uppercase font-black tracking-widest opacity-60 truncate">{currentTrack.artist}</p>
                </div>
                {isPlaying && (
                  <div className="flex items-center gap-1 pr-2">
                    <div className="w-1 h-4 bg-current rounded-full animate-music-bar" />
                    <div className="w-1 h-6 bg-current rounded-full animate-music-bar" style={{ animationDelay: '150ms' }} />
                    <div className="w-1 h-3 bg-current rounded-full animate-music-bar" style={{ animationDelay: '300ms' }} />
                  </div>
                )}
              </div>
            </div>

            {/* Upcoming */}
            <div className="flex items-center justify-between mb-4 px-2">
              <h3 className="text-xs font-black uppercase tracking-widest opacity-40">
                Next Up
              </h3>
              <span className="text-[10px] font-black opacity-30 uppercase tracking-tighter">Drag to reorder in queue menu</span>
            </div>

            {upcomingQueue.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 opacity-30">
                <Music2 size={48} className="mb-4" />
                <p className="text-sm font-black uppercase tracking-widest">End of Queue</p>
              </div>
            ) : (
              <div className="space-y-1">
                {upcomingQueue.map((track, idx) => {
                  const actualIndex = queueIndex + 1 + idx;
                  return (
                    <div
                      key={`${track.id}-${actualIndex}`}
                      className="flex items-center gap-4 px-3 py-3 rounded-2xl hover:bg-white/5 transition-all group"
                    >
                      <div
                        className="w-12 h-12 flex-shrink-0"
                        onClick={() => handleQueueTrackClick(actualIndex)}
                      >
                        <TrackCover
                          coverUrl={track.coverUrl}
                          coverBlob={track.coverBlob}
                          alt={track.title}
                          className="w-full h-full rounded-xl object-cover shadow-lg"
                        />
                      </div>
                      <div
                        className="flex-1 min-w-0"
                        onClick={() => handleQueueTrackClick(actualIndex)}
                      >
                        <p className="font-bold text-sm truncate">{track.title}</p>
                        <p className="text-[10px] uppercase font-black tracking-wider opacity-50 truncate">{track.artist}</p>
                      </div>
                      <button
                        onClick={() => removeFromQueue(actualIndex)}
                        className="p-2 opacity-40 hover:opacity-100 transition-opacity"
                      >
                        <X size={18} />
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
            <div className="flex-1 flex items-center justify-center px-8 py-4">
              <div className="relative w-full aspect-square max-w-[85vw] max-h-[85vw]">
                <TrackCover
                  coverUrl={currentTrack.coverUrl}
                  coverBlob={currentTrack.coverBlob}
                  alt={currentTrack.title}
                  className="w-full h-full rounded-[2.5rem] shadow-2xl object-cover"
                />
                {isBuffering && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-[2.5rem] backdrop-blur-sm">
                    <Loader2 size={64} className="animate-spin text-white" />
                  </div>
                )}
              </div>
            </div>

            {/* Track Info */}
            <div className="px-8 pt-4 flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h2 className="text-3xl font-black tracking-tighter truncate leading-tight">
                  {currentTrack.title}
                </h2>
                <p className="text-xl font-bold opacity-60 truncate mt-1">{currentTrack.artist}</p>
              </div>
              <button
                onClick={() => toggleLike(currentTrack.id, currentTrack.title)}
                className="p-2 mt-1"
              >
                <Heart size={32} fill={isLiked ? 'currentColor' : 'none'} className={isLiked ? 'text-accent' : 'opacity-40'} />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="px-8 mt-8 mb-6">
              <div
                className="h-1.5 bg-white/10 rounded-full relative group"
                onClick={handleSeek}
                onTouchMove={handleTouchSeek}
              >
                <div
                  className="h-full bg-white/60 rounded-full relative"
                  style={{ width: `${progressPercent}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-2xl" />
                </div>
              </div>
              <div className="flex justify-between mt-3 text-[10px] font-black uppercase tracking-widest opacity-40">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center justify-between px-8 mb-10">
              <button
                onClick={() => setShuffle(!shuffle)}
                className={`transition-all ${shuffle ? 'text-accent scale-110' : 'opacity-40 hover:opacity-100'}`}
              >
                <Shuffle size={24} />
              </button>
              
              <div className="flex items-center gap-8">
                <button onClick={skipPrev} className="hover:scale-110 transition-transform active:scale-90">
                  <SkipBack size={40} className="fill-current" />
                </button>
                <button
                  onClick={togglePlay}
                  className="w-20 h-20 rounded-full bg-white text-[#0A192F] flex items-center justify-center hover:scale-105 active:scale-90 transition-all shadow-2xl"
                >
                  {isBuffering ? (
                    <Loader2 size={36} className="animate-spin" />
                  ) : isPlaying ? (
                    <Pause size={36} className="fill-current" />
                  ) : (
                    <Play size={36} className="fill-current ml-1" />
                  )}
                </button>
                <button onClick={skipNext} className="hover:scale-110 transition-transform active:scale-90">
                  <SkipForward size={40} className="fill-current" />
                </button>
              </div>

              <button
                onClick={cycleRepeat}
                className={`transition-all ${repeat !== 'off' ? 'text-accent scale-110' : 'opacity-40 hover:opacity-100'}`}
              >
                {repeat === 'one' ? <Repeat1 size={24} /> : <Repeat size={24} />}
              </button>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between px-8 pb-[calc(2rem+env(safe-area-inset-bottom,0px))]">
              <div className="w-10" /> {/* Spacer */}
              <button
                onClick={() => setShowQueue(true)}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/20 transition-colors shadow-lg border border-white/5"
              >
                <ListMusic size={20} />
                <span className="text-xs font-black uppercase tracking-widest">Queue</span>
              </button>
              <div className="w-10" /> {/* Spacer */}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MobilePlayerDrawer;
