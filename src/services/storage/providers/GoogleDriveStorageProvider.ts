import { StorageProvider, ListFolderResult } from '../types';
import AuthManager from '../../auth/AuthManager';

export class GoogleDriveStorageProvider implements StorageProvider {
  providerId = 'google-drive';

  async getTemporaryLink(fileId: string): Promise<string> {
    // Google Drive doesn't have a simple temporary link like Dropbox.
    // We return a special URI that our download methods will recognize,
    // or just the media download URL.
    // Since we are using fetch with headers in our engine, we can return the media URL.
    return `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  }

  isLinkFresh(_path: string): boolean {
    // Google Drive "links" (media URLs) don't really expire as long as the token is valid.
    return true;
  }

  invalidateLink(_path: string): void {
    // No-op for Google Drive
  }

  async getHeaders(): Promise<Record<string, string>> {
    const auth = AuthManager.getInstance().getProvider('google-drive');
    const token = await auth?.getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async downloadChunk(fileId: string, startByte: number, length: number): Promise<Blob> {
    const auth = AuthManager.getInstance().getProvider('google-drive');
    if (!auth) throw new Error('Google Drive auth provider not found');
    const token = await auth.getAccessToken();

    const endByte = startByte + length - 1;
    const url = await this.getTemporaryLink(fileId);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Range: `bytes=${startByte}-${endByte}`,
      },
    });

    if (!response.ok && response.status !== 206) {
      throw new Error(`Google Drive chunk download failed: ${response.status}`);
    }

    return response.blob();
  }

  async listFolder(folderId: string = 'root', cursor?: string): Promise<ListFolderResult> {
    const auth = AuthManager.getInstance().getProvider('google-drive');
    if (!auth) throw new Error('Google Drive auth provider not found');
    const token = await auth.getAccessToken();

    // Query for files in folder, including audio files and folders
    const q = `'${folderId}' in parents and trashed = false and (mimeType contains 'audio/' or mimeType = 'application/vnd.google-apps.folder')`;
    const params = new URLSearchParams({
      q,
      fields: 'nextPageToken, files(id, name, mimeType, size)',
      pageSize: '1000',
    });
    if (cursor) params.append('pageToken', cursor);

    const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Google Drive list failed: ${await response.text()}`);
    }

    const data = await response.json();

    return {
      entries: data.files.map((f: any) => ({
        name: f.name,
        path: f.id, // Use ID as path for Google Drive
        size: parseInt(f.size || '0', 10),
        isFolder: f.mimeType === 'application/vnd.google-apps.folder',
      })),
      cursor: data.nextPageToken,
      hasMore: !!data.nextPageToken,
    };
  }
}
