import { db } from '@/lib/db';
import { getMarketDataProvider } from '@/lib/services/market/marketDataProviderFactory';
import { getWeatherDataProvider } from '@/lib/services/weather/weatherDataProviderFactory';
import { LatLng } from '@/lib/types/phase7';
import { EstimatedNetRealization } from '@/lib/types/phase8';

export const marketRepository = {
  async getCurrentMarketPrices(crop: string, district?: string, mandi?: string) {
    const provider = getMarketDataProvider();
    return provider.getCurrentPrices(crop, district, mandi);
  },

  async getHistoricalMarketTrends(crop: string, mandi: string, days: number = 30) {
    const provider = getMarketDataProvider();
    return provider.getHistoricalPrices(crop, mandi, days);
  },

  async getNearbyMarkets(crop: string, userLocation?: LatLng, currentDistrict?: string) {
    const provider = getMarketDataProvider();
    return provider.getNearbyMarkets(crop, userLocation, currentDistrict);
  },

  async getPriceOutlook(crop: string, mandi?: string) {
    const provider = getMarketDataProvider();
    return provider.getPriceOutlook(crop, mandi);
  },

  async getWeatherObservation(district: string, taluka?: string) {
    const provider = getWeatherDataProvider();
    return provider.getWeatherObservation(district, taluka);
  },

  async getWeatherForecast(district: string, days: number = 5) {
    const provider = getWeatherDataProvider();
    return provider.getWeatherForecast(district, days);
  },

  async calculateEstimatedNetRealization(cropValue: number, transportCost: number = 0, storageCost: number = 0): Promise<EstimatedNetRealization> {
    const net = Math.max(0, cropValue - transportCost - storageCost);
    return {
      cropCommercialValue: cropValue,
      estimatedTransportCost: transportCost,
      estimatedStorageCost: storageCost,
      estimatedNetRealization: net,
      isEstimateOnly: true,
      includedCostsDescription: 'Calculated as Crop Commercial Value minus estimated transport and storage costs. Other marketing fees or taxes may apply.',
    };
  },
};
