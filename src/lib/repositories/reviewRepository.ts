import { db } from '@/lib/db';
import { TransactionReviewItem } from '@/lib/types/phase10';

export const reviewRepository = {
  async createReview(data: {
    orderId: string;
    reviewerId: string;
    reviewedUserId: string;
    reviewedProviderId?: string | null;
    rating: number;
    comment?: string | null;
  }): Promise<TransactionReviewItem> {
    const created = await db.transactionReview.create({
      data: {
        orderId: data.orderId,
        reviewerId: data.reviewerId,
        reviewedUserId: data.reviewedUserId,
        reviewedProviderId: data.reviewedProviderId || null,
        rating: data.rating,
        comment: data.comment || null,
      },
      include: {
        reviewer: { select: { name: true } },
        reviewedUser: { select: { name: true } },
      },
    });

    return this.mapReview(created);
  },

  async findReview(reviewerId: string, orderId: string, reviewedUserId: string): Promise<TransactionReviewItem | null> {
    const review = await db.transactionReview.findUnique({
      where: {
        reviewerId_orderId_reviewedUserId: {
          reviewerId,
          orderId,
          reviewedUserId,
        },
      },
      include: {
        reviewer: { select: { name: true } },
        reviewedUser: { select: { name: true } },
      },
    });

    if (!review || review.deletedAt) return null;
    return this.mapReview(review);
  },

  async findReviewById(id: string): Promise<TransactionReviewItem | null> {
    const review = await db.transactionReview.findUnique({
      where: { id },
      include: {
        reviewer: { select: { name: true } },
        reviewedUser: { select: { name: true } },
      },
    });

    if (!review || review.deletedAt) return null;
    return this.mapReview(review);
  },

  async updateReview(
    id: string,
    reviewerId: string,
    data: { rating?: number; comment?: string | null }
  ): Promise<TransactionReviewItem> {
    const existing = await db.transactionReview.findUnique({
      where: { id },
    });

    if (!existing || existing.deletedAt) {
      throw new Error('Review not found');
    }

    if (existing.reviewerId !== reviewerId) {
      throw new Error('UNAUTHORIZED_IDOR: Cannot edit a review created by another user.');
    }

    const updated = await db.transactionReview.update({
      where: { id },
      data: {
        rating: data.rating !== undefined ? data.rating : existing.rating,
        comment: data.comment !== undefined ? data.comment : existing.comment,
      },
      include: {
        reviewer: { select: { name: true } },
        reviewedUser: { select: { name: true } },
      },
    });

    return this.mapReview(updated);
  },

  async getUserReviews(
    reviewedUserId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ reviews: TransactionReviewItem[]; total: number }> {
    const where = {
      reviewedUserId,
      deletedAt: null,
    };

    const [records, total] = await Promise.all([
      db.transactionReview.findMany({
        where,
        include: {
          reviewer: { select: { name: true } },
          reviewedUser: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: options.limit || 20,
        skip: options.offset || 0,
      }),
      db.transactionReview.count({ where }),
    ]);

    return {
      reviews: records.map((r) => this.mapReview(r)),
      total,
    };
  },

  async getProviderReviews(
    reviewedProviderId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ reviews: TransactionReviewItem[]; total: number }> {
    const where = {
      reviewedProviderId,
      deletedAt: null,
    };

    const [records, total] = await Promise.all([
      db.transactionReview.findMany({
        where,
        include: {
          reviewer: { select: { name: true } },
          reviewedUser: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: options.limit || 20,
        skip: options.offset || 0,
      }),
      db.transactionReview.count({ where }),
    ]);

    return {
      reviews: records.map((r) => this.mapReview(r)),
      total,
    };
  },

  async getUserReviewStats(reviewedUserId: string): Promise<{
    count: number;
    averageRating: number;
    ratingBreakdown: Record<number, number>;
  }> {
    const reviews = await db.transactionReview.findMany({
      where: {
        reviewedUserId,
        deletedAt: null,
      },
      select: { rating: true },
    });

    const breakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;

    for (const r of reviews) {
      if (r.rating >= 1 && r.rating <= 5) {
        breakdown[r.rating] = (breakdown[r.rating] || 0) + 1;
        sum += r.rating;
      }
    }

    const count = reviews.length;
    const averageRating = count > 0 ? Math.round((sum / count) * 10) / 10 : 0;

    return {
      count,
      averageRating,
      ratingBreakdown: breakdown,
    };
  },

  mapReview(raw: any): TransactionReviewItem {
    return {
      id: raw.id,
      orderId: raw.orderId,
      reviewerId: raw.reviewerId,
      reviewedUserId: raw.reviewedUserId,
      reviewedProviderId: raw.reviewedProviderId || null,
      rating: raw.rating,
      comment: raw.comment || null,
      createdAt: raw.createdAt.toISOString(),
      updatedAt: raw.updatedAt.toISOString(),
      deletedAt: raw.deletedAt ? raw.deletedAt.toISOString() : null,
      reviewerName: raw.reviewer?.name,
      reviewedUserName: raw.reviewedUser?.name,
    };
  },
};
