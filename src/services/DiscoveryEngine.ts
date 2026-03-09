/**
 * DiscoveryEngine — Recursive Dropbox Folder Scanner
 *
 * Scans a Dropbox folder (default: /Music) recursively,
 * filters for audio files, extracts metadata from folder structure,
 * and stores results in IndexedDB.
 *
 * Folder convention: /Music/Artist/Album/track.mp3
 * If structure is flat, artist/album default to "Unknown".
 */

import DropboxService from './DropboxService';
import { upsertTracks, clearTracks, type StoredTrack } from './db';

// Supported audio extensions
const AUDIO_EXTENSIONS = new Set(['.mp3', '.flac', '.wav', '.ogg', '.m4a', '.aac', '.wma', '.opus']);

// Default cover images (cycle through Unsplash music images)
const DEFAULT_COVERS = [
  'https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=300&h=300&fit=crop',
];

export type ScanProgressCallback = (found: number, scanning: boolean) => void;

class DiscoveryEngine {
  private static instance: DiscoveryEngine;

  private constructor() {}

  static getInstance(): DiscoveryEngine {
    if (!DiscoveryEngine.instance) {
      DiscoveryEngine.instance = new DiscoveryEngine();
    }
    return DiscoveryEngine.instance;
  }

  /**
   * Scan a Dropbox folder recursively for audio files.
   *
   * @param rootPath  The Dropbox path to scan (e.g. "/Music" or "")
   * @param onProgress  Called with (tracksFound, isStillScanning)
   * @returns Array of discovered tracks (also persisted in IndexedDB)
   */
  async scanFolder(
    rootPath: string = '',
    onProgress?: ScanProgressCallback
  ): Promise<StoredTrack[]> {
    const dropbox = DropboxService.getInstance();
    const tracks: StoredTrack[] = [];
    let coverIndex = 0;

    onProgress?.(0, true);

    try {
      // 1. Gather all file entries first (recursive)
      let result = await dropbox.listFolder(rootPath);
      const allEntries = [...result.entries];

      while (result.has_more) {
        result = await dropbox.listFolder('', result.cursor);
        allEntries.push(...result.entries);
      }

      // Filter for audio files
      const audioEntries = allEntries.filter((entry) => {
        if (entry['.tag'] !== 'file') return false;
        return AUDIO_EXTENSIONS.has(this.getExtension(entry.name));
      });

      console.log(`[DiscoveryEngine] Found ${audioEntries.length} audio files. Extracting metadata...`);

      // 2. Process in parallel with concurrency limit (avoid 429s)
      const CONCURRENCY = 5;
      const mm = await import('music-metadata-browser');

      for (let i = 0; i < audioEntries.length; i += CONCURRENCY) {
        const batch = audioEntries.slice(i, i + CONCURRENCY);
        
        const batchResults = await Promise.all(
          batch.map(async (entry) => {
            // Default fallback metadata from path/filename
            const pathMeta = this.extractMetadataFromPath(entry.path_lower, rootPath);
            let artist = pathMeta.artist;
            let album = pathMeta.album;
            let title = this.cleanTitle(entry.name);
            let duration = '0:00';
            let durationSeconds = 0;
            const coverUrl = DEFAULT_COVERS[coverIndex++ % DEFAULT_COVERS.length];
            let coverBlob: Blob | undefined;

            try {
              // Increase chunk size to 1MB for better reliability with high-res art/FLAC
              const chunk = await dropbox.downloadChunk(entry.path_lower, 0, 1024 * 1024);
              const arrayBuffer = await chunk.arrayBuffer();
              const uint8Array = new Uint8Array(arrayBuffer);
              
              const metadata = await mm.parseBuffer(uint8Array, entry.name);
              console.log(`[DiscoveryEngine] Parsed ${entry.name}:`, metadata.common.title || 'No Title');
              
              // Prefer metadata-based values if they exist
              if (metadata.common.title) title = metadata.common.title;
              if (metadata.common.artist) artist = metadata.common.artist;
              if (metadata.common.album) album = metadata.common.album;
              
              if (metadata.format.duration) {
                durationSeconds = Math.round(metadata.format.duration);
                const mins = Math.floor(durationSeconds / 60);
                const secs = durationSeconds % 60;
                duration = `${mins}:${secs.toString().padStart(2, '0')}`;
              }
              
              if (metadata.common.picture && metadata.common.picture.length > 0) {
                const picture = metadata.common.picture[0];
                coverBlob = new Blob([picture.data], { type: picture.format });
                console.log(`[DiscoveryEngine] Found cover art for ${entry.name} (${picture.format}, ${picture.data.length} bytes)`);
              }
            } catch (metaErr) {
               console.error(`[DiscoveryEngine] Metadata extraction failed for ${entry.name}:`, metaErr);
            }

            return {
              id: this.generateId(entry.path_lower),
              title,
              artist,
              album,
              dropboxPath: entry.path_lower,
              duration,
              durationSeconds,
              coverUrl,
              coverBlob,
              addedDate: new Date().toLocaleDateString(),
              fileSize: entry.size || 0,
            };
          })
        );

        tracks.push(...batchResults);
        onProgress?.(tracks.length, true);
        
        // Brief pause to avoid hammering the API
        if (i + CONCURRENCY < audioEntries.length) {
          await new Promise(r => setTimeout(r, 200));
        }
      }

      // 3. Persist to IndexedDB
      if (tracks.length > 0) {
        await clearTracks();
        await upsertTracks(tracks);
      }

      onProgress?.(tracks.length, false);
      return tracks;
    } catch (err) {
      console.error('[DiscoveryEngine] Scan failed:', err);
      onProgress?.(tracks.length, false);
      throw err;
    }
  }

