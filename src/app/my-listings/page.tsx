'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { SyncManager } from '@/components/offline/SyncManager';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { LotItem } from '@/lib/types/phase2';
import { ExtendedLotStatus } from '@/lib/types/phase3';
import { offlineQueue } from '@/lib/offline/offlineQueue';
import { 
  Sprout, 
  Plus, 
  Pause, 
  Play, 
  CheckCircle2, 
  Edit, 
  Eye, 
  AlertCircle, 
  Calendar, 
  Tag, 
  Layers, 
  MapPin,
  Clock,
  Sparkles
} from 'lucide-react';

export default function MyListingsPage() {
  const { t } = useTranslation();

  // Active user session
  const [user, setUser] = useState<any>({
    id: 'dev-user-farmer-1',
    name: 'रमेश पाटील (Ramesh Patil)',
    role: 'FARMER',
  });

  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [lots, setLots] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    // Read session cookie if present
    const cookie = document.cookie
      .split('; ')
      .find((row) => row.startsWith('krishisetu_session='));
    if (cookie) {
      try {
        const val = JSON.parse(decodeURIComponent(cookie.split('=')[1]));
        if (val && val.name) setUser((prev: any) => ({ ...prev, ...val }));
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    fetchFarmerListings();
  }, [user.id, activeTab]);

  const fetchFarmerListings = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/v1/farmer/lots?farmerId=${user.id}&status=${activeTab}`);
      const data = await res.json();
      if (data.success) {
        setLots(data.lots || []);
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to fetch listings' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Network request failed.' });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusTransition = async (lotId: string, targetStatus: ExtendedLotStatus) => {
    setMessage(null);
    const idempotencyKey = `trans-${lotId}-${targetStatus}-${Date.now()}`;
    const payload = { farmerId: user.id, targetStatus, idempotencyKey };

    try {
      const res = await fetch(`/api/v1/lots/${lotId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setMessage({
          type: 'success',
          text: data.message || `Listing status updated to ${targetStatus}`,
        });
        fetchFarmerListings();
      } else if (res.status === 409) {
        // Commitment conflict error
        setMessage({
          type: 'error',
          text: data.message || `Conflict: Cannot change status due to active prebookings or accepted offers.`,
        });
      } else {
        setMessage({ type: 'error', text: data.message || 'Transition failed' });
      }
    } catch (err: any) {
      // Offline fallback: Enqueue mutation seamlessly into IndexedDB queue
      console.warn('Network offline during status transition, queueing mutation:', err);
      await offlineQueue.addMutation(`/api/v1/lots/${lotId}/status`, 'POST', payload);
      setMessage({
        type: 'info',
        text: 'Offline mode: Status change saved locally. Will synchronize upon reconnect.',
      });
      // Optimistically update UI
      setLots((prev) =>
        prev.map((l) => (l.id === lotId ? { ...l, status: targetStatus } : l))
      );
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">Draft</span>;
      case 'PUBLISHED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">Published</span>;
      case 'PAUSED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">Paused</span>;
      case 'UNDER_OFFER':
      case 'BOOKING_THRESHOLD_REACHED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300">Under Offer / Pre-booked</span>;
      case 'SOLD':
      case 'COMPLETED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300">Sold / Completed</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-amber-50 dark:from-slate-900 dark:via-slate-800 dark:to-emerald-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans">
      <Navbar />
      <SyncManager />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-2">
              <Sprout className="w-3.5 h-3.5" />
              {t('myListings.title')}
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {t('myListings.title')}
            </h1>
            <p className="text-slate-600 dark:text-slate-300 mt-1 text-sm">
              {t('myListings.sub')}
            </p>
          </div>

          <Link
            href="/lots/new"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md shadow-emerald-600/20 transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            {t('lotCreation.title')}
          </Link>
        </div>

        {/* Status Alert Banner */}
        {message && (
          <div
            className={`p-4 rounded-xl mb-6 border flex items-start gap-3 ${
              message.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-200'
                : message.type === 'info'
                ? 'bg-sky-50 border-sky-200 text-sky-900 dark:bg-sky-950/50 dark:border-sky-800 dark:text-sky-200'
                : 'bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/50 dark:border-rose-800 dark:text-rose-200'
            }`}
          >
            {message.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
            {message.type === 'info' && <Sparkles className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />}
            {message.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />}
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        )}

        {/* Status Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none border-b border-slate-200 dark:border-slate-700/60">
          {[
            { id: 'ALL', label: t('myListings.tabAll') },
            { id: 'DRAFT', label: t('myListings.tabDraft') },
            { id: 'PUBLISHED', label: t('myListings.tabPublished') },
            { id: 'PAUSED', label: t('myListings.tabPaused') },
            { id: 'SOLD_COMPLETED', label: t('myListings.tabSoldCompleted') },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Listings Grid */}
        {loading ? (
          <div className="text-center py-16 text-slate-500 font-medium">
            {t('common.loading')}
          </div>
        ) : lots.length === 0 ? (
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-12 text-center border border-dashed border-slate-300 dark:border-slate-700 shadow-sm">
            <Sprout className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              {t('myListings.noListings')}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Create a new produce lot to connect directly with verified buyers across your district.
            </p>
            <Link
              href="/lots/new"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold"
            >
              <Plus className="w-4 h-4" />
              {t('lotCreation.title')}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lots.map((lot) => (
              <div
                key={lot.id}
                className="bg-white dark:bg-slate-800/90 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700/60 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        {lot.cropName}
                        {lot.variety && <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1.5">({lot.variety})</span>}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                        {lot.publicVillage}, {lot.publicTaluka}, {lot.publicDistrict}
                      </p>
                    </div>
                    {renderStatusBadge(lot.status)}
                  </div>

                  {/* Lot Parameters */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl mb-4 border border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block">{t('lotCreation.quantity')}</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {lot.quantityAvailable} {lot.unit}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block">{t('lotCreation.askPrice')}</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        ₹{lot.askPricePerUnit}/{lot.unit}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block">{t('lotCreation.grade')}</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {lot.grade || 'Standard'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block">{t('lotCreation.harvestDate')}</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {new Date(lot.expectedHarvestDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* State Machine Transition Actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
                  <Link
                    href={`/lots/${lot.id}`}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1 transition-all"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View
                  </Link>

                  <div className="flex items-center gap-1.5">
                    {lot.status === 'DRAFT' && (
                      <button
                        onClick={() => handleStatusTransition(lot.id, 'PUBLISHED')}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1"
                      >
                        <Play className="w-3 h-3" />
                        {t('myListings.actionPublish')}
                      </button>
                    )}

                    {lot.status === 'PUBLISHED' && (
                      <>
                        <button
                          onClick={() => handleStatusTransition(lot.id, 'PAUSED')}
                          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold flex items-center gap-1"
                        >
                          <Pause className="w-3 h-3" />
                          {t('myListings.actionPause')}
                        </button>
                        <button
                          onClick={() => handleStatusTransition(lot.id, 'SOLD')}
                          className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          {t('myListings.actionMarkSold')}
                        </button>
                      </>
                    )}

                    {lot.status === 'PAUSED' && (
                      <button
                        onClick={() => handleStatusTransition(lot.id, 'PUBLISHED')}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1"
                      >
                        <Play className="w-3 h-3" />
                        {t('myListings.actionResume')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
