import { z } from 'zod';

export const geographicQuerySchema = z.object({
  district: z.string().optional(),
  taluka: z.string().optional(),
  village: z.string().optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().min(1).max(500).default(50),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export const storageMapQuerySchema = geographicQuerySchema.extend({
  facilityType: z.string().optional(),
  crop: z.string().optional(),
  minCapacity: z.coerce.number().min(0).optional(),
});

export const transportMapQuerySchema = geographicQuerySchema.extend({
  vehicleType: z.string().optional(),
  crop: z.string().optional(),
  minCapacity: z.coerce.number().min(0).optional(),
});

export const geocodeQuerySchema = z.object({
  query: z.string().min(2),
});
