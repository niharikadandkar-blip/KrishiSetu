import { db } from '@/lib/db';
import {
  CancelStorageInput,
  CapacityCheckResult,
  CreateStorageRequestInput,
  StorageStatus,
  TransitionStorageStatusInput,
} from '@/lib/types/phase6';
import { Decimal } from '@prisma/client/runtime/library';

// Capacity Consuming & Non-Consuming State Arrays (Approved Domain Contract)
export const ACTIVE_CAPACITY_STATES: StorageStatus[] = [
  'ACCEPTED',
  'RESERVED',
  'CHECK_IN_PENDING',
  'STORED',
  'RELEASE_REQUESTED',
];

export const FREE_CAPACITY_STATES: StorageStatus[] = [
  'REQUESTED',
  'RELEASED',
  'COMPLETED',
  'CANCELLED',
];

// Helper: Normalize unit quantities (1 Tonne = 10 Quintals = 1000 kg)
export function normalizeCapacityQuantity(quantity: number, requestUnit: string, facilityUnit: string): number {
  const reqU = requestUnit.trim().toLowerCase();
  const facU = facilityUnit.trim().toLowerCase();

  if (reqU === facU) return quantity;

  // Convert request quantity to kg first
  let inKg = quantity;
  if (reqU === 'tonne' || reqU === 'tonnes' || reqU === 'ton') {
    inKg = quantity * 1000;
  } else if (reqU === 'quintal' || reqU === 'quintals') {
    inKg = quantity * 100;
  } else if (reqU === 'kg' || reqU === 'kgs') {
    inKg = quantity;
  } else {
    throw new Error(`UNIT_MISMATCH: Unsupported request capacity unit '${requestUnit}'. Supported units: Quintal, Tonne, kg.`);
  }

  // Convert kg to facility target unit
  if (facU === 'tonne' || facU === 'tonnes' || facU === 'ton') {
    return inKg / 1000;
  } else if (facU === 'quintal' || facU === 'quintals') {
    return inKg / 100;
  } else if (facU === 'kg' || facU === 'kgs') {
    return inKg;
  } else {
    throw new Error(`UNIT_MISMATCH: Unsupported facility capacity unit '${facilityUnit}'. Supported units: Quintal, Tonne, kg.`);
  }
}

