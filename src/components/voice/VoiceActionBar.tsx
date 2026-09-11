'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { VoiceInput } from './VoiceInput';
import { VoiceResolvedCommand } from '@/lib/voice/VoiceCommandResolver';
import { Mic, X, Navigation, AlertCircle } from 'lucide-react';

export const VoiceActionBar: React.FC = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const handleCommandResolved = (cmd: VoiceResolvedCommand) => {
    setFeedbackMsg(null);

    if (cmd.type === 'NAVIGATE' && cmd.route) {
      router.push(cmd.route);
      setIsOpen(false);
    } else if (cmd.type === 'QUERY_MARKET' && cmd.route) {
      router.push(cmd.route);
      setIsOpen(false);
    } else if (cmd.type === 'SEARCH_MARKETPLACE' && cmd.route) {
      router.push(cmd.route);
      setIsOpen(false);
    } else if (cmd.type === 'UNRESOLVED') {
      setFeedbackMsg(
        t('voice.unresolvedCommand') || "Could not identify command. You can edit transcript or use text."
      );
    }
  };

  return (
    <div className="relative font-sans">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-amber-300 font-bold text-xs border border-emerald-700 shadow-sm transition-colors"
        title="Voice Commands"
        aria-label="Voice Input Assistant"
      >
        <Mic className="w-4 h-4 text-amber-400" />
        <span className="hidden sm:inline">{t('voice.voiceInput') || 'Voice Input'}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 p-4 bg-white rounded-2xl shadow-xl border border-stone-200 z-50 text-stone-900 space-y-3">
          <div className="flex justify-between items-center border-b border-stone-100 pb-2">
            <div className="flex items-center gap-2">
              <Navigation className="w-4 h-4 text-emerald-800" />
              <h3 className="text-sm font-extrabold text-stone-900">
                {t('voice.voiceInput') || 'Voice Input'}
              </h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-stone-400 hover:text-stone-700 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-stone-500 font-medium">
            {t('voice.promptInstruction') || 'Speak commands like "Open marketplace", "Check weather", or "Onion prices".'}
          </p>

          <VoiceInput autoProcessCommand={true} onCommandResolved={handleCommandResolved} />

          {feedbackMsg && (
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0" />
              <span>{feedbackMsg}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
