import { NextRequest, NextResponse } from 'next/server';
import { buyerRequirementService } from '@/lib/services/buyerRequirementService';
import { lotRepository } from '@/lib/repositories/lotRepository';
import { buyerRequirementSchema } from '@/lib/validations/phase3';

export async function GET(req: NextRequest) {
  try {
    const buyerId = req.nextUrl.searchParams.get('buyerId') || req.headers.get('x-user-id');
    const rfqId = req.nextUrl.searchParams.get('rfqId');

    if (!buyerId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: Buyer ID missing' },
        { status: 401 }
      );
    }

    const requirements = await buyerRequirementService.getBuyerRequirements(buyerId);

    // If specific RFQ requested for matching score calculation against active marketplace lots
    if (rfqId) {
      const selectedRfq = requirements.find((r) => r.id === rfqId);
      if (selectedRfq) {
        const activeLots = await lotRepository.searchMarketplaceLots({
          cropName: selectedRfq.targetCrop,
        });

        const matches = activeLots.map((lot) => {
          const matchResult = buyerRequirementService.calculateLotMatchScore(selectedRfq, lot);
          return {
            lot,
            matchResult,
          };
        });

        matches.sort((a, b) => b.matchResult.totalScore - a.matchResult.totalScore);

        return NextResponse.json({
          success: true,
          requirement: selectedRfq,
          matches,
        });
      }
    }

    return NextResponse.json({
      success: true,
      requirements,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch buyer requirements' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const buyerId = body.buyerId || req.headers.get('x-user-id');

    if (!buyerId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: Buyer ID missing' },
        { status: 401 }
      );
    }

    const validationResult = buyerRequirementSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, errors: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const createdRequirement = await buyerRequirementService.createRequirement(validationResult.data);

    return NextResponse.json({
      success: true,
      message: 'Buyer requirement (RFQ) created successfully',
      requirement: createdRequirement,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create buyer requirement' },
      { status: 500 }
    );
  }
}
