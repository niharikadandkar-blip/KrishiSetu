import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { notificationRepository } from '@/lib/repositories/notificationRepository';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const deleted = await notificationRepository.deleteMarketAlertConfig(id, session.id);

    if (!deleted) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Alert config not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Alert configuration deleted',
    });
  } catch (error: any) {
    if (error.message?.includes('UNAUTHORIZED_IDOR')) {
      return NextResponse.json({ error: 'FORBIDDEN', message: error.message }, { status: 403 });
    }
    console.error('Delete alert config error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_SERVER_ERROR', message: error.message },
      { status: 500 }
    );
  }
}
