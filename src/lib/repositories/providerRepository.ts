import { db } from '@/lib/db';
import { AddFacilityInput, AddVehicleInput, RegisterProviderInput } from '@/lib/types/phase6';
import { Decimal } from '@prisma/client/runtime/library';

export const providerRepository = {
  async registerProvider(input: RegisterProviderInput) {
    const existing = await db.providerProfile.findUnique({
      where: { userId: input.userId },
    });

    if (existing) {
      return db.providerProfile.update({
        where: { userId: input.userId },
        data: {
          businessName: input.businessName || existing.businessName,
          hasTransportServices: input.hasTransportServices ?? existing.hasTransportServices,
          hasStorageServices: input.hasStorageServices ?? existing.hasStorageServices,
          contactName: input.contactName || existing.contactName,
          contactMobile: input.contactMobile || existing.contactMobile,
          state: input.state || existing.state,
          district: input.district || existing.district,
          taluka: input.taluka || existing.taluka,
          village: input.village || existing.village,
        },
        include: { vehicles: true, facilities: true },
      });
    }

    return db.providerProfile.create({
      data: {
        userId: input.userId,
        businessName: input.businessName || null,
        hasTransportServices: input.hasTransportServices,
        hasStorageServices: input.hasStorageServices,
        contactName: input.contactName,
        contactMobile: input.contactMobile,
        state: input.state,
        district: input.district,
        taluka: input.taluka || null,
        village: input.village || null,
        verificationStatus: 'PROFILE_PENDING',
      },
      include: { vehicles: true, facilities: true },
    });
  },

  async findProviderByUserId(userId: string) {
    return db.providerProfile.findUnique({
      where: { userId },
      include: {
        vehicles: true,
        facilities: true,
        user: { select: { name: true, mobile: true, role: true } },
      },
    });
  },

  async addVehicle(input: AddVehicleInput) {
    const provider = await db.providerProfile.findUnique({
      where: { id: input.providerId },
    });

    if (!provider) {
      throw new Error('PROVIDER_NOT_FOUND: Provider profile not found');
    }

    if (provider.userId !== input.userId) {
      throw new Error('UNAUTHORIZED_ACTION: You can only add vehicles to your own provider profile.');
    }

    return db.transportVehicle.create({
      data: {
        providerId: input.providerId,
        vehicleType: input.vehicleType,
        vehicleNumber: input.vehicleNumber,
        capacity: input.capacity,
        capacityUnit: input.capacityUnit || 'Quintal',
        supportedCrops: input.supportedCrops,
        serviceAreaDistricts: input.serviceAreaDistricts,
        pricingMethod: input.pricingMethod,
        ratePerKm: input.ratePerKm ? new Decimal(input.ratePerKm) : null,
        ratePerTrip: input.ratePerTrip ? new Decimal(input.ratePerTrip) : null,
        isAvailable: input.isAvailable ?? true,
      },
    });
  },

  async addFacility(input: AddFacilityInput) {
    const provider = await db.providerProfile.findUnique({
      where: { id: input.providerId },
    });

    if (!provider) {
      throw new Error('PROVIDER_NOT_FOUND: Provider profile not found');
    }

    if (provider.userId !== input.userId) {
      throw new Error('UNAUTHORIZED_ACTION: You can only add storage facilities to your own provider profile.');
    }

    return db.storageFacility.create({
      data: {
        providerId: input.providerId,
        facilityName: input.facilityName,
        facilityType: input.facilityType,
        totalCapacity: input.totalCapacity,
        capacityUnit: input.capacityUnit || 'Quintal',
        supportedCrops: input.supportedCrops,
        pricePerUnitPerDay: new Decimal(input.pricePerUnitPerDay),
        state: input.state,
        district: input.district,
        taluka: input.taluka || null,
        village: input.village || null,
        isAvailable: input.isAvailable ?? true,
      },
    });
  },

  async getTransportProvidersForMap(filters: {
    district?: string;
    vehicleType?: string;
    crop?: string;
    minCapacity?: number;
    userLocation?: { latitude: number; longitude: number };
    limit?: number;
  }) {
    const { getMapProvider } = await import('@/lib/services/map/mapProviderFactory');
    const { LocationPrivacyService } = await import('@/lib/services/locationPrivacyService');
    const { GeoService } = await import('@/lib/services/geoService');

    const mapProvider = getMapProvider();

    const providerWhereClause: any = { hasTransportServices: true };
    if (filters.district) {
      providerWhereClause.district = { contains: filters.district };
    }

    const vehicleWhereClause: any = { isAvailable: true };
    if (filters.vehicleType) vehicleWhereClause.vehicleType = filters.vehicleType;
    if (filters.minCapacity) vehicleWhereClause.capacity = { gte: filters.minCapacity };

    const vehicles = await db.transportVehicle.findMany({
      where: {
        ...vehicleWhereClause,
        provider: providerWhereClause,
      },
      include: {
        provider: true,
      },
      take: filters.limit || 50,
      orderBy: { createdAt: 'desc' },
    });

    const items = await Promise.all(
      vehicles.map(async (v) => {
        if (filters.crop && v.supportedCrops) {
          const crops = v.supportedCrops.toLowerCase();
          if (!crops.includes(filters.crop.toLowerCase())) {
            return null;
          }
        }

        let baseLocation = v.provider.latitude && v.provider.longitude ? { latitude: v.provider.latitude, longitude: v.provider.longitude } : null;
        if (!baseLocation) {
          baseLocation = await mapProvider.geocode(v.provider.district);
        }

        const discoveryLocation = baseLocation
          ? LocationPrivacyService.getDeterministicDiscoveryLocation(v.id, baseLocation)
          : undefined;

        let distanceResult = undefined;
        if (filters.userLocation && discoveryLocation) {
          const distKm = GeoService.calculateGeodesicDistance(filters.userLocation, discoveryLocation);
          distanceResult = GeoService.formatDistanceResult(distKm, 'GEODESIC');
        }

        return {
          id: v.id,
          providerId: v.providerId,
          businessName: v.provider.businessName || undefined,
          contactName: v.provider.contactName,
          vehicleType: v.vehicleType,
          vehicleNumber: v.vehicleNumber,
          capacity: v.capacity,
          capacityUnit: v.capacityUnit,
          supportedCrops: v.supportedCrops ? v.supportedCrops.split(',').map((c) => c.trim()) : [],
          serviceAreaDistricts: v.serviceAreaDistricts ? v.serviceAreaDistricts.split(',').map((d) => d.trim()) : [],
          pricingMethod: v.pricingMethod,
          ratePerKm: v.ratePerKm ? Number(v.ratePerKm) : undefined,
          ratePerTrip: v.ratePerTrip ? Number(v.ratePerTrip) : undefined,
          state: v.provider.state,
          district: v.provider.district,
          taluka: v.provider.taluka || undefined,
          village: v.provider.village || undefined,
          discoveryLocation,
          distance: distanceResult,
        };
      })
    );

    return items.filter((item) => item !== null);
  },
};
