/// <reference types="vite/client" />

interface Window {
  Buffer: any;
}

declare module 'music-metadata-browser' {
  export function parseBuffer(
    buffer: Uint8Array,
    mimeType?: string,
    options?: any
  ): Promise<any>;
}
