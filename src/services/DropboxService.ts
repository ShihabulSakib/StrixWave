/**
 * DropboxService — Bridge between Strixwave and Dropbox API
 *
 * Responsibilities:
 *   1. Fetch temporary streaming links (4h expiry)
 *   2. Download files with Range-based chunking
 *   3. Exponential backoff on HTTP 429 (rate limit)
 *   4. Link age validation before resuming paused tracks
 */

import AuthService from './AuthService';

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

export interface TemporaryLinkEntry {
  url: string;
  fetchedAt: number; // epoch ms
}

interface DropboxFileMetadata {
  name: string;
  path_lower: string;
  size: number;
  '.tag': string;
}

export interface DropboxListFolderResult {
  entries: DropboxFileMetadata[];
  cursor: string;
  has_more: boolean;
}

// -------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------

/** Links are valid for 4h; we re-fetch after 3.5h to be safe. */
const LINK_MAX_AGE_MS = 3.5 * 60 * 60 * 1000;

/** Max retries for exponential backoff */
const MAX_RETRIES = 3;

/** Chunk size for Range requests (2MB) */
const CHUNK_SIZE = 2 * 1024 * 1024;

// -------------------------------------------------------------------
// DropboxService
// -------------------------------------------------------------------

class DropboxService {
  private static instance: DropboxService;
  private linkCache = new Map<string, TemporaryLinkEntry>();

  private constructor() {}

  static getInstance(): DropboxService {
    if (!DropboxService.instance) {
      DropboxService.instance = new DropboxService();
    }
    return DropboxService.instance;
  }

  // ---------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------

  /**
   * Get a temporary download link for a file.
   * Returns a cached link if still fresh (<3.5h old), otherwise re-fetches.
   */
  async getTemporaryLink(dropboxPath: string): Promise<string> {
    const cached = this.linkCache.get(dropboxPath);
    if (cached && !this.isLinkExpired(cached)) {
      return cached.url;
    }

    const token = await AuthService.getInstance().getAccessToken();

    const data = await this.fetchWithRetry<{ link: string }>(
      'https://api.dropboxapi.com/2/files/get_temporary_link',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path: dropboxPath }),
      }
    );

    const entry: TemporaryLinkEntry = { url: data.link, fetchedAt: Date.now() };
    this.linkCache.set(dropboxPath, entry);
    return data.link;
  }

  /**
   * Check if a cached link for a path is still valid.
   * Used before resuming a paused track.
   */
  isLinkFresh(dropboxPath: string): boolean {
    const cached = this.linkCache.get(dropboxPath);
    return !!cached && !this.isLinkExpired(cached);
  }

  /**
   * Invalidate a cached link (forces re-fetch on next request).
   */
  invalidateLink(dropboxPath: string): void {
    this.linkCache.delete(dropboxPath);
  }

  /**
   * Download a file as a Blob.
   * Optionally reports download progress.
   */
  async downloadFile(
    dropboxPath: string,
    onProgress?: (loaded: number, total: number) => void
  ): Promise<Blob> {
    const link = await this.getTemporaryLink(dropboxPath);

    const response = await fetch(link);
    if (!response.ok) {
      throw new Error(`Download failed: ${response.status} ${response.statusText}`);
    }

    const contentLength = Number(response.headers.get('Content-Length') || 0);
    const reader = response.body?.getReader();

    if (!reader) {
      // Fallback: no streaming support
      return response.blob();
    }

    const chunks: Uint8Array[] = [];
    let loaded = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      chunks.push(value);
      loaded += value.length;
      onProgress?.(loaded, contentLength);
    }

    return new Blob(chunks);
  }

  /**
   * Download a byte range of a file (for tiered chunk pre-fetching).
   *
   * Range header: "bytes=start-end"
   * Returns the chunk as a Blob.
   */
  async downloadChunk(
    dropboxPath: string,
    startByte: number = 0,
    chunkSize: number = CHUNK_SIZE
  ): Promise<Blob> {
    const link = await this.getTemporaryLink(dropboxPath);
    const endByte = startByte + chunkSize - 1;

    // Note: Dropbox temporary links support Range requests
    try {
      const response = await fetch(link, {
        headers: {
          Range: `bytes=${startByte}-${endByte}`,
        },
      });

      if (!response.ok && response.status !== 206) {
        throw new Error(`Chunk download failed: ${response.status}`);
      }

      return response.blob();
    } catch (err) {
      console.error(`[DropboxService] downloadChunk failed for ${dropboxPath}:`, err);
      throw err;
    }
  }

  /**
   * List folder contents (used by DiscoveryEngine).
   */
  async listFolder(path: string, cursor?: string): Promise<DropboxListFolderResult> {
    const token = await AuthService.getInstance().getAccessToken();

    const endpoint = cursor
      ? 'https://api.dropboxapi.com/2/files/list_folder/continue'
      : 'https://api.dropboxapi.com/2/files/list_folder';

    const body = cursor
      ? { cursor }
      : { path: path || '', recursive: true, limit: 2000 };

    return this.fetchWithRetry<DropboxListFolderResult>(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  }

  // ---------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------

  private isLinkExpired(entry: TemporaryLinkEntry): boolean {
    return Date.now() - entry.fetchedAt > LINK_MAX_AGE_MS;
  }

  /**
   * Fetch with exponential backoff on 429 (Rate Limit).
   * Retries: 1s → 2s → 4s
   */
  private async fetchWithRetry<T>(url: string, init: RequestInit, attempt = 0): Promise<T> {
    const response = await fetch(url, init);

    if (response.status === 429 && attempt < MAX_RETRIES) {
      const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
      console.warn(`[DropboxService] Rate limited (429). Retrying in ${delay}ms... (attempt ${attempt + 1}/${MAX_RETRIES})`);
      await new Promise((r) => setTimeout(r, delay));
      return this.fetchWithRetry<T>(url, init, attempt + 1);
    }

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Dropbox API error (${response.status}): ${err}`);
    }

    return response.json();
  }
}

export default DropboxService;
