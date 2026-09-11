import { NextResponse } from 'next/server';
import { marketRepository } from '@/lib/repositories/marketRepository';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const district = searchParams.get('district') || 'Nashik';
    const days = parseInt(searchParams.get('days') || '5', 10);

    const forecast = await marketRepository.getWeatherForecast(district, days);

    return NextResponse.json({
      success: true,
      district,
      forecast,
    });
  } catch (error: any) {
    console.error('Weather forecast query error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_SERVER_ERROR', message: error.message },
      { status: 500 }
    );
  }
}
