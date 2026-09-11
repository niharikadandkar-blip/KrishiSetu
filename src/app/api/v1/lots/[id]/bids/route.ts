import { NextRequest, NextResponse } from 'next/server';
import { biddingRepository } from '@/lib/repositories/biddingRepository';
import { bidSchema } from '@/lib/validations/phase2';
import { getAuthSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { notificationService } from '@/lib/services/notificationService';

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const lotId = params.id;
    const idempotencyKey = req.headers.get('X-Idempotency-Key') || undefined;
    const body = await req.json();

    const session = await getAuthSession(req);
    const bidderId = session?.id || body.bidderId || req.headers.get('x-user-id');
    const bidderRole = session?.role || body.bidderRole || 'BUYER';

    const payload = { ...body, lotId, bidderId, bidderRole, idempotencyKey: body.idempotencyKey || idempotencyKey };
    const validation = bidSchema.safeParse(payload);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: 'Validation Error', errors: validation.error.format() },
        { status: 400 }
      );
    }

    const bid = await biddingRepository.createBid(validation.data);

    // Post-transaction Event Notification (Correction #1: After authoritative transaction succeeds)
    try {
      const lot = await db.lot.findUnique({ where: { id: lotId } });
      if (lot) {
        await notificationService.notifyOfferEvent({
          eventType: 'OFFER_RECEIVED',
          recipientUserId: lot.farmerId,
          senderUserId: bidderId,
          offerId: bid.id,
          lotId: lot.id,
          cropName: lot.cropName,
          quantity: bid.quantity,
          pricePerUnit: bid.offeredPricePerUnit,
          unit: lot.unit,
        });
      }
    } catch (err) {
      console.error('Silent offer notification error:', err);
    }

    return NextResponse.json({
      success: true,
      bid,
      message: 'Bid submitted successfully to farmer!',
    });
  } catch (error: any) {
    console.error('API Create Bid Error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Server error submitting bid' }, { status: 500 });
  }
}
