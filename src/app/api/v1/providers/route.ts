import { NextRequest, NextResponse } from 'next/server';
import { providerRepository } from '@/lib/repositories/providerRepository';
import { registerProviderSchema, addVehicleSchema, addFacilitySchema } from '@/lib/validations/phase6';
import { getAuthSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    const userId = session?.id || req.nextUrl.searchParams.get('userId') || req.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { success: false, code: 'UNAUTHORIZED_ACCESS', message: 'User session or user ID required' },
        { status: 401 }
      );
    }

    const provider = await providerRepository.findProviderByUserId(userId);
    return NextResponse.json({ success: true, provider });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, code: 'SERVER_ERROR', message: error.message || 'Failed to fetch provider profile' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    const body = await req.json();
    const action = req.nextUrl.searchParams.get('action') || body.action || 'REGISTER';

    const userId = session?.id || body.userId || req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { success: false, code: 'UNAUTHORIZED_ACCESS', message: 'User session is required' },
        { status: 401 }
      );
    }

    if (action === 'ADD_VEHICLE') {
      const validation = addVehicleSchema.safeParse({ ...body, userId });
      if (!validation.success) {
        return NextResponse.json(
          { success: false, code: 'INVALID_INPUT', errors: validation.error.flatten().fieldErrors },
          { status: 400 }
        );
      }
      const vehicle = await providerRepository.addVehicle(validation.data);
      return NextResponse.json({ success: true, vehicle, message: 'Transport vehicle added successfully.' });
    }

    if (action === 'ADD_FACILITY') {
      const validation = addFacilitySchema.safeParse({ ...body, userId });
      if (!validation.success) {
        return NextResponse.json(
          { success: false, code: 'INVALID_INPUT', errors: validation.error.flatten().fieldErrors },
          { status: 400 }
        );
      }
      const facility = await providerRepository.addFacility(validation.data);
      return NextResponse.json({ success: true, facility, message: 'Storage facility added successfully.' });
    }

    // Default: REGISTER PROVIDER
    const validation = registerProviderSchema.safeParse({ ...body, userId });
    if (!validation.success) {
      return NextResponse.json(
        { success: false, code: 'INVALID_INPUT', errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const provider = await providerRepository.registerProvider(validation.data);
    return NextResponse.json({
      success: true,
      provider,
      message: 'Provider profile registered successfully.',
    });
  } catch (error: any) {
    const errorMsg = error.message || '';
    let status = 400;
    let code = 'INVALID_ACTION';

    if (errorMsg.startsWith('PROVIDER_NOT_FOUND')) {
      status = 404;
      code = 'PROVIDER_NOT_FOUND';
    } else if (errorMsg.startsWith('UNAUTHORIZED')) {
      status = 403;
      code = 'UNAUTHORIZED_ACTION';
    }

    return NextResponse.json({ success: false, code, message: errorMsg }, { status });
  }
}
