/**
 * metadata.worker.ts — Off-Main-Thread Metadata Parser
 *
 * Receives audio file chunk ArrayBuffers and parses them with
 * music-metadata-browser to extract ID3/Vorbis tags and cover art.
 * Keeps the main thread responsive during large library scans.
 */

import { Buffer } from 'buffer';

// Inject Node.js polyfills into the worker's global scope
// Required for music-metadata-browser and its dependencies (safe-buffer, string_decoder, etc)
self.global = self;
self.Buffer = Buffer;
(self as any).process = { env: {} };

import * as mm from 'music-metadata-browser';

export interface MetadataRequest {
  id: string;
  arrayBuffer: ArrayBuffer;
  filename: string;
}

export interface MetadataResponse {
  id: string;
  title?: string;
  artist?: string;
  album?: string;
  durationSeconds?: number;
  duration?: string;
  coverBlob?: Blob;
  error?: string;
}

self.onmessage = async (event: MessageEvent<MetadataRequest>) => {
  const { id, arrayBuffer, filename } = event.data;

  try {
    const uint8Array = new Uint8Array(arrayBuffer);
    const metadata = await mm.parseBuffer(uint8Array, filename);

    let durationSeconds: number | undefined;
    let duration: string | undefined;
    let coverBlob: Blob | undefined;

    if (metadata.format.duration) {
      durationSeconds = Math.round(metadata.format.duration);
      const mins = Math.floor(durationSeconds / 60);
      const secs = durationSeconds % 60;
      duration = `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    if (metadata.common.picture && metadata.common.picture.length > 0) {
      const picture = metadata.common.picture[0];
      coverBlob = new Blob([picture.data], { type: picture.format });
    }

    const response: MetadataResponse = {
      id,
      title: metadata.common.title,
      artist: metadata.common.artist,
      album: metadata.common.album,
      durationSeconds,
      duration,
      coverBlob,
    };

    self.postMessage(response);
  } catch (err) {
    const response: MetadataResponse = {
      id,
      error: err instanceof Error ? err.message : 'Unknown parsing error',
    };
    self.postMessage(response);
  }
};
