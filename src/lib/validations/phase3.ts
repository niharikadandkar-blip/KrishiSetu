import { z } from 'zod';

export const updateLotSchema = z.object({
  cropName: z.string().min(2).optional(),
  variety: z.string().optional(),
  quantityAvailable: z.number().positive().optional(),
  unit: z.string().optional(),
  askPricePerUnit: z.number().positive().optional(),
  expectedHarvestDate: z.string().optional(),
  alreadyHarvested: z.boolean().optional(),
  grade: z.string().optional(),
  sizeMm: z.number().positive().optional(),
  maturityColour: z.string().optional(),
  moisturePct: z.number().min(0).max(100).optional(),
  damagePct: z.number().min(0).max(100).optional(),
  freshness: z.string().optional(),
  packagingType: z.string().optional(),
  photoUrls: z.array(z.string()).optional(),
  publicVillage: z.string().optional(),
  publicTaluka: z.string().optional(),
  publicDistrict: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  farmAddress: z.string().optional(),
});

export const statusTransitionSchema = z.object({
  targetStatus: z.enum([
    'DRAFT',
    'PUBLISHED',
    'PAUSED',
    'UNDER_OFFER',
    'BOOKING_THRESHOLD_REACHED',
    'FARMER_CONFIRMED',
    'HARVEST_READY',
    'HARVESTED',
    'DISPATCHED',
    'COMPLETED',
    'CANCELLED',
    'SOLD',
  ]),
  reason: z.string().optional(),
});

export const buyerRequirementSchema = z.object({
  buyerId: z.string().min(1, { message: 'Buyer ID is required' }),
  targetCrop: z.string().min(2, { message: 'Target crop is required' }),
  targetVariety: z.string().optional(),
  requiredQuantity: z.number().positive({ message: 'Quantity must be greater than 0' }),
  unit: z.string().default('Quintal'),
  targetGrade: z.string().optional(),
  budgetPricePerUnit: z.number().positive({ message: 'Budget price must be greater than 0' }),
  deliveryDistrict: z.string().min(1, { message: 'Delivery district is required' }),
  deliveryAddress: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  requiredByDate: z.string(),
});

export const toggleSavedListingSchema = z.object({
  lotId: z.string().min(1, { message: 'Lot ID is required' }),
});
