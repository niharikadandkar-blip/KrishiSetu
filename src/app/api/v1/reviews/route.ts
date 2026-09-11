import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { reputationService } from '@/lib/services/reputationService';
import { createReviewSchema } from '@/lib/validations/phase10';

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const validation = createReviewSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Invalid input data', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const review = await reputationService.submitReview(session.id, validation.data);

    return NextResponse.json({
      success: true,
      review,
    });
  } catch (error: any) {
    if (
      error.message.includes('not eligible') ||
      error.message.includes('Order not found') ||
      error.message.includes('only allowed for completed') ||
      error.message.includes('already submitted') ||
      error.message.includes('Cannot submit')
    ) {
      return NextResponse.json({ error: 'FORBIDDEN', message: error.message }, { status: 403 });
    }

    console.error('Submit review error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_SERVER_ERROR', message: error.message },
      { status: 500 }
    );
  }
}
