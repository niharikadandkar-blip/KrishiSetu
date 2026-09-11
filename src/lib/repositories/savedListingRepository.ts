import { db } from '@/lib/db';
import { SavedListingItem } from '@/lib/types/phase3';

export const savedListingRepository = {
  async toggleSavedListing(userId: string, lotId: string): Promise<{ saved: boolean; id?: string }> {
    const existing = await db.savedListing.findUnique({
      where: {
        userId_lotId: {
          userId,
          lotId,
        },
      },
    });

    if (existing) {
      await db.savedListing.delete({
        where: { id: existing.id },
      });
      return { saved: false };
    } else {
      const created = await db.savedListing.create({
        data: {
          userId,
          lotId,
        },
      });
      return { saved: true, id: created.id };
    }
  },

  async getSavedListingsByUser(userId: string): Promise<SavedListingItem[]> {
    const records = await db.savedListing.findMany({
      where: { userId },
      include: {
        lot: {
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
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return records.map((r) => ({
      id: r.id,
      userId: r.userId,
      lotId: r.lotId,
      createdAt: r.createdAt.toISOString(),
      lot: {
        id: r.lot.id,
        farmerId: r.lot.farmerId,
        farmerName: r.lot.farmer.name,
        cropName: r.lot.cropName,
        variety: r.lot.variety,
        quantityAvailable: r.lot.quantityAvailable,
        unit: r.lot.unit,
        askPricePerUnit: r.lot.askPricePerUnit,
        expectedHarvestDate: r.lot.expectedHarvestDate.toISOString(),
        alreadyHarvested: r.lot.alreadyHarvested,
        grade: r.lot.grade,
        sizeMm: r.lot.sizeMm,
        maturityColour: r.lot.maturityColour,
        moisturePct: r.lot.moisturePct,
        damagePct: r.lot.damagePct,
        freshness: r.lot.freshness,
        packagingType: r.lot.packagingType,
        photoUrls: r.lot.photoUrls ? JSON.parse(r.lot.photoUrls) : null,
        publicVillage: r.lot.publicVillage,
        publicTaluka: r.lot.publicTaluka,
        publicDistrict: r.lot.publicDistrict,
        latitude: null, // Protected location privacy
        longitude: null,
        farmAddress: null,
        status: r.lot.status as any,
        createdAt: r.lot.createdAt.toISOString(),
        updatedAt: r.lot.updatedAt.toISOString(),
      },
    }));
  },

  async isListingSavedByUser(userId: string, lotId: string): Promise<boolean> {
    const count = await db.savedListing.count({
      where: {
        userId,
        lotId,
      },
    });
    return count > 0;
  },
};
