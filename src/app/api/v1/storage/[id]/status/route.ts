import { NextRequest, NextResponse } from 'next/server';
import { storageRepository } from '@/lib/repositories/storageRepository';
import { transitionStorageStatusSchema } from '@/lib/validations/phase6';
import { getAuthSession } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const requestId = params.id;
    const body = await req.json();

    const session = await getAuthSession(req);
    const userId = session?.id || body.userId || req.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { success: false, code: 'UNAUTHORIZED_ACCESS', message: 'User session is required' },
        { status: 401 }
      );
    }

    const validation = transitionStorageStatusSchema.safeParse({ ...body, requestId, userId });
    if (!validation.success) {
      return NextResponse.json(
        { success: false, code: 'INVALID_INPUT', errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const updatedRequest = await storageRepository.transitionStorageStatus(validation.data);

    return NextResponse.json({
      success: true,
      request: updatedRequest,
      message: `Storage status updated to '${validation.data.targetStatus}' successfully.`,
    });
  } catch (error: any) {
    const errorMsg = error.message || '';
    let status = 400;
    let code = 'INVALID_ACTION';

    if (errorMsg.startsWith('STORAGE_NOT_FOUND')) {
      status = 404;
      code = 'STORAGE_NOT_FOUND';
    } else if (errorMsg.startsWith('CAPACITY_OVERBOOKED')) {
      status = 409;
      code = 'CAPACITY_OVERBOOKED';
    } else if (errorMsg.startsWith('UNAUTHORIZED')) {
      status = 403;
      code = 'UNAUTHORIZED_PARTICIPANT';
    } else if (errorMsg.startsWith('INVALID_STATE_TRANSITION')) {
      status = 409;
      code = 'INVALID_STATE_TRANSITION';
    }

    return NextResponse.json({ success: false, code, message: errorMsg }, { status });
  }
}
