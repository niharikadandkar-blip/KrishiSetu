import { NextRequest, NextResponse } from 'next/server';
import { lotRepository } from '@/lib/repositories/lotRepository';
import { statusTransitionSchema } from '@/lib/validations/phase3';

export async function POST(
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

    // Zod validation
    const validationResult = statusTransitionSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, errors: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { targetStatus } = validationResult.data;

    // Enforce lot state integrity & commitment checks in repository
    const updatedLot = await lotRepository.transitionStatus(lotId, farmerId, targetStatus);

    return NextResponse.json({
      success: true,
      message: `Produce lot status transitioned to ${targetStatus}`,
      lot: updatedLot,
    });
  } catch (error: any) {
    const status = error.message?.includes('Forbidden')
      ? 403
      : error.message?.includes('Cannot transition')
      ? 409 // Conflict
      : 400;

    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update status' },
      { status }
    );
  }
}
