import { NextRequest, NextResponse } from 'next/server';
import { reputationService } from '@/lib/services/reputationService';

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ userId: string }> }
) {
  try {
    const params = await props.params;
    const { userId } = params;
    const summary = await reputationService.getUserReputationSummary(userId);

    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (error: any) {
    if (error.message === 'User not found') {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'User not found' }, { status: 404 });
    }
    console.error('Fetch reputation summary error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_SERVER_ERROR', message: error.message },
      { status: 500 }
    );
  }
}
