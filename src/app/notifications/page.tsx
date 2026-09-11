'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { SyncManager } from '@/components/offline/SyncManager';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import {
  Bell,
  CheckCheck,
  Check,
  Filter,
  Tag,
  ShoppingBag,
  Truck,
  Warehouse,
  Store,
  Sun,
  AlertTriangle,
  Info,
  Clock,
  ArrowRight,
  WifiOff,
  Settings,
  ShieldAlert,
} from 'lucide-react';
import { NotificationItem, NotificationCategory } from '@/lib/types/phase9';
import { getCachedNotifications, saveNotificationsToCache } from '@/lib/offline/indexedDBStore';

export default function NotificationsPage() {
  const { t } = useTranslation();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [unreadOnly, setUnreadOnly] = useState<boolean>(false);

  useEffect(() => {
    setIsOffline(!navigator.onLine);
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      let url = `/api/v1/notifications?limit=100`;
      if (selectedCategory !== 'ALL') url += `&category=${selectedCategory}`;
      if (unreadOnly) url += `&unreadOnly=true`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
        saveNotificationsToCache(data.notifications || []);
      }
    } catch (err) {
      console.error('Fetch notifications error, using IndexedDB cache:', err);
      const cached = await getCachedNotifications();
      let filtered = cached;
      if (selectedCategory !== 'ALL') filtered = filtered.filter((n) => n.category === selectedCategory);
      if (unreadOnly) filtered = filtered.filter((n) => !n.readAt);
      setNotifications(filtered);
      setUnreadCount(cached.filter((n) => !n.readAt).length);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [selectedCategory, unreadOnly]);

  const handleMarkAsRead = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/notifications/${id}/read`, { method: 'PATCH' });
      const data = await res.json();
      if (data.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Mark read error:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch('/api/v1/notifications/read-all', { method: 'PATCH' });
      const data = await res.json();
      if (data.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Mark all read error:', err);
    }
  };

  const getCategoryIcon = (category: NotificationCategory) => {
    switch (category) {
      case 'OFFER':
        return <ShoppingBag className="w-4 h-4 text-emerald-600" />;
      case 'ORDER':
        return <ShoppingBag className="w-4 h-4 text-amber-600" />;
      case 'TRANSPORT':
        return <Truck className="w-4 h-4 text-blue-600" />;
      case 'STORAGE':
        return <Warehouse className="w-4 h-4 text-purple-600" />;
      case 'MARKET':
        return <Store className="w-4 h-4 text-teal-600" />;
      case 'WEATHER':
        return <Sun className="w-4 h-4 text-sky-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-600" />;
    }
  };

  const formatMessageText = (notif: NotificationItem) => {
    const p = notif.payload || {};
    switch (notif.type) {
      case 'OFFER_RECEIVED':
        return `Buyer has submitted an offer for ${p.cropName || 'produce'} (${p.quantity || 0} ${p.unit || 'Qtl'} @ ₹${p.pricePerUnit || 0}/unit).`;
      case 'COUNTER_OFFER_RECEIVED':
        return `Counter-offer received for ${p.cropName || 'produce'} (${p.quantity || 0} ${p.unit || 'Qtl'} @ ₹${p.pricePerUnit || 0}/unit).`;
      case 'OFFER_ACCEPTED':
        return `Offer for ${p.cropName || 'produce'} has been accepted! Quantity reserved.`;
      case 'OFFER_REJECTED':
        return `Offer for ${p.cropName || 'produce'} was not accepted.`;
      case 'ORDER_CREATED':
        return `Order #${p.orderNumber || ''} created for ${p.quantity || 0} ${p.unit || 'Qtl'} of ${p.cropName || 'produce'}.`;
      case 'ORDER_STATUS_CHANGED':
        return `Order #${p.orderNumber || ''} status updated to '${p.status || ''}'.`;
      case 'TRANSPORT_REQUESTED':
      case 'TRANSPORT_ACCEPTED':
        return `Transport request updated for ${p.vehicleType || 'vehicle'}. Status: ${p.status || ''}.`;
      case 'STORAGE_REQUESTED':
      case 'STORAGE_ACCEPTED':
        return `Storage reservation updated for ${p.facilityName || 'facility'}. Status: ${p.status || ''}.`;
      case 'MARKET_PRICE_ALERT':
        return `Market alert: ${p.cropName} in ${p.district} reached ₹${p.observedPrice} (Target: ${p.condition} ₹${p.targetPrice}).`;
      case 'WEATHER_ALERT':
        return `Weather advisory for ${p.district}: ${p.condition}. Consider reviewing harvest and storage plans.`;
      default:
        return t(notif.messageKey) || 'Notification update from KrishiSetu.';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      <Navbar />
      <SyncManager />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 space-y-6">
        {/* Header Hero */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold uppercase tracking-wider border border-amber-500/30">
              <Bell className="w-4 h-4" />
              {t('notifications.title')}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {t('notifications.title')}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              Active app unread notifications & actionable transaction reminders
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/settings/notifications"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-600 transition-colors"
            >
              <Settings className="w-4 h-4 text-amber-400" />
              <span>{t('notifications.settingsBtn')}</span>
            </Link>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-emerald-950 text-xs font-extrabold shadow transition-colors"
              >
                <CheckCheck className="w-4 h-4" />
                <span>{t('notifications.markAllRead')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Offline Cache Notice */}
        {isOffline && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center space-x-3 text-amber-900 text-xs font-medium">
            <WifiOff className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-bold">Viewing Cached Notifications (Offline Mode)</p>
              <p className="text-[11px] text-amber-700">Notifications cached locally in IndexedDB. Reconnect to refresh feed.</p>
            </div>
          </div>
        )}

        {/* Filter Controls Bar */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-4 shadow-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {['ALL', 'OFFER', 'ORDER', 'TRANSPORT', 'STORAGE', 'MARKET', 'WEATHER'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  selectedCategory === cat
                    ? 'bg-emerald-900 text-amber-300'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Unread Only Toggle */}
          <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => setUnreadOnly(e.target.checked)}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
            />
            <span>{t('notifications.unreadOnly')}</span>
          </label>
        </div>

        {/* Notification List Feed */}
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs font-semibold animate-pulse">
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-700 space-y-3">
            <Bell className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">{t('notifications.noNotifications')}</h3>
            <p className="text-xs text-slate-400">All transactional updates and market alerts will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif) => {
              const isUnread = !notif.readAt;
              const isDemo = notif.payload?.isDemoData;

              return (
                <div
                  key={notif.id}
                  className={`p-5 rounded-3xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isUnread
                      ? 'bg-white dark:bg-slate-800 border-emerald-500/60 shadow-lg'
                      : 'bg-slate-50/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700/80 opacity-90'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    {/* Category Icon */}
                    <div className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-700 shrink-0 mt-0.5">
                      {getCategoryIcon(notif.category)}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {isUnread && <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" />}
                        <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                          {t(notif.titleKey) || notif.type}
                        </span>

                        {/* Priority Badge */}
                        {notif.priority === 'HIGH' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800 uppercase">
                            High Priority
                          </span>
                        )}

                        {/* Demo Data Tag (Correction #6) */}
                        {isDemo && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                            Demo Data Alert
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {formatMessageText(notif)}
                      </p>

                      <div className="text-[10px] text-slate-400 flex items-center gap-2 pt-1">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(notif.createdAt).toLocaleString()}</span>
                        {notif.isRequired && <span className="text-emerald-600 font-semibold">• Required Workflow</span>}
                      </div>
                    </div>
                  </div>

                  {/* Actions Right */}
                  <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-700/60 justify-end">
                    {notif.deepLink && (
                      <Link
                        href={notif.deepLink}
                        className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-emerald-900 hover:bg-emerald-800 text-amber-300 text-xs font-bold transition-colors"
                      >
                        <span>{t('notifications.actionBtn')}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    )}

                    {isUnread && (
                      <button
                        onClick={() => handleMarkAsRead(notif.id)}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors"
                        title={t('notifications.markRead')}
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
