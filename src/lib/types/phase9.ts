export type NotificationCategory =
  | 'OFFER'
  | 'ORDER'
  | 'TRANSPORT'
  | 'STORAGE'
  | 'MARKET'
  | 'WEATHER'
  | 'LISTING'
  | 'REMINDER'
  | 'SYSTEM'
  | 'SUPPORT';

export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export type NotificationType =
  | 'OFFER_RECEIVED'
  | 'COUNTER_OFFER_RECEIVED'
  | 'OFFER_ACCEPTED'
  | 'OFFER_REJECTED'
  | 'OFFER_WITHDRAWN'
  | 'OFFER_EXPIRING_REMINDER'
  | 'ORDER_CREATED'
  | 'ORDER_STATUS_CHANGED'
  | 'ORDER_CANCELLED'
  | 'ORDER_ACTION_REQUIRED'
  | 'TRANSPORT_REQUESTED'
  | 'TRANSPORT_ACCEPTED'
  | 'TRANSPORT_DRIVER_ASSIGNED'
  | 'TRANSPORT_STATUS_CHANGED'
  | 'STORAGE_REQUESTED'
  | 'STORAGE_ACCEPTED'
  | 'STORAGE_STATUS_CHANGED'
  | 'MARKET_PRICE_ALERT'
  | 'WEATHER_ALERT'
  | 'HARVEST_REMINDER'
  | 'SYSTEM_NOTICE';

export interface NotificationItem {
  id: string;
  userId: string;
  type: NotificationType | string;
  category: NotificationCategory;
  priority: NotificationPriority;
  titleKey: string;
  messageKey: string;
  payload?: Record<string, any>;
  deepLink?: string;
  sourceEntityType?: string;
  sourceEntityId?: string;
  idempotencyKey?: string;
  isRequired: boolean;
  readAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
}

export interface NotificationPreferenceItem {
  id: string;
  userId: string;
  enableInApp: boolean;
  enableOffers: boolean;
  enableOrders: boolean;
  enableTransport: boolean;
  enableStorage: boolean;
  enableMarket: boolean;
  enableWeather: boolean;
  enableReminders: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MarketAlertConfigItem {
  id: string;
  userId: string;
  cropName: string;
  district: string;
  targetPrice: number;
  condition: 'ABOVE' | 'BELOW';
  isActive: boolean;
  isDemoData: boolean;
  createdAt: string;
  updatedAt: string;
}

// Extensible External Notification Provider Interfaces (Architectural Stubs for Future Credentials)
export interface IPushNotificationProvider {
  sendPush(userId: string, title: string, body: string, deepLink?: string): Promise<{ success: boolean; providerName: string }>;
}

export interface ISMSProvider {
  sendSMS(mobile: string, message: string): Promise<{ success: boolean; providerName: string }>;
}

export interface IWhatsAppProvider {
  sendWhatsApp(mobile: string, templateId: string, params: Record<string, any>): Promise<{ success: boolean; providerName: string }>;
}

export interface IEmailProvider {
  sendEmail(to: string, subject: string, html: string): Promise<{ success: boolean; providerName: string }>;
}
