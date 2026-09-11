import { NextRequest, NextResponse } from 'next/server';
import { lotRepository } from '@/lib/repositories/lotRepository';

export async function GET(req: NextRequest) {
  try {
    const farmerId = req.nextUrl.searchParams.get('farmerId') || req.headers.get('x-user-id');
    const statusFilter = req.nextUrl.searchParams.get('status') || 'ALL';

    if (!farmerId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: Farmer ID missing' },
        { status: 401 }
      );
    }

    const lots = await lotRepository.findFarmerLots(farmerId, statusFilter);

    return NextResponse.json({
      success: true,
      count: lots.length,
      lots,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch farmer listings' },
      { status: 500 }
    );
  }
}
