import { NextResponse } from 'next/server';
import { verificationService } from '@/lib/services/verificationService';
import { userRepository } from '@/lib/repositories/userRepository';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, verificationType } = body;

    if (!userId) {
      return NextResponse.json({ success: false, message: 'User ID is required' }, { status: 400 });
    }

    const result = await verificationService.initiateVerification(userId, verificationType || 'DIGILOCKER_AADHAAR');

    const updatedUser = await userRepository.findById(userId);

    return NextResponse.json({
      success: true,
      verification: result,
      user: updatedUser ? {
        id: updatedUser.id,
        name: updatedUser.name,
        mobile: updatedUser.mobile,
        role: updatedUser.role,
        language: updatedUser.language,
        mobileVerified: updatedUser.mobileVerified,
        profileVerified: updatedUser.profileVerified,
      } : null,
    });
  } catch (error: any) {
    console.error('API Verification Error:', error);
    return NextResponse.json({ success: false, message: 'Verification process failed' }, { status: 500 });
  }
}
