import { LatLng, DistanceResult, DistanceType } from '@/lib/types/phase7';

export class GeoService {
  /**
   * Earth's mean radius in kilometers
   */
  private static readonly EARTH_RADIUS_KM = 6371;

  /**
   * Calculates geodesic (straight-line) distance using the Haversine formula
   */
  static calculateGeodesicDistance(origin: LatLng, destination: LatLng): number {
    const dLat = this.toRadians(destination.latitude - origin.latitude);
    const dLon = this.toRadians(destination.longitude - origin.longitude);

    const lat1 = this.toRadians(origin.latitude);
    const lat2 = this.toRadians(destination.latitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return this.EARTH_RADIUS_KM * c;
  }

  /**
   * Formats distance with accurate type labeling (GEODESIC vs ESTIMATED_ROAD)
   */
  static formatDistanceResult(distanceKm: number, type: DistanceType): DistanceResult {
    const rounded = Math.round(distanceKm * 10) / 10;
    
    if (type === 'ESTIMATED_ROAD') {
      return {
        distanceKm: rounded,
        distanceType: 'ESTIMATED_ROAD',
        label: 'Estimated road distance',
      };
    }

    return {
      distanceKm: rounded,
      distanceType: 'GEODESIC',
      label: 'Approximate straight-line distance',
    };
  }

  /**
   * Computes a bounding box (minLat, maxLat, minLng, maxLng) for bounding box spatial queries.
   * Useful for SQLite development queries before production PostGIS deployment.
   */
  static getBoundingBox(center: LatLng, radiusKm: number): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
    const latDelta = radiusKm / 111; // ~111 km per degree latitude
    const lngDelta = radiusKm / (111 * Math.cos(this.toRadians(center.latitude)));

    return {
      minLat: center.latitude - latDelta,
      maxLat: center.latitude + latDelta,
      minLng: center.longitude - lngDelta,
      maxLng: center.longitude + lngDelta,
    };
  }

  /**
   * PostGIS spatial query template documentation generator for production migration
   */
  static getPostGISQueryTemplate(tableName: string, latParam: number, lngParam: number, radiusMeters: number): string {
    return `
      SELECT *, 
        ST_Distance(location::geography, ST_MakePoint(${lngParam}, ${latParam})::geography) / 1000 AS distance_km
      FROM "${tableName}"
      WHERE ST_DWithin(location::geography, ST_MakePoint(${lngParam}, ${latParam})::geography, ${radiusMeters})
      ORDER BY distance_km ASC;
    `.trim();
  }

  private static toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }
}
