import React, { useState, useEffect } from 'react';

interface TrackCoverProps {
  coverUrl?: string;
  coverBlob?: Blob;
  alt: string;
  className?: string;
}

export const TrackCover: React.FC<TrackCoverProps> = ({ coverUrl, coverBlob, alt, className }) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (coverBlob) {
      const url = URL.createObjectURL(coverBlob);
      setBlobUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    return undefined;
  }, [coverBlob]);

  const finalUrl = blobUrl || coverUrl || 'https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=300&h=300&fit=crop';

  return (
    <img
      src={finalUrl}
      alt={alt}
      className={className}
      onError={(e) => {
        // Fallback if blob URL or original URL fails
        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=300&h=300&fit=crop';
      }}
    />
  );
};

export default TrackCover;
