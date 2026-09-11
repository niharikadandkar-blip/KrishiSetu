'use client';

import React from 'react';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { ShieldCheck, AlertTriangle, CheckCircle2, X } from 'lucide-react';

interface VoiceConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  actionSummary: {
    actionType: string;
    details: Record<string, string | number | undefined>;
    rawTranscript: string;
  };
}

export const VoiceConfirmationModal: React.FC<VoiceConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  actionSummary,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm font-sans">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-5 animate-in fade-in zoom-in duration-150">
        
        <div className="flex justify-between items-start border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-700" />
            <div>
              <h2 className="text-lg font-black text-stone-900">
                {title || t('voice.confirmActionTitle') || 'Confirm High-Impact Action'}
              </h2>
              <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                {t('voice.manualConfirmationRequired') || 'Explicit User Confirmation Required'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
          <span>
            {t('voice.confirmationNotice') ||
              'Voice input prepares form values. High-impact transactions require explicit manual confirmation to prevent unintentional execution.'}
          </span>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wide">
            {t('voice.spokenSummary') || 'Spoken Voice Summary'}
          </h3>
          <p className="text-sm font-bold text-stone-800 p-3 bg-stone-50 rounded-2xl border border-stone-200 italic">
            "{actionSummary.rawTranscript}"
          </p>

          <div className="space-y-2 pt-2">
            <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wide">
              {t('voice.interpretedDetails') || 'Extracted Action Details'}
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(actionSummary.details).map(([key, val]) => (
                <div key={key} className="p-2.5 rounded-xl bg-stone-50 border border-stone-200">
                  <span className="text-stone-400 block text-[10px] capitalize">{key}</span>
                  <strong className="text-stone-900">{val !== undefined && val !== null ? String(val) : 'N/A'}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-3 border-t border-stone-100">
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-3.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            <span>{t('common.confirm') || 'Confirm & Execute'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs border border-stone-300 transition-colors text-center"
          >
            {t('common.cancel') || 'Cancel'}
          </button>
        </div>

      </div>
    </div>
  );
};
