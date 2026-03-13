import { StorageProvider, ListFolderResult } from '../types';
import AuthManager from '../../auth/AuthManager';

interface TemporaryLinkEntry {
  url: string;
  fetchedAt: number;
}

const LINK_MAX_AGE_MS = 3.5 * 60 * 60 * 1000;
const MAX_RETRIES = 3;

export class DropboxStorageProvider implements StorageProvider {
  providerId = 'dropbox';
  private linkCache = new Map<string, TemporaryLinkEntry>();

  async getTemporaryLink(path: string): Promise<string> {
    const cached = this.linkCache.get(path);
    if (cached && !this.isLinkExpired(cached)) {
      return cached.url;
    }

    const auth = AuthManager.getInstance().getProvider('dropbox');
    if (!auth) throw new Error('Dropbox auth provider not found');
    
    const token = await auth.getAccessToken();

    const data = await this.fetchWithRetry<{ link: string }>(
      'https://api.dropboxapi.com/2/files/get_temporary_link',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path }),
      }
    );

    const entry: TemporaryLinkEntry = { url: data.link, fetchedAt: Date.now() };
    this.linkCache.set(path, entry);
    return data.link;
  }

  isLinkFresh(path: string): boolean {
    const cached = this.linkCache.get(path);
    return !!cached && !this.isLinkExpired(cached);
  }

  invalidateLink(path: string): void {
    this.linkCache.delete(path);
  }

  async downloadChunk(path: string, startByte: number, length: number): Promise<Blob> {
    const link = await this.getTemporaryLink(path);
    const endByte = startByte + length - 1;

    const response = await fetch(link, {
      headers: {
        Range: `bytes=${startByte}-${endByte}`,
      },
    });

    if (!response.ok && response.status !== 206) {
      throw new Error(`Dropbox chunk download failed: ${response.status}`);
    }

    return response.blob();
  }

  async listFolder(path: string, cursor?: string): Promise<ListFolderResult> {
    const auth = AuthManager.getInstance().getProvider('dropbox');
    if (!auth) throw new Error('Dropbox auth provider not found');
    const token = await auth.getAccessToken();

    const endpoint = cursor
      ? 'https://api.dropboxapi.com/2/files/list_folder/continue'
      : 'https://api.dropboxapi.com/2/files/list_folder';

    const body = cursor
      ? { cursor }
      : { path: path || '', recursive: true, limit: 2000 };

    const data = await this.fetchWithRetry<any>(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    return {
      entries: data.entries.map((e: any) => ({
        name: e.name,
        path: e.path_lower,
        size: e.size || 0,
        isFolder: e['.tag'] === 'folder',
      })),
      cursor: data.cursor,
      hasMore: data.has_more,
    };
  }

  private isLinkExpired(entry: TemporaryLinkEntry): boolean {
    return Date.now() - entry.fetchedAt > LINK_MAX_AGE_MS;
  }

  private async fetchWithRetry<T>(url: string, init: RequestInit, attempt = 0): Promise<T> {
    const response = await fetch(url, init);

    if (response.status === 429 && attempt < MAX_RETRIES) {
      const delay = Math.pow(2, attempt) * 1000;
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
