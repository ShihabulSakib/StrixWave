export interface ListFolderResult {
  entries: {
    name: string;
    path: string;
    size: number;
    isFolder: boolean;
  }[];
  cursor?: string;
  hasMore: boolean;
}

export interface StorageProvider {
  providerId: string;
  listFolder(path: string, cursor?: string): Promise<ListFolderResult>;
  getTemporaryLink(path: string): Promise<string>;
  downloadChunk(path: string, startByte: number, length: number): Promise<Blob>;
  invalidateLink(path: string): void;
  isLinkFresh(path: string): boolean;
  getHeaders?(): Promise<Record<string, string>>;
}
