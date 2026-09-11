import { db } from '@/lib/db';
import { PrebookingInput } from '@/lib/types/phase2';
import { lotRepository } from './lotRepository';

export const prebookingRepository = {
  async createPrebooking(input: PrebookingInput) {
    const lot = await db.lot.findUnique({ where: { id: input.lotId } });
    if (!lot) {
      throw new Error('Target produce lot not found');
    }

    const totalAmount = input.quantityBooked * input.unitPrice;

    // Create Prebooking Record
    const prebooking = await db.harvestPrebooking.create({
      data: {
        lotId: input.lotId,
        buyerId: input.buyerId,
        buyerType: input.buyerType || 'INDIVIDUAL',
        societyName: input.societyName || null,
        quantityBooked: input.quantityBooked,
        unitPrice: input.unitPrice,
        totalAmount,
        status: 'PENDING_CONFIRMATION',
      },
    });

    // Calculate Cumulative Booked Quantity
    const aggregate = await db.harvestPrebooking.aggregate({
      where: {
        lotId: input.lotId,
        status: { in: ['PENDING_CONFIRMATION', 'CONFIRMED', 'FULFILLED'] },
      },
      _sum: {
        quantityBooked: true,
      },
    });

    const totalBooked = aggregate._sum.quantityBooked || 0;

    // REAL-WORLD LIFECYCLE STATE TRANSITION: If booked quantity >= capacity, flag BOOKING_THRESHOLD_REACHED
    if (totalBooked >= lot.quantityAvailable && lot.status === 'PUBLISHED') {
      await lotRepository.updateStatus(lot.id, 'BOOKING_THRESHOLD_REACHED');
    }

    return {
      prebooking,
      totalBooked,
      lotCapacity: lot.quantityAvailable,
      thresholdReached: totalBooked >= lot.quantityAvailable,
    };
  },

  async findByLotId(lotId: string) {
    return db.harvestPrebooking.findMany({
      where: { lotId },
      include: {
        buyer: {
          select: {
            id: true,
            name: true,
            mobile: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },
};
