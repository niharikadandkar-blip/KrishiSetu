import { db } from '@/lib/db';
import { LocationInfo } from '@/lib/types';

export const locationRepository = {
  async upsertLocation(userId: string, data: LocationInfo) {
    return db.locationData.upsert({
      where: { userId },
      create: {
        userId,
        state: data.state,
        district: data.district,
        taluka: data.taluka || null,
        village: data.village || null,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        formattedAddress: data.formattedAddress || null,
      },
      update: {
        state: data.state,
        district: data.district,
        taluka: data.taluka || null,
        village: data.village || null,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        formattedAddress: data.formattedAddress || null,
      },
    });
  },
};
