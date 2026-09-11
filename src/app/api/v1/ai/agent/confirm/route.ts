import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { previewTokenStore } from '@/lib/ai/PreviewTokenStore';
import { lotRepository } from '@/lib/repositories/lotRepository';
import { biddingRepository } from '@/lib/repositories/biddingRepository';
import { orderRepository } from '@/lib/repositories/orderRepository';
import { transportRepository } from '@/lib/repositories/transportRepository';
import { storageRepository } from '@/lib/repositories/storageRepository';
import { reportRepository } from '@/lib/repositories/reportRepository';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthSession(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED: Please sign in to confirm this action.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { previewId, actionType } = body;

    if (!previewId || !actionType) {
      return NextResponse.json(
        { success: false, error: 'INVALID_REQUEST: previewId and actionType are required.' },
        { status: 400 }
      );
    }

    // 1. Consume & re-verify preview token server-side (Atomic one-time use)
    const record = previewTokenStore.consumePreviewToken(previewId, user.id, actionType);

    if (!record) {
      return NextResponse.json(
        {
          success: false,
          error: 'STALE_PREVIEW: These details have changed or the confirmation link expired. Please review the latest information and try again.',
        },
        { status: 400 }
      );
    }

    const args = record.arguments;

    // 2. Dispatch to canonical business services/repositories with double server-side revalidation
    switch (actionType) {
      case 'CREATE_CROP_LISTING': {
        if (user.role !== 'FARMER') {
          return NextResponse.json(
            { success: false, error: 'UNAUTHORIZED_ROLE: Only registered farmers can publish listings.' },
            { status: 403 }
          );
        }

        const newLot = await lotRepository.createLot({
          farmerId: user.id,
          cropName: String(args.cropName),
          variety: args.variety ? String(args.variety) : undefined,
          quantityAvailable: Number(args.quantityAvailable),
          unit: String(args.unit || 'Quintal'),
          askPricePerUnit: Number(args.askPricePerUnit),
          expectedHarvestDate: new Date().toISOString(),
          alreadyHarvested: true,
          publicDistrict: String(args.publicDistrict || 'Nashik'),
          publicTaluka: String(args.publicTaluka || 'Niphad'),
          publicVillage: String(args.publicVillage || 'Pimplas'),
        });

        return NextResponse.json({
          success: true,
          message: 'Produce lot successfully published to KrishiSetu Marketplace!',
          data: newLot,
        });
      }

      case 'ACCEPT_OFFER': {
        const offerId = String(args.offerId);
        const currentOffer = await db.offerAndBid.findUnique({
          where: { id: offerId },
          include: { lot: true },
        });

        if (!currentOffer) {
          return NextResponse.json(
            { success: false, error: 'STALE_STATE: The offer no longer exists.' },
            { status: 400 }
          );
        }

        if (currentOffer.lot.farmerId !== user.id) {
          return NextResponse.json(
            { success: false, error: 'UNAUTHORIZED: You do not own this produce lot.' },
            { status: 403 }
          );
        }

        if (currentOffer.status !== 'PENDING') {
          return NextResponse.json(
            {
              success: false,
              error: `STALE_STATE: Offer status has changed to '${currentOffer.status}'. Cannot accept.`,
            },
            { status: 400 }
          );
        }

        const accepted = await biddingRepository.respondToBid({
          bidId: currentOffer.id,
          userId: user.id,
          action: 'ACCEPT',
        });

        return NextResponse.json({
          success: true,
          message: 'Offer successfully accepted! Deal commitment locked.',
          data: accepted,
        });
      }

      case 'REJECT_OFFER': {
        const offerId = String(args.offerId);
        const currentOffer = await db.offerAndBid.findUnique({
          where: { id: offerId },
          include: { lot: true },
        });
        if (!currentOffer || currentOffer.status !== 'PENDING') {
          return NextResponse.json(
            { success: false, error: 'STALE_STATE: Offer status has changed.' },
            { status: 400 }
          );
        }

        const rejected = await biddingRepository.respondToBid({
          bidId: currentOffer.id,
          userId: user.id,
          action: 'REJECT',
        });

        return NextResponse.json({
          success: true,
          message: 'Offer rejected.',
          data: rejected,
        });
      }

      case 'COUNTER_OFFER': {
        const parentOfferId = String(args.parentOfferId);
        const parentOffer = await db.offerAndBid.findUnique({
          where: { id: parentOfferId },
          include: { lot: true },
        });
        if (!parentOffer || parentOffer.status !== 'PENDING') {
          return NextResponse.json(
            { success: false, error: 'STALE_STATE: Original offer is no longer pending.' },
            { status: 400 }
          );
        }

        const counter = await biddingRepository.respondToBid({
          bidId: parentOffer.id,
          userId: user.id,
          action: 'COUNTER',
          counterPricePerUnit: Number(args.counterPricePerUnit),
          counterQuantity: Number(args.counterQuantity || parentOffer.quantity),
        });

        return NextResponse.json({
          success: true,
          message: 'Counter offer submitted.',
          data: counter,
        });
      }

      case 'GENERATE_ORDER': {
        const offerId = String(args.acceptedOfferId);
        const offer = await db.offerAndBid.findUnique({
          where: { id: offerId },
        });
        if (!offer || offer.status !== 'ACCEPTED') {
          return NextResponse.json(
            { success: false, error: 'STALE_STATE: Offer is not in ACCEPTED state.' },
            { status: 400 }
          );
        }

        const order = await orderRepository.createOrderFromAcceptedOffer({
          acceptedOfferId: offer.id,
          userId: user.id,
        });

        return NextResponse.json({
          success: true,
          message: 'Deal receipt generated and order created successfully!',
          data: order,
        });
      }

      case 'REQUEST_TRANSPORT': {
        const request = await transportRepository.createTransportRequest({
          userId: user.id,
          providerId: String(args.providerId),
          pickupVillage: 'Niphad',
          pickupTaluka: 'Niphad',
          pickupDistrict: String(args.pickupDistrict),
          deliveryVillage: 'Vashi',
          deliveryTaluka: 'Thane',
          deliveryDistrict: String(args.destinationDistrict),
          cropCategory: 'Vegetables',
          quantity: Number(args.cargoWeightQuintals),
          scheduledPickupDate: new Date().toISOString(),
        });

        return NextResponse.json({
          success: true,
          message: 'Transport booking request sent to provider.',
          data: request,
        });
      }

      case 'RESERVE_STORAGE': {
        const reservation = await storageRepository.createStorageRequest({
          userId: user.id,
          facilityId: String(args.facilityId),
          cropName: 'Onion',
          quantity: Number(args.reservedCapacityUnits),
          unit: 'Quintal',
          durationDays: Number(args.durationDays),
          expectedCheckInDate: new Date().toISOString(),
        });

        return NextResponse.json({
          success: true,
          message: 'Storage capacity reservation request submitted.',
          data: reservation,
        });
      }

      case 'SUBMIT_REPORT': {
        const report = await reportRepository.createReport({
          reporterId: user.id,
          reportedUserId: String(args.reportedUserId),
          category: 'FRAUD',
          description: String(args.reason),
        });

        return NextResponse.json({
          success: true,
          message: 'Report submitted to KrishiSetu Trust & Safety Team.',
          data: report,
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `UNSUPPORTED_ACTION: Action type '${actionType}' is not supported.` },
          { status: 400 }
        );
    }
  } catch (err: any) {
    console.error('Error confirming action:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Confirmation failed due to server error' },
      { status: 500 }
    );
  }
}
