import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { notificationRepository } from '@/lib/repositories/notificationRepository';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const notification = await notificationRepository.markAsRead(id, session.id);

    if (!notification) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Notification not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      notification,
    });
  } catch (error: any) {
    if (error.message?.includes('UNAUTHORIZED_IDOR')) {
      return NextResponse.json({ error: 'FORBIDDEN', message: error.message }, { status: 403 });
    }
    console.error('Mark notification as read error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_SERVER_ERROR', message: error.message },
      { status: 500 }
    );
  }
}
