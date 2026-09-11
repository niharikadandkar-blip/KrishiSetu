import { IWeatherDataProvider } from './IWeatherDataProvider';
import { WeatherObservationItem, WeatherForecastItem } from '@/lib/types/phase8';

const DISTRICT_WEATHER_BENCHMARKS: Record<string, Partial<WeatherObservationItem>> = {
  Nashik: {
    temperatureC: 28,
    condition: 'Sunny',
    humidityPct: 65,
    rainfallMm: 0,
    windSpeedKmh: 12,
    agContextHint: 'Sunny weather is favorable for harvesting and open produce drying.',
  },
  Pune: {
    temperatureC: 26,
    condition: 'Cloudy',
    humidityPct: 72,
    rainfallMm: 2,
    windSpeedKmh: 14,
    agContextHint: 'Overcast conditions present. Consider checking transport vehicle tarpaulins.',
  },
  Sangli: {
    temperatureC: 29,
    condition: 'Sunny',
    humidityPct: 58,
    rainfallMm: 0,
    windSpeedKmh: 10,
    agContextHint: 'Dry sunny conditions. Ideal for turmeric curing and storage dispatch.',
  },
  Latur: {
    temperatureC: 31,
    condition: 'Sunny',
    humidityPct: 50,
    rainfallMm: 0,
    windSpeedKmh: 11,
    agContextHint: 'Warm dry weather. Good for grain loading and warehouse storage.',
  },
  Nagpur: {
    temperatureC: 32,
    condition: 'Sunny',
    humidityPct: 55,
    rainfallMm: 0,
    windSpeedKmh: 9,
    agContextHint: 'High temperatures. Refrigerated cold transport recommended for perishable citrus.',
  },
};

export class DemoWeatherDataProvider implements IWeatherDataProvider {
  getProviderName(): string {
    return 'DemoWeatherDataProvider (IMD Maharashtra Sandbox)';
  }

  isDemoProvider(): boolean {
    return true;
  }

  async getWeatherObservation(district: string, taluka?: string): Promise<WeatherObservationItem> {
    const distKey = Object.keys(DISTRICT_WEATHER_BENCHMARKS).find(
      (k) => k.toLowerCase() === district.trim().toLowerCase()
    ) || 'Nashik';

    const base = DISTRICT_WEATHER_BENCHMARKS[distKey] || DISTRICT_WEATHER_BENCHMARKS['Nashik']!;

    return {
      id: `wx_${district.toLowerCase()}_${Date.now()}`,
      state: 'Maharashtra',
      district: distKey,
      taluka: taluka || undefined,
      temperatureC: base.temperatureC || 28,
      condition: base.condition || 'Sunny',
      humidityPct: base.humidityPct || 60,
      rainfallMm: base.rainfallMm || 0,
      windSpeedKmh: base.windSpeedKmh || 12,
      source: 'IMD Sandbox / Demo Data',
      isDemoData: true,
      observedAt: new Date().toISOString(),
      agContextHint: base.agContextHint || 'Weather information for your selected area. Rainfall or humidity may affect transport planning.',
    };
  }

  async getWeatherForecast(district: string, days: number = 5): Promise<WeatherForecastItem[]> {
    const baseWx = await this.getWeatherObservation(district);
    const forecast: WeatherForecastItem[] = [];

    const conditions: WeatherObservationItem['condition'][] = ['Sunny', 'Cloudy', 'Rainy', 'Sunny', 'Sunny'];

    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const cond = conditions[i % conditions.length];

      forecast.push({
        date: d.toISOString().split('T')[0],
        condition: cond,
        minTempC: Math.round(baseWx.temperatureC - 6 + Math.sin(i) * 2),
        maxTempC: Math.round(baseWx.temperatureC + Math.cos(i) * 2),
        rainfallProbPct: cond === 'Rainy' ? 70 : cond === 'Cloudy' ? 30 : 10,
      });
    }

    return forecast;
  }
}
