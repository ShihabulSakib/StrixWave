/**
 * DiscoveryEngine — Recursive Cloud Folder Scanner
 *
 * Scans a cloud storage folder (default: root) recursively,
 * filters for audio files, extracts metadata using a Web Worker,
 * and stores results in IndexedDB.
 */

import StorageManager from './storage/StorageManager';
import { upsertTracks, clearTracks, type StoredTrack } from './db';
import type { MetadataRequest, MetadataResponse } from './metadata.worker';

// Supported audio extensions
const AUDIO_EXTENSIONS = new Set(['.mp3', '.flac', '.wav', '.ogg', '.m4a', '.aac', '.wma', '.opus']);

// Metadata chunk size: 512KB
const METADATA_CHUNK_SIZE = 512 * 1024;

export type ScanProgressCallback = (found: number, scanning: boolean) => void;

class DiscoveryEngine {
  private static instance: DiscoveryEngine;
  private worker: Worker | null = null;

  private constructor() {}

  static getInstance(): DiscoveryEngine {
    if (!DiscoveryEngine.instance) {
      DiscoveryEngine.instance = new DiscoveryEngine();
    }
    return DiscoveryEngine.instance;
  }

  private getWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(
        new URL('./metadata.worker.ts', import.meta.url),
        { type: 'module' }
      );
    }
    return this.worker;
  }

  private parseWithWorker(id: string, arrayBuffer: ArrayBuffer, filename: string): Promise<MetadataResponse> {
    return new Promise((resolve) => {
      const worker = this.getWorker();
      const handler = (event: MessageEvent<MetadataResponse>) => {
        if (event.data.id === id) {
          worker.removeEventListener('message', handler);
          resolve(event.data);
        }
      };
      worker.addEventListener('message', handler);
      const request: MetadataRequest = { id, arrayBuffer, filename };
      worker.postMessage(request, [arrayBuffer]);
    });
  }

  async scanFolder(
    providerId: string = 'dropbox',
    rootPath: string = '',
    onProgress?: ScanProgressCallback
  ): Promise<StoredTrack[]> {
    const storage = StorageManager.getInstance();
    const tracks: StoredTrack[] = [];
    
    // For Google Drive, we need to manually recurse. For Dropbox, it's already recursive.
    const foldersToScan: string[] = [rootPath || (providerId === 'google-drive' ? 'root' : '')];
    const scannedFolders = new Set<string>();

    onProgress?.(0, true);

    try {
      while (foldersToScan.length > 0) {
        const currentFolder = foldersToScan.shift()!;
        if (scannedFolders.has(currentFolder)) continue;
        scannedFolders.add(currentFolder);

        console.log(`[DiscoveryEngine] Scanning folder: ${currentFolder} on ${providerId}`);
        
        let result = await storage.listFolder(providerId, currentFolder);
        const allEntries = [...result.entries];

        while (result.hasMore) {
          result = await storage.listFolder(providerId, currentFolder, result.cursor);
          allEntries.push(...result.entries);
        }

        // For Google Drive, add subfolders to the queue
        if (providerId === 'google-drive') {
          allEntries
            .filter(entry => entry.isFolder)
            .forEach(folder => foldersToScan.push(folder.path));
        }

        const audioEntries = allEntries.filter((entry) => {
          if (entry.isFolder) return false;
          return AUDIO_EXTENSIONS.has(this.getExtension(entry.name));
        });

        if (audioEntries.length > 0) {
          console.log(`[DiscoveryEngine] Found ${audioEntries.length} audio files in ${currentFolder}. Extracting metadata...`);

          const CONCURRENCY = 5;

          for (let i = 0; i < audioEntries.length; i += CONCURRENCY) {
            const batch = audioEntries.slice(i, i + CONCURRENCY);
            
            const batchResults = await Promise.all(
              batch.map(async (entry) => {
                const pathMeta = this.extractMetadataFromPath(entry.path, rootPath);
                let artist = pathMeta.artist;
                let album = pathMeta.album;
                let title = this.cleanTitle(entry.name);
                let duration = '0:00';
                let durationSeconds = 0;
                let coverBlob: Blob | undefined;

                try {
                  const chunk = await storage.downloadChunk(providerId, entry.path, 0, METADATA_CHUNK_SIZE);
                  const arrayBuffer = await chunk.arrayBuffer();
                  
                  const workerResult = await this.parseWithWorker(
                    this.generateId(providerId, entry.path),
                    arrayBuffer,
                    entry.name
                  );

                  if (!workerResult.error) {
                    if (workerResult.title) title = workerResult.title;
                    if (workerResult.artist) artist = workerResult.artist;
                    if (workerResult.album) album = workerResult.album;
                    if (workerResult.durationSeconds) durationSeconds = workerResult.durationSeconds;
                    if (workerResult.duration) duration = workerResult.duration;
                    if (workerResult.coverBlob) coverBlob = workerResult.coverBlob;
                  }
                } catch (metaErr) {
                   console.error(`[DiscoveryEngine] Metadata extraction failed for ${entry.name}:`, metaErr);
                }

                return {
                  id: this.generateId(providerId, entry.path),
                  title,
                  artist,
                  album,
                  providerId,
                  providerPath: entry.path,
                  duration,
                  durationSeconds,
                  coverUrl: undefined, // Removed default covers
                  coverBlob,
                  addedDate: new Date().toLocaleDateString(),
                  fileSize: entry.size || 0,
                };
              })
            );

            tracks.push(...batchResults);
            onProgress?.(tracks.length, true);
            
            if (i + CONCURRENCY < audioEntries.length) {
              await new Promise(r => setTimeout(r, 100));
            }
          }
        }
      }

      if (tracks.length > 0) {
        await upsertTracks(tracks);
      }

      onProgress?.(tracks.length, false);
      this.terminateWorker();
      return tracks;
    } catch (err) {
      console.error('[DiscoveryEngine] Scan failed:', err);
      onProgress?.(tracks.length, false);
      this.terminateWorker();
      throw err;
    }
  }

  private terminateWorker(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }

  private extractMetadataFromPath(
    filePath: string,
    rootPath: string
  ): { artist: string; album: string } {
    const root = rootPath.toLowerCase().replace(/\/$/, '');
    let relative = filePath.toLowerCase();
    if (root && relative.startsWith(root)) {
      relative = relative.slice(root.length);
    }

    const parts = relative.split('/').filter(Boolean);

    if (parts.length >= 3) {
      return {
        artist: this.capitalize(parts[parts.length - 3]) || 'Unknown Artist',
        album: this.capitalize(parts[parts.length - 2]) || 'Unknown Album',
      };
    } else if (parts.length === 2) {
      return {
        artist: this.capitalize(parts[0]),
        album: 'Unknown Album',
      };
    }

    return { artist: 'Unknown Artist', album: 'Unknown Album' };
  }

  private cleanTitle(filename: string): string {
    const dotIdx = filename.lastIndexOf('.');
    let name = dotIdx > 0 ? filename.slice(0, dotIdx) : filename;
    name = name.replace(/^\d+[\s.\-_]+/, '');
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

  private generateId(providerId: string, path: string): string {
    const fullPath = `${providerId}:${path}`;
    let hash = 0;
    for (let i = 0; i < fullPath.length; i++) {
      const char = fullPath.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return `${providerId.slice(0, 3)}_${Math.abs(hash).toString(36)}`;
  }
}

export default DiscoveryEngine;
