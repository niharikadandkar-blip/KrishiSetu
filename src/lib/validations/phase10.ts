import { z } from 'zod';

export const createReviewSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  rating: z.number().int().min(1, 'Rating must be between 1 and 5').max(5, 'Rating must be between 1 and 5'),
  comment: z.string().max(1000).optional(),
});

export const updateReviewSchema = z.object({
  rating: z.number().int().min(1, 'Rating must be between 1 and 5').max(5, 'Rating must be between 1 and 5').optional(),
  comment: z.string().max(1000).optional(),
});

export const createReportSchema = z.object({
  reportedUserId: z.string().optional(),
  reportedProviderId: z.string().optional(),
  orderId: z.string().optional(),
  offerId: z.string().optional(),
  lotId: z.string().optional(),
  category: z.enum([
    'NON_PAYMENT',
    'NON_DELIVERY',
    'QUALITY_MISMATCH',
    'FRAUD',
    'UNPROFESSIONAL_BEHAVIOR',
    'HARASSMENT',
    'OTHER',
  ]),
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000),
});

export const updateReportStatusSchema = z.object({
  status: z.enum(['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED']),
  moderationNote: z.string().min(2, 'Moderation note must be at least 2 characters').optional(),
});
