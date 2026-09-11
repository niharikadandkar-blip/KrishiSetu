import { z } from 'zod';

export const createOfferSchema = z.object({
  lotId: z.string().min(1, { message: 'Lot ID is required' }),
  bidderId: z.string().min(1, { message: 'Bidder ID is required' }),
  bidderRole: z.enum(['FARMER', 'BUYER']),
  offeredPricePerUnit: z.number().positive({ message: 'Offered price must be greater than 0' }),
  quantity: z.number().positive({ message: 'Quantity must be greater than 0' }),
  paymentTermsDays: z.number().min(0).default(0),
  isFixedPrice: z.boolean().optional(),
  idempotencyKey: z.string().optional(),
});

export const respondOfferSchema = z.object({
  bidId: z.string().min(1, { message: 'Bid ID is required' }),
  userId: z.string().min(1, { message: 'User ID is required' }),
  action: z.enum(['ACCEPT', 'REJECT', 'COUNTER']),
  counterPricePerUnit: z.number().positive().optional(),
  counterQuantity: z.number().positive().optional(),
  counterPaymentTermsDays: z.number().min(0).optional(),
});

export const withdrawOfferSchema = z.object({
  bidId: z.string().min(1, { message: 'Bid ID is required' }),
  userId: z.string().min(1, { message: 'User ID is required' }),
  reason: z.string().optional(),
});
