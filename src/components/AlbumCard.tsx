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
  onClick,
  onPlay,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      className="group relative bg-surface p-3 rounded-lg cursor-pointer hover:bg-surface-hover transition-all duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Cover Image */}
      <div className="relative mb-4">
        <TrackCover
          coverUrl={coverUrl}
          coverBlob={coverBlob}
          alt={title}
          className="w-full aspect-square object-cover rounded-md shadow-lg"
        />
        {/* Play Button Overlay */}
        <div
          onClick={(e) => {
            if (onPlay) {
              e.stopPropagation();
              onPlay(e);
            }
          }}
          className={`absolute bottom-2 right-2 w-12 h-12 rounded-full bg-accent flex items-center justify-center shadow-xl transition-all duration-300 ${
            isHovered
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-4'
          }`}
        >
          <Play size={24} className="fill-primary text-primary ml-1" />
        </div>
      </div>

      {/* Title */}
      <h3 className="text-text-primary font-semibold text-sm mb-1 truncate">
        {title}
      </h3>

      {/* Description */}
      {showDescription && description && (
        <p className="text-text-secondary text-xs line-clamp-2">{description}</p>
      )}

      {/* Subtitle (for Made for You section) */}
      {!showDescription && subtitle && (
        <p className="text-text-secondary text-xs line-clamp-1">{subtitle}</p>
      )}
    </div>
  );
};

export default AlbumCard;
