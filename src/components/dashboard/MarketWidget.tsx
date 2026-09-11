'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Store, TrendingUp, ArrowRight } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { MarketPriceRecordItem } from '@/lib/types/phase8';

export function MarketWidget() {
  const { t } = useTranslation();
  const [record, setRecord] = useState<MarketPriceRecordItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWidgetData() {
      try {
        const res = await fetch('/api/v1/market-intelligence?crop=Onion&district=Nashik');
        const data = await res.json();
        if (data.success && data.prices?.[0]) {
          setRecord(data.prices[0]);
        }
      } catch (err) {
        console.error('Failed to load market widget:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchWidgetData();
  }, []);

  if (loading) {
    return (
      <div className="p-5 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 animate-pulse text-xs text-slate-400">
        Loading Market Prices...
      </div>
    );
  }

  if (!record) return null;

  return (
    <div className="bg-gradient-to-br from-emerald-900 to-teal-950 text-white rounded-3xl p-6 shadow-xl border border-emerald-800 flex flex-col justify-between space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-emerald-800 text-amber-300 rounded-lg">
            <Store className="w-4 h-4" />
          </div>
          <span className="font-bold text-xs uppercase tracking-wider text-emerald-200">Market Price Benchmark</span>
        </div>
        <span className="text-[10px] text-amber-300 bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded font-bold">
          {record.mandiName}
        </span>
      </div>

      <div>
        <span className="text-xs text-emerald-200 font-medium block">{record.cropName} Modal Price</span>
        <div className="text-3xl font-black text-amber-400 tracking-tight mt-1">
          ₹{record.modalPrice.toLocaleString()} <span className="text-xs font-semibold text-white">/ {record.unit}</span>
        </div>
        <p className="text-[11px] text-emerald-100/80 mt-1">Range: ₹{record.minPrice} - ₹{record.maxPrice}</p>
      </div>

      <div className="pt-3 border-t border-emerald-800 flex items-center justify-between">
        <span className="text-[10px] text-emerald-300">{record.marketDate}</span>
        <Link
          href="/market-intelligence"
          className="inline-flex items-center space-x-1 text-xs font-extrabold text-amber-400 hover:underline"
        >
          <span>{t('market.viewIntelligenceBtn')}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
