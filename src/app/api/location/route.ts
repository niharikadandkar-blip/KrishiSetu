import { NextResponse } from 'next/server';
import { locationRepository } from '@/lib/repositories/locationRepository';
import { locationSchema } from '@/lib/validations';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, state, district, taluka, village, latitude, longitude, formattedAddress } = body;

    if (!userId) {
      return NextResponse.json({ success: false, message: 'User ID is required' }, { status: 400 });
    }

    const validation = locationSchema.safeParse({ state, district, taluka, village, latitude, longitude, formattedAddress });
    if (!validation.success) {
      return NextResponse.json({ success: false, message: 'Invalid location details' }, { status: 400 });
    }

    const saved = await locationRepository.upsertLocation(userId, validation.data);

    return NextResponse.json({ success: true, location: saved });
  } catch (error: any) {
    console.error('API Location Error:', error);
    return NextResponse.json({ success: false, message: 'Failed to save location' }, { status: 500 });
  }
}
