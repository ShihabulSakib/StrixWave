import React, { useState, useRef, useEffect } from 'react';
import { Play, Loader2, Heart, Trash2, MoreHorizontal } from 'lucide-react';
import TrackCover from '../TrackCover';
import { usePlayer, type Track } from '../../context/PlayerContext';
import PlaylistSelector from './PlaylistSelector';

interface TrackRowProps {
  track: Track;
  index: number;
  isActive: boolean;
  isPlaying: boolean;
  isBuffering: boolean;
  onTrackClick: (index: number) => void;
  onRemoveTrack?: (trackId: string) => void;
}

export const TrackRow: React.FC<TrackRowProps> = ({
  track,
  index,
  isActive,
  isPlaying,
  isBuffering,
  onTrackClick,
  onRemoveTrack,
}) => {
  const { isTrackLiked, toggleLike } = usePlayer();
  const [isHovered, setIsHovered] = useState(false);
  const [showPlaylistSelector, setShowPlaylistSelector] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowPlaylistSelector(false);
      }
    };
    if (showPlaylistSelector) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPlaylistSelector]);

  return (
    <div
      className={`group flex items-center md:grid md:grid-cols-[auto_1fr_1fr_auto] gap-3 md:gap-4 px-2 md:px-4 py-1.5 rounded-lg hover:bg-surface-hover/60 transition-all cursor-pointer border border-transparent hover:border-white/5 ${
        isActive ? 'bg-accent/10 border-accent/20' : ''
      }`}
      onClick={() => onTrackClick(index)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Index / Status */}
      <div className="hidden md:flex w-8 items-center justify-center text-text-secondary">
        {isActive && isBuffering ? (
          <Loader2 size={16} className="animate-spin text-accent" />
        ) : isActive && isPlaying ? (
          <div className="w-4 h-4 flex items-center justify-center gap-0.5">
            <div className="w-1 h-3 bg-accent rounded-full animate-pulse" />
            <div className="w-1 h-4 bg-accent rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
            <div className="w-1 h-2 bg-accent rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
          </div>
        ) : isHovered ? (
          <Play size={16} className="fill-current text-text-primary" />
        ) : (
          <span className={isActive ? 'text-accent font-bold' : 'text-xs'}>{index + 1}</span>
        )}
      </div>

      {/* Info */}
      <div className="flex items-center gap-3 min-w-0 flex-1 md:flex-none">
        <TrackCover
          coverUrl={track.coverUrl}
          coverBlob={track.coverBlob}
          alt={track.title}
          className="w-12 h-12 md:w-10 md:h-10 rounded-lg object-cover shadow-md group-hover:scale-105 transition-transform"
        />
        <div className="min-w-0">
          <p className={`font-semibold truncate text-sm md:text-base ${isActive ? 'text-accent' : 'text-text-primary'}`}>
            {track.title}
          </p>
          <p className="text-text-secondary text-xs truncate group-hover:text-text-primary transition-colors">
            {track.artist}
          </p>
        </div>
      </div>

      {/* Album */}
      <div className="hidden md:flex items-center text-text-secondary text-sm truncate opacity-70 group-hover:opacity-100 transition-opacity">
        {track.album}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 md:gap-4 text-text-secondary text-sm ml-auto">
        <button
          className={`transition-all hidden md:block p-1.5 rounded-full hover:bg-surface-hover ${
            isTrackLiked(track.id) 
              ? 'text-accent opacity-100' 
              : 'text-text-secondary hover:text-accent opacity-0 group-hover:opacity-100'
          }`}
          onClick={(e) => {
            e.stopPropagation();
            toggleLike(track.id, track.title);
          }}
        >
          <Heart size={18} fill={isTrackLiked(track.id) ? 'currentColor' : 'none'} />
        </button>

        <span className="w-10 text-right hidden md:block tabular-nums opacity-60 text-xs">
          {track.duration}
        </span>
        
        <div className="flex items-center gap-1 relative" ref={menuRef}>
          {onRemoveTrack && (
            <button
              className="text-text-secondary hover:text-red-500 transition-all p-2 md:p-1.5 rounded-full hover:bg-red-500/10 md:opacity-0 md:group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveTrack(track.id);
              }}
              title="Remove from playlist"
            >
              <Trash2 size={16} />
            </button>
          )}
          
          <button
            className={`text-text-secondary hover:text-text-primary transition-all p-2 md:p-1.5 rounded-full hover:bg-surface-hover ${
              showPlaylistSelector ? 'bg-surface-hover text-text-primary' : 'md:opacity-0 md:group-hover:opacity-100'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              setShowPlaylistSelector(!showPlaylistSelector);
            }}
          >
            <MoreHorizontal size={20} className="md:w-5 md:h-5" />
          </button>

          {showPlaylistSelector && (
            <div 
              className="absolute right-0 bottom-full mb-2 z-[100]"
              onClick={(e) => e.stopPropagation()}
            >
              <PlaylistSelector
                trackId={track.id}
                trackTitle={track.title}
                onClose={() => setShowPlaylistSelector(false)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrackRow;
