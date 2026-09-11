import { z } from 'zod';

export const marketIntelligenceQuerySchema = z.object({
  crop: z.string().min(1).default('Onion'),
  variety: z.string().optional(),
  district: z.string().optional(),
  mandi: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export const weatherQuerySchema = z.object({
  district: z.string().default('Nashik'),
  taluka: z.string().optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
});
