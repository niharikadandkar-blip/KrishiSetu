export type OrderStatus =
  | 'ORDER_CREATED'
  | 'CONFIRMED'
  | 'PICKUP_PLANNED'
  | 'READY_FOR_PICKUP'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'RECEIPT_PENDING'
  | 'COMPLETED'
  | 'CANCELLED';

export interface OrderSnapshot {
  cropName: string;
  variety?: string | null;
  quantity: number;
  unit: string;
  agreedPricePerUnit: number;
  agreedTotalValue: number;
  paymentTermsDays: number;
  farmerName: string;
  farmerMobile: string;
  buyerName: string;
  buyerMobile: string;
  publicVillage: string;
  publicTaluka: string;
  publicDistrict: string;
  grade?: string | null;
  packagingType?: string | null;
}

export interface OrderItem extends OrderSnapshot {
  id: string;
  orderNumber: string;
  acceptedOfferId: string;
  lotId: string;
  farmerId: string;
  buyerId: string;
  status: OrderStatus;
  cancelledAt?: string | null;
  cancelledBy?: string | null;
  cancellationReason?: string | null;
  pickupPlannedDate?: string | null;
  pickupAddress?: string | null;
  deliveryAddress?: string | null;
  fulfillmentNotes?: string | null;
  idempotencyKey?: string | null;
  createdAt: string;
  updatedAt: string;
  timelineEvents?: OrderTimelineEventItem[];
  transportRequests?: any[];
  storageRequests?: any[];
}

export interface OrderTimelineEventItem {
  id: string;
  orderId: string;
  status: OrderStatus | string;
  actorId: string;
  actorRole: 'FARMER' | 'BUYER' | 'SYSTEM';
  actorName: string;
  notes?: string | null;
  createdAt: string;
}

export interface CreateOrderInput {
  acceptedOfferId: string;
  userId: string;
  idempotencyKey?: string;
  pickupAddress?: string;
  deliveryAddress?: string;
  notes?: string;
}

export interface TransitionOrderStatusInput {
  orderId: string;
  userId: string;
  targetStatus: OrderStatus;
  notes?: string;
  pickupPlannedDate?: string;
  pickupAddress?: string;
  deliveryAddress?: string;
}

export interface CancelOrderInput {
  orderId: string;
  userId: string;
  cancellationReason?: string;
}

export interface OrderFilterOptions {
  userId?: string;
  role?: 'FARMER' | 'BUYER';
  statusCategory?: 'ALL' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
}
