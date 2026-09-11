import { verificationRepository } from '@/lib/repositories/verificationRepository';
import { userRepository } from '@/lib/repositories/userRepository';
import { VerificationStatus } from '@/lib/types';

export interface IdentityVerificationProvider {
  providerName: string;
  isProductionReady: boolean;
  initiateVerification(userId: string, documentType: string): Promise<{
    success: boolean;
    verificationId: string;
    status: VerificationStatus;
    redirectUrl?: string;
    message: string;
  }>;
}

/**
 * Development / Demo Verification Provider
 * Clearly marked as Development Mode to prevent false claims of government verification.
 */
export class DevelopmentVerificationProvider implements IdentityVerificationProvider {
  providerName = 'DEVELOPMENT_DEMO (DigiLocker Sandbox)';
  isProductionReady = false;

  async initiateVerification(userId: string, documentType: string = 'DIGILOCKER_AADHAAR') {
    // Create verification request record in DB
    const request = await verificationRepository.createRequest({
      userId,
      verificationType: documentType,
      provider: 'DEVELOPMENT_DEMO',
      documentReference: 'DEMO-DOC-REF-SIH2026',
    });

    // Simulate instant demo approval for SIH demonstration
    await verificationRepository.updateStatus(
      request.id,
      'APPROVED',
      'DEVELOPMENT_AUTO_REVIEWER',
      'Demo Verification Completed — DigiLocker Sandbox Mode'
    );

    // Update User profileVerified state in DB
    await userRepository.updateProfileVerification(userId, true);

    return {
      success: true,
      verificationId: request.id,
      status: 'APPROVED' as VerificationStatus,
      message: 'Demo identity verification successfully completed (Development Mode).',
    };
  }
}

/**
 * DigiLocker Production Verification Provider (Future Integration Stub)
 */
export class DigiLockerVerificationProvider implements IdentityVerificationProvider {
  providerName = 'DIGILOCKER_OFFICIAL';
  isProductionReady = true;

  async initiateVerification(userId: string, documentType: string) {
    return {
      success: false,
      verificationId: '',
      status: 'RESTRICTED' as VerificationStatus,
      message: 'DigiLocker production OAuth credentials not configured in environment variables.',
    };
  }
}

export const verificationService: IdentityVerificationProvider = new DevelopmentVerificationProvider();
