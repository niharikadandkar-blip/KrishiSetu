import { IMarketDataProvider } from './IMarketDataProvider';
import {
  MarketPriceRecordItem,
  HistoricalTrendResult,
  PriceOutlookResult,
  NearbyMarketComparisonItem,
  HistoricalTrendPoint,
} from '@/lib/types/phase8';
import { LatLng } from '@/lib/types/phase7';
import { GeoService } from '../geoService';

const DEMO_MARKET_RECORDS: MarketPriceRecordItem[] = [
  {
    id: 'mktr_onion_lasalgaon',
    cropName: 'Onion',
    variety: 'Red Onion',
    mandiName: 'Lasalgaon APMC',
    district: 'Nashik',
    state: 'Maharashtra',
    marketDate: '2026-09-11',
    minPrice: 1900,
    maxPrice: 2600,
    modalPrice: 2350,
    arrivalsQuantity: 1450,
    unit: 'Quintal',
    source: 'Agmarknet Sandbox / Demo Data',
    isDemoData: true,
    retrievedAt: new Date().toISOString(),
  },
  {
    id: 'mktr_onion_vashi',
    cropName: 'Onion',
    variety: 'Garwa Onion',
    mandiName: 'Vashi APMC',
    district: 'Mumbai Suburban',
    state: 'Maharashtra',
    marketDate: '2026-09-11',
    minPrice: 2200,
    maxPrice: 2850,
    modalPrice: 2550,
    arrivalsQuantity: 2100,
    unit: 'Quintal',
    source: 'Agmarknet Sandbox / Demo Data',
    isDemoData: true,
    retrievedAt: new Date().toISOString(),
  },
  {
    id: 'mktr_onion_pune',
    cropName: 'Onion',
    variety: 'Local Red',
    mandiName: 'Gultekdi APMC (Pune)',
    district: 'Pune',
    state: 'Maharashtra',
    marketDate: '2026-09-11',
    minPrice: 2000,
    maxPrice: 2500,
    modalPrice: 2280,
    arrivalsQuantity: 980,
    unit: 'Quintal',
    source: 'Agmarknet Sandbox / Demo Data',
    isDemoData: true,
    retrievedAt: new Date().toISOString(),
  },
  {
    id: 'mktr_potato_pune',
    cropName: 'Potato',
    variety: 'Jyoti',
    mandiName: 'Gultekdi APMC (Pune)',
    district: 'Pune',
    state: 'Maharashtra',
    marketDate: '2026-09-11',
    minPrice: 1400,
    maxPrice: 1850,
    modalPrice: 1650,
    arrivalsQuantity: 820,
    unit: 'Quintal',
    source: 'Agmarknet Sandbox / Demo Data',
    isDemoData: true,
    retrievedAt: new Date().toISOString(),
  },
  {
    id: 'mktr_tomato_nashik',
    cropName: 'Tomato',
    variety: 'Hybrid Red',
    mandiName: 'Pimpalgaon APMC',
    district: 'Nashik',
    state: 'Maharashtra',
    marketDate: '2026-09-11',
    minPrice: 1500,
    maxPrice: 2200,
    modalPrice: 1900,
    arrivalsQuantity: 650,
    unit: 'Quintal',
    source: 'Agmarknet Sandbox / Demo Data',
    isDemoData: true,
    retrievedAt: new Date().toISOString(),
  },
  {
    id: 'mktr_turmeric_sangli',
    cropName: 'Turmeric',
    variety: 'Rajapuri',
    mandiName: 'Sangli APMC',
    district: 'Sangli',
    state: 'Maharashtra',
    marketDate: '2026-09-11',
    minPrice: 13200,
    maxPrice: 16800,
    modalPrice: 14900,
    arrivalsQuantity: 340,
    unit: 'Quintal',
    source: 'Agmarknet Sandbox / Demo Data',
    isDemoData: true,
    retrievedAt: new Date().toISOString(),
  },
  {
    id: 'mktr_soybean_latur',
    cropName: 'Soybean',
    variety: 'Yellow Soybean',
    mandiName: 'Latur APMC',
    district: 'Latur',
    state: 'Maharashtra',
    marketDate: '2026-09-11',
    minPrice: 4200,
    maxPrice: 4850,
    modalPrice: 4600,
    arrivalsQuantity: 1890,
    unit: 'Quintal',
    source: 'Agmarknet Sandbox / Demo Data',
    isDemoData: true,
    retrievedAt: new Date().toISOString(),
  },
];

const MANDI_LOCATIONS: Record<string, LatLng> = {
  'Lasalgaon APMC': { latitude: 20.1491, longitude: 74.2285 },
  'Vashi APMC': { latitude: 19.0760, longitude: 73.0033 },
  'Gultekdi APMC (Pune)': { latitude: 18.4975, longitude: 73.8642 },
  'Pimpalgaon APMC': { latitude: 20.1724, longitude: 73.9856 },
  'Sangli APMC': { latitude: 16.8524, longitude: 74.5815 },
  'Latur APMC': { latitude: 18.4088, longitude: 76.5604 },
};

export class DemoMarketDataProvider implements IMarketDataProvider {
  getProviderName(): string {
    return 'DemoMarketDataProvider (Agmarknet Maharashtra Sandbox)';
  }

  isDemoProvider(): boolean {
    return true;
  }

