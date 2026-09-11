import { NextResponse } from 'next/server';
import { lotRepository } from '@/lib/repositories/lotRepository';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const latStr = searchParams.get('lat') || '18.5204'; // Default Pune origin
    const lngStr = searchParams.get('lng') || '73.8567';
    const radiusStr = searchParams.get('radiusKm') || '50';
    const cropFilter = searchParams.get('crop') || undefined;

    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    const radiusKm = parseFloat(radiusStr);

    if (isNaN(lat) || isNaN(lng) || isNaN(radiusKm)) {
      return NextResponse.json({ success: false, message: 'Invalid latitude, longitude, or radius' }, { status: 400 });
    }

    const lots = await lotRepository.findNearbyLots(lat, lng, radiusKm, cropFilter);

    return NextResponse.json({
      success: true,
      origin: { latitude: lat, longitude: lng },
      radiusKm,
      count: lots.length,
      lots,
    });
  } catch (error: any) {
    console.error('API Nearby Lots Error:', error);
    return NextResponse.json({ success: false, message: 'Server error querying nearby lots' }, { status: 500 });
  }
}