export const storageRepository = {
  async discoverStorageFacilities(district?: string, facilityType?: string) {
    const whereClause: any = { isAvailable: true };
    if (facilityType) whereClause.facilityType = facilityType;
    if (district) whereClause.district = district;

    const facilities = await db.storageFacility.findMany({
      where: whereClause,
      include: {
        provider: {
          select: {
            id: true,
            businessName: true,
            contactName: true,
            state: true,
            district: true,
            taluka: true,
            village: true,
            verificationStatus: true,
          },
        },
        requests: {
          where: { status: { in: ACTIVE_CAPACITY_STATES } },
          select: { normalizedQuantity: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return facilities.map((f) => {
      const activeReservedQuantity = f.requests.reduce((sum, r) => sum + r.normalizedQuantity, 0);
      const availableCapacity = Math.max(0, f.totalCapacity - activeReservedQuantity);

      return {
        id: f.id,
        facilityName: f.facilityName,
        facilityType: f.facilityType,
        totalCapacity: f.totalCapacity,
        availableCapacity,
        activeReservedQuantity,
        capacityUnit: f.capacityUnit,
        supportedCrops: f.supportedCrops,
        pricePerUnitPerDay: Number(f.pricePerUnitPerDay),
        state: f.state,
        district: f.district,
        taluka: f.taluka,
        village: f.village,
        isAvailable: f.isAvailable,
        updatedAt: f.updatedAt,
        provider: f.provider,
      };
    });
  },

  async checkFacilityCapacity(facilityId: string, requestedQuantity: number, requestUnit: string): Promise<CapacityCheckResult> {
    const facility = await db.storageFacility.findUnique({
      where: { id: facilityId },
      include: {
        requests: {
          where: { status: { in: ACTIVE_CAPACITY_STATES } },
          select: { normalizedQuantity: true },
        },
      },
    });

    if (!facility) {
      throw new Error('FACILITY_NOT_FOUND: Storage facility not found');
    }

    const normalizedQuantity = normalizeCapacityQuantity(requestedQuantity, requestUnit, facility.capacityUnit);
    const activeReservedQuantity = facility.requests.reduce((sum, r) => sum + r.normalizedQuantity, 0);
    const availableCapacity = Math.max(0, facility.totalCapacity - activeReservedQuantity);
    const isFeasible = availableCapacity >= normalizedQuantity;

    return {
      facilityId,
      totalCapacity: facility.totalCapacity,
      activeReservedQuantity,
      availableCapacity,
      capacityUnit: facility.capacityUnit,
      requestedQuantity,
      normalizedQuantity,
      isFeasible,
    };
  },

  async createStorageRequest(input: CreateStorageRequestInput) {
    // 1. Idempotency Check
    if (input.idempotencyKey) {
      const existing = await db.storageRequest.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        include: { timelineEvents: { orderBy: { createdAt: 'asc' } } },
      });
      if (existing) return existing;
    }

    // 2. Atomic Database Transaction + Row Locking Strategy
    return db.$transaction(async (tx) => {
      // Fetch StorageFacility details inside transaction
      const facility = await tx.storageFacility.findUnique({
        where: { id: input.facilityId },
        select: {
          id: true,
          totalCapacity: true,
          capacityUnit: true,
          pricePerUnitPerDay: true,
        },
      });

      if (!facility) {
        throw new Error('FACILITY_NOT_FOUND: Target storage facility record not found');
      }
      const requestUnit = input.unit || 'Quintal';

      // 3. Normalize Quantity
      const normalizedQuantity = normalizeCapacityQuantity(input.quantity, requestUnit, facility.capacityUnit);

      // 4. Calculate Active Reserved Capacity Inside Lock
      const activeRequests = await tx.storageRequest.findMany({
        where: {
          facilityId: facility.id,
          status: { in: ACTIVE_CAPACITY_STATES },
        },
        select: { normalizedQuantity: true },
      });

      const activeReservedQuantity = activeRequests.reduce((sum, r) => sum + r.normalizedQuantity, 0);
      const availableCapacity = facility.totalCapacity - activeReservedQuantity;

      // 5. Overbooking Concurrency Protection Gate
      if (normalizedQuantity > availableCapacity) {
        throw new Error(
          `CAPACITY_OVERBOOKED: Requested capacity (${input.quantity} ${requestUnit} = ${normalizedQuantity} ${facility.capacityUnit}) exceeds current available facility capacity (${availableCapacity} ${facility.capacityUnit}).`
        );
      }

      // Calculate Agreed Storage Cost
      const pricePerUnit = Number(facility.pricePerUnitPerDay);
      const agreedStorageCost = input.agreedStorageCost ?? Math.round(normalizedQuantity * pricePerUnit * input.durationDays * 100) / 100;

      // 6. Create Storage Request
      const request = await tx.storageRequest.create({
        data: {
          facilityId: facility.id,
          orderId: input.orderId || null,
          lotId: input.lotId || null,
          requesterId: input.userId,
          cropName: input.cropName,
          quantity: input.quantity,
          unit: requestUnit,
          normalizedQuantity,
          expectedCheckInDate: new Date(input.expectedCheckInDate),
          durationDays: input.durationDays,
          agreedStorageCost: new Decimal(agreedStorageCost),
          paymentStatus: 'PAYMENT_NOT_INTEGRATED',
          status: 'REQUESTED',
          idempotencyKey: input.idempotencyKey || null,

          timelineEvents: {
            create: {
              status: 'REQUESTED',
              actorId: input.userId,
              actorRole: 'REQUESTER',
              actorName: 'Requester',
              notes: `Storage reservation requested (${input.quantity} ${requestUnit}).`,
            },
          },
        },
        include: { timelineEvents: { orderBy: { createdAt: 'asc' } } },
      });

      return request;
    });
  },

  async transitionStorageStatus(input: TransitionStorageStatusInput) {
    return db.$transaction(async (tx) => {
      const request = await tx.storageRequest.findUnique({
        where: { id: input.requestId },
        include: {
          facility: {
            select: { id: true, providerId: true, totalCapacity: true, capacityUnit: true, provider: { select: { userId: true, contactName: true } } },
          },
          order: { select: { farmerId: true, buyerId: true } },
        },
      });

      if (!request) {
        throw new Error('STORAGE_NOT_FOUND: Target storage request record not found');
      }

      const currentStatus = request.status as StorageStatus;
      const targetStatus = input.targetStatus;

      // Terminal State Protection
      if (['COMPLETED', 'CANCELLED'].includes(currentStatus)) {
        throw new Error(`INVALID_STATE_TRANSITION: Cannot modify storage reservation in terminal state '${currentStatus}'.`);
      }

      // Authorization Guard
      const isRequester = request.requesterId === input.userId;
      const isProvider = request.facility.provider.userId === input.userId;
      const isOrderFarmer = request.order?.farmerId === input.userId;
      const isOrderBuyer = request.order?.buyerId === input.userId;

      if (!isRequester && !isProvider && !isOrderFarmer && !isOrderBuyer) {
        throw new Error('UNAUTHORIZED_PARTICIPANT: You are not authorized to update this storage reservation.');
      }

      // State Machine Lifecycle Transitions
      const validTransitions: Record<StorageStatus, StorageStatus[]> = {
        REQUESTED: ['ACCEPTED', 'CANCELLED'],
        ACCEPTED: ['RESERVED', 'CANCELLED'],
        RESERVED: ['CHECK_IN_PENDING', 'CANCELLED'],
        CHECK_IN_PENDING: ['STORED', 'CANCELLED'],
        STORED: ['RELEASE_REQUESTED'],
        RELEASE_REQUESTED: ['RELEASED'],
        RELEASED: ['COMPLETED'],
        COMPLETED: [],
        CANCELLED: [],
      };

      const allowedNext = validTransitions[currentStatus] || [];
      if (!allowedNext.includes(targetStatus)) {
        throw new Error(
          `INVALID_STATE_TRANSITION: Cannot transition storage reservation from '${currentStatus}' to '${targetStatus}'. Allowed next states: [${allowedNext.join(', ')}].`
        );
      }

      // If transitioning to an active capacity state (e.g., ACCEPTED/RESERVED), verify capacity lock
      if (ACTIVE_CAPACITY_STATES.includes(targetStatus) && !ACTIVE_CAPACITY_STATES.includes(currentStatus)) {
        const activeRequests = await tx.storageRequest.findMany({
          where: {
            facilityId: request.facilityId,
            status: { in: ACTIVE_CAPACITY_STATES },
            id: { not: request.id },
          },
          select: { normalizedQuantity: true },
        });

        const activeReservedQuantity = activeRequests.reduce((sum, r) => sum + r.normalizedQuantity, 0);
        const availableCapacity = request.facility.totalCapacity - activeReservedQuantity;

        if (request.normalizedQuantity > availableCapacity) {
          throw new Error(
            `CAPACITY_OVERBOOKED: Cannot accept reservation. Facility available capacity (${availableCapacity} ${request.facility.capacityUnit}) is insufficient for requested quantity (${request.normalizedQuantity} ${request.facility.capacityUnit}).`
          );
        }
      }

      const updatedRequest = await tx.storageRequest.update({
        where: { id: input.requestId },
        data: {
          status: targetStatus,
          timelineEvents: {
            create: {
              status: targetStatus,
              actorId: input.userId,
              actorRole: isProvider ? 'PROVIDER' : 'PARTICIPANT',
              actorName: isProvider ? request.facility.provider.contactName || 'Provider' : 'Participant',
              notes: input.notes || `Storage status updated to ${targetStatus}.`,
            },
          },
        },
        include: { timelineEvents: { orderBy: { createdAt: 'asc' } } },
      });

      return updatedRequest;
    });
  },

  async cancelStorageRequest(input: CancelStorageInput) {
    return db.$transaction(async (tx) => {
      const request = await tx.storageRequest.findUnique({
        where: { id: input.requestId },
        include: {
          facility: { select: { provider: { select: { userId: true } } } },
          order: { select: { farmerId: true, buyerId: true } },
        },
      });

      if (!request) {
        throw new Error('STORAGE_NOT_FOUND: Target storage request record not found');
      }

      const isRequester = request.requesterId === input.userId;
      const isProvider = request.facility.provider.userId === input.userId;
      const isOrderFarmer = request.order?.farmerId === input.userId;
      const isOrderBuyer = request.order?.buyerId === input.userId;

      if (!isRequester && !isProvider && !isOrderFarmer && !isOrderBuyer) {
        throw new Error('UNAUTHORIZED_PARTICIPANT: You are not authorized to cancel this storage reservation.');
      }

      const currentStatus = request.status as StorageStatus;
      const eligibleForCancel: StorageStatus[] = ['REQUESTED', 'ACCEPTED', 'RESERVED', 'CHECK_IN_PENDING'];

      if (!eligibleForCancel.includes(currentStatus)) {
        throw new Error(
          `INVALID_STATE_TRANSITION: Cannot cancel storage reservation in '${currentStatus}' state. Cancellation is only permitted prior to check-in.`
        );
      }

      return tx.storageRequest.update({
        where: { id: input.requestId },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelledBy: input.userId,
          cancellationReason: input.cancellationReason || 'Storage reservation cancelled by participant.',
          timelineEvents: {
            create: {
              status: 'CANCELLED',
              actorId: input.userId,
              actorRole: 'PARTICIPANT',
              actorName: 'Participant',
              notes: input.cancellationReason || 'Storage reservation cancelled.',
            },
          },
        },
        include: { timelineEvents: { orderBy: { createdAt: 'asc' } } },
      });
    });
  },

  async findStorageById(requestId: string, requestingUserId?: string) {
    const request = await db.storageRequest.findUnique({
      where: { id: requestId },
      include: {
        facility: {
          include: {
            provider: {
              select: {
                id: true,
                businessName: true,
                contactName: true,
                contactMobile: true,
                state: true,
                district: true,
                taluka: true,
                village: true,
                verificationStatus: true,
                userId: true,
              },
            },
          },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            farmerId: true,
            buyerId: true,
            farmerName: true,
            buyerName: true,
          },
        },
        timelineEvents: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!request) return null;

    // 3-Tier Privacy Masking Check
    const isRequester = requestingUserId === request.requesterId;
    const isProvider = request.facility.provider.userId === requestingUserId;
    const isOrderFarmer = request.order?.farmerId === requestingUserId;
    const isOrderBuyer = request.order?.buyerId === requestingUserId;

    const isAuthorizedParticipant = isRequester || isProvider || isOrderFarmer || isOrderBuyer;

    if (!isAuthorizedParticipant) {
      return {
        ...request,
        agreedStorageCost: Number(request.agreedStorageCost),
        facility: {
          ...request.facility,
          pricePerUnitPerDay: Number(request.facility.pricePerUnitPerDay),
          provider: {
            ...request.facility.provider,
            contactMobile: '[Protected Mobile]',
          },
        },
      };
    }

    return {
      ...request,
      agreedStorageCost: Number(request.agreedStorageCost),
      facility: {
        ...request.facility,
        pricePerUnitPerDay: Number(request.facility.pricePerUnitPerDay),
      },
    };
  },

  async findRequestsByUser(userId: string) {
    return db.storageRequest.findMany({
      where: {
        OR: [
          { requesterId: userId },
          { facility: { provider: { userId } } },
          { order: { farmerId: userId } },
          { order: { buyerId: userId } },
        ],
      },
      include: {
        facility: { select: { facilityName: true, facilityType: true, district: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async getStorageFacilitiesForMap(filters: {
    district?: string;
    facilityType?: string;
    crop?: string;
    minCapacity?: number;
    userLocation?: { latitude: number; longitude: number };
    limit?: number;
  }) {
    const { getMapProvider } = await import('@/lib/services/map/mapProviderFactory');
    const { LocationPrivacyService } = await import('@/lib/services/locationPrivacyService');
    const { GeoService } = await import('@/lib/services/geoService');

    const mapProvider = getMapProvider();

    const whereClause: any = { isAvailable: true };
    if (filters.district) whereClause.district = { contains: filters.district };
    if (filters.facilityType) whereClause.facilityType = filters.facilityType;

    const facilities = await db.storageFacility.findMany({
      where: whereClause,
      include: {
        requests: {
          where: { status: { in: ACTIVE_CAPACITY_STATES } },
          select: { normalizedQuantity: true },
        },
      },
      take: filters.limit || 50,
      orderBy: { createdAt: 'desc' },
    });

    const items = await Promise.all(
      facilities.map(async (f) => {
        const activeReservedQuantity = f.requests.reduce((sum, r) => sum + r.normalizedQuantity, 0);
        const availableCapacity = Math.max(0, f.totalCapacity - activeReservedQuantity);

        if (filters.minCapacity && availableCapacity < filters.minCapacity) {
          return null;
        }

        if (filters.crop && f.supportedCrops) {
          const crops = f.supportedCrops.toLowerCase();
          if (!crops.includes(filters.crop.toLowerCase())) {
            return null;
          }
        }

        // Location determination
        let baseLocation = f.latitude && f.longitude ? { latitude: f.latitude, longitude: f.longitude } : null;
        if (!baseLocation) {
          baseLocation = await mapProvider.geocode(f.district);
        }

        const discoveryLocation = baseLocation
          ? LocationPrivacyService.getDeterministicDiscoveryLocation(f.id, baseLocation)
          : undefined;

        let distanceResult = undefined;
        if (filters.userLocation && discoveryLocation) {
          const distKm = GeoService.calculateGeodesicDistance(filters.userLocation, discoveryLocation);
          distanceResult = GeoService.formatDistanceResult(distKm, 'GEODESIC');
        }

        return {
          id: f.id,
          facilityName: f.facilityName,
          facilityType: f.facilityType,
          totalCapacity: f.totalCapacity,
          availableCapacity,
          capacityUnit: f.capacityUnit,
          supportedCrops: f.supportedCrops ? f.supportedCrops.split(',').map((c) => c.trim()) : [],
          pricePerUnitPerDay: Number(f.pricePerUnitPerDay),
          state: f.state,
          district: f.district,
          taluka: f.taluka || undefined,
          village: f.village || undefined,
          discoveryLocation,
          distance: distanceResult,
          lastUpdated: f.updatedAt.toISOString(),
        };
      })
    );

    return items.filter((item) => item !== null);
  },
};
