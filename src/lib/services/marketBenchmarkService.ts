import { db } from '@/lib/db';
import { MarketBenchmarkItem } from '@/lib/types/phase2';

export interface MarketBenchmarkProvider {
  providerName: string;
  isProductionReady: boolean;
  getBenchmarks(district?: string): Promise<MarketBenchmarkItem[]>;
}

const SAMPLE_BENCHMARKS: Omit<MarketBenchmarkItem, 'id' | 'fetchedAt'>[] = [
  {
    cropName: 'कांदा (Onion)',
    mandiName: 'Niphad APMC (निफाड नाशिक)',
    district: 'Nashik',
    minPrice: 2100,
    maxPrice: 2850,
    modalPrice: 2450,
    trend: 'UP',
    weatherInfo: 'Partly Cloudy, 28°C • Light Rain expected in 2 days',
    source: 'Agmarknet API (Development Sandbox)',
  },
  {
    cropName: 'सोयाबीन (Soyabean)',
    mandiName: 'Latur APMC (लातूर)',
    district: 'Latur',
    minPrice: 4400,
    maxPrice: 5100,
    modalPrice: 4800,
    trend: 'UP',
    weatherInfo: 'Sunny, 31°C • Clear weather for harvest drying',
    source: 'Agmarknet API (Development Sandbox)',
  },
  {
    cropName: 'गहू (Wheat)',
    mandiName: 'Pune APMC (पुणे मार्कफेड)',
    district: 'Pune',
    minPrice: 2400,
    maxPrice: 2900,
    modalPrice: 2650,
    trend: 'STABLE',
    weatherInfo: 'Clear, 27°C • Optimal transport condition',
    source: 'Agmarknet API (Development Sandbox)',
  },
  {
    cropName: 'टोमॅटो (Tomato)',
    mandiName: 'Narayangaon APMC (नारायणगाव)',
    district: 'Pune',
    minPrice: 1400,
    maxPrice: 2100,
    modalPrice: 1800,
    trend: 'DOWN',
    weatherInfo: 'Moderate Rain, 24°C • Handle with humidity protection',
    source: 'Agmarknet API (Development Sandbox)',
  },
  {
    cropName: 'कापूस (Cotton)',
    mandiName: 'Yavatmal APMC (यवतमाळ)',
    district: 'Yavatmal',
    minPrice: 6800,
    maxPrice: 7600,
    modalPrice: 7200,
    trend: 'UP',
    weatherInfo: 'Sunny, 33°C • Low moisture content',
    source: 'Agmarknet API (Development Sandbox)',
  },
];

export class DevelopmentMarketBenchmarkProvider implements MarketBenchmarkProvider {
  providerName = 'Agmarknet & Open-Meteo Development Sandbox';
  isProductionReady = false;

  async getBenchmarks(district: string = 'Pune'): Promise<MarketBenchmarkItem[]> {
    // Check if daily cache exists in database
    const cached = await db.marketBenchmarkCache.findMany({
      orderBy: { fetchedAt: 'desc' },
      take: 10,
    });

    if (cached.length > 0) {
      return cached.map((c) => ({
        id: c.id,
        cropName: c.cropName,
        mandiName: c.mandiName,
        district: c.district,
        minPrice: c.minPrice,
        maxPrice: c.maxPrice,
        modalPrice: c.modalPrice,
        trend: c.trend as 'UP' | 'DOWN' | 'STABLE',
        weatherInfo: c.weatherInfo,
        source: c.source,
        fetchedAt: c.fetchedAt.toISOString(),
      }));
    }

    // Populate daily cache if empty
    const items: MarketBenchmarkItem[] = [];
    for (const b of SAMPLE_BENCHMARKS) {
      const record = await db.marketBenchmarkCache.create({
        data: {
          cropName: b.cropName,
          mandiName: b.mandiName,
          district: b.district,
          minPrice: b.minPrice,
          maxPrice: b.maxPrice,
          modalPrice: b.modalPrice,
          trend: b.trend,
          weatherInfo: b.weatherInfo || null,
          source: b.source,
        },
      });

      items.push({
        id: record.id,
        cropName: record.cropName,
        mandiName: record.mandiName,
        district: record.district,
        minPrice: record.minPrice,
        maxPrice: record.maxPrice,
        modalPrice: record.modalPrice,
        trend: record.trend as 'UP' | 'DOWN' | 'STABLE',
        weatherInfo: record.weatherInfo,
        source: record.source,
        fetchedAt: record.fetchedAt.toISOString(),
      });
    }

    return items;
  }
}

export const marketBenchmarkService: MarketBenchmarkProvider = new DevelopmentMarketBenchmarkProvider();
