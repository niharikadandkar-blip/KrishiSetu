import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { reportService } from '@/lib/services/reportService';
import { updateReportStatusSchema } from '@/lib/validations/phase10';

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }

    if ((session.role as string) !== 'ADMIN') {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });
    }

    const params = await props.params;
    const { id } = params;
    const body = await req.json();
    const validation = updateReportStatusSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Invalid input data', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const report = await reportService.updateReportStatus(
      session.id,
      session.role,
      id,
      validation.data
    );

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error: any) {
    if (error.message.includes('UNAUTHORIZED')) {
      return NextResponse.json({ error: 'FORBIDDEN', message: error.message }, { status: 403 });
    }
    if (error.message === 'Report not found') {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Report not found' }, { status: 404 });
    }

    console.error('Update report status error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_SERVER_ERROR', message: error.message },
      { status: 500 }
    );
  }
}
