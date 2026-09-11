import { db } from '@/lib/db';
import { Role } from '@/lib/types';

export const userRepository = {
  async findByMobile(mobile: string) {
    return db.user.findUnique({
      where: { mobile },
      include: {
        location: true,
        farmerProfile: true,
        buyerProfile: true,
        verificationRequests: true,
      },
    });
  },

  async findById(id: string) {
    return db.user.findUnique({
      where: { id },
      include: {
        location: true,
        farmerProfile: true,
        buyerProfile: true,
        verificationRequests: true,
      },
    });
  },

  async createUser(data: { name: string; mobile: string; role: Role; language: string }) {
    return db.user.create({
      data: {
        name: data.name,
        mobile: data.mobile,
        role: data.role,
        language: data.language,
        mobileVerified: true, // Granted upon OTP completion
        profileVerified: false,
      },
      include: {
        location: true,
        farmerProfile: true,
        buyerProfile: true,
        verificationRequests: true,
      },
    });
  },

  async updateProfileVerification(userId: string, isVerified: boolean) {
    return db.user.update({
      where: { id: userId },
      data: { profileVerified: isVerified },
    });
  },

  async updateLanguage(userId: string, language: string) {
    return db.user.update({
      where: { id: userId },
      data: { language },
    });
  },
};
