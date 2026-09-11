import { IMapProvider } from './IMapProvider';
import { LatLng, DistanceResult, MapConfig, NavigationHandoff } from '@/lib/types/phase7';
import { GeoService } from '../geoService';

// Standard Agricultural Centroids in Maharashtra (Demo/Fallback dataset)
const MAHARASHTRA_CENTROIDS: Record<string, LatLng> = {
  NASHIK: { latitude: 19.9975, longitude: 73.7898 },
  PUNE: { latitude: 18.5204, longitude: 73.8567 },
  SANGLI: { latitude: 16.8524, longitude: 74.5815 },
  KOLHAPUR: { latitude: 16.7050, longitude: 74.2433 },
  NAGPUR: { latitude: 21.1458, longitude: 79.0882 },
  LATUR: { latitude: 18.4088, longitude: 76.5604 },
  SOLAPUR: { latitude: 17.6599, longitude: 75.9064 },
  AHMEDNAGAR: { latitude: 19.0948, longitude: 74.7480 },
  AURANGABAD: { latitude: 19.8762, longitude: 75.3433 },
  CHHATRAPATI_SAMBHAJINAGAR: { latitude: 19.8762, longitude: 75.3433 },
  JALGAON: { latitude: 21.0077, longitude: 75.5626 },
  AMRAVATI: { latitude: 20.9374, longitude: 77.7796 },
  SATARA: { latitude: 17.6805, longitude: 74.0183 },
  BEED: { latitude: 18.9891, longitude: 75.7601 },
  OSMANABAD: { latitude: 18.1861, longitude: 76.0419 },
  DHARASHIV: { latitude: 18.1861, longitude: 76.0419 },
  NANDED: { latitude: 19.1383, longitude: 77.3210 },
  MUMBAI: { latitude: 19.0760, longitude: 72.8777 },
};

export class DemoMapProvider implements IMapProvider {
  getProviderName(): string {
    return 'DemoMapProvider (Maharashtra Static Centroid Fallback)';
  }

  getMapConfig(): MapConfig {
    return {
      tileUrl: process.env.NEXT_PUBLIC_MAP_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      defaultCenter: { latitude: 19.7515, longitude: 75.7139 }, // Center of Maharashtra
      defaultZoom: 7,
    };
  }

  async geocode(locationQuery: string): Promise<LatLng | null> {
    if (!locationQuery) return null;
    const normalized = locationQuery.toUpperCase().replace(/\s+/g, '');
    
    for (const [key, centroid] of Object.entries(MAHARASHTRA_CENTROIDS)) {
      if (normalized.includes(key)) {
        return centroid;
      }
    }
    // Default fallback to center of Maharashtra if unknown district
    return { latitude: 19.7515, longitude: 75.7139 };
  }

  async reverseGeocode(location: LatLng): Promise<{ state: string; district: string; taluka?: string; village?: string } | null> {
    // Find closest centroid
    let closestDistrict = 'Maharashtra District';
    let minDistance = Infinity;

    for (const [district, centroid] of Object.entries(MAHARASHTRA_CENTROIDS)) {
      const dist = GeoService.calculateGeodesicDistance(location, centroid);
      if (dist < minDistance) {
        minDistance = dist;
        closestDistrict = district.charAt(0) + district.slice(1).toLowerCase();
      }
    }

    return {
      state: 'Maharashtra',
      district: closestDistrict,
      taluka: 'Taluka',
      village: 'Village',
    };
  }

  async calculateDistance(origin: LatLng, destination: LatLng): Promise<DistanceResult> {
    const distKm = GeoService.calculateGeodesicDistance(origin, destination);
    return {
      distanceKm: Math.round(distKm * 10) / 10,
      distanceType: 'GEODESIC',
      label: 'Approximate straight-line distance',
    };
  }

  async getDirections(origin: LatLng, destination: LatLng): Promise<{ routeGeometry: LatLng[]; distance: DistanceResult } | null> {
    const distance = await this.calculateDistance(origin, destination);
    // Simple straight-line waypoint representation for demo
    const routeGeometry: LatLng[] = [
      origin,
      {
        latitude: (origin.latitude + destination.latitude) / 2,
        longitude: (origin.longitude + destination.longitude) / 2,
      },
      destination,
    ];

    return {
      routeGeometry,
      distance,
    };
  }

  getNavigationUrl(destination: LatLng, label: string, isAuthorizedExact: boolean, origin?: LatLng): NavigationHandoff {
    const destLat = destination.latitude.toFixed(6);
    const destLng = destination.longitude.toFixed(6);
    const encodedLabel = encodeURIComponent(label);

    let googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=driving`;
    if (origin) {
      googleMapsUrl += `&origin=${origin.latitude.toFixed(6)},${origin.longitude.toFixed(6)}`;
    }

    const openStreetMapUrl = origin
      ? `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${origin.latitude.toFixed(6)}%2C${origin.longitude.toFixed(6)}%3B${destLat}%2C${destLng}`
      : `https://www.openstreetmap.org/?mlat=${destLat}&mlon=${destLng}#map=14/${destLat}/${destLng}`;

    const geoUri = `geo:${destLat},${destLng}?q=${destLat},${destLng}(${encodedLabel})`;

    return {
      googleMapsUrl,
      openStreetMapUrl,
      geoUri,
      isAuthorizedExact,
    };
  }
}
