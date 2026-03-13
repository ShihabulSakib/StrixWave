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
    for (let i = 0; i < alt.length; i++) {
      hash = alt.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h1 = Math.abs(hash % 360);
    const h2 = (h1 + 40) % 360;
    return {
      background: `linear-gradient(135deg, hsl(${h1}, 60%, 45%) 0%, hsl(${h2}, 70%, 25%) 100%)`,
    };
  }, [alt]);

  const hasImage = blobUrl || (coverUrl && !coverUrl.includes('images.unsplash.com'));
  const finalUrl = blobUrl || coverUrl;

  if (hasImage) {
    return (
      <img
        src={finalUrl}
        alt={alt}
        className={`${className} object-cover animate-fade-in`}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
          // Force it to show the placeholder by making the parent visible
        }}
      />
    );
  }

  return (
    <div
      className={`${className} flex items-center justify-center text-white/50 overflow-hidden relative group`}
      style={placeholderStyle}
    >
      <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-500" />
      <Music2 size={iconSizes[size]} className="relative z-10 group-hover:scale-110 transition-transform duration-500 opacity-80" />
      
      {/* Subtle abstract pattern overlay */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '12px 12px' }} />
    </div>
  );
};

export default TrackCover;
