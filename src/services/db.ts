/**
 * IndexedDB Persistence Layer for Strixwave
 *
 * Database: strixwave-db
 * Object Store: tracks — indexed by dropboxPath for dedup
 *
 * No external dependencies — uses raw IndexedDB API.
 */

export interface StoredTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  providerId: string; // 'dropbox' | 'google-drive'
  providerPath: string;
  duration: string;
  durationSeconds: number;
  coverUrl: string; // This will now be a fallback or default
  coverBlob?: Blob;  // Store the actual cover art blob
  addedDate: string;
  fileSize: number;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  trackIds: string[];
  coverUrl?: string;
  isFavorite?: boolean;
  createdAt: string;
  updatedAt: string;
}

const DB_NAME = 'strixwave-db';
const DB_VERSION = 3; // Incremented version for migration
const STORE_TRACKS = 'tracks';
const STORE_PLAYLISTS = 'playlists';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      
      // Handle tracks store
      if (!db.objectStoreNames.contains(STORE_TRACKS)) {
        const store = db.createObjectStore(STORE_TRACKS, { keyPath: 'id' });
        store.createIndex('providerPath', 'providerPath', { unique: false });
        store.createIndex('providerId', 'providerId', { unique: false });
        store.createIndex('artist', 'artist', { unique: false });
        store.createIndex('album', 'album', { unique: false });
      } else {
        const store = request.transaction!.objectStore(STORE_TRACKS);
        if (!store.indexNames.contains('providerPath')) {
          store.createIndex('providerPath', 'providerPath', { unique: false });
        }
        if (!store.indexNames.contains('providerId')) {
          store.createIndex('providerId', 'providerId', { unique: false });
        }
        // Migration: dropboxPath -> providerPath
        if (event.oldVersion < 3) {
          // Note: We can't easily iterate and update here in onupgradeneeded for all cases,
          // but we can ensure the structure is ready. The actual data migration 
          // might be better handled after opening if needed, but IDB usually requires
          // version change for index changes.
        }
      }

      // Handle playlists store
      if (!db.objectStoreNames.contains(STORE_PLAYLISTS)) {
        db.createObjectStore(STORE_PLAYLISTS, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      // Perform data migration if needed
      migrateData(db).then(() => resolve(db));
    };
    request.onerror = () => reject(request.error);
  });
}

async function migrateData(db: IDBDatabase): Promise<void> {
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_TRACKS, 'readwrite');
    const store = tx.objectStore(STORE_TRACKS);
    const request = store.openCursor();

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        const track = cursor.value;
        let changed = false;

        // Migrate dropboxPath to providerPath and set providerId
        if (track.dropboxPath && !track.providerPath) {
          track.providerPath = track.dropboxPath;
          track.providerId = 'dropbox';
          delete track.dropboxPath;
          changed = true;
        }

        if (changed) {
          cursor.update(track);
        }
        cursor.continue();
      } else {
        resolve();
      }
    };
    request.onerror = () => resolve(); // Ignore errors in migration for now
  });
}

// --- Track Operations ---

export async function getAllTracks(): Promise<StoredTrack[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TRACKS, 'readonly');
    const store = tx.objectStore(STORE_TRACKS);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as StoredTrack[]);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

export async function upsertTrack(track: StoredTrack): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TRACKS, 'readwrite');
    const store = tx.objectStore(STORE_TRACKS);
    store.put(track);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function upsertTracks(tracks: StoredTrack[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TRACKS, 'readwrite');
    const store = tx.objectStore(STORE_TRACKS);
    for (const track of tracks) {
      store.put(track);
    }
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function getTrackByPath(providerId: string, providerPath: string): Promise<StoredTrack | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TRACKS, 'readonly');
    const store = tx.objectStore(STORE_TRACKS);
    const request = store.getAll();
    request.onsuccess = () => {
      const tracks = request.result as StoredTrack[];
      const track = tracks.find(t => t.providerId === providerId && t.providerPath === providerPath);
      resolve(track);
    };
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

export async function getTracksByIds(ids: string[]): Promise<StoredTrack[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TRACKS, 'readonly');
    const store = tx.objectStore(STORE_TRACKS);
    const results: StoredTrack[] = [];
    
    // We have to do multiple gets or use a cursor because getAll with keys isn't standard in older IDB
    let count = 0;
    if (ids.length === 0) {
      db.close();
      resolve([]);
      return;
    }

    ids.forEach(id => {
      const req = store.get(id);
      req.onsuccess = () => {
        if (req.result) results.push(req.result);
        count++;
        if (count === ids.length) {
          db.close();
          resolve(results);
        }
      };
      req.onerror = () => {
        count++;
        if (count === ids.length) {
          db.close();
          resolve(results);
        }
      };
    });
  });
}

export async function clearTracks(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TRACKS, 'readwrite');
    const store = tx.objectStore(STORE_TRACKS);
    store.clear();
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

// --- Playlist Operations ---

export async function getAllPlaylists(): Promise<Playlist[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PLAYLISTS, 'readonly');
    const store = tx.objectStore(STORE_PLAYLISTS);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as Playlist[]);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

export async function upsertPlaylist(playlist: Playlist): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PLAYLISTS, 'readwrite');
    const store = tx.objectStore(STORE_PLAYLISTS);
    store.put(playlist);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function deletePlaylist(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PLAYLISTS, 'readwrite');
    const store = tx.objectStore(STORE_PLAYLISTS);
    store.delete(id);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}
