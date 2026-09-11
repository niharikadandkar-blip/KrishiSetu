import { NextResponse } from 'next/server';
import { otpService } from '@/lib/services/otpService';
import { z } from 'zod';

const sendOtpSchema = z.object({
  mobile: z.string().regex(/^[6-9]\d{9}$/),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = sendOtpSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, message: 'Invalid mobile number format' }, { status: 400 });
    }

    const result = await otpService.sendOTP(parsed.data.mobile);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('API Send OTP Error:', error);
    return NextResponse.json({ success: false, message: 'Failed to send OTP' }, { status: 500 });
  }
}
