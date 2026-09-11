import { notificationRepository } from '@/lib/repositories/notificationRepository';
import {
  NotificationItem,
  NotificationPriority,
  NotificationCategory,
  IPushNotificationProvider,
  ISMSProvider,
  IWhatsAppProvider,
  IEmailProvider,
} from '@/lib/types/phase9';
import { db } from '@/lib/db';

// Extensible Provider Stubs (Dormant until third-party credentials configured)
class DormantPushProvider implements IPushNotificationProvider {
  async sendPush(userId: string, title: string, body: string, deepLink?: string) {
    return { success: false, providerName: 'DormantPushProvider (Credentials Unconfigured)' };
  }
}

class DormantSMSProvider implements ISMSProvider {
  async sendSMS(mobile: string, message: string) {
    return { success: false, providerName: 'DormantSMSProvider (Credentials Unconfigured)' };
  }
}

class DormantWhatsAppProvider implements IWhatsAppProvider {
  async sendWhatsApp(mobile: string, templateId: string, params: Record<string, any>) {
    return { success: false, providerName: 'DormantWhatsAppProvider (Credentials Unconfigured)' };
  }
}

class DormantEmailProvider implements IEmailProvider {
  async sendEmail(to: string, subject: string, html: string) {
    return { success: false, providerName: 'DormantEmailProvider (Credentials Unconfigured)' };
  }
}

