import { db } from '@/lib/db';
import {
  CancelTransportInput,
  CreateTransportRequestInput,
  TransitionTransportStatusInput,
  TransportStatus,
} from '@/lib/types/phase6';
import { Decimal } from '@prisma/client/runtime/library';

export const transportRepository = {
  async discoverTransportProviders(district?: string, vehicleType?: string) {
    const whereClause: any = { isAvailable: true };
    if (vehicleType) whereClause.vehicleType = vehicleType;
    if (district) whereClause.serviceAreaDistricts = { contains: district };

    const vehicles = await db.transportVehicle.findMany({
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
      },
      orderBy: { createdAt: 'desc' },
    });

    // Mask exact contact mobile for public discovery tier
    return vehicles.map((v) => ({
      ...v,
      ratePerKm: v.ratePerKm ? Number(v.ratePerKm) : null,
      ratePerTrip: v.ratePerTrip ? Number(v.ratePerTrip) : null,
    }));
  },

  async createTransportRequest(input: CreateTransportRequestInput) {
    // 1. Idempotency Guard
    if (input.idempotencyKey) {
      const existing = await db.transportRequest.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        include: { timelineEvents: { orderBy: { createdAt: 'asc' } } },
      });
      if (existing) return existing;
    }

    // 2. One Active Transport Assignment per Order Invariant
    if (input.orderId) {
      const activeOrderTransport = await db.transportRequest.findFirst({
        where: {
          orderId: input.orderId,
          status: { notIn: ['CANCELLED'] },
        },
      });

      if (activeOrderTransport) {
        throw new Error(
          `ACTIVE_TRANSPORT_EXISTS: An active transport assignment (${activeOrderTransport.status}) already exists for Order #${input.orderId}. Please cancel existing transport before creating a new arrangement.`
        );
      }
    }

    const arrangementType = input.arrangementType || 'KRISHISETU_PROVIDER';
    const initialStatus: TransportStatus = arrangementType === 'KRISHISETU_PROVIDER' ? 'REQUESTED' : 'ASSIGNED';

    return db.$transaction(async (tx) => {
      const request = await tx.transportRequest.create({
        data: {
          orderId: input.orderId || null,
          arrangementType,
          requesterId: input.userId,
          providerId: input.providerId || null,
          vehicleId: input.vehicleId || null,
          driverName: input.driverName || null,
          driverMobile: input.driverMobile || null,

          pickupVillage: input.pickupVillage,
          pickupTaluka: input.pickupTaluka,
          pickupDistrict: input.pickupDistrict,
          pickupAddress: input.pickupAddress || null,

          deliveryVillage: input.deliveryVillage,
          deliveryTaluka: input.deliveryTaluka,
          deliveryDistrict: input.deliveryDistrict,
          deliveryAddress: input.deliveryAddress || null,

          cropCategory: input.cropCategory,
          quantity: input.quantity,
          unit: input.unit || 'Quintal',
          scheduledPickupDate: new Date(input.scheduledPickupDate),
          estimatedDistanceKm: input.estimatedDistanceKm || null,
          pricingType: input.pricingType || 'NEGOTIABLE',
          agreedTransportCost: input.agreedTransportCost ? new Decimal(input.agreedTransportCost) : null,
          paymentResponsibility: input.paymentResponsibility || 'NOT_SPECIFIED',
          paymentStatus: 'PAYMENT_NOT_INTEGRATED',

          status: initialStatus,
          idempotencyKey: input.idempotencyKey || null,

          timelineEvents: {
            create: {
              status: initialStatus,
              actorId: input.userId,
              actorRole: 'REQUESTER',
              actorName: 'Participant',
              notes: `Transport request created (${arrangementType}).`,
            },
          },
        },
        include: { timelineEvents: { orderBy: { createdAt: 'asc' } } },
      });

      return request;
    });
  },

  async transitionTransportStatus(input: TransitionTransportStatusInput) {
    return db.$transaction(async (tx) => {
      const request = await tx.transportRequest.findUnique({
        where: { id: input.requestId },
        include: {
          provider: { select: { userId: true, contactName: true } },
          order: { select: { farmerId: true, buyerId: true } },
        },
      });

      if (!request) {
        throw new Error('TRANSPORT_NOT_FOUND: Target transport request record not found');
      }

      const currentStatus = request.status as TransportStatus;
      const targetStatus = input.targetStatus;

      // Terminal State Protection
      if (['COMPLETED', 'CANCELLED'].includes(currentStatus)) {
        throw new Error(`INVALID_STATE_TRANSITION: Cannot modify transport request in terminal state '${currentStatus}'.`);
      }

      // Authorization Guard
      const isRequester = request.requesterId === input.userId;
      const isProvider = request.provider?.userId === input.userId;
      const isOrderFarmer = request.order?.farmerId === input.userId;
      const isOrderBuyer = request.order?.buyerId === input.userId;

      if (!isRequester && !isProvider && !isOrderFarmer && !isOrderBuyer) {
        throw new Error('UNAUTHORIZED_PARTICIPANT: You are not authorized to update this transport request.');
      }

      // State Machine Lifecycle Transitions
      const validTransitions: Record<TransportStatus, TransportStatus[]> = {
        REQUESTED: ['ACCEPTED', 'CANCELLED'],
        ACCEPTED: ['ASSIGNED', 'CANCELLED'],
        ASSIGNED: ['PICKUP_PLANNED', 'CANCELLED'],
        PICKUP_PLANNED: ['READY_FOR_PICKUP', 'CANCELLED'],
        READY_FOR_PICKUP: ['PICKED_UP', 'CANCELLED'],
        PICKED_UP: ['IN_TRANSIT'],
        IN_TRANSIT: ['DELIVERED'],
        DELIVERED: ['COMPLETED'],
        COMPLETED: [],
        CANCELLED: [],
      };

      const allowedNext = validTransitions[currentStatus] || [];
      if (!allowedNext.includes(targetStatus)) {
        throw new Error(
          `INVALID_STATE_TRANSITION: Cannot transition transport request from '${currentStatus}' to '${targetStatus}'. Allowed next states: [${allowedNext.join(', ')}].`
        );
      }

      const updatedRequest = await tx.transportRequest.update({
        where: { id: input.requestId },
        data: {
          status: targetStatus,
          ...(input.driverName ? { driverName: input.driverName } : {}),
          ...(input.driverMobile ? { driverMobile: input.driverMobile } : {}),
          timelineEvents: {
            create: {
              status: targetStatus,
              actorId: input.userId,
              actorRole: isProvider ? 'PROVIDER' : 'PARTICIPANT',
              actorName: isProvider ? request.provider?.contactName || 'Provider' : 'Participant',
              notes: input.notes || `Transport status updated to ${targetStatus}.`,
            },
          },
        },
        include: { timelineEvents: { orderBy: { createdAt: 'asc' } } },
      });

      return updatedRequest;
    });
  },

  async cancelTransportRequest(input: CancelTransportInput) {
    return db.$transaction(async (tx) => {
      const request = await tx.transportRequest.findUnique({
        where: { id: input.requestId },
        include: {
          provider: { select: { userId: true } },
          order: { select: { farmerId: true, buyerId: true } },
        },
      });

      if (!request) {
        throw new Error('TRANSPORT_NOT_FOUND: Target transport request record not found');
      }

      const isRequester = request.requesterId === input.userId;
      const isProvider = request.provider?.userId === input.userId;
      const isOrderFarmer = request.order?.farmerId === input.userId;
      const isOrderBuyer = request.order?.buyerId === input.userId;

      if (!isRequester && !isProvider && !isOrderFarmer && !isOrderBuyer) {
        throw new Error('UNAUTHORIZED_PARTICIPANT: You are not authorized to cancel this transport request.');
      }

      const currentStatus = request.status as TransportStatus;
      const eligibleForCancel: TransportStatus[] = ['REQUESTED', 'ACCEPTED', 'ASSIGNED', 'PICKUP_PLANNED', 'READY_FOR_PICKUP'];

      if (!eligibleForCancel.includes(currentStatus)) {
        throw new Error(
          `INVALID_STATE_TRANSITION: Cannot cancel transport request in '${currentStatus}' state. Cancellation is only permitted prior to transit dispatch.`
        );
      }

      return tx.transportRequest.update({
        where: { id: input.requestId },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelledBy: input.userId,
          cancellationReason: input.cancellationReason || 'Transport request cancelled by participant.',
          timelineEvents: {
            create: {
              status: 'CANCELLED',
              actorId: input.userId,
              actorRole: 'PARTICIPANT',
              actorName: 'Participant',
              notes: input.cancellationReason || 'Transport request cancelled.',
            },
          },
        },
        include: { timelineEvents: { orderBy: { createdAt: 'asc' } } },
      });
    });
  },

  async findTransportById(requestId: string, requestingUserId?: string) {
    const request = await db.transportRequest.findUnique({
      where: { id: requestId },
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
        vehicle: true,
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
    const isProvider = request.provider?.userId === requestingUserId;
    const isOrderFarmer = request.order?.farmerId === requestingUserId;
    const isOrderBuyer = request.order?.buyerId === requestingUserId;

    const isAuthorizedParticipant = isRequester || isProvider || isOrderFarmer || isOrderBuyer;

    if (!isAuthorizedParticipant) {
      // Return 3-tier privacy masked object for discovery/unrelated views
      return {
        ...request,
        pickupAddress: null,
        deliveryAddress: null,
        driverName: null,
        driverMobile: null,
        provider: request.provider
          ? {
              ...request.provider,
              contactMobile: '[Protected Mobile]',
            }
          : null,
      };
    }

    return request;
  },

  async findRequestsByUser(userId: string) {
    return db.transportRequest.findMany({
      where: {
        OR: [
          { requesterId: userId },
          { provider: { userId } },
          { order: { farmerId: userId } },
          { order: { buyerId: userId } },
        ],
      },
      include: {
        provider: { select: { businessName: true, contactName: true } },
        vehicle: { select: { vehicleType: true, vehicleNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async getOrderRouteGeographicDetails(orderId: string, requestingUserId: string, userRole: string = 'FARMER') {
    const { getMapProvider } = await import('@/lib/services/map/mapProviderFactory');
    const { LocationPrivacyService } = await import('@/lib/services/locationPrivacyService');
    const { GeoService } = await import('@/lib/services/geoService');

    const mapProvider = getMapProvider();

    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        transportRequests: {
          where: { status: { notIn: ['CANCELLED'] } },
          include: { provider: true },
          take: 1,
        },
        storageRequests: {
          where: { status: { notIn: ['CANCELLED'] } },
          include: { facility: true },
          take: 1,
        },
      },
    });

    if (!order) {
      throw new Error('ORDER_NOT_FOUND: Order record not found');
    }

    const activeTransport = order.transportRequests[0] || null;
    const isAuthorized = LocationPrivacyService.isAuthorizedForFulfillment(
      requestingUserId,
      userRole,
      { farmerId: order.farmerId, buyerId: order.buyerId },
      activeTransport?.provider ? { providerId: activeTransport.provider.userId } : null
    );

    const pickupVillage = activeTransport?.pickupVillage || order.publicVillage;
    const pickupTaluka = activeTransport?.pickupTaluka || order.publicTaluka;
    const pickupDistrict = activeTransport?.pickupDistrict || order.publicDistrict;

    const deliveryVillage = activeTransport?.deliveryVillage || order.publicVillage;
    const deliveryTaluka = activeTransport?.deliveryTaluka || order.publicTaluka;
    const deliveryDistrict = activeTransport?.deliveryDistrict || order.publicDistrict;

    let pickupLocation = activeTransport?.pickupLatitude && activeTransport?.pickupLongitude
      ? { latitude: activeTransport.pickupLatitude, longitude: activeTransport.pickupLongitude }
      : await mapProvider.geocode(pickupDistrict);

    let deliveryLocation = activeTransport?.deliveryLatitude && activeTransport?.deliveryLongitude
      ? { latitude: activeTransport.deliveryLatitude, longitude: activeTransport.deliveryLongitude }
      : await mapProvider.geocode(deliveryDistrict);

    let distanceResult = undefined;
    if (pickupLocation && deliveryLocation) {
      const distKm = GeoService.calculateGeodesicDistance(pickupLocation, deliveryLocation);
      distanceResult = GeoService.formatDistanceResult(distKm, 'GEODESIC');
    }

    const navigationHandoff = (isAuthorized && deliveryLocation)
      ? mapProvider.getNavigationUrl(deliveryLocation, `Delivery Location - Order ${order.orderNumber}`, true, pickupLocation || undefined)
      : undefined;

    let storageFacilityInfo = undefined;
    if (order.storageRequests.length > 0) {
      const storageReq = order.storageRequests[0];
      const facility = storageReq.facility;
      let facilityLocation = facility.latitude && facility.longitude
        ? { latitude: facility.latitude, longitude: facility.longitude }
        : await mapProvider.geocode(facility.district);

      let storageNavHandoff = (isAuthorized && facilityLocation)
        ? mapProvider.getNavigationUrl(facilityLocation, `Storage Facility - ${facility.facilityName}`, true)
        : undefined;

      storageFacilityInfo = {
        facilityId: facility.id,
        facilityName: facility.facilityName,
        facilityType: facility.facilityType,
        address: isAuthorized ? (facility.address || `${facility.village || ''}, ${facility.district}`) : undefined,
        location: isAuthorized ? (facilityLocation || undefined) : undefined,
        navigationHandoff: storageNavHandoff,
      };
    }

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      pickup: {
        village: pickupVillage,
        taluka: pickupTaluka,
        district: pickupDistrict,
        address: isAuthorized ? (activeTransport?.pickupAddress || order.pickupAddress || `${pickupVillage}, ${pickupDistrict}`) : undefined,
        location: isAuthorized ? (pickupLocation || undefined) : (pickupLocation ? LocationPrivacyService.getDeterministicDiscoveryLocation(order.id + '_pickup', pickupLocation) : undefined),
        isExactAuthorized: isAuthorized,
      },
      delivery: {
        village: deliveryVillage,
        taluka: deliveryTaluka,
        district: deliveryDistrict,
        address: isAuthorized ? (activeTransport?.deliveryAddress || order.deliveryAddress || `${deliveryVillage}, ${deliveryDistrict}`) : undefined,
        location: isAuthorized ? (deliveryLocation || undefined) : (deliveryLocation ? LocationPrivacyService.getDeterministicDiscoveryLocation(order.id + '_del', deliveryLocation) : undefined),
        isExactAuthorized: isAuthorized,
      },
      distance: distanceResult,
      navigationHandoff,
      storageFacility: storageFacilityInfo,
    };
  },
};
