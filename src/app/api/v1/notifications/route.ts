import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { notificationRepository } from '@/lib/repositories/notificationRepository';
import { notificationQuerySchema } from '@/lib/validations/phase9';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || undefined;
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : 0;

    const result = await notificationRepository.getUserNotifications(session.id, {
      category: category as any,
      unreadOnly,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      notifications: result.notifications,
      total: result.total,
      unreadCount: result.unreadCount,
    });
  } catch (error: any) {
    console.error('Fetch notifications error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_SERVER_ERROR', message: error.message },
      { status: 500 }
    );
  }
}