export const notificationService = {
  // External Provider Interfaces (Extensible for future production credentials)
  pushProvider: new DormantPushProvider(),
  smsProvider: new DormantSMSProvider(),
  whatsAppProvider: new DormantWhatsAppProvider(),
  emailProvider: new DormantEmailProvider(),

  /**
   * Safe notification creator wrapper:
   * Guarantees a notification error never rolls back or invalidates a successful business transaction.
   */
  async safeNotify(params: Parameters<typeof notificationRepository.createNotification>[0]): Promise<NotificationItem | null> {
    try {
      return await notificationRepository.createNotification(params);
    } catch (err) {
      console.error(`[NOTIFICATION_SERVICE_SILENT_ERROR] Failed to send notification:`, err);
      return null;
    }
  },

  /**
   * Phase 4: Offer Event Notifications
   */
  async notifyOfferEvent(event: {
    eventType: 'OFFER_RECEIVED' | 'COUNTER_OFFER_RECEIVED' | 'OFFER_ACCEPTED' | 'OFFER_REJECTED' | 'OFFER_WITHDRAWN';
    recipientUserId: string;
    senderUserId: string;
    offerId: string;
    lotId: string;
    cropName: string;
    quantity: number;
    pricePerUnit: number;
    unit?: string;
  }) {
    const idempotencyKey = `OFFER:${event.offerId}:${event.eventType}`;
    const payload = {
      cropName: event.cropName,
      quantity: event.quantity,
      pricePerUnit: event.pricePerUnit,
      unit: event.unit || 'Quintal',
      offerId: event.offerId,
      lotId: event.lotId,
    };

    let titleKey = 'notifications.offerReceivedTitle';
    let messageKey = 'notifications.offerReceivedMsg';
    let priority: NotificationPriority = 'NORMAL';
    let isRequired = false;

    if (event.eventType === 'COUNTER_OFFER_RECEIVED') {
      titleKey = 'notifications.counterOfferTitle';
      messageKey = 'notifications.counterOfferMsg';
      priority = 'NORMAL';
    } else if (event.eventType === 'OFFER_ACCEPTED') {
      titleKey = 'notifications.offerAcceptedTitle';
      messageKey = 'notifications.offerAcceptedMsg';
      priority = 'HIGH';
      isRequired = true; // Critical commercial commitment notification
    } else if (event.eventType === 'OFFER_REJECTED') {
      titleKey = 'notifications.offerRejectedTitle';
      messageKey = 'notifications.offerRejectedMsg';
      priority = 'LOW';
    } else if (event.eventType === 'OFFER_WITHDRAWN') {
      titleKey = 'notifications.offerWithdrawnTitle';
      messageKey = 'notifications.offerWithdrawnMsg';
      priority = 'LOW';
    }

    return this.safeNotify({
      userId: event.recipientUserId,
      type: event.eventType,
      category: 'OFFER',
      priority,
      titleKey,
      messageKey,
      payload,
      deepLink: '/offers',
      sourceEntityType: 'OFFER',
      sourceEntityId: event.offerId,
      idempotencyKey,
      isRequired,
    });
  },

  /**
   * Phase 5: Order Event Notifications
   */
  async notifyOrderEvent(event: {
    eventType: 'ORDER_CREATED' | 'ORDER_STATUS_CHANGED' | 'ORDER_CANCELLED';
    recipientUserId: string;
    orderId: string;
    orderNumber: string;
    cropName: string;
    quantity: number;
    status: string;
    cancellationReason?: string;
  }) {
    const idempotencyKey = `ORDER:${event.orderId}:${event.status}`;
    const payload = {
      orderNumber: event.orderNumber,
      cropName: event.cropName,
      quantity: event.quantity,
      status: event.status,
      cancellationReason: event.cancellationReason,
      orderId: event.orderId,
    };

    let titleKey = 'notifications.orderCreatedTitle';
    let messageKey = 'notifications.orderCreatedMsg';
    let priority: NotificationPriority = 'HIGH';
    const isRequired = true; // All order workflow updates are required

    if (event.eventType === 'ORDER_STATUS_CHANGED') {
      titleKey = 'notifications.orderStatusTitle';
      messageKey = 'notifications.orderStatusMsg';
      if (['READY_FOR_PICKUP', 'RECEIPT_PENDING', 'DELIVERED'].includes(event.status)) {
        priority = 'HIGH';
      }
    } else if (event.eventType === 'ORDER_CANCELLED') {
      titleKey = 'notifications.orderCancelledTitle';
      messageKey = 'notifications.orderCancelledMsg';
      priority = 'HIGH';
    }

    return this.safeNotify({
      userId: event.recipientUserId,
      type: event.eventType,
      category: 'ORDER',
      priority,
      titleKey,
      messageKey,
      payload,
      deepLink: `/orders/${event.orderId}`,
      sourceEntityType: 'ORDER',
      sourceEntityId: event.orderId,
      idempotencyKey,
      isRequired,
    });
  },

  /**
   * Phase 6: Transport Notifications
   */
  async notifyTransportEvent(event: {
    eventType: 'TRANSPORT_REQUESTED' | 'TRANSPORT_ACCEPTED' | 'DRIVER_ASSIGNED' | 'TRANSPORT_STATUS_CHANGED';
    recipientUserId: string;
    requestId: string;
    vehicleType?: string;
    driverName?: string;
    status: string;
  }) {
    const idempotencyKey = `TRANSPORT:${event.requestId}:${event.status}`;
    const payload = {
      requestId: event.requestId,
      vehicleType: event.vehicleType || 'Transport Vehicle',
      driverName: event.driverName || 'Assigned Driver',
      status: event.status,
    };

    let titleKey = 'notifications.transportRequestedTitle';
    let messageKey = 'notifications.transportRequestedMsg';
    let priority: NotificationPriority = 'NORMAL';

    if (event.eventType === 'TRANSPORT_ACCEPTED') {
      titleKey = 'notifications.transportAcceptedTitle';
      messageKey = 'notifications.transportAcceptedMsg';
      priority = 'HIGH';
    } else if (event.eventType === 'DRIVER_ASSIGNED') {
      titleKey = 'notifications.driverAssignedTitle';
      messageKey = 'notifications.driverAssignedMsg';
      priority = 'NORMAL';
    } else if (event.eventType === 'TRANSPORT_STATUS_CHANGED') {
      titleKey = 'notifications.transportStatusTitle';
      messageKey = 'notifications.transportStatusMsg';
    }

    return this.safeNotify({
      userId: event.recipientUserId,
      type: event.eventType,
      category: 'TRANSPORT',
      priority,
      titleKey,
      messageKey,
      payload,
      deepLink: `/transport/${event.requestId}`,
      sourceEntityType: 'TRANSPORT_REQUEST',
      sourceEntityId: event.requestId,
      idempotencyKey,
      isRequired: false,
    });
  },

  /**
   * Phase 6: Storage Notifications
   */
  async notifyStorageEvent(event: {
    eventType: 'STORAGE_REQUESTED' | 'STORAGE_ACCEPTED' | 'STORAGE_STATUS_CHANGED';
    recipientUserId: string;
    requestId: string;
    facilityName: string;
    cropName: string;
    status: string;
  }) {
    const idempotencyKey = `STORAGE:${event.requestId}:${event.status}`;
    const payload = {
      requestId: event.requestId,
      facilityName: event.facilityName,
      cropName: event.cropName,
      status: event.status,
    };

    let titleKey = 'notifications.storageRequestedTitle';
    let messageKey = 'notifications.storageRequestedMsg';
    let priority: NotificationPriority = 'NORMAL';

    if (event.eventType === 'STORAGE_ACCEPTED') {
      titleKey = 'notifications.storageAcceptedTitle';
      messageKey = 'notifications.storageAcceptedMsg';
      priority = 'HIGH';
    } else if (event.eventType === 'STORAGE_STATUS_CHANGED') {
      titleKey = 'notifications.storageStatusTitle';
      messageKey = 'notifications.storageStatusMsg';
    }

    return this.safeNotify({
      userId: event.recipientUserId,
      type: event.eventType,
      category: 'STORAGE',
      priority,
      titleKey,
      messageKey,
      payload,
      deepLink: `/storage/${event.requestId}`,
      sourceEntityType: 'STORAGE_REQUEST',
      sourceEntityId: event.requestId,
      idempotencyKey,
      isRequired: false,
    });
  },

  /**
   * Phase 8: Data-Condition Market Alert Evaluation Service
   * Evaluated during price data queries or explicit refresh triggers.
   */
  async evaluateMarketAlerts(cropName: string, district: string, observedModalPrice: number, isDemoData: boolean = true) {
    // Find active alert configs matching crop and district
    const matchingConfigs = await db.marketAlertConfig.findMany({
      where: {
        cropName: { equals: cropName },
        district: { equals: district },
        isActive: true,
      },
    });

    const dateStr = new Date().toISOString().split('T')[0];

    for (const config of matchingConfigs) {
      let triggered = false;
      if (config.condition === 'ABOVE' && observedModalPrice >= config.targetPrice) {
        triggered = true;
      } else if (config.condition === 'BELOW' && observedModalPrice <= config.targetPrice) {
        triggered = true;
      }

      if (triggered) {
        const idempotencyKey = `MARKET_ALERT:${config.userId}:${config.id}:${dateStr}`;
        await this.safeNotify({
          userId: config.userId,
          type: 'MARKET_PRICE_ALERT',
          category: 'MARKET',
          priority: 'NORMAL',
          titleKey: 'notifications.marketAlertTitle',
          messageKey: 'notifications.marketAlertMsg',
          payload: {
            cropName: config.cropName,
            district: config.district,
            targetPrice: config.targetPrice,
            observedPrice: observedModalPrice,
            condition: config.condition,
            isDemoData,
            source: 'Agmarknet Sandbox / Demo Data',
          },
          deepLink: '/market-intelligence',
          sourceEntityType: 'MARKET_PRICE',
          sourceEntityId: config.id,
          idempotencyKey,
          isRequired: false,
        });
      }
    }
  },

  /**
   * Phase 8: Data-Condition Weather Alert Evaluation Service
   * Evaluated during weather observations retrieval.
   */
  async evaluateWeatherAlerts(userId: string, district: string, condition: string, rainfallMm?: number, humidityPct?: number, isDemoData: boolean = true) {
    const isRain = condition.toLowerCase().includes('rain') || (rainfallMm && rainfallMm > 5);
    const isHighHumidity = humidityPct && humidityPct > 80;

    if (isRain || isHighHumidity) {
      const dateStr = new Date().toISOString().split('T')[0];
      const alertType = isRain ? 'RAIN_FORECAST' : 'HIGH_HUMIDITY';
      const idempotencyKey = `WX_ALERT:${userId}:${district}:${alertType}:${dateStr}`;

      const advisoryMsgKey = isRain
        ? 'notifications.weatherRainAdvisoryMsg'
        : 'notifications.weatherHumidityAdvisoryMsg';

      await this.safeNotify({
        userId,
        type: 'WEATHER_ALERT',
        category: 'WEATHER',
        priority: isRain ? 'HIGH' : 'NORMAL',
        titleKey: 'notifications.weatherAlertTitle',
        messageKey: advisoryMsgKey,
        payload: {
          district,
          condition,
          rainfallMm: rainfallMm || 0,
          humidityPct: humidityPct || 0,
          isDemoData,
          source: 'IMD Sandbox / Demo Data',
        },
        deepLink: '/weather',
        sourceEntityType: 'WEATHER_OBSERVATION',
        idempotencyKey,
        isRequired: false,
      });
    }
  },
};
