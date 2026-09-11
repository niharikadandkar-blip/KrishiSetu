import { NextRequest, NextResponse } from 'next/server';
import { storageRepository } from '@/lib/repositories/storageRepository';
import { getAuthSession } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const requestId = params.id;
    const session = await getAuthSession(req);
    const requestingUserId = session?.id || req.nextUrl.searchParams.get('userId') || req.headers.get('x-user-id') || undefined;

    const request = await storageRepository.findStorageById(requestId, requestingUserId);

    if (!request) {
      return NextResponse.json(
        { success: false, code: 'STORAGE_NOT_FOUND', message: 'Storage reservation record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      request,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, code: 'SERVER_ERROR', message: error.message || 'Failed to fetch storage details' },
      { status: 500 }
    );
  }
}