  async getCurrentPrices(crop: string, district?: string, mandi?: string): Promise<MarketPriceRecordItem[]> {
    const targetCrop = crop.trim().toLowerCase();
    
    let filtered = DEMO_MARKET_RECORDS.filter(
      (r) => r.cropName.toLowerCase().includes(targetCrop) || targetCrop.includes(r.cropName.toLowerCase())
    );

    if (district) {
      const targetDist = district.trim().toLowerCase();
      filtered = filtered.filter((r) => r.district.toLowerCase().includes(targetDist));
    }

    if (mandi) {
      const targetMandi = mandi.trim().toLowerCase();
      filtered = filtered.filter((r) => r.mandiName.toLowerCase().includes(targetMandi));
    }

    // If exact filter yielded zero, return all matching crop items
    if (filtered.length === 0) {
      filtered = DEMO_MARKET_RECORDS.filter((r) => r.cropName.toLowerCase().includes(targetCrop));
    }

    // Fallback if crop is brand new
    if (filtered.length === 0) {
      filtered = [
        {
          id: `mktr_generic_${crop.toLowerCase()}`,
          cropName: crop,
          variety: 'Standard Variety',
          mandiName: 'Regional APMC Benchmark',
          district: district || 'Nashik',
          state: 'Maharashtra',
          marketDate: new Date().toISOString().split('T')[0],
          minPrice: 1800,
          maxPrice: 2400,
          modalPrice: 2150,
          arrivalsQuantity: 500,
          unit: 'Quintal',
          source: 'Agmarknet Sandbox / Demo Data',
          isDemoData: true,
          retrievedAt: new Date().toISOString(),
        },
      ];
    }

    return filtered;
  }

  async getHistoricalPrices(crop: string, mandi: string, days: number = 30): Promise<HistoricalTrendResult> {
    const prices = await this.getCurrentPrices(crop, undefined, mandi);
    const baseRecord = prices[0];
    const baseModal = baseRecord ? baseRecord.modalPrice : 2200;

    const dataPoints: HistoricalTrendPoint[] = [];
    const step = Math.max(1, Math.floor(days / 7));

    // Generate deterministic historical trajectory
    for (let i = days; i >= 0; i -= step) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      // Sinusoidal deterministic fluctuation relative to base modal
      const fluctuation = Math.sin(i * 0.4) * 80 + (days - i) * 3;
      const modal = Math.round(baseModal - 150 + fluctuation);

      dataPoints.push({
        date: dateStr,
        modalPrice: modal,
        minPrice: Math.round(modal * 0.88),
        maxPrice: Math.round(modal * 1.12),
      });
    }

    const firstPrice = dataPoints[0]?.modalPrice || baseModal;
    const lastPrice = dataPoints[dataPoints.length - 1]?.modalPrice || baseModal;
    const percentageChange = Math.round(((lastPrice - firstPrice) / firstPrice) * 1000) / 10;
    const trend: 'UPWARD' | 'DOWNWARD' | 'STABLE' =
      percentageChange > 1.5 ? 'UPWARD' : percentageChange < -1.5 ? 'DOWNWARD' : 'STABLE';

    return {
      cropName: crop,
      mandiName: mandi || (baseRecord ? baseRecord.mandiName : 'Regional APMC'),
      trend,
      percentageChange,
      dataPoints,
      periodDescription: `Historical ${days}-day market trend`,
    };
  }

  async getNearbyMarkets(crop: string, userLocation?: LatLng, currentDistrict: string = 'Nashik'): Promise<NearbyMarketComparisonItem[]> {
    const currentPrices = await this.getCurrentPrices(crop);

    const userLoc = userLocation || { latitude: 19.9975, longitude: 73.7898 }; // Nashik default

    return currentPrices.map((r) => {
      const mandiLoc = MANDI_LOCATIONS[r.mandiName] || { latitude: 19.7515, longitude: 75.7139 };
      const distKm = GeoService.calculateGeodesicDistance(userLoc, mandiLoc);

      return {
        id: r.id,
        mandiName: r.mandiName,
        district: r.district,
        cropName: r.cropName,
        modalPrice: r.modalPrice,
        minPrice: r.minPrice,
        maxPrice: r.maxPrice,
        arrivalsQuantity: r.arrivalsQuantity,
        unit: r.unit,
        distanceKm: Math.round(distKm * 10) / 10,
        distanceType: 'GEODESIC',
        distanceLabel: 'Approximate straight-line distance',
        dataFreshness: r.marketDate,
        source: r.source,
        isDemoData: true,
        contextualNotice:
          'Higher price does not always mean higher profit. Transport, storage and other costs may affect your final realization.',
      };
    });
  }

  async getPriceOutlook(crop: string, mandi?: string): Promise<PriceOutlookResult> {
    const history = await this.getHistoricalPrices(crop, mandi || 'Lasalgaon APMC', 30);
    
    // Deterministic trend indicator
    const obsCount = history.dataPoints.length;
    let outlook: 'UPWARD' | 'DOWNWARD' | 'STABLE' | 'INSUFFICIENT_DATA' = 'INSUFFICIENT_DATA';

    if (obsCount >= 3) {
      if (history.percentageChange > 2) {
        outlook = 'UPWARD';
      } else if (history.percentageChange < -2) {
        outlook = 'DOWNWARD';
      } else {
        outlook = 'STABLE';
      }
    }

    return {
      cropName: crop,
      outlook,
      observationCount: obsCount,
      methodology: 'Deterministic historical trend momentum indicator based on 30-day price trajectory slope',
      disclaimer: 'Trend indicators are based on available historical data and are not a guarantee of future prices.',
      generatedAt: new Date().toISOString(),
    };
  }
}
