import { db } from '@/lib/db';
import { VerificationStatus } from '@/lib/types';

export const verificationRepository = {
  async createRequest(data: {
    userId: string;
    verificationType: string;
    provider: string;
    documentReference?: string;
  }) {
    return db.verificationRequest.create({
      data: {
        userId: data.userId,
        verificationType: data.verificationType,
        provider: data.provider,
        status: 'PENDING',
        documentReference: data.documentReference || null,
      },
    });
  },

  async updateStatus(
    id: string,
    status: VerificationStatus,
    reviewedBy?: string,
    notes?: string
  ) {
    return db.verificationRequest.update({
      where: { id },
      data: {
        status,
        reviewedAt: new Date(),
        reviewedBy: reviewedBy || 'SYSTEM',
        reviewNotes: notes || null,
      },
    });
  },

  async findByUserId(userId: string) {
    return db.verificationRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  },
};
