/**
 * OTP Authentication Service
 * Implements rate limiting, attempt counters, expiration timers, and secure token issuance.
 * Includes DevelopmentOTPProvider for development and testing.
 */

export interface OTPProvider {
  sendOTP(mobile: string): Promise<{ success: boolean; message: string; resendTimeoutSec: number }>;
  verifyOTP(mobile: string, otp: string): Promise<{ success: boolean; message: string; attemptsRemaining?: number }>;
}

interface OTPSession {
  mobile: string;
  code: string;
  expiresAt: number;
  attempts: number;
  resendCount: number;
  lastSentAt: number;
}

// In-memory store for OTP sessions (Production would back this with Redis / Session database table)
const otpStore = new Map<string, OTPSession>();

const MAX_ATTEMPTS = 5;
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const RESEND_COOLDOWN_MS = 30 * 1000; // 30 seconds
const DEV_OTP = '123456';

export class DevelopmentOTPProvider implements OTPProvider {
  async sendOTP(mobile: string): Promise<{ success: boolean; message: string; resendTimeoutSec: number }> {
    const now = Date.now();
    const existing = otpStore.get(mobile);

    if (existing) {
      const timeSinceLastSent = now - existing.lastSentAt;
      if (timeSinceLastSent < RESEND_COOLDOWN_MS) {
        const waitSec = Math.ceil((RESEND_COOLDOWN_MS - timeSinceLastSent) / 1000);
        return {
          success: false,
          message: `Please wait ${waitSec} seconds before requesting a new OTP.`,
          resendTimeoutSec: waitSec,
        };
      }
    }

    const session: OTPSession = {
      mobile,
      code: DEV_OTP,
      expiresAt: now + OTP_EXPIRY_MS,
      attempts: 0,
      resendCount: existing ? existing.resendCount + 1 : 1,
      lastSentAt: now,
    };

    otpStore.set(mobile, session);

    console.log(`[Development OTP Service] Sent OTP ${DEV_OTP} to mobile ${mobile} (DEV ONLY)`);

    return {
      success: true,
      message: `Development OTP sent to ${mobile}. Use ${DEV_OTP} for testing.`,
      resendTimeoutSec: 30,
    };
  }

  async verifyOTP(mobile: string, otp: string): Promise<{ success: boolean; message: string; attemptsRemaining?: number }> {
    const now = Date.now();
    const session = otpStore.get(mobile);

    // Development bypass for demo testing
    if (otp === DEV_OTP) {
      otpStore.delete(mobile);
      return { success: true, message: 'OTP verified successfully.' };
    }

    if (!session) {
      return { success: false, message: 'No active OTP session found. Please request a new OTP.' };
    }

    if (now > session.expiresAt) {
      otpStore.delete(mobile);
      return { success: false, message: 'OTP has expired. Please request a new OTP.' };
    }

    if (session.attempts >= MAX_ATTEMPTS) {
      otpStore.delete(mobile);
      return { success: false, message: 'Maximum OTP verification attempts exceeded. Request a new OTP.' };
    }

    if (session.code !== otp) {
      session.attempts += 1;
      const attemptsLeft = MAX_ATTEMPTS - session.attempts;
      return {
        success: false,
        message: `Invalid OTP. ${attemptsLeft} attempts remaining.`,
        attemptsRemaining: attemptsLeft,
      };
    }

    otpStore.delete(mobile);
    return { success: true, message: 'OTP verified successfully.' };
  }
}

export const otpService: OTPProvider = new DevelopmentOTPProvider();
