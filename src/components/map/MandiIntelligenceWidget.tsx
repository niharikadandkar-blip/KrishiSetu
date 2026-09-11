'use client';

import React, { useEffect, useState } from 'react';
import { MandiLocationItem } from '@/lib/types/phase7';
import { Store, TrendingUp, Navigation, ExternalLink, Info } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/LanguageContext';

export function MandiIntelligenceWidget() {
  const { t } = useTranslation();
  const [mandis, setMandis] = useState<MandiLocationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMandis() {
      try {
        const res = await fetch('/api/v1/map/mandis');
        const data = await res.json();
        if (data.success) {
          setMandis(data.mandis || []);
        }
      } catch (err) {
        console.error('Failed to load Mandi benchmarks:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchMandis();
  }, []);

  if (loading) {
    return (
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl animate-pulse text-xs text-slate-500">
        Loading Mandi location intelligence...
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3 border-b border-slate-150 pb-3">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-800 text-sm">{t('map.mandiIntelligence')}</h4>
            <p className="text-xs text-slate-500">Benchmark APMC market prices & locations</p>
          </div>
        </div>
        <span className="inline-flex items-center text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-medium">
          <Info className="w-3 h-3 mr-1" />
          Static Benchmark Data
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {mandis.map((mandi) => (
          <div
            key={mandi.id}
            className="p-3 bg-slate-50 hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 rounded-lg transition-colors flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h5 className="font-semibold text-slate-900 text-xs">{mandi.mandiName}</h5>
                  <p className="text-[11px] text-slate-500">{mandi.district}, {mandi.state}</p>
                </div>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-semibold rounded">
                  {mandi.cropName}
                </span>
              </div>

              <div className="mt-2.5 flex items-center space-x-3 text-xs">
                <div>
                  <span className="text-slate-500 text-[10px] block">Modal Price</span>
                  <span className="font-bold text-emerald-700 text-sm">₹{mandi.modalPrice}/Qtl</span>
                </div>
                <div className="border-l border-slate-300 pl-3">
                  <span className="text-slate-500 text-[10px] block">Range</span>
                  <span className="text-slate-700 text-xs">₹{mandi.minPrice} - ₹{mandi.maxPrice}</span>
                </div>
              </div>
            </div>

            {mandi.location && (
              <div className="mt-3 pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[10px]">APMC Location Pin</span>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${mandi.location.latitude},${mandi.location.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-emerald-700 hover:text-emerald-800 font-medium text-[11px]"
                >
                  <Navigation className="w-3 h-3 mr-1" />
                  <span>Navigate</span>
                  <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
