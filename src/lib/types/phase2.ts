export type LotStatus = 
  | 'DRAFT'
  | 'PUBLISHED'
  | 'UNDER_OFFER'
  | 'BOOKING_THRESHOLD_REACHED'
  | 'FARMER_CONFIRMED'
  | 'HARVEST_READY'
  | 'HARVESTED'
  | 'DISPATCHED'
  | 'COMPLETED'
  | 'CANCELLED';

export type PrebookingStatus = 
  | 'PENDING_CONFIRMATION'
  | 'CONFIRMED'
  | 'FULFILLED'
  | 'CANCELLED';

export type BidStatus = 
  | 'PENDING'
  | 'COUNTERED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'WITHDRAWN';

export type RFQStatus = 
  | 'OPEN'
  | 'MATCHED'
  | 'CLOSED'
  | 'EXPIRED';

export type CameraStage = 
  | 'HARVESTED'
  | 'PACKED'
  | 'DISPATCHED';

export interface LotItem {
  id: string;
  farmerId: string;
  farmerName?: string;
  farmerMobile?: string;
  cropName: string;
  variety?: string | null;
  quantityAvailable: number;
  unit: string;
  askPricePerUnit: number;
  expectedHarvestDate: string;
  alreadyHarvested: boolean;
  
  // Optional Quality Parameters
  grade?: string | null;
  sizeMm?: number | null;
  maturityColour?: string | null;
  moisturePct?: number | null;
  damagePct?: number | null;
  freshness?: string | null;
  packagingType?: string | null;
  photoUrls?: string[] | null;
  
  // Location & Privacy Model
  publicVillage: string;
  publicTaluka: string;
  publicDistrict: string;
  latitude?: number | null;   // Protected - visible only to authorized counterparty
  longitude?: number | null;  // Protected
  farmAddress?: string | null; // Protected
  
  // Calculated Radial Distance (km)
  distanceKm?: number | null;
  
  status: LotStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLotInput {
  farmerId: string;
  cropName: string;
  variety?: string;
  quantityAvailable: number;
  unit?: string;
  askPricePerUnit: number;
  expectedHarvestDate: string;
  alreadyHarvested?: boolean;
  
  grade?: string;
  sizeMm?: number;
  maturityColour?: string;
  moisturePct?: number;
  damagePct?: number;
  freshness?: string;
  packagingType?: string;
  photoUrls?: string[];
  
  publicVillage: string;
  publicTaluka: string;
  publicDistrict: string;
  latitude?: number;
  longitude?: number;
  farmAddress?: string;
  
  idempotencyKey?: string;
}

export interface PrebookingInput {
  lotId: string;
  buyerId: string;
  buyerType?: 'INDIVIDUAL' | 'SOCIETY' | 'INSTITUTIONAL' | 'TRADER';
  societyName?: string;
  quantityBooked: number;
  unitPrice: number;
}

export interface BidInput {
  lotId: string;
  bidderId: string;
  bidderRole: 'FARMER' | 'BUYER';
  offeredPricePerUnit: number;
  quantity: number;
  paymentTermsDays?: number;
  idempotencyKey?: string;
}

export interface RespondBidInput {
  bidId: string;
  userId: string;
  action: 'ACCEPT' | 'REJECT' | 'COUNTER';
  counterPricePerUnit?: number;
  counterQuantity?: number;
  counterPaymentTermsDays?: number;
}

export interface HarvestLogInput {
  lotId: string;
  stage: CameraStage;
  photoUrl: string;
  latitude?: number;
  longitude?: number;
}

export interface MarketBenchmarkItem {
  id: string;
  cropName: string;
  mandiName: string;
  district: string;
  minPrice: number;
  maxPrice: number;
  modalPrice: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
  weatherInfo?: string | null;
  source: string;
  fetchedAt: string;
}
