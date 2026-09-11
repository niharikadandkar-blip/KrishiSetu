import { randomUUID } from 'crypto';

export interface ActionPreviewRecord {
  previewId: string;
  userId: string;
  actionType: string;
  arguments: Record<string, unknown>;
  entityFingerprint: string;
  createdAt: number;
  expiresAt: number;
  consumed: boolean;
}

class PreviewTokenStore {
  private store = new Map<string, ActionPreviewRecord>();

  public createPreviewToken(
    userId: string,
    actionType: string,
    args: Record<string, unknown>,
    entityFingerprint: string = '',
    ttlMs: number = 5 * 60 * 1000 // 5 minutes TTL
  ): ActionPreviewRecord {
    const previewId = `prv_${Date.now()}_${randomUUID().substring(0, 8)}`;
    const now = Date.now();
    const record: ActionPreviewRecord = {
      previewId,
      userId,
      actionType,
      arguments: args,
      entityFingerprint,
      createdAt: now,
      expiresAt: now + ttlMs,
      consumed: false,
    };
    this.store.set(previewId, record);
    return record;
  }

  public getPreviewToken(previewId: string): ActionPreviewRecord | null {
    const record = this.store.get(previewId);
    if (!record) return null;

    if (Date.now() > record.expiresAt) {
      this.store.delete(previewId);
      return null;
    }
    return record;
  }

  public consumePreviewToken(previewId: string, userId: string, actionType: string): ActionPreviewRecord | null {
    const record = this.store.get(previewId);
    if (!record) return null;

    if (Date.now() > record.expiresAt) {
      this.store.delete(previewId);
      return null;
    }

    if (record.consumed) {
      return null;
    }

    if (record.userId !== userId || record.actionType !== actionType) {
      return null;
    }

    record.consumed = true;
    this.store.set(previewId, record);
    return record;
  }

  public clearExpired(): void {
    const now = Date.now();
    for (const [id, rec] of this.store.entries()) {
      if (now > rec.expiresAt || rec.consumed) {
        this.store.delete(id);
      }
    }
  }
}

export const previewTokenStore = new PreviewTokenStore();
