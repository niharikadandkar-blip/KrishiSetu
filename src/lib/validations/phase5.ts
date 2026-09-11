import { z } from 'zod';

export const createOrderSchema = z.object({
  acceptedOfferId: z.string().min(1, { message: 'Accepted Offer ID is required' }),
  userId: z.string().min(1, { message: 'User ID is required' }),
  idempotencyKey: z.string().optional(),
  pickupAddress: z.string().optional(),
  deliveryAddress: z.string().optional(),
  notes: z.string().optional(),
});

export const transitionOrderStatusSchema = z.object({
  orderId: z.string().min(1, { message: 'Order ID is required' }),
  userId: z.string().min(1, { message: 'User ID is required' }),
  targetStatus: z.enum([
    'ORDER_CREATED',
    'CONFIRMED',
    'PICKUP_PLANNED',
    'READY_FOR_PICKUP',
    'PICKED_UP',
    'IN_TRANSIT',
    'DELIVERED',
    'RECEIPT_PENDING',
    'COMPLETED',
    'CANCELLED',
  ]),
  notes: z.string().optional(),
  pickupPlannedDate: z.string().optional(),
  pickupAddress: z.string().optional(),
  deliveryAddress: z.string().optional(),
});

export const cancelOrderSchema = z.object({
  orderId: z.string().min(1, { message: 'Order ID is required' }),
  userId: z.string().min(1, { message: 'User ID is required' }),
  cancellationReason: z.string().optional(),
});
