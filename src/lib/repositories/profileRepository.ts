import { db } from '@/lib/db';
import { BuyerType } from '@/lib/types';

export const profileRepository = {
  async upsertFarmerProfile(userId: string, data: { mainCrop?: string; otherCrops?: string; farmingStatus?: string; farmArea?: number }) {
    return db.farmerProfile.upsert({
      where: { userId },
      create: {
        userId,
        mainCrop: data.mainCrop || null,
        otherCrops: data.otherCrops || null,
        farmingStatus: data.farmingStatus || null,
        farmArea: data.farmArea || null,
      },
      update: {
        ...(data.mainCrop !== undefined && { mainCrop: data.mainCrop }),
        ...(data.otherCrops !== undefined && { otherCrops: data.otherCrops }),
        ...(data.farmingStatus !== undefined && { farmingStatus: data.farmingStatus }),
        ...(data.farmArea !== undefined && { farmArea: data.farmArea }),
      },
    });
  },

  async upsertBuyerProfile(userId: string, data: { businessName?: string; businessType?: BuyerType; cropsPurchased?: string; businessLocation?: string }) {
    return db.buyerProfile.upsert({
      where: { userId },
      create: {
        userId,
        businessName: data.businessName || null,
        businessType: data.businessType || 'TRADER',
        cropsPurchased: data.cropsPurchased || null,
        businessLocation: data.businessLocation || null,
      },
      update: {
        ...(data.businessName !== undefined && { businessName: data.businessName }),
        ...(data.businessType !== undefined && { businessType: data.businessType }),
        ...(data.cropsPurchased !== undefined && { cropsPurchased: data.cropsPurchased }),
        ...(data.businessLocation !== undefined && { businessLocation: data.businessLocation }),
      },
    });
  },
};
