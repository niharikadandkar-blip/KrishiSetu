import { db } from '@/lib/db';
import { reviewRepository } from '@/lib/repositories/reviewRepository';
import { userRepository } from '@/lib/repositories/userRepository';
import { notificationRepository } from '@/lib/repositories/notificationRepository';
import { UserReputationSummary, ReviewEligibilityResult, TransactionReviewItem } from '@/lib/types/phase10';

export const reputationService = {
  async getUserReputationSummary(userId: string): Promise<UserReputationSummary> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Count completed orders where user is farmer or buyer
    const completedTransactionCount = await db.order.count({
      where: {
        status: 'COMPLETED',
        OR: [{ farmerId: userId }, { buyerId: userId }],
      },
    });

    // Fetch review stats
    const stats = await reviewRepository.getUserReviewStats(userId);

    // Build verification badges
    const verificationBadges: string[] = [];
    if (user.mobileVerified) {
      verificationBadges.push('✓ Mobile Verified');
    }
    if (user.profileVerified) {
      verificationBadges.push('✓ Profile Verified');
    }

    // Check if user has an approved DigiLocker verification request
    const digilockerApproved = await db.verificationRequest.findFirst({
      where: {
        userId,
        verificationType: 'DIGILOCKER_AADHAAR',
        status: 'APPROVED',
      },
    });
    if (digilockerApproved) {
      verificationBadges.push('✓ DigiLocker Verified');
    }

    if (completedTransactionCount > 0) {
      verificationBadges.push(`⭐ ${stats.averageRating > 0 ? stats.averageRating.toFixed(1) : 'New'} (${completedTransactionCount} completed)`);
    }

    return {
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      mobileVerified: user.mobileVerified,
      profileVerified: user.profileVerified,
      verificationBadges,
      completedTransactionCount,
      averageRating: stats.averageRating,
      totalReviewCount: stats.count,
      ratingBreakdown: stats.ratingBreakdown,
    };
  },

  async checkReviewEligibility(
    reviewerId: string,
    orderId: string,
    targetUserId?: string
  ): Promise<ReviewEligibilityResult> {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        transportRequests: { select: { providerId: true } },
        storageRequests: { select: { facility: { select: { providerId: true } } } },
      },
    });

    if (!order) {
      return { eligible: false, reason: 'Order not found' };
    }

    // Strict state check: Order MUST be COMPLETED
    if (order.status !== 'COMPLETED') {
      return { eligible: false, reason: 'Reviews are only allowed for completed orders' };
    }

    // Check if reviewer is part of order FIRST
    const isFarmer = order.farmerId === reviewerId;
    const isBuyer = order.buyerId === reviewerId;
    
    // Check if reviewer is a provider for transport/storage in this order
    const providerProfile = await db.providerProfile.findUnique({ where: { userId: reviewerId } });
    let isProvider = false;
    if (providerProfile) {
      const isTransportProvider = order.transportRequests.some((t) => t.providerId === providerProfile.id);
      const isStorageProvider = order.storageRequests.some((s) => s.facility?.providerId === providerProfile.id);
      isProvider = isTransportProvider || isStorageProvider;
    }

    if (!isFarmer && !isBuyer && !isProvider) {
      return { eligible: false, reason: 'Only order participants can submit a review' };
    }

    // Determine target user if not specified
    let reviewedUserId = targetUserId;
    if (!reviewedUserId) {
      if (reviewerId === order.farmerId) {
        reviewedUserId = order.buyerId;
      } else if (reviewerId === order.buyerId) {
        reviewedUserId = order.farmerId;
      }
    }

    if (!reviewedUserId) {
      return { eligible: false, reason: 'Could not determine user to review' };
    }

    // Cannot review self
    if (reviewerId === reviewedUserId) {
      return { eligible: false, reason: 'Cannot submit a review for yourself' };
    }

    // Check existing review
    const existing = await reviewRepository.findReview(reviewerId, orderId, reviewedUserId);
    if (existing) {
      return { eligible: false, reason: 'You have already submitted a review for this order' };
    }

    // Find provider profile of reviewed user if any
    const reviewedUserProvider = await db.providerProfile.findUnique({ where: { userId: reviewedUserId } });

    return {
      eligible: true,
      orderId,
      reviewedUserId,
      reviewedProviderId: reviewedUserProvider ? reviewedUserProvider.id : null,
    };
  },

  async submitReview(
    reviewerId: string,
    params: { orderId: string; rating: number; comment?: string }
  ): Promise<TransactionReviewItem> {
    const eligibility = await this.checkReviewEligibility(reviewerId, params.orderId);
    if (!eligibility.eligible || !eligibility.reviewedUserId) {
      throw new Error(eligibility.reason || 'Not eligible to review this order');
    }

    const review = await reviewRepository.createReview({
      orderId: params.orderId,
      reviewerId,
      reviewedUserId: eligibility.reviewedUserId,
      reviewedProviderId: eligibility.reviewedProviderId,
      rating: params.rating,
      comment: params.comment,
    });

    // Send notification to reviewed user
    const reviewer = await userRepository.findById(reviewerId);
    await notificationRepository.createNotification({
      userId: eligibility.reviewedUserId,
      type: 'REVIEW_RECEIVED',
      category: 'ORDER',
      priority: 'NORMAL',
      titleKey: 'notifications.reviewReceivedTitle',
      messageKey: 'notifications.reviewReceivedMsg',
      payload: {
        reviewerName: reviewer?.name || 'A user',
        rating: params.rating,
        orderId: params.orderId,
      },
      deepLink: `/orders/${params.orderId}`,
      sourceEntityType: 'TRANSACTION_REVIEW',
      sourceEntityId: review.id,
      idempotencyKey: `review-notif-${review.id}`,
    });

    return review;
  },

  async updateReview(
    reviewerId: string,
    reviewId: string,
    params: { rating?: number; comment?: string }
  ): Promise<TransactionReviewItem> {
    return reviewRepository.updateReview(reviewId, reviewerId, params);
  },

  async getUserReviews(userId: string, options?: { limit?: number; offset?: number }) {
    return reviewRepository.getUserReviews(userId, options);
  },

  async getProviderReviews(providerId: string, options?: { limit?: number; offset?: number }) {
    return reviewRepository.getProviderReviews(providerId, options);
  },
};
