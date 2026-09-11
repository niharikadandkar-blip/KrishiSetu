export interface MarketPriceRecordItem {
  id: string;
  cropName: string;
  variety?: string;
  mandiName: string;
  district: string;
  state: string;
  marketDate: string;
  minPrice: number;
  maxPrice: number;
  modalPrice: number;
  arrivalsQuantity: number;
  unit: string;
  source: string;
  isDemoData: boolean;
  retrievedAt: string;
}

export interface HistoricalTrendPoint {
  date: string;
  modalPrice: number;
  minPrice: number;
  maxPrice: number;
  changePct?: number;
}

export interface HistoricalTrendResult {
  cropName: string;
  mandiName: string;
  trend: 'UPWARD' | 'DOWNWARD' | 'STABLE';
  percentageChange: number;
  dataPoints: HistoricalTrendPoint[];
  periodDescription: string;
}

export interface PriceOutlookResult {
  cropName: string;
  outlook: 'UPWARD' | 'DOWNWARD' | 'STABLE' | 'INSUFFICIENT_DATA';
  probabilityUpward?: number;
  probabilityDownward?: number;
  observationCount: number;
  methodology: string;
  disclaimer: string;
  generatedAt: string;
}

export interface NearbyMarketComparisonItem {
  id: string;
  mandiName: string;
  district: string;
  cropName: string;
  modalPrice: number;
  minPrice: number;
  maxPrice: number;
  arrivalsQuantity: number;
  unit: string;
  distanceKm?: number;
  distanceType?: 'GEODESIC' | 'ESTIMATED_ROAD';
  distanceLabel?: string;
  dataFreshness: string;
  source: string;
  isDemoData: boolean;
  contextualNotice: string;
}

export interface EstimatedNetRealization {
  cropCommercialValue: number;
  estimatedTransportCost: number;
  estimatedStorageCost: number;
  estimatedNetRealization: number;
  isEstimateOnly: true;
  includedCostsDescription: string;
}

export interface WeatherObservationItem {
  id: string;
  state: string;
  district: string;
  taluka?: string;
  temperatureC: number;
  condition: 'Sunny' | 'Rainy' | 'Cloudy' | 'Thunderstorm' | 'Foggy';
  humidityPct?: number;
  rainfallMm?: number;
  windSpeedKmh?: number;
  source: string;
  isDemoData: boolean;
  observedAt: string;
  agContextHint?: string;
}

export interface WeatherForecastItem {
  date: string;
  condition: string;
  minTempC: number;
  maxTempC: number;
  rainfallProbPct: number;
}
