/**
 * color-utils.ts — Professional color extraction and manipulation
 */

export interface TrackTheme {
  primary: string;
  secondary: string;
  accent: string;
  isDark: boolean;
}

const DEFAULT_THEME: TrackTheme = {
  primary: '#0A192F',
  secondary: '#112240',
  accent: '#FFB100',
  isDark: true,
};

/**
 * Extracts the dominant color from an image (URL or Blob)
 */
export async function extractTheme(source?: string | Blob): Promise<TrackTheme> {
  if (!source) return DEFAULT_THEME;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(DEFAULT_THEME);

      // Scale down for performance
      canvas.width = 50;
      canvas.height = 50;
      ctx.drawImage(img, 0, 0, 50, 50);

      const imageData = ctx.getImageData(0, 0, 50, 50).data;
      let r = 0, g = 0, b = 0;
      let count = 0;

      // Average colors (skipping transparent/pure black/pure white)
      for (let i = 0; i < imageData.length; i += 4) {
        const tr = imageData[i];
        const tg = imageData[i + 1];
        const tb = imageData[i + 2];
        const brightness = (tr + tg + tb) / 3;
        
        if (brightness > 10 && brightness < 245) {
          r += tr;
          g += tg;
          b += tb;
          count++;
        }
      }

      if (count === 0) return resolve(DEFAULT_THEME);

      r = Math.floor(r / count);
      g = Math.floor(g / count);
      b = Math.floor(b / count);

      // Create primary color (muted version of dominant for background)
      const primary = `rgb(${r}, ${g}, ${b})`;
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      const isDark = brightness < 128;

      // Create secondary (darker/lighter variant)
      const secondary = isDark 
        ? `rgb(${Math.max(0, r - 30)}, ${Math.max(0, g - 30)}, ${Math.max(0, b - 30)})`
        : `rgb(${Math.min(255, r + 30)}, ${Math.min(255, g + 30)}, ${Math.min(255, b + 30)})`;

      resolve({
        primary,
        secondary,
        accent: isDark ? '#FFB100' : '#0A192F', // Keep high contrast accent
        isDark,
      });
    };

    img.onerror = () => resolve(DEFAULT_THEME);

    if (source instanceof Blob) {
      img.src = URL.createObjectURL(source);
    } else {
      img.src = source;
    }
  });
}

/**
 * Generates a theme from a string (for generated gradients)
 */
export function generateThemeFromTitle(title: string): TrackTheme {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h1 = Math.abs(hash % 360);
  const h2 = (h1 + 40) % 360;
  
  return {
    primary: `hsl(${h1}, 60%, 25%)`,
    secondary: `hsl(${h2}, 70%, 15%)`,
    accent: '#FFB100',
    isDark: true,
  };
}
