import {
  enqueueOfflineMutation,
  getPendingMutations,
  removeMutationFromQueue,
  QueuedMutation,
} from './indexedDBStore';

export const offlineQueue = {
  async addMutation(endpoint: string, method: 'POST' | 'PUT', payload: any): Promise<QueuedMutation> {
    const id = payload.idempotencyKey || `mut-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const mutation: QueuedMutation = {
      id,
      endpoint,
      method,
      payload,
      status: 'QUEUED',
      createdAt: Date.now(),
      retryCount: 0,
    };

    await enqueueOfflineMutation(mutation);
    return mutation;
  },

  async processQueue(): Promise<{ processed: number; succeeded: number; failed: number; conflicts: number }> {
    if (typeof window === 'undefined' || !navigator.onLine) {
      return { processed: 0, succeeded: 0, failed: 0, conflicts: 0 };
    }

    const pending = await getPendingMutations();
    if (pending.length === 0) {
      return { processed: 0, succeeded: 0, failed: 0, conflicts: 0 };
    }

    let succeeded = 0;
    let failed = 0;
    let conflicts = 0;

    for (const item of pending) {
      try {
        item.status = 'SYNCING';
        item.retryCount += 1;

        const res = await fetch(item.endpoint, {
          method: item.method,
          headers: {
            'Content-Type': 'application/json',
            'X-Idempotency-Key': item.id,
          },
          body: JSON.stringify(item.payload),
        });

        const data = await res.json();

        if (res.ok && data.success) {
          succeeded += 1;
          await removeMutationFromQueue(item.id);
        } else if (res.status === 409) {
          // Mandatory Correction #4: OFFLINE CONFLICT SAFETY
          // Server state has evolved or commitment conflict exists. Mark as CONFLICT for user visibility.
          conflicts += 1;
          item.status = 'CONFLICT';
          item.errorMessage = data.message || 'Conflict: Server state has changed or active commitments exist.';
          await enqueueOfflineMutation(item);
        } else {
          failed += 1;
          item.status = item.retryCount >= 5 ? 'FAILED' : 'QUEUED';
          item.errorMessage = data.message || 'Sync failed';
          await enqueueOfflineMutation(item);
        }
      } catch (err: any) {
        failed += 1;
        item.status = item.retryCount >= 5 ? 'FAILED' : 'QUEUED';
        item.errorMessage = err.message || 'Network error';
        await enqueueOfflineMutation(item);
      }
    }

    return { processed: pending.length, succeeded, failed, conflicts };
  },
};
