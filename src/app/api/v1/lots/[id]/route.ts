import { NextRequest, NextResponse } from 'next/server';
import { lotRepository } from '@/lib/repositories/lotRepository';
import { updateLotSchema } from '@/lib/validations/phase3';

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const lotId = params.id;
    
    // Read requesting user ID from query string or cookie for location privacy check
    const requestingUserId = req.nextUrl.searchParams.get('userId') || undefined;

    const lot = await lotRepository.findLotById(lotId, requestingUserId);

    if (!lot) {
      return NextResponse.json(
        { success: false, message: 'Produce lot not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, lot });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch lot details' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const lotId = params.id;
    const body = await req.json();

    const farmerId = body.farmerId || req.headers.get('x-user-id');
    if (!farmerId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: Farmer ID missing' },
        { status: 401 }
      );
    }

    // Zod Validation
    const validationResult = updateLotSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, errors: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const updatedLot = await lotRepository.updateLot(lotId, farmerId, validationResult.data);

    return NextResponse.json({
      success: true,
      message: 'Produce lot updated successfully',
      lot: updatedLot,
    });
  } catch (error: any) {
    const status = error.message?.includes('Forbidden') ? 403 : 400;
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update produce lot' },
      { status }
    );
  }
}
