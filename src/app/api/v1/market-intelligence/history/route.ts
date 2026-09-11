import { NextResponse } from 'next/server';
import { marketRepository } from '@/lib/repositories/marketRepository';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const crop = searchParams.get('crop') || 'Onion';
    const mandi = searchParams.get('mandi') || 'Lasalgaon APMC';
    const days = parseInt(searchParams.get('days') || '30', 10);

    const history = await marketRepository.getHistoricalMarketTrends(crop, mandi, days);

    return NextResponse.json({
      success: true,
      history,
    });
  } catch (error: any) {
    console.error('Market intelligence history query error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_SERVER_ERROR', message: error.message },
      { status: 500 }
    );
  }
}