  // ---------------------------------------------------------------
  // Private Helpers
  // ---------------------------------------------------------------

  /**
   * Extract artist/album from folder path.
   * Convention: rootPath/Artist/Album/file.mp3
   * Falls back to "Unknown" if structure is flat.
   */
  private extractMetadataFromPath(
    filePath: string,
    rootPath: string
  ): { artist: string; album: string } {
    // Remove root path prefix
    const root = rootPath.toLowerCase().replace(/\/$/, '');
    let relative = filePath.toLowerCase();
    if (root && relative.startsWith(root)) {
      relative = relative.slice(root.length);
    }

    // Split: /artist/album/file.mp3 → ['', 'artist', 'album', 'file.mp3']
    const parts = relative.split('/').filter(Boolean);

    if (parts.length >= 3) {
      // Has artist/album structure
      return {
        artist: this.capitalize(parts[parts.length - 3]) || 'Unknown Artist',
        album: this.capitalize(parts[parts.length - 2]) || 'Unknown Album',
      };
    } else if (parts.length === 2) {
      // Just artist/file.mp3
      return {
        artist: this.capitalize(parts[0]),
        album: 'Unknown Album',
      };
    }

    return { artist: 'Unknown Artist', album: 'Unknown Album' };
  }

  private cleanTitle(filename: string): string {
    // Remove extension
    const dotIdx = filename.lastIndexOf('.');
    let name = dotIdx > 0 ? filename.slice(0, dotIdx) : filename;

    // Remove leading track numbers like "01 ", "01. ", "01 - "
    name = name.replace(/^\d+[\s.\-_]+/, '');

    // Replace underscores with spaces
    name = name.replace(/_/g, ' ');

    return name.trim() || filename;
  }

  private getExtension(filename: string): string {
    const dotIdx = filename.lastIndexOf('.');
    return dotIdx > 0 ? filename.slice(dotIdx).toLowerCase() : '';
  }

  private capitalize(str: string): string {
    return str
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  private generateId(path: string): string {
    // Simple hash from path for consistent IDs
    let hash = 0;
    for (let i = 0; i < path.length; i++) {
      const char = path.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32-bit int
    }
    return `dbx_${Math.abs(hash).toString(36)}`;
  }
}

export default DiscoveryEngine;
