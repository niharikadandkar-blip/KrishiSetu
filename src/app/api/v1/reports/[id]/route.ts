import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { reportService } from '@/lib/services/reportService';

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }

    const params = await props.params;
    const { id } = params;
    const report = await reportService.getReportById(id, session.id, session.role);

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error: any) {
    if (error.message.includes('UNAUTHORIZED_IDOR')) {
      return NextResponse.json({ error: 'FORBIDDEN', message: error.message }, { status: 403 });
    }
    if (error.message === 'Report not found') {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Report not found' }, { status: 404 });
    }

    console.error('Fetch report details error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_SERVER_ERROR', message: error.message },
      { status: 500 }
    );
  }
}
