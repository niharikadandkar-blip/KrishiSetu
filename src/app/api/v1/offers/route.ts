import { NextRequest, NextResponse } from 'next/server';
import { biddingRepository } from '@/lib/repositories/biddingRepository';
import { getAuthSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    const queryUserId = req.nextUrl.searchParams.get('userId');
    const userId = session?.id || queryUserId;
    const role = req.nextUrl.searchParams.get('role') || session?.role || 'BUYER';
    const lotId = req.nextUrl.searchParams.get('lotId');

    if (!userId && !lotId) {
      return NextResponse.json(
        { success: false, code: 'UNAUTHORIZED_PARTICIPANT', message: 'User session or Lot ID is required' },
        { status: 401 }
      );
    }

    if (lotId) {
      const offers = await biddingRepository.findByLotId(lotId);
      return NextResponse.json({ success: true, count: offers.length, offers });
    }

    if (role === 'FARMER') {
      const offers = await biddingRepository.findOffersByFarmer(userId!);
      return NextResponse.json({ success: true, count: offers.length, offers });
    } else {
      const offers = await biddingRepository.findOffersByBuyer(userId!);
      return NextResponse.json({ success: true, count: offers.length, offers });
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, code: 'SERVER_ERROR', message: error.message || 'Failed to fetch offers' },
      { status: 500 }
    );
  }
}
