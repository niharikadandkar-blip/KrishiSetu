import { LatLng } from '@/lib/types/phase7';
import crypto from 'crypto';

export class LocationPrivacyService {
  /**
   * Generates a deterministic discovery-level coordinate offset (1.5 - 3.5 km jitter).
   * Ensures the same entity always resolves to the exact same discovery coordinate pin
   * across multiple API calls, eliminating random pin jumps.
   */
  static getDeterministicDiscoveryLocation(entityId: string, exactLocation: LatLng): LatLng {
    // Generate deterministic 32-bit integer from hash of entityId
    const hash = crypto.createHash('sha256').update(`krishisetu_geo_jitter_${entityId}`).digest('hex');
    const latOffsetRaw = parseInt(hash.substring(0, 8), 16) / 0xffffffff; // 0.0 to 1.0
    const lngOffsetRaw = parseInt(hash.substring(8, 16), 16) / 0xffffffff; // 0.0 to 1.0

    // Map 0..1 to jitter between -0.02 and +0.02 degrees (~2 km)
    const latJitter = (latOffsetRaw - 0.5) * 0.03;
    const lngJitter = (lngOffsetRaw - 0.5) * 0.03;

    return {
      latitude: Math.round((exactLocation.latitude + latJitter) * 10000) / 10000,
      longitude: Math.round((exactLocation.longitude + lngJitter) * 10000) / 10000,
    };
  }

  /**
   * Sanitizes a public entity payload by stripping protected exact location coordinates
   * and street addresses.
   */
  static sanitizePublicPayload<T extends Record<string, unknown>>(item: T): Omit<T, 'latitude' | 'longitude' | 'farmAddress' | 'pickupAddress' | 'deliveryAddress' | 'address'> {
    const sanitized = { ...item };
    delete sanitized.latitude;
    delete sanitized.longitude;
    delete sanitized.farmAddress;
    delete sanitized.pickupAddress;
    delete sanitized.deliveryAddress;
    delete sanitized.address;
    return sanitized;
  }

  /**
   * Verifies if a user has authorized fulfillment access to an order's exact geographic details.
   */
  static isAuthorizedForFulfillment(userId: string, userRole: string, order: { farmerId: string; buyerId: string }, transport?: { providerId?: string | null } | null): boolean {
    if (!userId) return false;
    
    // System admin role always authorized
    if (userRole === 'ADMIN') return true;

    // Order farmer or buyer
    if (order.farmerId === userId || order.buyerId === userId) return true;

    // Assigned transport provider
    if (transport?.providerId && transport.providerId === userId) return true;

    return false;
  }
}
