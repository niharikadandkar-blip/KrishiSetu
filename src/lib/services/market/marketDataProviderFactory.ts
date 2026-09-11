import { IMarketDataProvider } from './IMarketDataProvider';
import { DemoMarketDataProvider } from './DemoMarketDataProvider';

let instance: IMarketDataProvider | null = null;

export function getMarketDataProvider(): IMarketDataProvider {
  if (instance) return instance;

  const providerType = process.env.MARKET_PROVIDER_TYPE || 'demo';

  switch (providerType.toLowerCase()) {
    case 'demo':
    default:
      instance = new DemoMarketDataProvider();
      break;
  }

  return instance;
}
