import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { notificationRepository } from '@/lib/repositories/notificationRepository';
import { createMarketAlertSchema } from '@/lib/validations/phase9';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }

    const alerts = await notificationRepository.getUserMarketAlertConfigs(session.id);

    return NextResponse.json({
      success: true,
      alerts,
    });
  } catch (error: any) {
    console.error('Fetch market alert configs error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_SERVER_ERROR', message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const validated = createMarketAlertSchema.parse(body);

    const alert = await notificationRepository.createMarketAlertConfig(
      session.id,
      validated.cropName,
      validated.district,
      validated.targetPrice,
      validated.condition
    );

    return NextResponse.json({
      success: true,
      alert,
    });
  } catch (error: any) {
    console.error('Create market alert config error:', error);
    return NextResponse.json(
      { error: 'BAD_REQUEST', message: error.message },
      { status: 400 }
    );
  }
}
