import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { reputationService } from '@/lib/services/reputationService';
import { updateReviewSchema } from '@/lib/validations/phase10';

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }

    const params = await props.params;
    const { id } = params;
    const body = await req.json();
    const validation = updateReviewSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Invalid input data', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const review = await reputationService.updateReview(session.id, id, validation.data);

    return NextResponse.json({
      success: true,
      review,
    });
  } catch (error: any) {
    if (error.message.includes('UNAUTHORIZED_IDOR')) {
      return NextResponse.json({ error: 'FORBIDDEN', message: error.message }, { status: 403 });
    }
    if (error.message === 'Review not found') {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Review not found' }, { status: 404 });
    }

    console.error('Update review error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_SERVER_ERROR', message: error.message },
      { status: 500 }
    );
  }
}
