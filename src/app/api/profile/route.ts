import { NextResponse } from 'next/server';
import { profileRepository } from '@/lib/repositories/profileRepository';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, role, farmerData, buyerData } = body;

    if (!userId) {
      return NextResponse.json({ success: false, message: 'User ID is required' }, { status: 400 });
    }

    if (role === 'FARMER' && farmerData) {
      const farmerProfile = await profileRepository.upsertFarmerProfile(userId, farmerData);
      return NextResponse.json({ success: true, profile: farmerProfile });
    }

    if (role === 'BUYER' && buyerData) {
      const buyerProfile = await profileRepository.upsertBuyerProfile(userId, buyerData);
      return NextResponse.json({ success: true, profile: buyerProfile });
    }

    return NextResponse.json({ success: false, message: 'Invalid profile payload' }, { status: 400 });
  } catch (error: any) {
    console.error('API Profile Update Error:', error);
    return NextResponse.json({ success: false, message: 'Failed to update profile' }, { status: 500 });
  }
}
