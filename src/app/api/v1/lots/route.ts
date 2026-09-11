import { NextResponse } from 'next/server';
import { lotRepository } from '@/lib/repositories/lotRepository';
import { createLotSchema } from '@/lib/validations/phase2';

export async function POST(req: Request) {
  try {
    const idempotencyKey = req.headers.get('X-Idempotency-Key') || undefined;
    const body = await req.json();

    const payload = { ...body, idempotencyKey: body.idempotencyKey || idempotencyKey };
    const validation = createLotSchema.safeParse(payload);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: 'Validation Error', errors: validation.error.format() },
        { status: 400 }
      );
    }

    const newLot = await lotRepository.createLot(validation.data);

    return NextResponse.json({
      success: true,
      lot: newLot,
      message: 'Produce lot published successfully!',
    });
  } catch (error: any) {
    console.error('API Create Lot Error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Server error creating lot' }, { status: 500 });
  }
}
