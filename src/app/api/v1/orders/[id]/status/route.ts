import { NextRequest, NextResponse } from 'next/server';
import { orderRepository } from '@/lib/repositories/orderRepository';
import { transitionOrderStatusSchema } from '@/lib/validations/phase5';
import { getAuthSession } from '@/lib/auth';
import { notificationService } from '@/lib/services/notificationService';

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const orderId = params.id;
    const body = await req.json();

    const session = await getAuthSession(req);
    const userId = session?.id || body.userId || req.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { success: false, code: 'UNAUTHORIZED_PARTICIPANT', message: 'User session is required' },
        { status: 401 }
      );
    }

    const validation = transitionOrderStatusSchema.safeParse({ ...body, orderId, userId });
    if (!validation.success) {
      return NextResponse.json(
        { success: false, code: 'INVALID_INPUT', errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const updatedOrder = await orderRepository.transitionOrderStatus(validation.data);

    // Post-transaction Event Notification (Correction #1: Safe notification trigger)
    try {
      const recipientUserId = userId === updatedOrder.farmerId ? updatedOrder.buyerId : updatedOrder.farmerId;
      await notificationService.notifyOrderEvent({
        eventType: 'ORDER_STATUS_CHANGED',
        recipientUserId,
        orderId: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        cropName: updatedOrder.cropName,
        quantity: updatedOrder.quantity,
        status: updatedOrder.status,
      });
    } catch (err) {
      console.error('Silent order status notification error:', err);
    }

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      message: `Order status updated to '${validation.data.targetStatus}' successfully.`,
    });
  } catch (error: any) {
    const errorMsg = error.message || '';
    let status = 400;
    let code = 'INVALID_ACTION';

    if (errorMsg.startsWith('ORDER_NOT_FOUND')) {
      status = 404;
      code = 'ORDER_NOT_FOUND';
    } else if (errorMsg.startsWith('UNAUTHORIZED_PARTICIPANT') || errorMsg.startsWith('UNAUTHORIZED_ACTION')) {
      status = 403;
      code = 'UNAUTHORIZED_PARTICIPANT';
    } else if (errorMsg.startsWith('INVALID_STATE_TRANSITION')) {
      status = 409;
      code = 'INVALID_STATE_TRANSITION';
    }

    return NextResponse.json(
      { success: false, code, message: errorMsg },
      { status }
    );
  }
}
