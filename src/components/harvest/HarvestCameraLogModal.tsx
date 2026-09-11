'use client';

import React, { useState } from 'react';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { Camera, X, CheckCircle2, Upload } from 'lucide-react';
import { CameraStage } from '@/lib/types/phase2';

interface HarvestCameraLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  lotId: string;
  onLogSaved: () => void;
}

export const HarvestCameraLogModal: React.FC<HarvestCameraLogModalProps> = ({
  isOpen,
  onClose,
  lotId,
  onLogSaved,
}) => {
  const { t } = useTranslation();

  const [stage, setStage] = useState<CameraStage>('HARVESTED');
  const [photoUrl, setPhotoUrl] = useState<string>(
    'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?q=80&w=800&auto=format&fit=crop'
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSaveLog = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch(`/api/v1/lots/${lotId}/harvest-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lotId,
          stage,
          photoUrl,
          latitude: 18.5204,
          longitude: 73.8567,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMsg('Harvest photo log recorded successfully!');
        setTimeout(() => {
          onLogSaved();
          onClose();
        }, 1500);
      }
    } catch (e) {
      setMsg(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 relative">
        
        <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">{t('harvestLog.title')}</h3>
              <p className="text-xs text-stone-500">Record crop condition photo with GPS stamp</p>
            </div>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {msg && (
          <div className="mb-4 p-2.5 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold text-center flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{msg}</span>
          </div>
        )}

        <form onSubmit={handleSaveLog} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              {t('harvestLog.stage')} *
            </label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value as CameraStage)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            >
              <option value="HARVESTED">{t('harvestLog.stageHarvested')}</option>
              <option value="PACKED">{t('harvestLog.stagePacked')}</option>
              <option value="DISPATCHED">{t('harvestLog.stageDispatched')}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              {t('harvestLog.photoUrl')} *
            </label>
            <input
              type="text"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              required
            />
          </div>

          {/* Image Preview */}
          {photoUrl && (
            <div className="rounded-xl overflow-hidden border border-stone-200 max-h-40 relative">
              <img src={photoUrl} alt="Harvest Preview" className="w-full h-36 object-cover" />
              <div className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded font-mono">
                GPS: 18.5204° N, 73.8567° E
              </div>
            </div>
          )}

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-stone-300 text-stone-700 text-xs font-bold hover:bg-stone-50"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold shadow flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              <span>{loading ? t('common.loading') : t('harvestLog.submitLog')}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
