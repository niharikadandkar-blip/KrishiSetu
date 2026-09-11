import { z } from 'zod';

export const notificationQuerySchema = z.object({
  category: z.enum(['OFFER', 'ORDER', 'TRANSPORT', 'STORAGE', 'MARKET', 'WEATHER', 'LISTING', 'REMINDER', 'SYSTEM', 'SUPPORT']).optional(),
  unreadOnly: z.enum(['true', 'false']).optional(),
  limit: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 50)),
  offset: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 0)),
});

export const updateNotificationPreferencesSchema = z.object({
  enableInApp: z.boolean().optional(),
  enableOffers: z.boolean().optional(),
  enableOrders: z.boolean().optional(),
  enableTransport: z.boolean().optional(),
  enableStorage: z.boolean().optional(),
  enableMarket: z.boolean().optional(),
  enableWeather: z.boolean().optional(),
  enableReminders: z.boolean().optional(),
});

export const createMarketAlertSchema = z.object({
  cropName: z.string().min(1, 'Crop name is required'),
  district: z.string().min(1, 'District is required'),
  targetPrice: z.number().positive('Target price must be positive'),
  condition: z.enum(['ABOVE', 'BELOW']),
});
