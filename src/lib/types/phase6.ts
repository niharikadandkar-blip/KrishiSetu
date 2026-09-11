import { Decimal } from '@prisma/client/runtime/library';

export type VerificationStatus = 'MOBILE_VERIFIED' | 'PROFILE_PENDING' | 'PROFILE_VERIFIED' | 'REJECTED';

export type VehicleType = 
  | 'PICKUP_TRUCK' 
  | 'MINI_TRUCK' 
  | 'HEAVY_TRUCK' 
  | 'TRACTOR_TRAILER' 
  | 'COLD_REFRIGERATED_TRUCK';

export type PricingMethod = 'PER_KM' | 'PER_TRIP' | 'NEGOTIABLE';

export type StorageType = 
  | 'COLD_STORAGE' 
  | 'WAREHOUSE' 
  | 'GODOWN' 
  | 'CONTROLLED_ATMOSPHERE';

export type TransportArrangementType = 
  | 'FARMER_ARRANGED' 
  | 'BUYER_ARRANGED' 
  | 'KRISHISETU_PROVIDER';

export type TransportStatus = 
  | 'REQUESTED' 
  | 'ACCEPTED' 
  | 'ASSIGNED' 
  | 'PICKUP_PLANNED' 
  | 'READY_FOR_PICKUP' 
  | 'PICKED_UP' 
  | 'IN_TRANSIT' 
  | 'DELIVERED' 
  | 'COMPLETED' 
  | 'CANCELLED';

export type StorageStatus = 
  | 'REQUESTED' 
  | 'ACCEPTED' 
  | 'RESERVED' 
  | 'CHECK_IN_PENDING' 
  | 'STORED' 
  | 'RELEASE_REQUESTED' 
  | 'RELEASED' 
  | 'COMPLETED' 
  | 'CANCELLED';

export type PaymentResponsibility = 'FARMER' | 'BUYER' | 'NOT_SPECIFIED';

export type PaymentStatus = 'PAYMENT_NOT_INTEGRATED' | 'MANUAL_PAYMENT_PENDING';

export interface RegisterProviderInput {
  userId: string;
  businessName?: string;
  hasTransportServices: boolean;
  hasStorageServices: boolean;
  contactName: string;
  contactMobile: string;
  state: string;
  district: string;
  taluka?: string;
  village?: string;
}

export interface AddVehicleInput {
  providerId: string;
  userId: string;
  vehicleType: VehicleType;
  vehicleNumber: string;
  capacity: number;
  capacityUnit?: string;
  supportedCrops: string; // Comma-separated
  serviceAreaDistricts: string; // Comma-separated
  pricingMethod: PricingMethod;
  ratePerKm?: number;
  ratePerTrip?: number;
  isAvailable?: boolean;
}

export interface AddFacilityInput {
  providerId: string;
  userId: string;
  facilityName: string;
  facilityType: StorageType;
  totalCapacity: number;
  capacityUnit?: string;
  supportedCrops: string; // Comma-separated
  pricePerUnitPerDay: number;
  state: string;
  district: string;
  taluka?: string;
  village?: string;
  isAvailable?: boolean;
}

export interface CreateTransportRequestInput {
  userId: string;
  orderId?: string;
  arrangementType?: TransportArrangementType;
  providerId?: string;
  vehicleId?: string;
  driverName?: string;
  driverMobile?: string;
  pickupVillage: string;
  pickupTaluka: string;
  pickupDistrict: string;
  pickupAddress?: string;
  deliveryVillage: string;
  deliveryTaluka: string;
  deliveryDistrict: string;
  deliveryAddress?: string;
  cropCategory: string;
  quantity: number;
  unit?: string;
  scheduledPickupDate: string;
  estimatedDistanceKm?: number;
  pricingType?: string;
  agreedTransportCost?: number;
  paymentResponsibility?: PaymentResponsibility;
  idempotencyKey?: string;
}

export interface TransitionTransportStatusInput {
  requestId: string;
  userId: string;
  targetStatus: TransportStatus;
  driverName?: string;
  driverMobile?: string;
  notes?: string;
}

export interface CancelTransportInput {
  requestId: string;
  userId: string;
  cancellationReason?: string;
}

export interface CreateStorageRequestInput {
  userId: string;
  facilityId: string;
  orderId?: string;
  lotId?: string;
  cropName: string;
  quantity: number;
  unit?: string;
  expectedCheckInDate: string;
  durationDays: number;
  agreedStorageCost?: number;
  idempotencyKey?: string;
}

export interface TransitionStorageStatusInput {
  requestId: string;
  userId: string;
  targetStatus: StorageStatus;
  notes?: string;
}

export interface CancelStorageInput {
  requestId: string;
  userId: string;
  cancellationReason?: string;
}

export interface CapacityCheckResult {
  facilityId: string;
  totalCapacity: number;
  activeReservedQuantity: number;
  availableCapacity: number;
  capacityUnit: string;
  requestedQuantity: number;
  normalizedQuantity: number;
  isFeasible: boolean;
}
