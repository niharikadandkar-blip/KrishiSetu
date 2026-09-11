import { NextResponse } from 'next/server';
import { otpService } from '@/lib/services/otpService';
import { userRepository } from '@/lib/repositories/userRepository';
import { registerSchema } from '@/lib/validations';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, mobile, role, language, otp } = body;

    // Validate registration schema
    const validation = registerSchema.safeParse({ name, mobile, role, language });
    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: 'Validation error', errors: validation.error.format() },
        { status: 400 }
      );
    }

    // Verify OTP via service
    const otpResult = await otpService.verifyOTP(mobile, otp);
    if (!otpResult.success) {
      return NextResponse.json(otpResult, { status: 400 });
    }

    // Find or create user in DB
    let user = await userRepository.findByMobile(mobile);
    if (!user) {
      user = await userRepository.createUser({ name, mobile, role, language });
    }

    if (!user) {
      return NextResponse.json({ success: false, message: 'Failed to create user account' }, { status: 500 });
    }

    // Set HTTP session cookie
    const cookieStore = await cookies();
    cookieStore.set('krishisetu_session', JSON.stringify({
      id: user.id,
      name: user.name,
      mobile: user.mobile,
      role: user.role,
      language: user.language,
      mobileVerified: user.mobileVerified,
      profileVerified: user.profileVerified,
    }), {
      httpOnly: false, // Accessible to client context for SIH demo state management
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        mobile: user.mobile,
        role: user.role,
        language: user.language,
        mobileVerified: user.mobileVerified,
        profileVerified: user.profileVerified,
      },
    });
  } catch (error: any) {
    console.error('API Verify OTP Error:', error);
    return NextResponse.json({ success: false, message: 'Server error during verification' }, { status: 500 });
  }
}
