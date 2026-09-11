import { LatLng, DistanceResult, MapConfig, NavigationHandoff } from '@/lib/types/phase7';

export interface IMapProvider {
  getProviderName(): string;
  getMapConfig(): MapConfig;
  geocode(locationQuery: string): Promise<LatLng | null>;
  reverseGeocode(location: LatLng): Promise<{ state: string; district: string; taluka?: string; village?: string } | null>;
  calculateDistance(origin: LatLng, destination: LatLng): Promise<DistanceResult>;
  getDirections(origin: LatLng, destination: LatLng): Promise<{ routeGeometry: LatLng[]; distance: DistanceResult } | null>;
  getNavigationUrl(destination: LatLng, label: string, isAuthorizedExact: boolean, origin?: LatLng): NavigationHandoff;
}
