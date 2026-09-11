import {
  MarketPriceRecordItem,
  HistoricalTrendResult,
  PriceOutlookResult,
  NearbyMarketComparisonItem,
} from '@/lib/types/phase8';
import { LatLng } from '@/lib/types/phase7';

export interface IMarketDataProvider {
  getProviderName(): string;
  isDemoProvider(): boolean;
  getCurrentPrices(crop: string, district?: string, mandi?: string): Promise<MarketPriceRecordItem[]>;
  getHistoricalPrices(crop: string, mandi: string, days?: number): Promise<HistoricalTrendResult>;
  getNearbyMarkets(crop: string, userLocation?: LatLng, currentDistrict?: string): Promise<NearbyMarketComparisonItem[]>;
  getPriceOutlook(crop: string, mandi?: string): Promise<PriceOutlookResult>;
}
