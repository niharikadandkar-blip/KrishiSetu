import { WeatherObservationItem, WeatherForecastItem } from '@/lib/types/phase8';

export interface IWeatherDataProvider {
  getProviderName(): string;
  isDemoProvider(): boolean;
  getWeatherObservation(district: string, taluka?: string): Promise<WeatherObservationItem>;
  getWeatherForecast(district: string, days?: number): Promise<WeatherForecastItem[]>;
}
