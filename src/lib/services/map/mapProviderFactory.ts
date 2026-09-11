import { IMapProvider } from './IMapProvider';
import { DemoMapProvider } from './DemoMapProvider';

let instance: IMapProvider | null = null;

export function getMapProvider(): IMapProvider {
  if (instance) return instance;

  const providerType = process.env.MAP_PROVIDER_TYPE || 'demo';

  switch (providerType.toLowerCase()) {
    case 'demo':
    default:
      instance = new DemoMapProvider();
      break;
  }

  return instance;
}
