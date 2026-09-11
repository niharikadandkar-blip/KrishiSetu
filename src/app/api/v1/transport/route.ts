import { NextRequest, NextResponse } from 'next/server';
import { transportRepository } from '@/lib/repositories/transportRepository';
import { createTransportRequestSchema } from '@/lib/validations/phase6';
import { getAuthSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    const mode = req.nextUrl.searchParams.get('mode') || 'DISCOVER';

    if (mode === 'DISCOVER') {
      const district = req.nextUrl.searchParams.get('district') || undefined;
      const vehicleType = req.nextUrl.searchParams.get('vehicleType') || undefined;
      const vehicles = await transportRepository.discoverTransportProviders(district, vehicleType);
      return NextResponse.json({ success: true, count: vehicles.length, vehicles });
    } else {
      const userId = session?.id || req.nextUrl.searchParams.get('userId') || req.headers.get('x-user-id');
      if (!userId) {
        return NextResponse.json(
          { success: false, code: 'UNAUTHORIZED_ACCESS', message: 'User session or User ID required' },
          { status: 401 }
        );
      }
      const requests = await transportRepository.findRequestsByUser(userId);
      return NextResponse.json({ success: true, count: requests.length, requests });
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, code: 'SERVER_ERROR', message: error.message || 'Failed to fetch transport data' },
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
        { success: false, code: 'UNAUTHORIZED_ACCESS', message: 'User session is required' },
        { status: 401 }
      );
    }

    const payload = { ...body, userId, idempotencyKey: body.idempotencyKey || idempotencyKey };
    const validation = createTransportRequestSchema.safeParse(payload);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, code: 'INVALID_INPUT', errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const request = await transportRepository.createTransportRequest(validation.data);

    return NextResponse.json({
      success: true,
      request,
      message: 'Transport arrangement request created successfully.',
    });
  } catch (error: any) {
    const errorMsg = error.message || '';
    let status = 400;
    let code = 'INVALID_ACTION';

    if (errorMsg.startsWith('ACTIVE_TRANSPORT_EXISTS')) {
      status = 409;
      code = 'ACTIVE_TRANSPORT_EXISTS';
    } else if (errorMsg.startsWith('UNAUTHORIZED')) {
      status = 403;
      code = 'UNAUTHORIZED_ACTION';
    }

    return NextResponse.json({ success: false, code, message: errorMsg }, { status });
  }
}
