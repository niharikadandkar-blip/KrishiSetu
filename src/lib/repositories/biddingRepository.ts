import { db } from '@/lib/db';
import { BidInput, RespondBidInput } from '@/lib/types/phase2';
import { NegotiationTimelineEvent, WithdrawOfferInput } from '@/lib/types/phase4';
import { lotRepository } from './lotRepository';

export const biddingRepository = {
  async createBid(input: BidInput & { isFixedPrice?: boolean }) {
    // 1. Idempotency Check (Mandatory Correction #10)
    if (input.idempotencyKey) {
      const existing = await db.offerAndBid.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (existing) {
        return existing;
      }
    }

    // 2. Fetch Lot & Availability Validation (Mandatory Correction #9)
    const lot = await db.lot.findUnique({ where: { id: input.lotId } });
    if (!lot) {
      throw new Error('LOT_UNAVAILABLE: Produce lot not found');
    }

    if (['SOLD', 'COMPLETED', 'CANCELLED'].includes(lot.status)) {
      throw new Error(`LOT_UNAVAILABLE: Produce lot is in '${lot.status}' status and no longer accepting offers.`);
    }

    // 3. Self-Offer Server-Side Guard (Mandatory Correction #6)
    if (lot.farmerId === input.bidderId) {
      throw new Error('FORBIDDEN_SELF_OFFER: Farmers cannot submit an offer on their own produce lot.');
    }

    // 4. Quantity Validation
    if (input.quantity <= 0) {
      throw new Error('INVALID_QUANTITY: Offered quantity must be greater than 0.');
    }

    if (input.quantity > lot.quantityAvailable) {
      throw new Error(`INSUFFICIENT_QUANTITY: Offered quantity (${input.quantity} ${lot.unit}) exceeds total lot capacity (${lot.quantityAvailable} ${lot.unit}).`);
    }

    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48-hour bid validity

    return db.offerAndBid.create({
      data: {
        lotId: input.lotId,
        bidderId: input.bidderId,
        bidderRole: input.bidderRole,
        offeredPricePerUnit: input.offeredPricePerUnit,
        quantity: input.quantity,
        paymentTermsDays: input.paymentTermsDays || 0,
        idempotencyKey: input.idempotencyKey || null,
        status: 'PENDING',
        expiresAt,
      },
    });
  },

  async respondToBid(input: RespondBidInput) {
    // Mandatory Correction #2: ATOMIC TRANSACTION & CONCURRENCY LOCKING
    return db.$transaction(async (tx) => {
      const parentBid = await tx.offerAndBid.findUnique({
        where: { id: input.bidId },
        include: {
          lot: true,
          bidder: {
            select: { id: true, name: true, mobile: true },
          },
        },
      });

      if (!parentBid) {
        throw new Error('OFFER_NOT_FOUND: Target offer record not found');
      }

      // Check status state machine
      if (parentBid.status !== 'PENDING') {
        throw new Error(`OFFER_ALREADY_RESPONDED: Offer status is currently '${parentBid.status}' and cannot be modified.`);
      }

      // Expiration check
      if (new Date() > new Date(parentBid.expiresAt)) {
        await tx.offerAndBid.update({
          where: { id: parentBid.id },
          data: { status: 'EXPIRED' },
        });
        throw new Error('OFFER_EXPIRED: Offer validity period has expired.');
      }

      const lot = parentBid.lot;

      // Trace root buyer ID for multi-hop counter-offer lineages
      let rootBuyerId: string = parentBid.bidderId;
      if (parentBid.bidderRole === 'FARMER') {
        let curr: typeof parentBid | null = parentBid;
        while (curr && curr.counterOfferId) {
          const prev = await tx.offerAndBid.findUnique({ where: { id: curr.counterOfferId } });
          if (!prev) break;
          if (prev.bidderRole === 'BUYER') {
            rootBuyerId = prev.bidderId;
            break;
          }
          curr = prev as any;
        }
      }

      // Participant Authorization Check (Mandatory Correction #5)
      const isFarmerOwner = lot.farmerId === input.userId;
      const isBuyerParticipant = rootBuyerId === input.userId;
      const isDirectOfferCreator = parentBid.bidderId === input.userId;

      if (isDirectOfferCreator && (input.action === 'ACCEPT' || input.action === 'REJECT')) {
        throw new Error('UNAUTHORIZED_PARTICIPANT: You cannot accept or reject your own offer.');
      }

      if (!isFarmerOwner && !isBuyerParticipant) {
        throw new Error('UNAUTHORIZED_PARTICIPANT: You are not an authorized participant in this negotiation.');
      }

      if (input.action === 'ACCEPT') {
        // Explicit Quantity Accounting: Sum accepted bids excluding those linked to CANCELLED orders
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

        const committedQuantity = activeBidsCommitment + (prebookingsAgg._sum.quantityBooked || 0);
        const remainingAvailable = lot.quantityAvailable - committedQuantity;

        if (parentBid.quantity > remainingAvailable) {
          throw new Error(
            `OFFER_CONFLICT: Cannot accept offer of ${parentBid.quantity} ${lot.unit}. Remaining available quantity is only ${remainingAvailable} ${lot.unit}.`
          );
        }

        // Lock offer status to ACCEPTED
        const updatedBid = await tx.offerAndBid.update({
          where: { id: input.bidId },
          data: { status: 'ACCEPTED' },
        });

        // Active offer locking on Lot
        const newCommitted = committedQuantity + parentBid.quantity;
        const targetLotStatus = newCommitted >= lot.quantityAvailable ? 'BOOKING_THRESHOLD_REACHED' : 'UNDER_OFFER';

        const updatedLot = await tx.lot.update({
          where: { id: lot.id },
          data: { status: targetLotStatus },
        });

        return { action: 'ACCEPTED', bid: updatedBid, lot: updatedLot };
      }

      if (input.action === 'REJECT') {
        const updatedBid = await tx.offerAndBid.update({
          where: { id: input.bidId },
          data: { status: 'REJECTED' },
        });
        return { action: 'REJECTED', bid: updatedBid };
      }

      if (input.action === 'COUNTER') {
        if (!input.counterPricePerUnit || input.counterPricePerUnit <= 0) {
          throw new Error('INVALID_PRICE: Valid counter-offer price is required.');
        }

        // Mark parent bid status as COUNTERED (Immutable Lineage - Mandatory Correction #4)
        await tx.offerAndBid.update({
          where: { id: input.bidId },
          data: { status: 'COUNTERED' },
        });

        const counterRole = parentBid.bidderRole === 'BUYER' ? 'FARMER' : 'BUYER';
        const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

        // Create linked child counter-offer
        const counterBid = await tx.offerAndBid.create({
          data: {
            lotId: parentBid.lotId,
            bidderId: input.userId,
            bidderRole: counterRole,
            offeredPricePerUnit: input.counterPricePerUnit,
            quantity: input.counterQuantity || parentBid.quantity,
            paymentTermsDays: input.counterPaymentTermsDays ?? parentBid.paymentTermsDays,
            counterOfferId: parentBid.id,
            status: 'PENDING',
            expiresAt,
          },
        });

        return { action: 'COUNTERED', parentBidId: parentBid.id, counterBid };
      }

      throw new Error('INVALID_ACTION: Invalid negotiation action');
    });
  },

  async withdrawOffer(input: WithdrawOfferInput) {
    const offer = await db.offerAndBid.findUnique({
      where: { id: input.bidId },
    });

    if (!offer) {
      throw new Error('OFFER_NOT_FOUND: Offer record not found');
    }

    if (offer.bidderId !== input.userId) {
      throw new Error('UNAUTHORIZED_PARTICIPANT: You can only withdraw your own offer.');
    }

    // Mandatory Correction #8: Withdrawal rules
    if (offer.status !== 'PENDING') {
      throw new Error(`INVALID_STATE_TRANSITION: Cannot withdraw offer with status '${offer.status}'. Only pending offers can be withdrawn.`);
    }

    return db.offerAndBid.update({
      where: { id: input.bidId },
      data: { status: 'WITHDRAWN' },
    });
  },

  async getNegotiationTimeline(bidId: string): Promise<NegotiationTimelineEvent[]> {
    const events: NegotiationTimelineEvent[] = [];
    let currentId: string | null = bidId;

    while (currentId) {
      const bid: any = await db.offerAndBid.findUnique({
        where: { id: currentId },
        include: {
          bidder: {
            select: { id: true, name: true },
          },
        },
      });

      if (!bid) break;

      events.unshift({
        id: bid.id,
        bidderId: bid.bidderId,
        bidderName: bid.bidder.name,
        bidderRole: bid.bidderRole as any,
        offeredPricePerUnit: bid.offeredPricePerUnit,
        quantity: bid.quantity,
        paymentTermsDays: bid.paymentTermsDays,
        status: bid.status as any,
        createdAt: bid.createdAt.toISOString(),
        parentOfferId: bid.counterOfferId,
      });

      currentId = bid.counterOfferId;
    }

    return events;
  },

  async findOffersByFarmer(farmerId: string) {
    const farmerLots = await db.lot.findMany({
      where: { farmerId },
      select: { id: true },
    });

    const lotIds = farmerLots.map((l) => l.id);
    if (lotIds.length === 0) return [];

    return db.offerAndBid.findMany({
      where: { lotId: { in: lotIds } },
      include: {
        lot: {
          select: {
            id: true,
            cropName: true,
            variety: true,
            unit: true,
            askPricePerUnit: true,
            quantityAvailable: true,
            publicVillage: true,
            publicDistrict: true,
            status: true,
          },
        },
        bidder: {
          select: {
            id: true,
            name: true,
            mobile: true,
            profileVerified: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async findOffersByBuyer(buyerId: string) {
    return db.offerAndBid.findMany({
      where: { bidderId: buyerId },
      include: {
        lot: {
          include: {
            farmer: {
              select: {
                id: true,
                name: true,
                mobile: true,
                profileVerified: true,
              },
            },
          },
        },
        counterOffer: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async findByLotId(lotId: string) {
    return db.offerAndBid.findMany({
      where: { lotId },
      include: {
        bidder: {
          select: {
            id: true,
            name: true,
            mobile: true,
            profileVerified: true,
          },
        },
        counterOffer: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  },
};
