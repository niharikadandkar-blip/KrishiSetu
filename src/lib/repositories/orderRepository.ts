import { db } from '@/lib/db';
import {
  CancelOrderInput,
  CreateOrderInput,
  OrderFilterOptions,
  OrderItem,
  OrderStatus,
  TransitionOrderStatusInput,
} from '@/lib/types/phase5';

export const orderRepository = {
  async createOrderFromAcceptedOffer(input: CreateOrderInput) {
    // 1. Idempotency Check via idempotencyKey
    if (input.idempotencyKey) {
      const existing = await db.order.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        include: { timelineEvents: { orderBy: { createdAt: 'asc' } } },
      });
      if (existing) {
        return existing;
      }
    }

    // 2. Fetch Offer & Lot details
    const offer = await db.offerAndBid.findUnique({
      where: { id: input.acceptedOfferId },
      include: {
        lot: {
          include: {
            farmer: {
              select: { id: true, name: true, mobile: true, profileVerified: true },
            },
          },
        },
        bidder: {
          select: { id: true, name: true, mobile: true, profileVerified: true },
        },
      },
    });

    if (!offer) {
      throw new Error('OFFER_NOT_FOUND: Source offer record not found');
    }

    // 3. Status Gate: MUST be ACCEPTED offer
    if (offer.status !== 'ACCEPTED') {
      throw new Error(`INVALID_OFFER_STATUS: Cannot generate order from offer in '${offer.status}' status. Only ACCEPTED offers can generate an order.`);
    }

    // 4. One-to-One Unique Guard: Check if an Order already exists for this accepted offer
    const existingOrderByOffer = await db.order.findUnique({
      where: { acceptedOfferId: offer.id },
      include: { timelineEvents: { orderBy: { createdAt: 'asc' } } },
    });
    if (existingOrderByOffer) {
      return existingOrderByOffer; // Idempotent return of existing order
    }

    const lot = offer.lot;
    const farmer = lot.farmer;
    const bidder = offer.bidder;

    // Determine Farmer and Buyer IDs
    const farmerId = lot.farmerId;
    const buyerId = offer.bidderRole === 'BUYER' ? offer.bidderId : (offer.counterOfferId ? offer.bidderId : offer.bidderId);

    // 5. Participant Authorization Check
    const isParticipant = input.userId === farmerId || input.userId === buyerId || input.userId === offer.bidderId;
    if (!isParticipant) {
      throw new Error('UNAUTHORIZED_PARTICIPANT: You are not authorized to create an order from this accepted offer.');
    }

    // Determine who is buyer vs farmer names/mobiles
    const farmerName = farmer.name;
    const farmerMobile = farmer.mobile;
    const buyerName = bidder.name;
    const buyerMobile = bidder.mobile;

    // 6. Server-Side Price & Value Calculation (Zero Trust in Client Amount)
    const agreedPricePerUnit = offer.offeredPricePerUnit;
    const quantity = offer.quantity;
    const agreedTotalValue = Math.round(quantity * agreedPricePerUnit * 100) / 100;

    // 7. Generate Unique Order Number
    const orderNumber = `KS-ORD-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

    // 8. Execute Atomic Transaction to create Order + Timeline Event
    return db.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNumber,
          acceptedOfferId: offer.id,
          lotId: lot.id,
          farmerId,
          buyerId,
          
          // Historical Commercial Snapshot
          cropName: lot.cropName,
          variety: lot.variety || null,
          quantity,
          unit: lot.unit || 'Quintal',
          agreedPricePerUnit,
          agreedTotalValue,
          paymentTermsDays: offer.paymentTermsDays || 0,
          farmerName,
          farmerMobile,
          buyerName,
          buyerMobile,
          publicVillage: lot.publicVillage,
          publicTaluka: lot.publicTaluka,
          publicDistrict: lot.publicDistrict,
          grade: lot.grade || null,
          packagingType: lot.packagingType || null,

          status: 'ORDER_CREATED',
          pickupAddress: input.pickupAddress || `${lot.publicVillage}, ${lot.publicTaluka}, ${lot.publicDistrict}`,
          deliveryAddress: input.deliveryAddress || null,
          fulfillmentNotes: input.notes || null,
          idempotencyKey: input.idempotencyKey || null,

          timelineEvents: {
            create: {
              status: 'ORDER_CREATED',
              actorId: input.userId,
              actorRole: input.userId === farmerId ? 'FARMER' : 'BUYER',
              actorName: input.userId === farmerId ? farmerName : buyerName,
              notes: 'Order generated from accepted commercial commitment.',
            },
          },
        },
        include: {
          timelineEvents: { orderBy: { createdAt: 'asc' } },
        },
      });

      return order;
    });
  },

  async transitionOrderStatus(input: TransitionOrderStatusInput) {
    return db.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: input.orderId },
        include: {
          lot: true,
          farmer: { select: { id: true, name: true } },
          buyer: { select: { id: true, name: true } },
        },
      });

      if (!order) {
        throw new Error('ORDER_NOT_FOUND: Target order record not found');
      }

      const currentStatus = order.status as OrderStatus;
      const targetStatus = input.targetStatus;

      // 1. Terminal State Check
      if (['COMPLETED', 'CANCELLED'].includes(currentStatus)) {
        throw new Error(`INVALID_STATE_TRANSITION: Cannot modify order in terminal state '${currentStatus}'.`);
      }

      // 2. Participant Authorization Check
      const isFarmer = order.farmerId === input.userId;
      const isBuyer = order.buyerId === input.userId;

      if (!isFarmer && !isBuyer) {
        throw new Error('UNAUTHORIZED_PARTICIPANT: You are not authorized to update this order.');
      }

      const actorRole = isFarmer ? 'FARMER' : 'BUYER';
      const actorName = isFarmer ? order.farmerName : order.buyerName;

      // 3. State Machine Transition Validation & Role Authority Matrix
      const validTransitions: Record<OrderStatus, OrderStatus[]> = {
        ORDER_CREATED: ['CONFIRMED', 'CANCELLED'],
        CONFIRMED: ['PICKUP_PLANNED', 'CANCELLED'],
        PICKUP_PLANNED: ['READY_FOR_PICKUP', 'CANCELLED'],
        READY_FOR_PICKUP: ['PICKED_UP', 'CANCELLED'],
        PICKED_UP: ['IN_TRANSIT'],
        IN_TRANSIT: ['DELIVERED'],
        DELIVERED: ['RECEIPT_PENDING'],
        RECEIPT_PENDING: ['COMPLETED'],
        COMPLETED: [],
        CANCELLED: [],
      };

      const allowedNextStates = validTransitions[currentStatus] || [];
      if (!allowedNextStates.includes(targetStatus)) {
        throw new Error(`INVALID_STATE_TRANSITION: Cannot transition order from '${currentStatus}' to '${targetStatus}'. Allowed next states: [${allowedNextStates.join(', ')}].`);
      }

      // Role-Specific Restrictions
      if (targetStatus === 'READY_FOR_PICKUP' && !isFarmer) {
        throw new Error('UNAUTHORIZED_ACTION: Only the farmer can mark produce ready for pickup.');
      }

      if ((targetStatus === 'RECEIPT_PENDING' || targetStatus === 'COMPLETED') && !isBuyer) {
        throw new Error('UNAUTHORIZED_ACTION: Only the buyer can confirm produce receipt and complete the order.');
      }

      // 4. Perform Update + Timeline Event Creation
      const updatedOrder = await tx.order.update({
        where: { id: input.orderId },
        data: {
          status: targetStatus,
          ...(input.pickupPlannedDate ? { pickupPlannedDate: new Date(input.pickupPlannedDate) } : {}),
          ...(input.pickupAddress ? { pickupAddress: input.pickupAddress } : {}),
          ...(input.deliveryAddress ? { deliveryAddress: input.deliveryAddress } : {}),
          ...(input.notes ? { fulfillmentNotes: input.notes } : {}),
          timelineEvents: {
            create: {
              status: targetStatus,
              actorId: input.userId,
              actorRole,
              actorName,
              notes: input.notes || `Order status updated to ${targetStatus}.`,
            },
          },
        },
        include: {
          timelineEvents: { orderBy: { createdAt: 'asc' } },
        },
      });

      return updatedOrder;
    });
  },

  async cancelOrder(input: CancelOrderInput) {
    return db.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: input.orderId },
        include: {
          acceptedOffer: true,
        },
      });

      if (!order) {
        throw new Error('ORDER_NOT_FOUND: Target order record not found');
      }

      const isFarmer = order.farmerId === input.userId;
      const isBuyer = order.buyerId === input.userId;

      if (!isFarmer && !isBuyer) {
        throw new Error('UNAUTHORIZED_PARTICIPANT: You are not authorized to cancel this order.');
      }

      const currentStatus = order.status as OrderStatus;

      // Eligible states for cancellation
      const eligibleForCancel: OrderStatus[] = ['ORDER_CREATED', 'CONFIRMED', 'PICKUP_PLANNED', 'READY_FOR_PICKUP'];
      if (!eligibleForCancel.includes(currentStatus)) {
        throw new Error(`INVALID_STATE_TRANSITION: Cannot cancel order in '${currentStatus}' state. Cancellation is only allowed prior to transport dispatch.`);
      }

      const actorRole = isFarmer ? 'FARMER' : 'BUYER';
      const actorName = isFarmer ? order.farmerName : order.buyerName;

      // Update Order Status to CANCELLED
      const cancelledOrder = await tx.order.update({
        where: { id: input.orderId },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelledBy: input.userId,
          cancellationReason: input.cancellationReason || 'Order cancelled by participant.',
          timelineEvents: {
            create: {
              status: 'CANCELLED',
              actorId: input.userId,
              actorRole,
              actorName,
              notes: input.cancellationReason || 'Order cancelled.',
            },
          },
        },
        include: {
          timelineEvents: { orderBy: { createdAt: 'asc' } },
        },
      });

      // Release commitment quantity by cancelling Order (leaving OfferAndBid status as ACCEPTED for historical truth)
      // Recalculate Lot committed quantity to update Lot status if needed
      if (order.lotId) {
        const lot = await tx.lot.findUnique({ where: { id: order.lotId } });
        if (lot && lot.status === 'BOOKING_THRESHOLD_REACHED') {
          // Check remaining active commitments
          const acceptedBids = await tx.offerAndBid.findMany({
            where: { lotId: lot.id, status: 'ACCEPTED' },
            include: { order: { select: { status: true } } },
          });

          const activeBidsCommitment = acceptedBids
            .filter((bid) => !bid.order || bid.order.status !== 'CANCELLED')
            .reduce((sum, bid) => sum + bid.quantity, 0);

          const prebookingsAgg = await tx.harvestPrebooking.aggregate({
            where: { lotId: lot.id, status: { in: ['CONFIRMED', 'FULFILLED'] } },
            _sum: { quantityBooked: true },
          });

          const totalActiveCommitted = activeBidsCommitment + (prebookingsAgg._sum.quantityBooked || 0);

          if (totalActiveCommitted < lot.quantityAvailable) {
            const newLotStatus = totalActiveCommitted > 0 ? 'UNDER_OFFER' : 'ACTIVE';
            await tx.lot.update({
              where: { id: lot.id },
              data: { status: newLotStatus },
            });
          }
        }
      }

      return cancelledOrder;
    });
  },

  async findOrderById(orderId: string, requestingUserId?: string) {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        lot: {
          select: {
            id: true,
            cropName: true,
            variety: true,
            photoUrls: true,
            latitude: true,
            longitude: true,
            farmAddress: true,
            status: true,
          },
        },
        acceptedOffer: {
          select: {
            id: true,
            status: true,
            createdAt: true,
          },
        },
        timelineEvents: {
          orderBy: { createdAt: 'asc' },
        },
        transportRequests: {
          where: { status: { notIn: ['CANCELLED'] } },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        storageRequests: {
          where: { status: { notIn: ['CANCELLED'] } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) return null;

    // IDOR Protection Check: Strictly enforce requesting user identity
    if (!requestingUserId) {
      throw new Error('UNAUTHORIZED_PARTICIPANT: Authentication required to view order details.');
    }

    const isFarmer = order.farmerId === requestingUserId;
    const isBuyer = order.buyerId === requestingUserId;
    if (!isFarmer && !isBuyer) {
      throw new Error('UNAUTHORIZED_PARTICIPANT: You do not have permission to view this order.');
    }

    return order;
  },

  async findOrdersByFarmer(farmerId: string, statusCategory: string = 'ALL') {
    const whereClause: any = { farmerId };

    if (statusCategory === 'ACTIVE') {
      whereClause.status = { notIn: ['COMPLETED', 'CANCELLED'] };
    } else if (statusCategory === 'COMPLETED') {
      whereClause.status = 'COMPLETED';
    } else if (statusCategory === 'CANCELLED') {
      whereClause.status = 'CANCELLED';
    }

    return db.order.findMany({
      where: whereClause,
      include: {
        timelineEvents: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async findOrdersByBuyer(buyerId: string, statusCategory: string = 'ALL') {
    const whereClause: any = { buyerId };

    if (statusCategory === 'ACTIVE') {
      whereClause.status = { notIn: ['COMPLETED', 'CANCELLED'] };
    } else if (statusCategory === 'COMPLETED') {
      whereClause.status = 'COMPLETED';
    } else if (statusCategory === 'CANCELLED') {
      whereClause.status = 'CANCELLED';
    }

    return db.order.findMany({
      where: whereClause,
      include: {
        timelineEvents: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });
  },
};
