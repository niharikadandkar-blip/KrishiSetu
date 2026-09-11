import { NextRequest, NextResponse } from 'next/server';
import { orderRepository } from '@/lib/repositories/orderRepository';
import { getAuthSession } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const orderId = params.id;
    const session = await getAuthSession(req);
    const requestingUserId = session?.id || req.nextUrl.searchParams.get('userId') || req.headers.get('x-user-id') || undefined;

    const order = await orderRepository.findOrderById(orderId, requestingUserId);

    if (!order) {
      return NextResponse.json(
        { success: false, code: 'ORDER_NOT_FOUND', message: 'Order record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error: any) {
    const errorMsg = error.message || '';
    const status = errorMsg.startsWith('UNAUTHORIZED_PARTICIPANT') ? 403 : 500;
    const code = errorMsg.startsWith('UNAUTHORIZED_PARTICIPANT') ? 'UNAUTHORIZED_PARTICIPANT' : 'SERVER_ERROR';

    return NextResponse.json(
      { success: false, code, message: errorMsg || 'Failed to fetch order details' },
      { status }
    );
  }
}
