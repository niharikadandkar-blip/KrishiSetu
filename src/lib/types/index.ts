export type Role = 'FARMER' | 'BUYER' | 'ADMIN';

export type Language = 'mr' | 'hi' | 'en';

export type VerificationStatus = 
  | 'PENDING' 
  | 'APPROVED' 
  | 'ACTION_REQUIRED' 
  | 'REJECTED' 
  | 'RESTRICTED';

export type VerificationLevel = 
  | 'UNVERIFIED'
  | 'MOBILE_VERIFIED'
  | 'PROFILE_VERIFIED'
  | 'MARKETPLACE_VERIFIED';

export type BuyerType = 
  | 'TRADER' 
  | 'WHOLESALER' 
  | 'PROCESSOR' 
  | 'RETAILER' 
  | 'FPO' 
  | 'EXPORTER' 
  | 'OTHER';

export interface UserSession {
  id: string;
  name: string;
  mobile: string;
  role: Role;
  language: Language;
  mobileVerified: boolean;
  profileVerified: boolean;
  verificationLevel: VerificationLevel;
  location?: LocationInfo | null;
  farmerProfile?: FarmerProfileInfo | null;
  buyerProfile?: BuyerProfileInfo | null;
}

export interface LocationInfo {
  state: string;
  district: string;
  taluka?: string | null;
  village?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  formattedAddress?: string | null;
}

export interface FarmerProfileInfo {
  mainCrop?: string | null;
  otherCrops?: string | null;
  farmingStatus?: string | null;
  farmArea?: number | null;
  farmAreaUnit?: string | null;
}

export interface BuyerProfileInfo {
  businessName?: string | null;
  businessType?: BuyerType | null;
  cropsPurchased?: string | null;
  businessLocation?: string | null;
}

export interface VerificationRequestData {
  id: string;
  userId: string;
  verificationType: string;
  status: VerificationStatus;
  provider: string;
  documentReference?: string | null;
  submittedAt: string;
  reviewedAt?: string | null;
  reviewNotes?: string | null;
}

export * from './phase10';

