'use client';

import React, { useState } from 'react';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { ShieldCheck, ShieldAlert, CheckCircle2, Lock, X, AlertTriangle } from 'lucide-react';

interface VerificationGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onVerificationComplete: () => void;
}

export const VerificationGateModal: React.FC<VerificationGateModalProps> = ({
  isOpen,
  onClose,
  userId,
  onVerificationComplete,
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleVerifyDemo = async () => {
    setLoading(true);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          verificationType: 'DIGILOCKER_AADHAAR',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMessage(t('verification.verifySuccess'));
        setTimeout(() => {
          onVerificationComplete();
          onClose();
        }, 1500);
      }
    } catch (error) {
      console.error('Verification error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 relative overflow-hidden">
        
        {/* Top Header & Close Button */}
        <div className="flex items-start justify-between border-b border-stone-100 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-stone-900 leading-snug">
                {t('verification.gateTitle')}
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                {t('verification.gateSub')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Why Verify Section */}
        <div className="bg-stone-50 p-4 rounded-xl mb-5 border border-stone-200/80 text-xs text-stone-700 space-y-2">
          <h4 className="font-bold text-stone-900 flex items-center gap-1.5 text-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            {t('verification.whyVerify')}
          </h4>
          <div className="flex items-start gap-2 pt-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{t('verification.reason1')}</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{t('verification.reason2')}</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{t('verification.reason3')}</span>
          </div>
        </div>

        {/* Current Verification Status Badges */}
        <div className="mb-6 space-y-2">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
            {t('verification.currentStatus')}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{t('verification.mobileVerifiedBadge')}</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs font-medium text-amber-800">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{t('verification.identityUnverifiedBadge')}</span>
            </div>
          </div>
        </div>

        {/* Demo Warning Disclaimer */}
        <div className="mb-5 p-3 rounded-lg bg-amber-50/80 border border-amber-300 text-[11px] text-amber-900 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>{t('verification.demoWarning')}</span>
        </div>

        {/* Success Message Banner */}
        {successMessage && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-100 text-emerald-900 text-xs font-bold text-center border border-emerald-300">
            {successMessage}
          </div>
        )}

        {/* Primary Action Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-stone-300 text-stone-700 font-semibold text-xs hover:bg-stone-100 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleVerifyDemo}
            disabled={loading}
            className="flex-2 py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4 text-amber-300" />
            {loading ? t('common.loading') : t('verification.digiLockerCta')}
          </button>
        </div>

      </div>
    </div>
  );
};
