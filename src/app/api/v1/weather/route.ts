import { NextResponse } from 'next/server';
import { marketRepository } from '@/lib/repositories/marketRepository';
import { weatherQuerySchema } from '@/lib/validations/phase8';
import { getAuthSession } from '@/lib/auth';
import { notificationService } from '@/lib/services/notificationService';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const queryObj = Object.fromEntries(searchParams.entries());

    const parsed = weatherQuerySchema.safeParse(queryObj);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'INVALID_QUERY_PARAMETERS', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { district, taluka } = parsed.data;
    const weather = await marketRepository.getWeatherObservation(district, taluka);

    // Evaluate weather advisory alerts if authenticated session exists (Correction #3 & #9)
    try {
      const session = await getAuthSession(req as any);
      if (session && weather) {
        await notificationService.evaluateWeatherAlerts(
          session.id,
          weather.district,
          weather.condition,
          weather.rainfallMm,
          weather.humidityPct,
          weather.isDemoData
        );
      }
    } catch (err) {
      console.error('Silent weather alert evaluation error:', err);
    }

    return NextResponse.json({
      success: true,
      weather,
    });
  } catch (error: any) {
    console.error('Weather observation query error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_SERVER_ERROR', message: error.message },
      { status: 500 }
    );
  }
}
