import { StorageProvider, ListFolderResult } from './types';
import { DropboxStorageProvider } from './providers/DropboxStorageProvider';
import { GoogleDriveStorageProvider } from './providers/GoogleDriveStorageProvider';

class StorageManager {
  private static instance: StorageManager;
  private providers: Map<string, StorageProvider> = new Map();

  private constructor() {
    this.registerProvider(new DropboxStorageProvider());
    this.registerProvider(new GoogleDriveStorageProvider());
  }

  static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  registerProvider(provider: StorageProvider): void {
    this.providers.set(provider.providerId, provider);
  }

  getProvider(id: string): StorageProvider | undefined {
    return this.providers.get(id);
  }

  async listFolder(providerId: string, path: string, cursor?: string): Promise<ListFolderResult> {
    const provider = this.getProvider(providerId);
    if (!provider) throw new Error(`Storage provider ${providerId} not found`);
    return provider.listFolder(path, cursor);
  }

  async getTemporaryLink(providerId: string, path: string): Promise<string> {
    const provider = this.getProvider(providerId);
    if (!provider) throw new Error(`Storage provider ${providerId} not found`);
    return provider.getTemporaryLink(path);
  }

  async downloadChunk(providerId: string, path: string, startByte: number, length: number): Promise<Blob> {
    const provider = this.getProvider(providerId);
    if (!provider) throw new Error(`Storage provider ${providerId} not found`);
    const link = await provider.getTemporaryLink(path);
    const headers = (await provider.getHeaders?.()) || {};

    const response = await fetch(link, {
      headers: {
        ...headers,
        Range: `bytes=${startByte}-${startByte + length - 1}`,
      },
    });

    if (!response.ok && response.status !== 206) {
      throw new Error(`Storage chunk download failed: ${response.status}`);
    }

    return response.blob();
  }
}

export default StorageManager;
