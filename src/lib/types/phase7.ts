export interface LatLng {
  latitude: number;
  longitude: number;
}

export type DistanceType = 'GEODESIC' | 'ESTIMATED_ROAD' | 'UNAVAILABLE';

export interface DistanceResult {
  distanceKm: number;
  distanceType: DistanceType;
  label: string;
}

export interface MapConfig {
  tileUrl: string;
  attribution: string;
  defaultCenter: LatLng;
  defaultZoom: number;
}

export interface MapMarker {
  id: string;
  title: string;
  subtitle?: string;
  location: LatLng;
  type: 'STORAGE' | 'TRANSPORT' | 'MANDI' | 'PICKUP' | 'DELIVERY';
  isDiscoveryApproximate: boolean;
  detailsUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface NavigationHandoff {
  googleMapsUrl?: string;
  openStreetMapUrl?: string;
  geoUri?: string;
  isAuthorizedExact: boolean;
}

export interface StorageMapDiscoveryItem {
  id: string;
  facilityName: string;
  facilityType: string;
  totalCapacity: number;
  availableCapacity: number;
  capacityUnit: string;
  supportedCrops: string[];
  pricePerUnitPerDay: number;
  state: string;
  district: string;
  taluka?: string;
  village?: string;
  discoveryLocation?: LatLng;
  distance?: DistanceResult;
  lastUpdated: string;
}

export interface TransportMapDiscoveryItem {
  id: string;
  providerId: string;
  businessName?: string;
  contactName: string;
  vehicleType: string;
  vehicleNumber: string;
  capacity: number;
  capacityUnit: string;
  supportedCrops: string[];
  serviceAreaDistricts: string[];
  pricingMethod: string;
  ratePerKm?: number;
  ratePerTrip?: number;
  state: string;
  district: string;
  taluka?: string;
  village?: string;
  discoveryLocation?: LatLng;
  distance?: DistanceResult;
}

export interface MandiLocationItem {
  id: string;
  mandiName: string;
  district: string;
  state: string;
  cropName: string;
  modalPrice: number;
  minPrice: number;
  maxPrice: number;
  location?: LatLng;
  distance?: DistanceResult;
  isStaticDemo: true;
}

export interface OrderRouteGeographicDetails {
  orderId: string;
  orderNumber: string;
  pickup: {
    village: string;
    taluka: string;
    district: string;
    address?: string; // Only if authorized
    location?: LatLng; // Exact if authorized, discovery/null if not
    isExactAuthorized: boolean;
  };
  delivery: {
    village: string;
    taluka: string;
    district: string;
    address?: string; // Only if authorized
    location?: LatLng; // Exact if authorized, discovery/null if not
    isExactAuthorized: boolean;
  };
  distance?: DistanceResult;
  navigationHandoff?: NavigationHandoff;
  storageFacility?: {
    facilityId: string;
    facilityName: string;
    facilityType: string;
    address?: string;
    location?: LatLng;
    distance?: DistanceResult;
    navigationHandoff?: NavigationHandoff;
  };
}
