'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { getPendingMutations, QueuedMutation } from '@/lib/offline/indexedDBStore';
import { offlineQueue } from '@/lib/offline/offlineQueue';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';

export const SyncManager: React.FC = () => {
  const { t } = useTranslation();
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingItems, setPendingItems] = useState<QueuedMutation[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncSuccess, setSyncSuccess] = useState<boolean>(false);

  const checkPending = async () => {
    const items = await getPendingMutations();
    setPendingItems(items);
  };

  useEffect(() => {
    setIsOnline(navigator.onLine);
    checkPending();

    const handleOnline = async () => {
      setIsOnline(true);
      await triggerSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
      checkPending();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(checkPending, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const triggerSync = async () => {
    if (!navigator.onLine || isSyncing) return;
    setIsSyncing(true);
    setSyncSuccess(false);

    try {
      const res = await offlineQueue.processQueue();
      await checkPending();
      if (res.succeeded > 0) {
        setSyncSuccess(true);
        setTimeout(() => setSyncSuccess(false), 3000);
      }
    } catch (e) {
      console.error('Sync error:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const pendingCount = pendingItems.length;
  const conflictItem = pendingItems.find((i) => i.status === 'CONFLICT');

  if (isOnline && pendingCount === 0 && !syncSuccess) {
    return null; // Hidden when online with empty queue
  }

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 max-w-sm w-full p-3.5 rounded-2xl shadow-xl border text-xs font-semibold flex items-center justify-between gap-3 transition-all ${
        conflictItem
          ? 'bg-rose-950 text-rose-100 border-rose-700'
          : !isOnline
          ? 'bg-amber-900 text-amber-100 border-amber-700'
          : 'bg-emerald-900 text-emerald-100 border-emerald-700'
      }`}
    >
      <div className="flex items-center gap-2.5">
        {conflictItem ? (
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
        ) : !isOnline ? (
          <WifiOff className="w-5 h-5 text-amber-400 shrink-0" />
        ) : syncSuccess ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
        ) : (
          <Wifi className="w-5 h-5 text-emerald-400 shrink-0" />
        )}
        <div>
          <div>
            {conflictItem
              ? 'Conflict Detected on Reconnect'
              : !isOnline
              ? t('offlineSync.bannerOffline')
              : t('offlineSync.bannerOnline')}
          </div>
          {conflictItem ? (
            <div className="text-[11px] text-rose-300 font-normal mt-0.5">
              {conflictItem.errorMessage || 'Server state evolved; action rejected safely.'}
            </div>
          ) : (
            pendingCount > 0 && (
              <div className="text-[11px] text-amber-300 font-bold mt-0.5">
                {t('offlineSync.pendingCount')} {pendingCount}
              </div>
            )
          )}
        </div>
      </div>

      {isOnline && pendingCount > 0 && (
        <button
          onClick={triggerSync}
          disabled={isSyncing}
          className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center gap-1 shrink-0 transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          {t('offlineSync.syncNow')}
        </button>
      )}
    </div>
  );
};
