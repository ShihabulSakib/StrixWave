import React, { useState } from 'react';
import { Play } from 'lucide-react';
import TrackCover from './TrackCover';

interface AlbumCardProps {
  title: string;
  description?: string;
  subtitle?: string;
  coverUrl: string;
  coverBlob?: Blob;
  showDescription?: boolean;
  hidePlayButton?: boolean;
  onClick?: () => void;
  onPlay?: (e: React.MouseEvent) => void;
}

export const AlbumCard: React.FC<AlbumCardProps> = ({
  title,
  description,
  subtitle,
  coverUrl,
  coverBlob,
  showDescription = true,
  hidePlayButton = false,
  onClick,
  onPlay,
}) => {
  return (
    <div
      onClick={onClick}
      className="group relative bg-white/[0.02] border border-white/5 p-4 rounded-2xl cursor-pointer hover:bg-white/[0.06] hover:border-white/10 transition-all duration-500 shadow-sm hover:shadow-2xl hover:-translate-y-1"
    >
      {/* Cover Image */}
      <div className="relative mb-4 aspect-square overflow-hidden rounded-xl shadow-lg">
        <TrackCover
          coverUrl={coverUrl}
          coverBlob={coverBlob}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        
        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        {/* Play Button Overlay */}
        {!hidePlayButton && (
          <div
            onClick={(e) => {
              if (onPlay) {
                e.stopPropagation();
                onPlay(e);
              }
            }}
            className="absolute bottom-3 right-3 w-12 h-12 rounded-full bg-accent flex items-center justify-center shadow-2xl transition-all duration-500 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 active:scale-90 hover:scale-110"
          >
            <Play size={22} className="fill-primary text-primary ml-1" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="space-y-1">
        <h3 className="text-text-primary font-bold text-base truncate tracking-tight">
          {title}
        </h3>

        {showDescription && description && (
          <p className="text-text-secondary text-xs line-clamp-2 font-medium leading-relaxed opacity-70">
            {description}
          </p>
        )}

        {!showDescription && subtitle && (
          <p className="text-text-secondary text-xs line-clamp-1 font-bold uppercase tracking-widest opacity-50">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};

export default AlbumCard;
