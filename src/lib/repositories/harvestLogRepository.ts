import { db } from '@/lib/db';
import { HarvestLogInput } from '@/lib/types/phase2';
import { lotRepository } from './lotRepository';

export const harvestLogRepository = {
  async createLog(input: HarvestLogInput) {
    const log = await db.harvestCameraLog.create({
      data: {
        lotId: input.lotId,
        stage: input.stage,
        photoUrl: input.photoUrl,
        latitude: input.latitude || null,
        longitude: input.longitude || null,
      },
    });

    // Update Lot status based on harvest stage progression
    if (input.stage === 'HARVESTED') {
      await lotRepository.updateStatus(input.lotId, 'HARVESTED');
    } else if (input.stage === 'DISPATCHED') {
      await lotRepository.updateStatus(input.lotId, 'DISPATCHED');
    }

    return log;
  },

  async findByLotId(lotId: string) {
    return db.harvestCameraLog.findMany({
      where: { lotId },
      orderBy: { loggedAt: 'desc' },
    });
  },
};
