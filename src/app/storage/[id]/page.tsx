'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { SyncManager } from '@/components/offline/SyncManager';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { StorageStatus } from '@/lib/types/phase6';
import { Warehouse, MapPin, CheckCircle2, Clock, Phone, ArrowLeft, AlertCircle } from 'lucide-react';

export default function StorageDetailPage() {
  const { t } = useTranslation();
  const params = useParams();
  const requestId = params.id as string;

  const [request, setRequest] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);

  const fetchStorageDetail = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/storage/${requestId}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setRequest(data.request);
      } else {
        setError(data.message || 'Failed to load storage details');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load storage details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStorageDetail();
  }, [requestId]);

  const handleStatusTransition = async (targetStatus: StorageStatus) => {
    setTransitioning(true);
    try {
      const res = await fetch(`/api/v1/storage/${requestId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetStatus }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Transition failed');

      fetchStorageDetail();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setTransitioning(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      <Navbar />
      <SyncManager />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 space-y-6">
        <Link href="/storage/requests" className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800">
          <ArrowLeft className="w-4 h-4" />
          Back to Storage Reservations
        </Link>

        {loading ? (
          <p className="text-sm text-slate-500 text-center py-12">{t('common.loading')}</p>
        ) : error || !request ? (
          <div className="p-6 bg-rose-50 border border-rose-200 text-rose-800 rounded-3xl text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5" />
            {error || 'Storage record not found'}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header Card */}
            <div className="bg-emerald-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-400 text-emerald-950 uppercase tracking-wider">
                  {request.status}
                </span>
                <span className="text-xs text-emerald-200 font-medium">
                  Duration: {request.durationDays} Days
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {request.cropName} ({request.quantity} {request.unit})
              </h1>
              <p className="text-xs text-emerald-200">
                Facility: {request.facility?.facilityName} ({request.facility?.facilityType})
              </p>
            </div>

            {/* Facility & Cost Details */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-xl border border-slate-200 dark:border-slate-700 space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Warehouse className="w-5 h-5 text-emerald-600" />
                Facility & Reservation Breakdown
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Facility Location</span>
                  <p className="font-bold text-sm text-slate-900 dark:text-white">
                    {request.facility?.village || 'Village'}, {request.facility?.district}
                  </p>
                  <p className="text-slate-500">
                    Contact Mobile: {request.facility?.provider?.contactMobile || 'Protected'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-emerald-600">Estimated Storage Cost</span>
                  <p className="font-extrabold text-lg text-emerald-700 dark:text-emerald-300">
                    ₹{request.agreedStorageCost}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Check-In: {new Date(request.expectedCheckInDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Workflow Actions */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-xl border border-slate-200 dark:border-slate-700 space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Reservation Lifecycle Actions</h3>

              <div className="flex flex-wrap items-center gap-3">
                {request.status === 'REQUESTED' && (
                  <button onClick={() => handleStatusTransition('ACCEPTED')} disabled={transitioning} className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-md">
                    Accept Reservation Request
                  </button>
                )}
                {request.status === 'ACCEPTED' && (
                  <button onClick={() => handleStatusTransition('RESERVED')} disabled={transitioning} className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-md">
                    Confirm Space Reserved
                  </button>
                )}
                {request.status === 'RESERVED' && (
                  <button onClick={() => handleStatusTransition('CHECK_IN_PENDING')} disabled={transitioning} className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-md">
                    Mark Check-In Pending
                  </button>
                )}
                {request.status === 'CHECK_IN_PENDING' && (
                  <button onClick={() => handleStatusTransition('STORED')} disabled={transitioning} className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-md">
                    Mark Produce Stored
                  </button>
                )}
                {request.status === 'STORED' && (
                  <button onClick={() => handleStatusTransition('RELEASE_REQUESTED')} disabled={transitioning} className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-md">
                    Request Produce Release
                  </button>
                )}
                {request.status === 'RELEASE_REQUESTED' && (
                  <button onClick={() => handleStatusTransition('RELEASED')} disabled={transitioning} className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-md">
                    Confirm Produce Released
                  </button>
                )}
                {request.status === 'RELEASED' && (
                  <button onClick={() => handleStatusTransition('COMPLETED')} disabled={transitioning} className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-md">
                    Complete Storage Job
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
