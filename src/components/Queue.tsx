import React, { useRef } from 'react';
import { usePlayer, type Track } from '../context/PlayerContext';
import { X, Play, Loader2, Music2, GripVertical } from 'lucide-react';
import TrackCover from './TrackCover';
import { useOverlayHistory } from '../hooks/useHistoryHook';

export const Queue: React.FC = () => {
  const {
    queue,
    queueIndex,
    currentTrack,
    isQueueOpen,
    toggleQueue,
    isPlaying,
    isBuffering,
    setQueue,
    removeFromQueue,
    reorderQueue,
  } = usePlayer();

  // --- Touch Reordering Logic (Mobile) ---
  const touchStartIndex = useRef<number>(-1);
  const touchCurrentIndex = useRef<number>(-1);

  useOverlayHistory(isQueueOpen, toggleQueue);

  if (!isQueueOpen) return null;

  const history = queue.slice(0, queueIndex);
  const upNext = queue.slice(queueIndex + 1);

  const handleTrackClick = (index: number) => {
    setQueue(queue, index);
  };

  // --- Drag and Drop Logic (Mouse) ---
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
    e.dataTransfer.effectAllowed = 'move';
    
    // Add visual feedback
    const row = (e.currentTarget as HTMLElement).closest('[data-queue-row]') as HTMLElement;
    if (row) row.classList.add('opacity-40');
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const row = (e.currentTarget as HTMLElement).closest('[data-queue-row]') as HTMLElement;
    if (row) row.classList.remove('opacity-40');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const row = (e.currentTarget as HTMLElement).closest('[data-queue-row]') as HTMLElement;
    if (row) row.classList.add('bg-accent/5');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const row = (e.currentTarget as HTMLElement).closest('[data-queue-row]') as HTMLElement;
    if (row) row.classList.remove('bg-accent/5');
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    const row = (e.currentTarget as HTMLElement).closest('[data-queue-row]') as HTMLElement;
    if (row) row.classList.remove('bg-accent/5');
    
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (fromIndex !== toIndex) {
      reorderQueue(fromIndex, toIndex);
    }
  };

  // --- Touch Reordering Logic (Mobile) ---
  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    touchStartIndex.current = index;
    touchCurrentIndex.current = index;
    
    const row = (e.currentTarget as HTMLElement).closest('[data-queue-row]') as HTMLElement;
    if (row) row.classList.add('bg-accent/20', 'scale-[1.02]', 'shadow-2xl', 'z-10');
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartIndex.current !== -1) {
      const touchY = e.touches[0].clientY;
      const element = document.elementFromPoint(e.touches[0].clientX, touchY);
      const row = element?.closest('[data-queue-index]') as HTMLElement;
      
      if (row) {
        const newIdx = parseInt(row.getAttribute('data-queue-index') || '-1', 10);
        if (newIdx !== -1 && newIdx !== touchCurrentIndex.current) {
          touchCurrentIndex.current = newIdx;
        }
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const row = (e.currentTarget as HTMLElement).closest('[data-queue-row]') as HTMLElement;
    if (row) row.classList.remove('bg-accent/20', 'scale-[1.02]', 'shadow-2xl', 'z-10');

    if (touchStartIndex.current !== -1 && touchCurrentIndex.current !== -1 && touchStartIndex.current !== touchCurrentIndex.current) {
      reorderQueue(touchStartIndex.current, touchCurrentIndex.current);
    }
    
    touchStartIndex.current = -1;
    touchCurrentIndex.current = -1;
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-80 bg-surface border-l border-divider shadow-2xl z-[55] flex flex-col transform transition-transform duration-300 ease-in-out animate-in slide-in-from-right">
      <div className="flex items-center justify-between px-4 py-4 border-b border-divider">
        <h2 className="text-lg font-bold text-text-primary">Queue</h2>
        <button
          onClick={toggleQueue}
          className="p-1 text-text-secondary hover:text-text-primary transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        {/* History */}
        {history.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
              History
            </h3>
            <div className="space-y-1">
              {history.map((track, idx) => (
                <div
                  key={`${track.id}-${idx}`}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-surface-hover group cursor-pointer"
                  onClick={() => handleTrackClick(idx)}
                >
                  <TrackCover
                    coverUrl={track.coverUrl}
                    coverBlob={track.coverBlob}
                    alt={track.title}
                    className="w-10 h-10 rounded object-cover flex-shrink-0 shadow-sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-text-primary text-sm font-medium truncate group-hover:text-accent">
                      {track.title}
                    </p>
                    <p className="text-text-secondary text-xs truncate">{track.artist}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Now Playing */}
        {currentTrack && (
          <div>
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
              Now Playing
            </h3>
            <div className="flex items-center gap-3 p-2 rounded-xl bg-accent/10 border border-accent/20 shadow-inner">
              <div className="relative w-10 h-10 flex-shrink-0">
                <TrackCover
                  coverUrl={currentTrack.coverUrl}
                  coverBlob={currentTrack.coverBlob}
                  alt={currentTrack.title}
                  className="w-10 h-10 rounded object-cover"
                />
                {isBuffering && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded">
                    <Loader2 size={16} className="animate-spin text-accent" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-accent text-sm font-bold truncate">{currentTrack.title}</p>
                <p className="text-text-secondary text-xs truncate font-medium">{currentTrack.artist}</p>
              </div>
              {isPlaying && !isBuffering && (
                <div className="flex items-center gap-0.5 justify-end w-8 pr-1">
                  <div className="w-0.5 h-3 bg-accent rounded-full animate-music-bar" />
                  <div className="w-0.5 h-4 bg-accent rounded-full animate-music-bar" style={{ animationDelay: '150ms' }} />
                  <div className="w-0.5 h-2 bg-accent rounded-full animate-music-bar" style={{ animationDelay: '300ms' }} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Up Next */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Up Next
            </h3>
            <span className="text-[9px] font-bold text-text-secondary opacity-40 uppercase tracking-tighter">
              Hold handle to reorder
            </span>
          </div>
          
          {upNext.length > 0 ? (
            <div className="space-y-1">
              {upNext.map((track, idx) => {
                const actualIndex = queueIndex + 1 + idx;
                return (
                  <div
                    key={`${track.id}-${actualIndex}`}
                    data-queue-row
                    data-queue-index={actualIndex}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, actualIndex)}
                    className="flex items-center gap-2 p-2 rounded-md hover:bg-surface-hover group transition-all border border-transparent hover:border-white/5 active:scale-[0.98]"
                  >
                    {/* Dedicated Drag Handle */}
                    <div
                      draggable
                      onDragStart={(e) => handleDragStart(e, actualIndex)}
                      onDragEnd={handleDragEnd}
                      onTouchStart={(e) => handleTouchStart(e, actualIndex)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      className="p-1 text-text-secondary opacity-20 group-hover:opacity-100 cursor-grab active:cursor-grabbing shrink-0"
                    >
                      <GripVertical size={16} />
                    </div>

                    <div
                      className="w-10 h-10 flex-shrink-0 cursor-pointer"
                      onClick={() => handleTrackClick(actualIndex)}
                    >
                      <TrackCover
                        coverUrl={track.coverUrl}
                        coverBlob={track.coverBlob}
                        alt={track.title}
                        className="w-full h-full rounded object-cover shadow-sm"
                      />
                    </div>
                    <div
                      className="min-w-0 flex-1 cursor-pointer"
                      onClick={() => handleTrackClick(actualIndex)}
                    >
                      <p className="text-text-primary text-sm font-medium truncate group-hover:text-accent">
                        {track.title}
                      </p>
                      <p className="text-text-secondary text-xs truncate">{track.artist}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromQueue(actualIndex);
                      }}
                      className="p-1 opacity-0 group-hover:opacity-100 hover:text-red-400 text-text-secondary transition-all"
                    >
                      <X size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-text-secondary bg-white/[0.02] rounded-2xl border border-dashed border-divider/50 mt-4">
              <Music2 size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium opacity-50">Queue is empty</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Queue;
