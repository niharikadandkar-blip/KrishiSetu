import { z } from 'zod';

export const registerProviderSchema = z.object({
  userId: z.string().uuid('Valid user ID required'),
  businessName: z.string().optional(),
  hasTransportServices: z.boolean().default(false),
  hasStorageServices: z.boolean().default(false),
  contactName: z.string().min(2, 'Contact name required'),
  contactMobile: z.string().regex(/^[6-9]\d{9}$/, 'Valid 10-digit Indian mobile number required'),
  state: z.string().min(2, 'State required'),
  district: z.string().min(2, 'District required'),
  taluka: z.string().optional(),
  village: z.string().optional(),
});

export const addVehicleSchema = z.object({
  providerId: z.string().uuid('Valid provider ID required'),
  userId: z.string().uuid('Valid user ID required'),
  vehicleType: z.enum([
    'PICKUP_TRUCK',
    'MINI_TRUCK',
    'HEAVY_TRUCK',
    'TRACTOR_TRAILER',
    'COLD_REFRIGERATED_TRUCK',
  ]),
  vehicleNumber: z.string().min(4, 'Vehicle registration number required'),
  capacity: z.number().positive('Capacity must be greater than 0'),
  capacityUnit: z.string().default('Quintal'),
  supportedCrops: z.string().min(2, 'Supported crops required'),
  serviceAreaDistricts: z.string().min(2, 'Service area districts required'),
  pricingMethod: z.enum(['PER_KM', 'PER_TRIP', 'NEGOTIABLE']).default('NEGOTIABLE'),
  ratePerKm: z.number().positive().optional(),
  ratePerTrip: z.number().positive().optional(),
  isAvailable: z.boolean().default(true),
});

export const addFacilitySchema = z.object({
  providerId: z.string().uuid('Valid provider ID required'),
  userId: z.string().uuid('Valid user ID required'),
  facilityName: z.string().min(2, 'Facility name required'),
  facilityType: z.enum(['COLD_STORAGE', 'WAREHOUSE', 'GODOWN', 'CONTROLLED_ATMOSPHERE']),
  totalCapacity: z.number().positive('Total capacity must be greater than 0'),
  capacityUnit: z.string().default('Quintal'),
  supportedCrops: z.string().min(2, 'Supported crops required'),
  pricePerUnitPerDay: z.number().min(0, 'Price per unit per day must be non-negative'),
  state: z.string().min(2, 'State required'),
  district: z.string().min(2, 'District required'),
  taluka: z.string().optional(),
  village: z.string().optional(),
  isAvailable: z.boolean().default(true),
});

export const createTransportRequestSchema = z.object({
  userId: z.string().uuid('Valid user ID required'),
  orderId: z.string().uuid().optional(),
  arrangementType: z.enum(['FARMER_ARRANGED', 'BUYER_ARRANGED', 'KRISHISETU_PROVIDER']).default('KRISHISETU_PROVIDER'),
  providerId: z.string().uuid().optional(),
  vehicleId: z.string().uuid().optional(),
  driverName: z.string().optional(),
  driverMobile: z.string().regex(/^[6-9]\d{9}$/, 'Valid mobile number required').optional().or(z.literal('')),
  pickupVillage: z.string().min(2, 'Pickup village required'),
  pickupTaluka: z.string().min(2, 'Pickup taluka required'),
  pickupDistrict: z.string().min(2, 'Pickup district required'),
  pickupAddress: z.string().optional(),
  deliveryVillage: z.string().min(2, 'Delivery village required'),
  deliveryTaluka: z.string().min(2, 'Delivery taluka required'),
  deliveryDistrict: z.string().min(2, 'Delivery district required'),
  deliveryAddress: z.string().optional(),
  cropCategory: z.string().min(2, 'Crop category required'),
  quantity: z.number().positive('Quantity must be greater than 0'),
  unit: z.string().default('Quintal'),
  scheduledPickupDate: z.string(),
  estimatedDistanceKm: z.number().positive().optional(),
  pricingType: z.string().default('NEGOTIABLE'),
  agreedTransportCost: z.number().nonnegative().optional(),
  paymentResponsibility: z.enum(['FARMER', 'BUYER', 'NOT_SPECIFIED']).default('NOT_SPECIFIED'),
  idempotencyKey: z.string().optional(),
});

export const transitionTransportStatusSchema = z.object({
  requestId: z.string().uuid('Valid request ID required'),
  userId: z.string().uuid('Valid user ID required'),
  targetStatus: z.enum([
    'REQUESTED',
    'ACCEPTED',
    'ASSIGNED',
    'PICKUP_PLANNED',
    'READY_FOR_PICKUP',
    'PICKED_UP',
    'IN_TRANSIT',
    'DELIVERED',
    'COMPLETED',
    'CANCELLED',
  ]),
  driverName: z.string().optional(),
  driverMobile: z.string().regex(/^[6-9]\d{9}$/, 'Valid mobile number required').optional().or(z.literal('')),
  notes: z.string().optional(),
});

export const cancelTransportSchema = z.object({
  requestId: z.string().uuid('Valid request ID required'),
  userId: z.string().uuid('Valid user ID required'),
  cancellationReason: z.string().optional(),
});

export const createStorageRequestSchema = z.object({
  userId: z.string().uuid('Valid user ID required'),
  facilityId: z.string().uuid('Valid facility ID required'),
  orderId: z.string().uuid().optional(),
  lotId: z.string().uuid().optional(),
  cropName: z.string().min(2, 'Crop name required'),
  quantity: z.number().positive('Quantity must be greater than 0'),
  unit: z.string().default('Quintal'),
  expectedCheckInDate: z.string(),
  durationDays: z.number().int().positive('Duration in days must be greater than 0'),
  agreedStorageCost: z.number().nonnegative().optional(),
  idempotencyKey: z.string().optional(),
});

export const transitionStorageStatusSchema = z.object({
  requestId: z.string().uuid('Valid request ID required'),
  userId: z.string().uuid('Valid user ID required'),
  targetStatus: z.enum([
    'REQUESTED',
    'ACCEPTED',
    'RESERVED',
    'CHECK_IN_PENDING',
    'STORED',
    'RELEASE_REQUESTED',
    'RELEASED',
    'COMPLETED',
    'CANCELLED',
  ]),
  notes: z.string().optional(),
});

export const cancelStorageSchema = z.object({
  requestId: z.string().uuid('Valid request ID required'),
  userId: z.string().uuid('Valid user ID required'),
  cancellationReason: z.string().optional(),
});
