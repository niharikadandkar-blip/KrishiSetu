import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { notificationRepository } from '@/lib/repositories/notificationRepository';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }

    const unreadCount = await notificationRepository.getUnreadCount(session.id);

    return NextResponse.json({
      success: true,
      unreadCount,
    });
  } catch (error: any) {
    console.error('Fetch unread count error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_SERVER_ERROR', message: error.message },
      { status: 500 }
    );
  }
}
