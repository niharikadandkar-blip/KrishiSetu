import { db } from '@/lib/db';
import {
  NotificationItem,
  NotificationPreferenceItem,
  MarketAlertConfigItem,
  NotificationCategory,
  NotificationPriority,
  NotificationType,
} from '@/lib/types/phase9';

export const notificationRepository = {
  async getPreferences(userId: string): Promise<NotificationPreferenceItem> {
    let pref = await db.notificationPreference.findUnique({
      where: { userId },
    });

    if (!pref) {
      pref = await db.notificationPreference.create({
        data: {
          userId,
          enableInApp: true,
          enableOffers: true,
          enableOrders: true,
          enableTransport: true,
          enableStorage: true,
          enableMarket: true,
          enableWeather: true,
          enableReminders: true,
        },
      });
    }

    return {
      id: pref.id,
      userId: pref.userId,
      enableInApp: pref.enableInApp,
      enableOffers: pref.enableOffers,
      enableOrders: pref.enableOrders,
      enableTransport: pref.enableTransport,
      enableStorage: pref.enableStorage,
      enableMarket: pref.enableMarket,
      enableWeather: pref.enableWeather,
      enableReminders: pref.enableReminders,
      createdAt: pref.createdAt.toISOString(),
      updatedAt: pref.updatedAt.toISOString(),
    };
  },

  async updatePreferences(
    userId: string,
    updates: Partial<Omit<NotificationPreferenceItem, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<NotificationPreferenceItem> {
    await this.getPreferences(userId); // ensure row exists

    const updated = await db.notificationPreference.update({
      where: { userId },
      data: updates,
    });

    return {
      id: updated.id,
      userId: updated.userId,
      enableInApp: updated.enableInApp,
      enableOffers: updated.enableOffers,
      enableOrders: updated.enableOrders,
      enableTransport: updated.enableTransport,
      enableStorage: updated.enableStorage,
      enableMarket: updated.enableMarket,
      enableWeather: updated.enableWeather,
      enableReminders: updated.enableReminders,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  },

  async createNotification(params: {
    userId: string;
    type: NotificationType | string;
    category: NotificationCategory;
    priority?: NotificationPriority;
    titleKey: string;
    messageKey: string;
    payload?: Record<string, any>;
    deepLink?: string;
    sourceEntityType?: string;
    sourceEntityId?: string;
    idempotencyKey?: string;
    isRequired?: boolean;
  }): Promise<NotificationItem | null> {
    // 1. Check idempotency key if provided
    if (params.idempotencyKey) {
      const existing = await db.notification.findUnique({
        where: { idempotencyKey: params.idempotencyKey },
      });
      if (existing) {
        return this.mapNotification(existing);
      }
    }

    // 2. Check user preferences unless it's a required workflow notification
    const isRequired = params.isRequired ?? false;
    if (!isRequired) {
      const prefs = await this.getPreferences(params.userId);
      if (!prefs.enableInApp) return null;

      if (params.category === 'OFFER' && !prefs.enableOffers) return null;
      if (params.category === 'ORDER' && !prefs.enableOrders) return null;
      if (params.category === 'TRANSPORT' && !prefs.enableTransport) return null;
      if (params.category === 'STORAGE' && !prefs.enableStorage) return null;
      if (params.category === 'MARKET' && !prefs.enableMarket) return null;
      if (params.category === 'WEATHER' && !prefs.enableWeather) return null;
      if (params.category === 'REMINDER' && !prefs.enableReminders) return null;
    }

    // 3. Persist notification
    try {
      const created = await db.notification.create({
        data: {
          userId: params.userId,
          type: params.type,
          category: params.category,
          priority: params.priority || 'NORMAL',
          titleKey: params.titleKey,
          messageKey: params.messageKey,
          payloadJson: params.payload ? JSON.stringify(params.payload) : null,
          deepLink: params.deepLink,
          sourceEntityType: params.sourceEntityType,
          sourceEntityId: params.sourceEntityId,
          idempotencyKey: params.idempotencyKey,
          isRequired,
        },
      });

      return this.mapNotification(created);
    } catch (err: any) {
      // If idempotency collision occurs concurrently, handle gracefully
      if (err.code === 'P2002' && params.idempotencyKey) {
        const existing = await db.notification.findUnique({
          where: { idempotencyKey: params.idempotencyKey },
        });
        return existing ? this.mapNotification(existing) : null;
      }
      throw err;
    }
  },

  async getUserNotifications(
    userId: string,
    options: { category?: NotificationCategory; unreadOnly?: boolean; limit?: number; offset?: number } = {}
  ): Promise<{ notifications: NotificationItem[]; total: number; unreadCount: number }> {
    const whereClause: any = { userId };
    if (options.category) {
      whereClause.category = options.category;
    }
    if (options.unreadOnly) {
      whereClause.readAt = null;
    }

    const [records, total, unreadCount] = await Promise.all([
      db.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: options.limit || 50,
        skip: options.offset || 0,
      }),
      db.notification.count({ where: whereClause }),
      db.notification.count({ where: { userId, readAt: null } }),
    ]);

    return {
      notifications: records.map(this.mapNotification),
      total,
      unreadCount,
    };
  },

  async getUnreadCount(userId: string): Promise<number> {
    return db.notification.count({
      where: { userId, readAt: null },
    });
  },

  async markAsRead(notificationId: string, userId: string): Promise<NotificationItem | null> {
    const notif = await db.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notif) return null;
    if (notif.userId !== userId) {
      throw new Error('UNAUTHORIZED_IDOR: Cannot modify notification belonging to another user.');
    }

    if (notif.readAt) return this.mapNotification(notif);

    const updated = await db.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });

    return this.mapNotification(updated);
  },

  async markAllAsRead(userId: string): Promise<number> {
    const result = await db.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return result.count;
  },

  async createMarketAlertConfig(userId: string, cropName: string, district: string, targetPrice: number, condition: 'ABOVE' | 'BELOW'): Promise<MarketAlertConfigItem> {
    const created = await db.marketAlertConfig.create({
      data: {
        userId,
        cropName,
        district,
        targetPrice,
        condition,
        isActive: true,
        isDemoData: true,
      },
    });

    return {
      id: created.id,
      userId: created.userId,
      cropName: created.cropName,
      district: created.district,
      targetPrice: created.targetPrice,
      condition: created.condition as any,
      isActive: created.isActive,
      isDemoData: created.isDemoData,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  },

  async getUserMarketAlertConfigs(userId: string): Promise<MarketAlertConfigItem[]> {
    const alerts = await db.marketAlertConfig.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    return alerts.map((a) => ({
      id: a.id,
      userId: a.userId,
      cropName: a.cropName,
      district: a.district,
      targetPrice: a.targetPrice,
      condition: a.condition as any,
      isActive: a.isActive,
      isDemoData: a.isDemoData,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    }));
  },

  async deleteMarketAlertConfig(alertId: string, userId: string): Promise<boolean> {
    const alert = await db.marketAlertConfig.findUnique({
      where: { id: alertId },
    });
    if (!alert) return false;
    if (alert.userId !== userId) {
      throw new Error('UNAUTHORIZED_IDOR: Cannot delete alert config belonging to another user.');
    }

    await db.marketAlertConfig.delete({ where: { id: alertId } });
    return true;
  },

  mapNotification(raw: any): NotificationItem {
    let payload: Record<string, any> | undefined;
    if (raw.payloadJson) {
      try {
        payload = JSON.parse(raw.payloadJson);
      } catch (e) {}
    }

    return {
      id: raw.id,
      userId: raw.userId,
      type: raw.type,
      category: raw.category,
      priority: raw.priority,
      titleKey: raw.titleKey,
      messageKey: raw.messageKey,
      payload,
      deepLink: raw.deepLink || undefined,
      sourceEntityType: raw.sourceEntityType || undefined,
      sourceEntityId: raw.sourceEntityId || undefined,
      idempotencyKey: raw.idempotencyKey || undefined,
      isRequired: raw.isRequired,
      readAt: raw.readAt ? raw.readAt.toISOString() : null,
      expiresAt: raw.expiresAt ? raw.expiresAt.toISOString() : null,
      createdAt: raw.createdAt.toISOString(),
    };
  },
};
