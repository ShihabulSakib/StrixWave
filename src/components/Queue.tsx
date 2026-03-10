import React from 'react';
import { usePlayer, type Track } from '../context/PlayerContext';
import { X, Play, Loader2, Music2 } from 'lucide-react';
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
  } = usePlayer();

  useOverlayHistory(isQueueOpen, toggleQueue);

  if (!isQueueOpen) return null;

  const history = queue.slice(0, queueIndex);
  const upNext = queue.slice(queueIndex + 1);

  const handleTrackClick = (index: number) => {
    setQueue(queue, index);
  };

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-surface border-l border-divider shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out">
      <div className="flex items-center justify-between px-4 py-4 border-b border-divider">
        <h2 className="text-lg font-bold text-text-primary">Queue</h2>
        <button
          onClick={toggleQueue}
          className="p-1 text-text-secondary hover:text-text-primary transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
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
                    className="w-10 h-10 rounded object-cover flex-shrink-0"
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
            <div className="flex items-center gap-3 p-2 rounded-md bg-accent/10 border border-accent/20">
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
                <p className="text-accent text-sm font-medium truncate">{currentTrack.title}</p>
                <p className="text-text-secondary text-xs truncate">{currentTrack.artist}</p>
              </div>
              {isPlaying && !isBuffering && (
                <div className="flex items-center gap-0.5 justify-end w-8">
                  <div className="w-1 h-3 bg-accent rounded-full animate-pulse" />
                  <div className="w-1 h-4 bg-accent rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                  <div className="w-1 h-2 bg-accent rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Up Next */}
        <div>
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
            Up Next
          </h3>
          {upNext.length > 0 ? (
            <div className="space-y-1">
              {upNext.map((track, idx) => {
                const actualIndex = queueIndex + 1 + idx;
                return (
                  <div
                    key={`${track.id}-${actualIndex}`}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-surface-hover group"
                  >
                    <div
                      className="w-10 h-10 flex-shrink-0 cursor-pointer"
                      onClick={() => handleTrackClick(actualIndex)}
                    >
                      <TrackCover
                        coverUrl={track.coverUrl}
                        coverBlob={track.coverBlob}
                        alt={track.title}
                        className="w-full h-full rounded object-cover"
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
                      className="p-1 opacity-0 group-hover:opacity-100 hover:text-accent text-text-secondary"
                    >
                      <X size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-text-secondary">
              <Music2 size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">Queue is empty</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Queue;
