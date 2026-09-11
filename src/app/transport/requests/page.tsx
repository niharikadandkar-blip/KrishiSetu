'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { SyncManager } from '@/components/offline/SyncManager';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { Truck, MapPin, ArrowRight, Clock, CheckCircle2 } from 'lucide-react';

export default function TransportRequestsPage() {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/transport?mode=MY_REQUESTS')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setRequests(data.requests || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      <Navbar />
      <SyncManager />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 space-y-6">
        <div className="bg-emerald-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-800 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-800 text-amber-300 text-xs font-bold uppercase tracking-wider">
            <Truck className="w-4 h-4" />
            {t('transport.myRequestsTitle')}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {t('transport.myRequestsTitle')}
          </h1>
          <p className="text-sm text-emerald-100/90 leading-relaxed max-w-2xl">
            Monitor active transport requests, driver assignments, and fulfillment progress.
          </p>
        </div>

        <div className="space-y-4">
          {loading ? (
            <p className="text-sm text-slate-500 text-center py-12">{t('common.loading')}</p>
          ) : requests.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 text-center border border-slate-200 dark:border-slate-700 space-y-3">
              <Truck className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-base font-bold text-slate-700 dark:text-slate-300">No transport requests found</p>
              <Link href="/transport/discover" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-md">
                Find Transport Providers
              </Link>
            </div>
          ) : (
            requests.map((r) => (
              <div key={r.id} className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                      {r.status}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      Arrangement: {r.arrangementType}
                    </span>
                  </div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    {r.cropCategory} ({r.quantity} {r.unit})
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                    From {r.pickupVillage}, {r.pickupDistrict} $\rightarrow$ {r.deliveryVillage}, {r.deliveryDistrict}
                  </p>
                </div>

                <Link
                  href={`/transport/${r.id}`}
                  className="px-5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-700 hover:bg-emerald-600 hover:text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition-all"
                >
                  View Details & Progress
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
