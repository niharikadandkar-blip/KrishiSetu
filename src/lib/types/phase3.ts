import { LotItem, LotStatus as Phase2LotStatus } from './phase2';

export type ExtendedLotStatus = 
  | 'DRAFT'
  | 'PUBLISHED'
  | 'PAUSED'
  | 'UNDER_OFFER'
  | 'BOOKING_THRESHOLD_REACHED'
  | 'FARMER_CONFIRMED'
  | 'HARVEST_READY'
  | 'HARVESTED'
  | 'DISPATCHED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'SOLD';

export interface MarketplaceFilterOptions {
  cropName?: string;
  variety?: string;
  grade?: string;
  packagingType?: string;
  minPrice?: number;
  maxPrice?: number;
  alreadyHarvested?: boolean;
  radiusKm?: number;
  originLat?: number;
  originLng?: number;
  sortBy?: 'distance' | 'price_asc' | 'price_desc' | 'harvest_date' | 'newest' | 'quantity';
  searchText?: string;
}

export interface UpdateLotInput {
  cropName?: string;
  variety?: string;
  quantityAvailable?: number;
  unit?: string;
  askPricePerUnit?: number;
  expectedHarvestDate?: string;
  alreadyHarvested?: boolean;
  grade?: string;
  sizeMm?: number;
  maturityColour?: string;
  moisturePct?: number;
  damagePct?: number;
  freshness?: string;
  packagingType?: string;
  photoUrls?: string[];
  publicVillage?: string;
  publicTaluka?: string;
  publicDistrict?: string;
  latitude?: number;
  longitude?: number;
  farmAddress?: string;
}

export interface ListingStatusTransitionInput {
  lotId: string;
  farmerId: string;
  targetStatus: ExtendedLotStatus;
  reason?: string;
}

export interface BuyerRequirementInput {
  buyerId: string;
  targetCrop: string;
  targetVariety?: string;
  requiredQuantity: number;
  unit?: string;
  targetGrade?: string;
  budgetPricePerUnit: number;
  deliveryDistrict: string;
  deliveryAddress?: string;
  latitude?: number;
  longitude?: number;
  requiredByDate: string;
}

export interface MatchingFactor {
  category: string; // 'CROP', 'PRICE', 'LOCATION', 'QUANTITY', 'HARVEST_DATE'
  score: number;    // 0 to 100
  weight: number;   // e.g. 0.35
  matched: boolean;
  explanation: string;
}

export interface MatchingScoreResult {
  totalScore: number; // 0 to 100
  matchGrade: 'EXCELLENT' | 'GOOD' | 'MODERATE' | 'LOW';
  factors: MatchingFactor[];
  lotId: string;
  rfqId?: string;
}

export interface SavedListingItem {
  id: string;
  userId: string;
  lotId: string;
  createdAt: string;
  lot: LotItem;
}
