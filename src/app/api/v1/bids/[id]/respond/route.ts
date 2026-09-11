import { NextRequest, NextResponse } from 'next/server';
import { biddingRepository } from '@/lib/repositories/biddingRepository';
import { respondOfferSchema } from '@/lib/validations/phase4';
import { getAuthSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { notificationService } from '@/lib/services/notificationService';

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const bidId = params.id;
    const body = await req.json();

    const session = await getAuthSession(req);
    const userId = session?.id || body.userId || req.headers.get('x-user-id');

    const validation = respondOfferSchema.safeParse({ ...body, bidId, userId });
    if (!validation.success) {
      return NextResponse.json(
        { success: false, code: 'INVALID_INPUT', errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const result = await biddingRepository.respondToBid(validation.data);

    // Post-transaction Event Notification (Correction #1: Safe notification trigger)
    try {
      const bidRecord = await db.offerAndBid.findUnique({
        where: { id: bidId },
        include: { lot: true },
      });
      if (bidRecord) {
        const action = validation.data.action;
        const recipientUserId = bidRecord.bidderId === userId ? bidRecord.lot.farmerId : bidRecord.bidderId;
        const eventType =
          action === 'ACCEPT'
            ? 'OFFER_ACCEPTED'
            : action === 'REJECT'
            ? 'OFFER_REJECTED'
            : 'COUNTER_OFFER_RECEIVED';

        await notificationService.notifyOfferEvent({
          eventType,
          recipientUserId,
          senderUserId: userId,
          offerId: bidRecord.id,
          lotId: bidRecord.lotId,
          cropName: bidRecord.lot.cropName,
          quantity: bidRecord.quantity,
          pricePerUnit: bidRecord.offeredPricePerUnit,
          unit: bidRecord.lot.unit,
        });
      }
    } catch (err) {
      console.error('Silent offer response notification error:', err);
    }

    return NextResponse.json({
      success: true,
      result,
      message: `Offer negotiation action '${validation.data.action}' processed successfully.`,
    });
  } catch (error: any) {
    const errorMsg = error.message || '';
    let status = 400;
    let code = 'INVALID_ACTION';

    if (errorMsg.startsWith('OFFER_NOT_FOUND')) {
      status = 404;
      code = 'OFFER_NOT_FOUND';
    } else if (errorMsg.startsWith('UNAUTHORIZED_PARTICIPANT')) {
      status = 403;
      code = 'UNAUTHORIZED_PARTICIPANT';
    } else if (errorMsg.startsWith('OFFER_CONFLICT') || errorMsg.startsWith('INSUFFICIENT_QUANTITY')) {
      status = 409;
      code = 'OFFER_CONFLICT';
    } else if (errorMsg.startsWith('OFFER_ALREADY_RESPONDED')) {
      status = 409;
      code = 'OFFER_ALREADY_RESPONDED';
    } else if (errorMsg.startsWith('OFFER_EXPIRED')) {
      status = 400;
      code = 'OFFER_EXPIRED';
    }

    return NextResponse.json(
      { success: false, code, message: errorMsg },
      { status }
    );
  }
}
