import { NextResponse } from 'next/server';
import { harvestLogRepository } from '@/lib/repositories/harvestLogRepository';
import { harvestLogSchema } from '@/lib/validations/phase2';

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const lotId = params.id;
    const body = await req.json();

    const validation = harvestLogSchema.safeParse({ ...body, lotId });
    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: 'Validation Error', errors: validation.error.format() },
        { status: 400 }
      );
    }

    const log = await harvestLogRepository.createLog(validation.data);

    return NextResponse.json({
      success: true,
      log,
      message: `Harvest camera photo log recorded for stage '${validation.data.stage}'.`,
    });
  } catch (error: any) {
    console.error('API Harvest Log Error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Server error recording harvest camera log' }, { status: 500 });
  }
}
