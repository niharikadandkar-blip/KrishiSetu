import { NextRequest, NextResponse } from 'next/server';
import { biddingRepository } from '@/lib/repositories/biddingRepository';
import { withdrawOfferSchema } from '@/lib/validations/phase4';
import { getAuthSession } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const offerId = params.id;
    const body = await req.json();

    const session = await getAuthSession(req);
    const userId = session?.id || body.userId || req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { success: false, code: 'UNAUTHORIZED_PARTICIPANT', message: 'User ID is required' },
        { status: 401 }
      );
    }

    const validationResult = withdrawOfferSchema.safeParse({ bidId: offerId, userId, reason: body.reason });
    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, code: 'INVALID_INPUT', errors: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const updatedOffer = await biddingRepository.withdrawOffer(validationResult.data);

    return NextResponse.json({
      success: true,
      message: 'Offer withdrawn successfully',
      offer: updatedOffer,
    });
  } catch (error: any) {
    const code = error.message?.startsWith('OFFER_NOT_FOUND')
      ? 'OFFER_NOT_FOUND'
      : error.message?.startsWith('UNAUTHORIZED_PARTICIPANT')
      ? 'UNAUTHORIZED_PARTICIPANT'
      : error.message?.startsWith('INVALID_STATE_TRANSITION')
      ? 'INVALID_STATE_TRANSITION'
      : 'SERVER_ERROR';

    const status = code === 'UNAUTHORIZED_PARTICIPANT' ? 403 : code === 'OFFER_NOT_FOUND' ? 404 : 400;

    return NextResponse.json(
      { success: false, code, message: error.message || 'Failed to withdraw offer' },
      { status }
    );
  }
}
