import { NextResponse } from 'next/server';
import { marketRepository } from '@/lib/repositories/marketRepository';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const crop = searchParams.get('crop') || 'Onion';
    const mandi = searchParams.get('mandi') || undefined;

    const outlook = await marketRepository.getPriceOutlook(crop, mandi);

    return NextResponse.json({
      success: true,
      outlook,
    });
  } catch (error: any) {
    console.error('Market outlook query error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_SERVER_ERROR', message: error.message },
      { status: 500 }
    );
  }
}
