import { NextResponse } from 'next/server';
import { marketRepository } from '@/lib/repositories/marketRepository';
import { marketIntelligenceQuerySchema } from '@/lib/validations/phase8';
import { notificationService } from '@/lib/services/notificationService';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const queryObj = Object.fromEntries(searchParams.entries());

    const parsed = marketIntelligenceQuerySchema.safeParse(queryObj);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'INVALID_QUERY_PARAMETERS', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { crop, district, mandi } = parsed.data;
    const prices = await marketRepository.getCurrentMarketPrices(crop, district, mandi);

    // Evaluate matching data-condition market alerts (Correction #3 & #8)
    if (prices.length > 0 && district) {
      try {
        await notificationService.evaluateMarketAlerts(crop, district, prices[0].modalPrice, prices[0].isDemoData);
      } catch (err) {
        console.error('Silent market alert evaluation error:', err);
      }
    }

    return NextResponse.json({
      success: true,
      count: prices.length,
      crop,
      prices,
    });
  } catch (error: any) {
    console.error('Market intelligence current query error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_SERVER_ERROR', message: error.message },
      { status: 500 }
    );
  }
}
