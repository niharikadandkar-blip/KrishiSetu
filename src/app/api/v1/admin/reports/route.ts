import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { reportService } from '@/lib/services/reportService';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }

    if ((session.role as string) !== 'ADMIN') {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const category = searchParams.get('category') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 20;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : 0;

    const result = await reportService.getAdminReports(session.role, {
      status: status as any,
      category: category as any,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      reports: result.reports,
      total: result.total,
    });
  } catch (error: any) {
    if (error.message.includes('UNAUTHORIZED')) {
      return NextResponse.json({ error: 'FORBIDDEN', message: error.message }, { status: 403 });
    }

    console.error('Fetch admin reports error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_SERVER_ERROR', message: error.message },
      { status: 500 }
    );
  }
}
