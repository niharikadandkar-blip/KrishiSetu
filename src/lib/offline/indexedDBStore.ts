/**
 * IndexedDB Offline Storage Layer for KrishiSetu
 * Manages client-side IndexedDB caching for produce catalogs, mandi benchmarks, and pending offline mutations.
 */

const DB_NAME = 'krishisetu_offline_db';
const DB_VERSION = 2;

export interface QueuedMutation {
  id: string; // Idempotency key / ULID
  endpoint: string; // e.g. /api/v1/lots
  method: 'POST' | 'PUT' | 'PATCH';
  payload: any;
  status: 'LOCAL_DRAFT' | 'QUEUED' | 'SYNCING' | 'SYNCED' | 'CONFLICT' | 'FAILED';
  createdAt: number;
  retryCount: number;
  errorMessage?: string;
}

export function openOfflineDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      return reject(new Error('IndexedDB not supported in this environment'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;

      // 1. Produce Catalog Store
      if (!db.objectStoreNames.contains('lots_catalog')) {
        db.createObjectStore('lots_catalog', { keyPath: 'id' });
      }

      // 2. Market Benchmarks Store
      if (!db.objectStoreNames.contains('market_benchmarks')) {
        db.createObjectStore('market_benchmarks', { keyPath: 'id' });
      }

      // 3. Pending Offline Mutation Queue Store
      if (!db.objectStoreNames.contains('pending_mutations')) {
        db.createObjectStore('pending_mutations', { keyPath: 'id' });
      }

      // 4. Notifications Cache Store (Phase 9 Correction #4)
      if (!db.objectStoreNames.contains('notifications_cache')) {
        db.createObjectStore('notifications_cache', { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveLotsToCache(lots: any[]): Promise<void> {
  try {
    const db = await openOfflineDB();
    const tx = db.transaction('lots_catalog', 'readwrite');
    const store = tx.objectStore('lots_catalog');
    for (const lot of lots) {
      store.put(lot);
    }
  } catch (e) {
    console.warn('Failed to save lots to IndexedDB cache:', e);
  }
}

export async function getCachedLots(): Promise<any[]> {
  try {
    const db = await openOfflineDB();
    const tx = db.transaction('lots_catalog', 'readonly');
    const store = tx.objectStore('lots_catalog');
    return new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch (e) {
    return [];
  }
}

export async function enqueueOfflineMutation(mutation: QueuedMutation): Promise<void> {
  try {
    const db = await openOfflineDB();
    const tx = db.transaction('pending_mutations', 'readwrite');
    const store = tx.objectStore('pending_mutations');
    store.put(mutation);
  } catch (e) {
    console.error('Failed to enqueue offline mutation:', e);
  }
}

export async function getPendingMutations(): Promise<QueuedMutation[]> {
  try {
    const db = await openOfflineDB();
    const tx = db.transaction('pending_mutations', 'readonly');
    const store = tx.objectStore('pending_mutations');
    return new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => {
        const items: QueuedMutation[] = req.result || [];
        resolve(items.filter((m) => m.status !== 'SYNCED'));
      };
      req.onerror = () => resolve([]);
    });
  } catch (e) {
    return [];
  }
}

export async function removeMutationFromQueue(id: string): Promise<void> {
  try {
    const db = await openOfflineDB();
    const tx = db.transaction('pending_mutations', 'readwrite');
    const store = tx.objectStore('pending_mutations');
    store.delete(id);
  } catch (e) {
    console.error('Failed to remove mutation from queue:', e);
  }
}

export async function saveNotificationsToCache(notifications: any[]): Promise<void> {
  try {
    const db = await openOfflineDB();
    const tx = db.transaction('notifications_cache', 'readwrite');
    const store = tx.objectStore('notifications_cache');
    for (const notif of notifications) {
      store.put(notif);
    }
  } catch (e) {
    console.warn('Failed to save notifications to IndexedDB cache:', e);
  }
}

export async function getCachedNotifications(): Promise<any[]> {
  try {
    const db = await openOfflineDB();
    const tx = db.transaction('notifications_cache', 'readonly');
    const store = tx.objectStore('notifications_cache');
    return new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => {
        const items = req.result || [];
        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        resolve(items);
      };
      req.onerror = () => resolve([]);
    });
  } catch (e) {
    return [];
  }
}
