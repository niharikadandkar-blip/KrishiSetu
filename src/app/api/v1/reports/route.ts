import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { reportService } from '@/lib/services/reportService';
import { createReportSchema } from '@/lib/validations/phase10';

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const validation = createReportSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Invalid input data', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const report = await reportService.createReport(session.id, validation.data);

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error: any) {
    console.error('Submit report error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_SERVER_ERROR', message: error.message },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }

    const reports = await reportService.getUserReports(session.id);

    return NextResponse.json({
      success: true,
      reports,
    });
  } catch (error: any) {
    console.error('Fetch user reports error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_SERVER_ERROR', message: error.message },
      { status: 500 }
    );
  }
}
