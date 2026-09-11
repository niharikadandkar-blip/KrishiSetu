import { NextRequest, NextResponse } from 'next/server';
import { savedListingRepository } from '@/lib/repositories/savedListingRepository';
import { toggleSavedListingSchema } from '@/lib/validations/phase3';

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId') || req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: User ID missing' },
        { status: 401 }
      );
    }

    const savedListings = await savedListingRepository.getSavedListingsByUser(userId);

    return NextResponse.json({
      success: true,
      count: savedListings.length,
      savedListings,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch saved listings' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = body.userId || req.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: User ID missing' },
        { status: 401 }
      );
    }

    const validationResult = toggleSavedListingSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, errors: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const result = await savedListingRepository.toggleSavedListing(
      userId,
      validationResult.data.lotId
    );

    return NextResponse.json({
      success: true,
      saved: result.saved,
      message: result.saved ? 'Produce lot saved to bookmarks' : 'Produce lot removed from bookmarks',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to toggle saved listing' },
      { status: 500 }
    );
  }
}
