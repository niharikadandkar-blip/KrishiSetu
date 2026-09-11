import { NextRequest, NextResponse } from 'next/server';
import { transportRepository } from '@/lib/repositories/transportRepository';
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

    const request = await transportRepository.findTransportById(requestId, requestingUserId);

    if (!request) {
      return NextResponse.json(
        { success: false, code: 'TRANSPORT_NOT_FOUND', message: 'Transport request record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      request,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, code: 'SERVER_ERROR', message: error.message || 'Failed to fetch transport details' },
      { status: 500 }
    );
  }
}
