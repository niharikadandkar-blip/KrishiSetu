import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { notificationRepository } from '@/lib/repositories/notificationRepository';
import { updateNotificationPreferencesSchema } from '@/lib/validations/phase9';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }

    const preferences = await notificationRepository.getPreferences(session.id);

    return NextResponse.json({
      success: true,
      preferences,
    });
  } catch (error: any) {
    console.error('Fetch notification preferences error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_SERVER_ERROR', message: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const validated = updateNotificationPreferencesSchema.parse(body);

    const preferences = await notificationRepository.updatePreferences(session.id, validated);

    return NextResponse.json({
      success: true,
      preferences,
    });
  } catch (error: any) {
    console.error('Update notification preferences error:', error);
    return NextResponse.json(
      { error: 'BAD_REQUEST', message: error.message },
      { status: 400 }
    );
  }
}
