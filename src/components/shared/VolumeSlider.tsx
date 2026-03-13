/**
 * VolumeSlider — Shared Volume Control
 *
 * Used by both PlayerBar (desktop) and MobilePlayerDrawer.
 */

import React, { useRef, useCallback } from 'react';
import { Volume2, Volume1, VolumeX } from 'lucide-react';

interface VolumeSliderProps {
  /** Volume level 0-100 */
  volume: number;
  /** Called with new volume 0-100 */
  onVolumeChange: (volume: number) => void;
  /** Icon size */
  iconSize?: number;
  /** Width class for the container */
  widthClass?: string;
}

export const VolumeSlider: React.FC<VolumeSliderProps> = ({
  volume,
  onVolumeChange,
  iconSize = 18,
  widthClass = 'w-28',
}) => {
  const barRef = useRef<HTMLDivElement>(null);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!barRef.current) return;
      const rect = barRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
      onVolumeChange(pct);
    },
    [onVolumeChange]
  );

  const toggleMute = useCallback(() => {
    onVolumeChange(volume === 0 ? 70 : 0);
  }, [volume, onVolumeChange]);

  // Hidden on mobile since browsers on Android/iOS do not support programmatic system volume sync
  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
    return null;
  }

  const VolumeIcon = volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2;

  return (
    <div className={`flex items-center gap-2 ${widthClass} group`}>
      <button
        onClick={toggleMute}
        className="text-text-secondary hover:text-text-primary transition-colors"
      >
        <VolumeIcon size={iconSize} />
      </button>
      <div
        ref={barRef}
        onClick={handleClick}
        role="slider"
        aria-label="Volume"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(volume)}
        tabIndex={0}
        className="flex-1 h-1 bg-white/10 rounded-full cursor-pointer"
      >
        <div
          className="h-full bg-text-secondary rounded-full group-hover:bg-accent transition-colors"
          style={{ width: `${volume}%` }}
        />
      </div>
    </div>
  );
};

export default VolumeSlider;
