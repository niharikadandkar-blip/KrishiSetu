import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { transportRepository } from '@/lib/repositories/transportRepository';

export async function GET(req: Request, props: { params: Promise<{ orderId: string }> }) {
  try {
    const { orderId } = await props.params;
    const authHeader = req.headers.get('authorization') || '';
    const userIdHeader = req.headers.get('x-user-id') || '';

    // Check authentication token or session cookie header
    let userId = userIdHeader;
    let userRole = 'FARMER';

    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const session = await db.sessionToken.findUnique({
        where: { token },
        include: { user: true },
      });
      if (session && session.expiresAt > new Date()) {
        userId = session.userId;
        userRole = session.user.role;
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'UNAUTHENTICATED: Authentication token or x-user-id header required.' },
        { status: 401 }
      );
    }

    const routeDetails = await transportRepository.getOrderRouteGeographicDetails(orderId, userId, userRole);

    return NextResponse.json({
      success: true,
      route: routeDetails,
    });
  } catch (error: any) {
    if (error.message.startsWith('ORDER_NOT_FOUND')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error.message.startsWith('UNAUTHORIZED')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    console.error('Order route map error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_SERVER_ERROR', message: error.message },
      { status: 500 }
    );
  }
}
