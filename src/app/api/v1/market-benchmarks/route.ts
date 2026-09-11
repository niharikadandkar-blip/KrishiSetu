import { NextResponse } from 'next/server';
import { marketBenchmarkService } from '@/lib/services/marketBenchmarkService';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const district = searchParams.get('district') || 'Pune';

    const benchmarks = await marketBenchmarkService.getBenchmarks(district);

    return NextResponse.json({
      success: true,
      district,
      provider: marketBenchmarkService.providerName,
      benchmarks,
    });
  } catch (error: any) {
    console.error('API Market Benchmarks Error:', error);
    return NextResponse.json({ success: false, message: 'Server error querying market benchmarks' }, { status: 500 });
  }
}
