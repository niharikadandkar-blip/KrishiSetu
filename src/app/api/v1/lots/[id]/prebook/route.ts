import { NextResponse } from 'next/server';
import { prebookingRepository } from '@/lib/repositories/prebookingRepository';
import { prebookingSchema } from '@/lib/validations/phase2';

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const lotId = params.id;
    const body = await req.json();

    const validation = prebookingSchema.safeParse({ ...body, lotId });
    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: 'Validation Error', errors: validation.error.format() },
        { status: 400 }
      );
    }

    const result = await prebookingRepository.createPrebooking(validation.data);

    return NextResponse.json({
      success: true,
      prebooking: result.prebooking,
      totalBooked: result.totalBooked,
      lotCapacity: result.lotCapacity,
      thresholdReached: result.thresholdReached,
      message: result.thresholdReached
        ? 'Pre-booking successful! Harvest capacity threshold reached for this lot.'
        : 'Harvest pre-booking recorded successfully.',
    });
  } catch (error: any) {
    console.error('API Prebook Error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Server error processing pre-booking' }, { status: 500 });
  }
}
