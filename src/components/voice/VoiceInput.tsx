'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { WebSpeechAdapter } from '@/lib/voice/WebSpeechAdapter';
import { VoiceCommandResolver, VoiceResolvedCommand } from '@/lib/voice/VoiceCommandResolver';
import { VoiceRecognitionResult, VoiceError } from '@/lib/voice/VoiceRecognitionProvider';
import { Mic, MicOff, Square, Check, RotateCcw, AlertCircle, Edit3, X } from 'lucide-react';

interface VoiceInputProps {
  onTranscriptSelect?: (transcript: string) => void;
  onCommandResolved?: (command: VoiceResolvedCommand) => void;
  placeholder?: string;
  className?: string;
  autoProcessCommand?: boolean;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({
  onTranscriptSelect,
  onCommandResolved,
  placeholder,
  className = '',
  autoProcessCommand = false,
}) => {
  const { language, t } = useTranslation();
  const [adapter, setAdapter] = useState<WebSpeechAdapter | null>(null);

  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [interimText, setInterimText] = useState<string>('');
  const [transcript, setTranscript] = useState<string>('');
  const [error, setError] = useState<VoiceError | null>(null);
  const [resolvedCommand, setResolvedCommand] = useState<VoiceResolvedCommand | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  useEffect(() => {
    const speechAdapter = new WebSpeechAdapter();
    setAdapter(speechAdapter);
    setIsSupported(speechAdapter.isSupported());

    speechAdapter.onStart(() => {
      setIsListening(true);
      setError(null);
      setInterimText('');
    });

    speechAdapter.onInterimResult((text) => {
      setInterimText(text);
    });

    speechAdapter.onResult((res: VoiceRecognitionResult) => {
      setTranscript(res.transcript);
      setInterimText('');
      setIsListening(false);

      const cmd = VoiceCommandResolver.resolveCommand(res.transcript);
      setResolvedCommand(cmd);

      if (autoProcessCommand && cmd.type !== 'UNRESOLVED' && onCommandResolved) {
        onCommandResolved(cmd);
      }
    });

    speechAdapter.onError((err: VoiceError) => {
      setError(err);
      setIsListening(false);
    });

    speechAdapter.onEnd(() => {
      setIsListening(false);
    });

    return () => {
      speechAdapter.destroy();
    };
  }, [autoProcessCommand, onCommandResolved]);

  const handleStartListening = () => {
    if (!adapter || !isSupported) return;
    setError(null);
    setTranscript('');
    setResolvedCommand(null);
    setIsEditing(false);
    adapter.startListening(language);
  };

  const handleStopListening = () => {
    if (adapter) {
      adapter.stopListening();
    }
  };

  const handleUseTranscript = () => {
    if (transcript && onTranscriptSelect) {
      onTranscriptSelect(transcript);
    }
    if (resolvedCommand && onCommandResolved) {
      onCommandResolved(resolvedCommand);
    }
  };

  const handleCancel = () => {
    if (adapter) {
      adapter.cancelListening();
    }
    setTranscript('');
    setInterimText('');
    setError(null);
    setResolvedCommand(null);
    setIsEditing(false);
  };

  return (
    <div className={`space-y-3 font-sans ${className}`}>
      <div className="flex items-center gap-2">
        {!isListening ? (
          <button
            type="button"
            onClick={handleStartListening}
            disabled={!isSupported}
            aria-label={t('voice.speak') || 'Speak using microphone'}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all border ${
              !isSupported
                ? 'bg-stone-100 border-stone-300 text-stone-400 cursor-not-allowed'
                : 'bg-emerald-800 hover:bg-emerald-700 border-emerald-900 text-amber-300 active:scale-95'
            }`}
          >
            <Mic className="w-4 h-4 text-amber-400" />
            <span>{t('voice.speak') || 'Speak'}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleStopListening}
            aria-label={t('voice.stop') || 'Stop recording'}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-red-600 hover:bg-red-700 text-white shadow-sm transition-all border border-red-700 animate-pulse"
          >
            <Square className="w-4 h-4 text-white" />
            <span>{t('voice.listening') || 'Listening...'} ({t('voice.stop') || 'Stop'})</span>
          </button>
        )}

        {transcript && (
          <button
            type="button"
            onClick={handleCancel}
            className="p-2 rounded-xl text-stone-500 hover:text-stone-800 hover:bg-stone-200 transition-colors"
            title={t('voice.cancel') || 'Cancel'}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ARIA Live Status Announcement */}
      <div className="sr-only" aria-live="polite">
        {isListening ? 'Listening for speech input...' : transcript ? `Recognized speech: ${transcript}` : ''}
      </div>

      {/* Unsupported Browser Warning */}
      {!isSupported && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0" />
          <span>{t('voice.unsupported') || "Voice input isn't supported on this browser. You can continue using text."}</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-700 flex-shrink-0" />
            <span>
              {error.code === 'PERMISSION_DENIED'
                ? (t('voice.permissionDenied') || 'Microphone permission required')
                : error.code === 'NO_SPEECH'
                ? (t('voice.noSpeech') || 'No speech detected. Please try again.')
                : error.message}
            </span>
          </div>
          <button
            type="button"
            onClick={handleStartListening}
            className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-800 font-bold rounded text-[10px] flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>{t('voice.tryAgain') || 'Try again'}</span>
          </button>
        </div>
      )}

      {/* Interim Listening Feedback */}
      {isListening && interimText && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs italic">
          "{interimText}..."
        </div>
      )}

      {/* Transcript Preview & Actions */}
      {transcript && !isListening && (
        <div className="p-4 rounded-2xl bg-white border border-stone-300 shadow-sm space-y-3">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wide">
              {t('voice.transcriptPreview') || 'Recognized Speech'}
            </span>
            {resolvedCommand?.type !== 'UNRESOLVED' && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Command: {resolvedCommand?.type}
              </span>
            )}
          </div>

          {!isEditing ? (
            <p className="text-sm font-semibold text-stone-900 p-2 bg-stone-50 rounded-xl border border-stone-200">
              "{transcript}"
            </p>
          ) : (
            <textarea
              rows={2}
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              className="w-full p-2 text-sm font-medium border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            />
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleUseTranscript}
              className="px-3.5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs shadow flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{t('voice.use') || 'Use'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs border border-stone-300 flex items-center gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditing ? (t('common.save') || 'Save') : (t('voice.edit') || 'Edit')}</span>
            </button>

            <button
              type="button"
              onClick={handleCancel}
              className="px-3.5 py-2 rounded-xl bg-stone-50 hover:bg-stone-100 text-stone-600 font-bold text-xs border border-stone-200"
            >
              {t('common.cancel') || 'Cancel'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
