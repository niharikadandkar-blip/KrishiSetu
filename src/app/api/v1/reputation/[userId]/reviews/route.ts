import { NextRequest, NextResponse } from 'next/server';
import { reputationService } from '@/lib/services/reputationService';

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ userId: string }> }
) {
  try {
    const params = await props.params;
    const { userId } = params;
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 20;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : 0;

    const result = await reputationService.getUserReviews(userId, { limit, offset });

    return NextResponse.json({
      success: true,
      reviews: result.reviews,
      total: result.total,
    });
  } catch (error: any) {
    console.error('Fetch user reviews error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_SERVER_ERROR', message: error.message },
      { status: 500 }
    );
  }
}
