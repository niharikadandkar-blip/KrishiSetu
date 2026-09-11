import { NextResponse } from 'next/server';
import { marketRepository } from '@/lib/repositories/marketRepository';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const crop = searchParams.get('crop') || 'Onion';
    const district = searchParams.get('district') || 'Nashik';
    const lat = searchParams.get('latitude') ? parseFloat(searchParams.get('latitude')!) : undefined;
    const lng = searchParams.get('longitude') ? parseFloat(searchParams.get('longitude')!) : undefined;

    const userLocation = (lat !== undefined && lng !== undefined) ? { latitude: lat, longitude: lng } : undefined;

    const nearbyMarkets = await marketRepository.getNearbyMarkets(crop, userLocation, district);

    return NextResponse.json({
      success: true,
      count: nearbyMarkets.length,
      crop,
      nearbyMarkets,
    });
  } catch (error: any) {
    console.error('Nearby markets query error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_SERVER_ERROR', message: error.message },
      { status: 500 }
    );
  }
}
