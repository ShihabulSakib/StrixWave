import React, { useState, useEffect, useMemo } from 'react';
import { Music2 } from 'lucide-react';

interface TrackCoverProps {
  coverUrl?: string;
  coverBlob?: Blob;
  alt: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const TrackCover: React.FC<TrackCoverProps> = ({ coverUrl, coverBlob, alt, className, size = 'md' }) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 48,
    xl: 64,
  };

  useEffect(() => {
    if (coverBlob) {
      const url = URL.createObjectURL(coverBlob);
      setBlobUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setBlobUrl(null);
    return undefined;
  }, [coverBlob]);

  // Generate a consistent gradient based on the alt text (title)
  const placeholderStyle = useMemo(() => {
    let hash = 0;
    const seed = alt || 'strixwave';
    for (let i = 0; i < seed.length; i++) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h1 = Math.abs(hash % 360);
    const h2 = (h1 + 40) % 360;
    return {
      background: `linear-gradient(135deg, hsl(${h1}, 65%, 45%) 0%, hsl(${h2}, 75%, 25%) 100%)`,
    };
  }, [alt]);

  const hasImage = blobUrl || (coverUrl && !coverUrl.includes('images.unsplash.com'));
  const finalUrl = blobUrl || coverUrl;

  return (
    <div className={`relative overflow-hidden group shrink-0 ${className}`}>
      {hasImage ? (
        <img
          src={finalUrl}
          alt={alt}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center text-white/50 relative"
          style={placeholderStyle}
        >
          <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-500" />
          <Music2 
            size={iconSizes[size]} 
            className="relative z-10 group-hover:scale-110 transition-transform duration-500 opacity-80" 
          />
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '12px 12px' }} />
        </div>
      )}
      {/* Subtle glass overlay for all covers */}
      <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
    </div>
  );
};

export default TrackCover;
