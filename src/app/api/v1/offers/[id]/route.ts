import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { biddingRepository } from '@/lib/repositories/biddingRepository';
import { getAuthSession } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const offerId = params.id;
    const session = await getAuthSession(req);

    const offer = await db.offerAndBid.findUnique({
      where: { id: offerId },
      include: {
        lot: {
          include: {
            farmer: {
              select: { id: true, name: true, mobile: true, profileVerified: true },
            },
          },
        },
        bidder: {
          select: { id: true, name: true, mobile: true, profileVerified: true },
        },
      },
    });

    if (!offer) {
      return NextResponse.json(
        { success: false, code: 'OFFER_NOT_FOUND', message: 'Offer record not found' },
        { status: 404 }
      );
    }

    // Participant Authorization & IDOR Protection Check
    if (session) {
      const isFarmer = offer.lot.farmerId === session.id;
      const isBidder = offer.bidderId === session.id;
      if (!isFarmer && !isBidder) {
        return NextResponse.json(
          { success: false, code: 'UNAUTHORIZED_PARTICIPANT', message: 'Forbidden: You are not an authorized participant in this offer.' },
          { status: 403 }
        );
      }
    }

    const timeline = await biddingRepository.getNegotiationTimeline(offerId);

    return NextResponse.json({
      success: true,
      offer,
      timeline,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, code: 'SERVER_ERROR', message: error.message || 'Failed to fetch offer details' },
      { status: 500 }
    );
  }
}
