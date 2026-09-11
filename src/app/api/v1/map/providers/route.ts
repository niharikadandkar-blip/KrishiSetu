import { NextResponse } from 'next/server';
import { providerRepository } from '@/lib/repositories/providerRepository';
import { transportMapQuerySchema } from '@/lib/validations/phase7';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const queryObj = Object.fromEntries(searchParams.entries());

    const parsed = transportMapQuerySchema.safeParse(queryObj);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'INVALID_QUERY_PARAMETERS', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { district, vehicleType, crop, minCapacity, latitude, longitude, limit } = parsed.data;

    const userLocation = (latitude !== undefined && longitude !== undefined)
      ? { latitude, longitude }
      : undefined;

    const providers = await providerRepository.getTransportProvidersForMap({
      district,
      vehicleType,
      crop,
      minCapacity,
      userLocation,
      limit,
    });

    return NextResponse.json({
      success: true,
      count: providers.length,
      providers,
    });
  } catch (error: any) {
    console.error('Transport providers map query error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_SERVER_ERROR', message: error.message },
      { status: 500 }
    );
  }
}
