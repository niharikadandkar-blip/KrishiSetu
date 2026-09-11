import { NextRequest, NextResponse } from 'next/server';
import { storageRepository } from '@/lib/repositories/storageRepository';
import { createStorageRequestSchema } from '@/lib/validations/phase6';
import { getAuthSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    const mode = req.nextUrl.searchParams.get('mode') || 'DISCOVER';

    if (mode === 'DISCOVER') {
      const district = req.nextUrl.searchParams.get('district') || undefined;
      const facilityType = req.nextUrl.searchParams.get('facilityType') || undefined;
      const facilities = await storageRepository.discoverStorageFacilities(district, facilityType);
      return NextResponse.json({ success: true, count: facilities.length, facilities });
    } else {
      const userId = session?.id || req.nextUrl.searchParams.get('userId') || req.headers.get('x-user-id');
      if (!userId) {
        return NextResponse.json(
          { success: false, code: 'UNAUTHORIZED_ACCESS', message: 'User session or User ID required' },
          { status: 401 }
        );
      }
      const requests = await storageRepository.findRequestsByUser(userId);
      return NextResponse.json({ success: true, count: requests.length, requests });
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, code: 'SERVER_ERROR', message: error.message || 'Failed to fetch storage data' },
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
    const validation = createStorageRequestSchema.safeParse(payload);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, code: 'INVALID_INPUT', errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const request = await storageRepository.createStorageRequest(validation.data);

    return NextResponse.json({
      success: true,
      request,
      message: 'Storage reservation request created successfully.',
    });
  } catch (error: any) {
    const errorMsg = error.message || '';
    let status = 400;
    let code = 'INVALID_ACTION';

    if (errorMsg.startsWith('FACILITY_NOT_FOUND')) {
      status = 404;
      code = 'FACILITY_NOT_FOUND';
    } else if (errorMsg.startsWith('CAPACITY_OVERBOOKED')) {
      status = 409;
      code = 'CAPACITY_OVERBOOKED';
    } else if (errorMsg.startsWith('UNIT_MISMATCH')) {
      status = 400;
      code = 'UNIT_MISMATCH';
    } else if (errorMsg.startsWith('UNAUTHORIZED')) {
      status = 403;
      code = 'UNAUTHORIZED_ACTION';
    }

    return NextResponse.json({ success: false, code, message: errorMsg }, { status });
  }
}
