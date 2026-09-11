import { IWeatherDataProvider } from './IWeatherDataProvider';
import { DemoWeatherDataProvider } from './DemoWeatherDataProvider';

let instance: IWeatherDataProvider | null = null;

export function getWeatherDataProvider(): IWeatherDataProvider {
  if (instance) return instance;

  const providerType = process.env.WEATHER_PROVIDER_TYPE || 'demo';

  switch (providerType.toLowerCase()) {
    case 'demo':
    default:
      instance = new DemoWeatherDataProvider();
      break;
  }

  return instance;
}
