import { db } from '@/lib/db';
import { CreateLotInput, LotItem, LotStatus } from '@/lib/types/phase2';
import { ExtendedLotStatus, MarketplaceFilterOptions, UpdateLotInput } from '@/lib/types/phase3';

// Haversine Radial Distance Calculation (in Kilometers)
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10; // Round to 1 decimal place
}

export const lotRepository = {
  async createLot(input: CreateLotInput) {
    return db.lot.create({
      data: {
        farmerId: input.farmerId,
        cropName: input.cropName,
        variety: input.variety || null,
        quantityAvailable: input.quantityAvailable,
        unit: input.unit || 'Quintal',
        askPricePerUnit: input.askPricePerUnit,
        expectedHarvestDate: new Date(input.expectedHarvestDate),
        alreadyHarvested: input.alreadyHarvested || false,
        grade: input.grade || null,
        sizeMm: input.sizeMm || null,
        maturityColour: input.maturityColour || null,
        moisturePct: input.moisturePct || null,
        damagePct: input.damagePct || null,
        freshness: input.freshness || null,
        packagingType: input.packagingType || null,
        photoUrls: input.photoUrls ? JSON.stringify(input.photoUrls) : null,
        publicVillage: input.publicVillage,
        publicTaluka: input.publicTaluka,
        publicDistrict: input.publicDistrict,
        latitude: input.latitude || null,
        longitude: input.longitude || null,
        farmAddress: input.farmAddress || null,
        status: 'PUBLISHED',
      },
      include: {
        farmer: {
          select: {
            id: true,
            name: true,
            mobile: true,
            mobileVerified: true,
            profileVerified: true,
          },
        },
      },
    });
  },

  async findNearbyLots(originLat: number, originLng: number, radiusKm: number = 50, cropFilter?: string) {
    const allLots = await db.lot.findMany({
      where: {
        status: { in: ['PUBLISHED', 'BOOKING_THRESHOLD_REACHED', 'FARMER_CONFIRMED', 'UNDER_OFFER'] },
        ...(cropFilter && cropFilter !== 'ALL' ? { cropName: cropFilter } : {}),
      },
      include: {
        farmer: {
          select: {
            id: true,
            name: true,
            mobileVerified: true,
            profileVerified: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const nearby: LotItem[] = [];

    for (const lot of allLots) {
      let distanceKm: number | null = null;
      if (lot.latitude && lot.longitude) {
        distanceKm = calculateHaversineDistance(originLat, originLng, lot.latitude, lot.longitude);
      }

      if (distanceKm === null || distanceKm <= radiusKm) {
        nearby.push({
          id: lot.id,
          farmerId: lot.farmerId,
          farmerName: lot.farmer.name,
          cropName: lot.cropName,
          variety: lot.variety,
          quantityAvailable: lot.quantityAvailable,
          unit: lot.unit,
          askPricePerUnit: lot.askPricePerUnit,
          expectedHarvestDate: lot.expectedHarvestDate.toISOString(),
          alreadyHarvested: lot.alreadyHarvested,
          grade: lot.grade,
          sizeMm: lot.sizeMm,
          maturityColour: lot.maturityColour,
          moisturePct: lot.moisturePct,
          damagePct: lot.damagePct,
          freshness: lot.freshness,
          packagingType: lot.packagingType,
          photoUrls: lot.photoUrls ? JSON.parse(lot.photoUrls) : null,
          publicVillage: lot.publicVillage,
          publicTaluka: lot.publicTaluka,
          publicDistrict: lot.publicDistrict,
          latitude: null,
          longitude: null,
          farmAddress: null,
          distanceKm: distanceKm ?? 12.5,
          status: lot.status as LotStatus,
          createdAt: lot.createdAt.toISOString(),
          updatedAt: lot.updatedAt.toISOString(),
        });
      }
    }

    return nearby.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
  },

  async searchMarketplaceLots(filters: MarketplaceFilterOptions) {
    const originLat = filters.originLat ?? 18.5204;
    const originLng = filters.originLng ?? 73.8567;
    const radiusKm = filters.radiusKm ?? 100;

    const whereClause: any = {
      status: { in: ['PUBLISHED', 'BOOKING_THRESHOLD_REACHED', 'FARMER_CONFIRMED', 'UNDER_OFFER'] },
    };

    if (filters.cropName && filters.cropName !== 'ALL') {
      whereClause.cropName = filters.cropName;
    }
    if (filters.variety) {
      whereClause.variety = { contains: filters.variety };
    }
    if (filters.grade && filters.grade !== 'ALL') {
      whereClause.grade = filters.grade;
    }
    if (filters.packagingType && filters.packagingType !== 'ALL') {
      whereClause.packagingType = filters.packagingType;
    }
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      whereClause.askPricePerUnit = {};
      if (filters.minPrice !== undefined) whereClause.askPricePerUnit.gte = filters.minPrice;
      if (filters.maxPrice !== undefined) whereClause.askPricePerUnit.lte = filters.maxPrice;
    }
    if (filters.alreadyHarvested !== undefined) {
      whereClause.alreadyHarvested = filters.alreadyHarvested;
    }
    if (filters.searchText && filters.searchText.trim() !== '') {
      const q = filters.searchText.trim();
      whereClause.OR = [
        { cropName: { contains: q } },
        { variety: { contains: q } },
        { publicVillage: { contains: q } },
        { publicDistrict: { contains: q } },
        { publicTaluka: { contains: q } },
      ];
    }

    const rawLots = await db.lot.findMany({
      where: whereClause,
      include: {
        farmer: {
          select: {
            id: true,
            name: true,
            mobileVerified: true,
            profileVerified: true,
          },
        },
      },
    });

    const results: LotItem[] = [];

    for (const lot of rawLots) {
      let distanceKm: number | null = null;
      if (lot.latitude && lot.longitude) {
        distanceKm = calculateHaversineDistance(originLat, originLng, lot.latitude, lot.longitude);
      }

      if (filters.radiusKm && distanceKm !== null && distanceKm > radiusKm) {
        continue; // Exclude outside search radius
      }

      results.push({
        id: lot.id,
        farmerId: lot.farmerId,
        farmerName: lot.farmer.name,
        cropName: lot.cropName,
        variety: lot.variety,
        quantityAvailable: lot.quantityAvailable,
        unit: lot.unit,
        askPricePerUnit: lot.askPricePerUnit,
        expectedHarvestDate: lot.expectedHarvestDate.toISOString(),
        alreadyHarvested: lot.alreadyHarvested,
        grade: lot.grade,
        sizeMm: lot.sizeMm,
        maturityColour: lot.maturityColour,
        moisturePct: lot.moisturePct,
        damagePct: lot.damagePct,
        freshness: lot.freshness,
        packagingType: lot.packagingType,
        photoUrls: lot.photoUrls ? JSON.parse(lot.photoUrls) : null,
        publicVillage: lot.publicVillage,
        publicTaluka: lot.publicTaluka,
        publicDistrict: lot.publicDistrict,
        latitude: null, // Protected location privacy
        longitude: null,
        farmAddress: null,
        distanceKm: distanceKm ?? 15,
        status: lot.status as LotStatus,
        createdAt: lot.createdAt.toISOString(),
        updatedAt: lot.updatedAt.toISOString(),
      });
    }

    // Apply Sorting
    const sortBy = filters.sortBy || 'distance';
    results.sort((a, b) => {
      if (sortBy === 'distance') return (a.distanceKm || 0) - (b.distanceKm || 0);
      if (sortBy === 'price_asc') return a.askPricePerUnit - b.askPricePerUnit;
      if (sortBy === 'price_desc') return b.askPricePerUnit - a.askPricePerUnit;
      if (sortBy === 'quantity') return b.quantityAvailable - a.quantityAvailable;
      if (sortBy === 'harvest_date') return new Date(a.expectedHarvestDate).getTime() - new Date(b.expectedHarvestDate).getTime();
      if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return 0;
    });

    return results;
  },

  async findLotById(id: string, requestingUserId?: string) {
    const lot = await db.lot.findUnique({
      where: { id },
      include: {
        farmer: {
          select: {
            id: true,
            name: true,
            mobile: true,
            mobileVerified: true,
            profileVerified: true,
          },
        },
        prebookings: true,
        bids: true,
        cameraLogs: true,
      },
    });

    if (!lot) return null;

    const isOwner = requestingUserId === lot.farmerId;
    const isAuthorizedBuyer = lot.prebookings.some(b => b.buyerId === requestingUserId) || lot.bids.some(b => b.bidderId === requestingUserId && b.status === 'ACCEPTED');

    return {
      ...lot,
      photoUrls: lot.photoUrls ? JSON.parse(lot.photoUrls) : null,
      latitude: (isOwner || isAuthorizedBuyer) ? lot.latitude : null,
      longitude: (isOwner || isAuthorizedBuyer) ? lot.longitude : null,
      farmAddress: (isOwner || isAuthorizedBuyer) ? lot.farmAddress : null,
    };
  },

  async findFarmerLots(farmerId: string, statusFilter?: string) {
    const whereClause: any = { farmerId };
    if (statusFilter && statusFilter !== 'ALL') {
      if (statusFilter === 'SOLD_COMPLETED') {
        whereClause.status = { in: ['SOLD', 'COMPLETED'] };
      } else {
        whereClause.status = statusFilter;
      }
    }

    const lots = await db.lot.findMany({
      where: whereClause,
      include: {
        prebookings: true,
        bids: true,
        cameraLogs: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    return lots.map((lot) => ({
      ...lot,
      photoUrls: lot.photoUrls ? JSON.parse(lot.photoUrls) : null,
      prebookingsCount: lot.prebookings.length,
      bidsCount: lot.bids.length,
    }));
  },

  async updateLot(id: string, farmerId: string, input: UpdateLotInput) {
    const existing = await db.lot.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('Lot not found');
    }

    // Ownership Authorization Check
    if (existing.farmerId !== farmerId) {
      throw new Error('Forbidden: You can only edit your own produce listings.');
    }

    // Terminal state protection
    if (['COMPLETED', 'CANCELLED', 'SOLD'].includes(existing.status)) {
      throw new Error(`Cannot update lot in terminal status: ${existing.status}`);
    }

    return db.lot.update({
      where: { id },
      data: {
        ...(input.cropName ? { cropName: input.cropName } : {}),
        ...(input.variety !== undefined ? { variety: input.variety } : {}),
        ...(input.quantityAvailable !== undefined ? { quantityAvailable: input.quantityAvailable } : {}),
        ...(input.unit ? { unit: input.unit } : {}),
        ...(input.askPricePerUnit !== undefined ? { askPricePerUnit: input.askPricePerUnit } : {}),
        ...(input.expectedHarvestDate ? { expectedHarvestDate: new Date(input.expectedHarvestDate) } : {}),
        ...(input.alreadyHarvested !== undefined ? { alreadyHarvested: input.alreadyHarvested } : {}),
        ...(input.grade !== undefined ? { grade: input.grade } : {}),
        ...(input.sizeMm !== undefined ? { sizeMm: input.sizeMm } : {}),
        ...(input.maturityColour !== undefined ? { maturityColour: input.maturityColour } : {}),
        ...(input.moisturePct !== undefined ? { moisturePct: input.moisturePct } : {}),
        ...(input.damagePct !== undefined ? { damagePct: input.damagePct } : {}),
        ...(input.freshness !== undefined ? { freshness: input.freshness } : {}),
        ...(input.packagingType !== undefined ? { packagingType: input.packagingType } : {}),
        ...(input.photoUrls ? { photoUrls: JSON.stringify(input.photoUrls) } : {}),
        ...(input.publicVillage ? { publicVillage: input.publicVillage } : {}),
        ...(input.publicTaluka ? { publicTaluka: input.publicTaluka } : {}),
        ...(input.publicDistrict ? { publicDistrict: input.publicDistrict } : {}),
        ...(input.latitude !== undefined ? { latitude: input.latitude } : {}),
        ...(input.longitude !== undefined ? { longitude: input.longitude } : {}),
        ...(input.farmAddress !== undefined ? { farmAddress: input.farmAddress } : {}),
      },
    });
  },

  async transitionStatus(id: string, farmerId: string, targetStatus: ExtendedLotStatus) {
    const lot = await db.lot.findUnique({
      where: { id },
      include: {
        bids: true,
        prebookings: true,
      },
    });

    if (!lot) {
      throw new Error('Lot not found');
    }

    // Ownership Authorization Check
    if (lot.farmerId !== farmerId) {
      throw new Error('Forbidden: You do not have permission to change this listing status.');
    }

    // Mandatory Correction #1: LOT STATE INTEGRITY CHECK
    // Inspect active Phase 2 commitments before allowing terminal / disruptive transitions
    const hasAcceptedBid = lot.bids.some((b) => b.status === 'ACCEPTED');
    const hasConfirmedPrebooking = lot.prebookings.some(
      (p) => p.status === 'CONFIRMED' || p.status === 'FULFILLED'
    );

    if (['PAUSED', 'CANCELLED', 'SOLD'].includes(targetStatus)) {
      if (hasAcceptedBid || hasConfirmedPrebooking) {
        throw new Error(
          `Cannot transition listing to ${targetStatus}: Active confirmed prebookings or accepted bids exist on this lot. Please fulfill existing commitments first.`
        );
      }
    }

    // State Machine Business Rules Validation
    const currentStatus = lot.status as ExtendedLotStatus;

    if (currentStatus === 'DRAFT' && targetStatus !== 'PUBLISHED' && targetStatus !== 'CANCELLED') {
      throw new Error('Draft listings can only be published or cancelled.');
    }

    if (['COMPLETED', 'CANCELLED'].includes(currentStatus)) {
      throw new Error(`Terminal state '${currentStatus}' cannot be altered.`);
    }

    return db.lot.update({
      where: { id },
      data: { status: targetStatus },
    });
  },

  async updateStatus(id: string, status: LotStatus) {
    return db.lot.update({
      where: { id },
      data: { status },
    });
  },
};
