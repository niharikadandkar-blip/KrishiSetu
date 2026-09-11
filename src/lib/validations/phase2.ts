import { z } from 'zod';

export const createLotSchema = z.object({
  farmerId: z.string().min(1, { message: 'Farmer ID is required' }),
  cropName: z.string().min(2, { message: 'Crop name must be at least 2 characters long' }),
  variety: z.string().optional(),
  quantityAvailable: z.number().positive({ message: 'Quantity must be greater than 0' }),
  unit: z.string().default('Quintal'),
  askPricePerUnit: z.number().positive({ message: 'Ask price must be greater than 0' }),
  expectedHarvestDate: z.string(),
  alreadyHarvested: z.boolean().default(false),
  
  // Quality inputs
  grade: z.string().optional(),
  sizeMm: z.number().positive().optional(),
  maturityColour: z.string().optional(),
  moisturePct: z.number().min(0).max(100).optional(),
  damagePct: z.number().min(0).max(100).optional(),
  freshness: z.string().optional(),
  packagingType: z.string().optional(),
  photoUrls: z.array(z.string()).optional(),
  
  // Location
  publicVillage: z.string().min(1, { message: 'Village name is required' }),
  publicTaluka: z.string().min(1, { message: 'Taluka is required' }),
  publicDistrict: z.string().min(1, { message: 'District is required' }),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  farmAddress: z.string().optional(),
  
  idempotencyKey: z.string().optional(),
});

export const prebookingSchema = z.object({
  lotId: z.string().min(1, { message: 'Lot ID is required' }),
  buyerId: z.string().min(1, { message: 'Buyer ID is required' }),
  buyerType: z.enum(['INDIVIDUAL', 'SOCIETY', 'INSTITUTIONAL', 'TRADER']).default('INDIVIDUAL'),
  societyName: z.string().optional(),
  quantityBooked: z.number().positive({ message: 'Booked quantity must be greater than 0' }),
  unitPrice: z.number().positive(),
});

export const bidSchema = z.object({
  lotId: z.string().min(1, { message: 'Lot ID is required' }),
  bidderId: z.string().min(1, { message: 'Bidder ID is required' }),
  bidderRole: z.enum(['FARMER', 'BUYER']),
  offeredPricePerUnit: z.number().positive({ message: 'Price must be greater than 0' }),
  quantity: z.number().positive({ message: 'Quantity must be greater than 0' }),
  paymentTermsDays: z.number().min(0).default(0),
  idempotencyKey: z.string().optional(),
});

export const respondBidSchema = z.object({
  bidId: z.string().min(1),
  userId: z.string().min(1),
  action: z.enum(['ACCEPT', 'REJECT', 'COUNTER']),
  counterPricePerUnit: z.number().positive().optional(),
  counterQuantity: z.number().positive().optional(),
  counterPaymentTermsDays: z.number().min(0).optional(),
});

export const harvestLogSchema = z.object({
  lotId: z.string().min(1),
  stage: z.enum(['HARVESTED', 'PACKED', 'DISPATCHED']),
  photoUrl: z.string().url({ message: 'Valid photo URL is required' }),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});
