import { NextRequest, NextResponse } from 'next/server';
import { orderRepository } from '@/lib/repositories/orderRepository';
import { createOrderSchema } from '@/lib/validations/phase5';
import { getAuthSession } from '@/lib/auth';
import { notificationService } from '@/lib/services/notificationService';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    const queryUserId = req.nextUrl.searchParams.get('userId');
    const userId = session?.id || queryUserId;
    const role = req.nextUrl.searchParams.get('role') || session?.role || 'BUYER';
    const statusCategory = req.nextUrl.searchParams.get('statusCategory') || 'ALL';

    if (!userId) {
      return NextResponse.json(
        { success: false, code: 'UNAUTHORIZED_PARTICIPANT', message: 'User session or User ID is required' },
        { status: 401 }
      );
    }

    if (role === 'FARMER') {
      const orders = await orderRepository.findOrdersByFarmer(userId, statusCategory);
      return NextResponse.json({ success: true, count: orders.length, orders });
    } else {
      const orders = await orderRepository.findOrdersByBuyer(userId, statusCategory);
      return NextResponse.json({ success: true, count: orders.length, orders });
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, code: 'SERVER_ERROR', message: error.message || 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    const body = await req.json();
    const idempotencyKey = req.headers.get('X-Idempotency-Key') || undefined;

    const userId = session?.id || body.userId || req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { success: false, code: 'UNAUTHORIZED_PARTICIPANT', message: 'User session is required' },
        { status: 401 }
      );
    }

    const payload = { ...body, userId, idempotencyKey: body.idempotencyKey || idempotencyKey };
    const validation = createOrderSchema.safeParse(payload);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, code: 'INVALID_INPUT', errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const order = await orderRepository.createOrderFromAcceptedOffer(validation.data);

    // Post-transaction Event Notification (Correction #1: Safe notification trigger)
    try {
      // Notify both Farmer and Buyer
      await notificationService.notifyOrderEvent({
        eventType: 'ORDER_CREATED',
        recipientUserId: order.farmerId,
        orderId: order.id,
        orderNumber: order.orderNumber,
        cropName: order.cropName,
        quantity: order.quantity,
        status: order.status,
      });

      await notificationService.notifyOrderEvent({
        eventType: 'ORDER_CREATED',
        recipientUserId: order.buyerId,
        orderId: order.id,
        orderNumber: order.orderNumber,
        cropName: order.cropName,
        quantity: order.quantity,
        status: order.status,
      });
    } catch (err) {
      console.error('Silent order notification error:', err);
    }

    return NextResponse.json({
      success: true,
      order,
      message: 'Order generated successfully from accepted commercial commitment.',
    });
  } catch (error: any) {
    const errorMsg = error.message || '';
    let status = 400;
    let code = 'INVALID_ACTION';

    if (errorMsg.startsWith('OFFER_NOT_FOUND')) {
      status = 404;
      code = 'OFFER_NOT_FOUND';
    } else if (errorMsg.startsWith('INVALID_OFFER_STATUS')) {
      status = 409;
      code = 'INVALID_OFFER_STATUS';
    } else if (errorMsg.startsWith('UNAUTHORIZED_PARTICIPANT')) {
      status = 403;
      code = 'UNAUTHORIZED_PARTICIPANT';
    }

    return NextResponse.json(
      { success: false, code, message: errorMsg },
      { status }
    );
  }
}
