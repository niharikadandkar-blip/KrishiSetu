import { BidStatus } from './phase2';

export interface NegotiationTimelineEvent {
  id: string;
  bidderId: string;
  bidderName?: string;
  bidderRole: 'FARMER' | 'BUYER';
  offeredPricePerUnit: number;
  quantity: number;
  paymentTermsDays: number;
  status: BidStatus;
  createdAt: string;
  parentOfferId?: string | null;
}

export interface WithdrawOfferInput {
  bidId: string;
  userId: string;
  reason?: string;
}

export interface OfferFilterOptions {
  role: 'FARMER' | 'BUYER';
  userId: string;
  status?: string;
  lotId?: string;
}
