/**
 * audio-utils.ts — Shared Audio Utilities
 *
 * Consolidates duplicated logic from PlayerBar.tsx and MobilePlayerDrawer.tsx.
 */

export type RepeatMode = 'off' | 'one' | 'all';

/**
 * Format seconds into m:ss display string.
 */
export function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Cycle repeat mode: off → all → one → off
 */
export function getNextRepeatMode(current: RepeatMode): RepeatMode {
  const modes: RepeatMode[] = ['off', 'all', 'one'];
  const idx = modes.indexOf(current);
  return modes[(idx + 1) % modes.length];
}

/**
 * Compute seek position from a mouse event on a progress bar element.
 * Returns the fraction (0-1) of the bar that was clicked.
 */
export function getSeekFraction(
  e: React.MouseEvent<HTMLDivElement>,
  barElement: HTMLDivElement
): number {
  const rect = barElement.getBoundingClientRect();
  const x = e.clientX - rect.left;
  return Math.max(0, Math.min(1, x / rect.width));
}

/**
 * Compute seek fraction from a touch event.
 */
export function getTouchSeekFraction(
  e: React.TouchEvent<HTMLDivElement>,
  barElement: HTMLDivElement
): number {
  const rect = barElement.getBoundingClientRect();
  const x = e.touches[0].clientX - rect.left;
  return Math.max(0, Math.min(1, x / rect.width));
}
