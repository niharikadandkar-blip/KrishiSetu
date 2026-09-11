'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { SyncManager } from '@/components/offline/SyncManager';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { Truck, Warehouse, CheckCircle2, ShieldCheck, ArrowRight, AlertCircle, Building2 } from 'lucide-react';

export default function ProviderOnboardingPage() {
  const { t } = useTranslation();

  const [hasTransport, setHasTransport] = useState(true);
  const [hasStorage, setHasStorage] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactMobile, setContactMobile] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [state, setState] = useState('Maharashtra');
  const [district, setDistrict] = useState('Nashik');
  const [taluka, setTaluka] = useState('Chandwad');
  const [village, setVillage] = useState('Sogras');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasTransport && !hasStorage) {
      setError('Please select at least one service capability (Transportation or Storage).');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/v1/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName,
          hasTransportServices: hasTransport,
          hasStorageServices: hasStorage,
          contactName,
          contactMobile,
          state,
          district,
          taluka,
          village,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to register provider profile');
      }

      setSuccess('Provider profile registered successfully! Redirecting to Dashboard...');
      setTimeout(() => {
        window.location.href = '/providers/dashboard';
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to register provider profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      <Navbar />
      <SyncManager />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 space-y-6">
        <div className="bg-emerald-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-800 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-800 text-amber-300 text-xs font-bold uppercase tracking-wider">
            <Building2 className="w-4 h-4" />
            {t('providers.onboardingTitle')}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {t('providers.onboardingTitle')}
          </h1>
          <p className="text-sm text-emerald-100/90 leading-relaxed">
            {t('providers.onboardingSub')}
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-sm flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 dark:border-slate-700 space-y-6">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-3">
              Select Service Capabilities
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setHasTransport(!hasTransport)}
                className={`p-5 rounded-2xl border-2 text-left flex items-start gap-4 transition-all ${
                  hasTransport
                    ? 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/30'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <div className={`p-3 rounded-xl ${hasTransport ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600'}`}>
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {t('providers.hasTransport')}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Offer Pickup Trucks, Mini Trucks, or Heavy Agri Transport.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setHasStorage(!hasStorage)}
                className={`p-5 rounded-2xl border-2 text-left flex items-start gap-4 transition-all ${
                  hasStorage
                    ? 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/30'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <div className={`p-3 rounded-xl ${hasStorage ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600'}`}>
                  <Warehouse className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {t('providers.hasStorage')}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Offer Cold Storage Facilities, Warehouses, or Local Godowns.
                  </p>
                </div>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Contact Person Name *
              </label>
              <input
                type="text"
                required
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="e.g. Ramesh Pawar"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Contact Mobile Number *
              </label>
              <input
                type="tel"
                required
                value={contactMobile}
                onChange={(e) => setContactMobile(e.target.value)}
                placeholder="10-digit mobile"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Business / Firm Name (Optional)
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Pawar Agro Transport & Logistics"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">State *</label>
              <input
                type="text"
                required
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">District *</label>
              <input
                type="text"
                required
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Taluka</label>
              <input
                type="text"
                value={taluka}
                onChange={(e) => setTaluka(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Village / City</label>
              <input
                type="text"
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base shadow-lg hover:shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? t('common.loading') : 'Register Provider Profile'}
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>
      </main>
    </div>
  );
}
