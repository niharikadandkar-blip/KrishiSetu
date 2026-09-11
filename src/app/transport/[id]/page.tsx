'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { SyncManager } from '@/components/offline/SyncManager';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { TransportStatus } from '@/lib/types/phase6';
import { Truck, MapPin, CheckCircle2, Clock, Phone, User, ArrowLeft, AlertCircle, ShieldCheck } from 'lucide-react';

export default function TransportDetailPage() {
  const { t } = useTranslation();
  const params = useParams();
  const requestId = params.id as string;

  const [request, setRequest] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Driver Assignment State
  const [driverName, setDriverName] = useState('');
  const [driverMobile, setDriverMobile] = useState('');
  const [transitioning, setTransitioning] = useState(false);

  const fetchTransportDetail = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/transport/${requestId}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setRequest(data.request);
        setDriverName(data.request.driverName || '');
        setDriverMobile(data.request.driverMobile || '');
      } else {
        setError(data.message || 'Failed to load transport details');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load transport details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransportDetail();
  }, [requestId]);

  const handleStatusTransition = async (targetStatus: TransportStatus) => {
    setTransitioning(true);
    try {
      const res = await fetch(`/api/v1/transport/${requestId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetStatus,
          driverName: driverName || undefined,
          driverMobile: driverMobile || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Transition failed');

      fetchTransportDetail();
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
        <Link href="/transport/requests" className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800">
          <ArrowLeft className="w-4 h-4" />
          Back to Transport Requests
        </Link>

        {loading ? (
          <p className="text-sm text-slate-500 text-center py-12">{t('common.loading')}</p>
        ) : error || !request ? (
          <div className="p-6 bg-rose-50 border border-rose-200 text-rose-800 rounded-3xl text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5" />
            {error || 'Transport record not found'}
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
                  {request.arrangementType}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {request.cropCategory} ({request.quantity} {request.unit})
              </h1>
              <p className="text-xs text-emerald-200">
                Scheduled Pickup: {new Date(request.scheduledPickupDate).toLocaleDateString()}
              </p>
            </div>

            {/* Provider & Driver Details */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-xl border border-slate-200 dark:border-slate-700 space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-emerald-600" />
                Transport Provider & Driver Information
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Provider</span>
                  <p className="font-bold text-sm text-slate-900 dark:text-white mt-1">
                    {request.provider?.businessName || request.provider?.contactName || 'Self / Direct Transport'}
                  </p>
                  <p className="text-slate-500 mt-1">
                    Mobile: {request.provider?.contactMobile || 'Protected'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Assigned Driver</span>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Driver Name</label>
                    <input
                      type="text"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      placeholder="Assign driver name"
                      className="w-full p-2 rounded-lg border bg-white dark:bg-slate-800 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Driver Mobile</label>
                    <input
                      type="tel"
                      value={driverMobile}
                      onChange={(e) => setDriverMobile(e.target.value)}
                      placeholder="Assign driver mobile"
                      className="w-full p-2 rounded-lg border bg-white dark:bg-slate-800 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Workflow Action Bar */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-xl border border-slate-200 dark:border-slate-700 space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Transport Lifecycle Actions</h3>

              <div className="flex flex-wrap items-center gap-3">
                {request.status === 'REQUESTED' && (
                  <button onClick={() => handleStatusTransition('ACCEPTED')} disabled={transitioning} className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-md">
                    Accept Transport Request
                  </button>
                )}
                {request.status === 'ACCEPTED' && (
                  <button onClick={() => handleStatusTransition('ASSIGNED')} disabled={transitioning} className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-md">
                    Assign Vehicle & Driver
                  </button>
                )}
                {request.status === 'ASSIGNED' && (
                  <button onClick={() => handleStatusTransition('PICKUP_PLANNED')} disabled={transitioning} className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-md">
                    Schedule Pickup
                  </button>
                )}
                {request.status === 'PICKUP_PLANNED' && (
                  <button onClick={() => handleStatusTransition('READY_FOR_PICKUP')} disabled={transitioning} className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-md">
                    Mark Ready for Pickup
                  </button>
                )}
                {request.status === 'READY_FOR_PICKUP' && (
                  <button onClick={() => handleStatusTransition('PICKED_UP')} disabled={transitioning} className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-md">
                    Confirm Picked Up
                  </button>
                )}
                {request.status === 'PICKED_UP' && (
                  <button onClick={() => handleStatusTransition('IN_TRANSIT')} disabled={transitioning} className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-md">
                    Mark In Transit
                  </button>
                )}
                {request.status === 'IN_TRANSIT' && (
                  <button onClick={() => handleStatusTransition('DELIVERED')} disabled={transitioning} className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-md">
                    Mark Delivered
                  </button>
                )}
                {request.status === 'DELIVERED' && (
                  <button onClick={() => handleStatusTransition('COMPLETED')} disabled={transitioning} className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-md">
                    Complete Transport Job
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
