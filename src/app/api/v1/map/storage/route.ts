import { NextResponse } from 'next/server';
import { storageRepository } from '@/lib/repositories/storageRepository';
import { storageMapQuerySchema } from '@/lib/validations/phase7';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const queryObj = Object.fromEntries(searchParams.entries());
    
    const parsed = storageMapQuerySchema.safeParse(queryObj);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'INVALID_QUERY_PARAMETERS', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { district, facilityType, crop, minCapacity, latitude, longitude, limit } = parsed.data;

    const userLocation = (latitude !== undefined && longitude !== undefined)
      ? { latitude, longitude }
      : undefined;

    const facilities = await storageRepository.getStorageFacilitiesForMap({
      district,
      facilityType,
      crop,
      minCapacity,
      userLocation,
      limit,
    });

    return NextResponse.json({
      success: true,
      count: facilities.length,
      facilities,
    });
  } catch (error: any) {
    console.error('Storage map query error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_SERVER_ERROR', message: error.message },
      { status: 500 }
    );
  }
}
