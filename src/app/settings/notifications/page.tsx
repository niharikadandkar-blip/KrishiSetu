'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { SyncManager } from '@/components/offline/SyncManager';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import {
  Settings,
  Bell,
  Check,
  ShieldCheck,
  Info,
  Trash2,
  Plus,
  ArrowLeft,
  AlertTriangle,
  Store,
} from 'lucide-react';
import { NotificationPreferenceItem, MarketAlertConfigItem } from '@/lib/types/phase9';

export default function NotificationSettingsPage() {
  const { t } = useTranslation();

  const [prefs, setPrefs] = useState<NotificationPreferenceItem | null>(null);
  const [alerts, setAlerts] = useState<MarketAlertConfigItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Form for adding market alert
  const [cropName, setCropName] = useState<string>('Onion');
  const [district, setDistrict] = useState<string>('Nashik');
  const [targetPrice, setTargetPrice] = useState<number>(2500);
  const [condition, setCondition] = useState<'ABOVE' | 'BELOW'>('ABOVE');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resPrefs, resAlerts] = await Promise.all([
        fetch('/api/v1/notification-preferences'),
        fetch('/api/v1/alerts'),
      ]);

      const dataPrefs = await resPrefs.json();
      const dataAlerts = await resAlerts.json();

      if (dataPrefs.success) setPrefs(dataPrefs.preferences);
      if (dataAlerts.success) setAlerts(dataAlerts.alerts || []);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTogglePreference = async (key: keyof NotificationPreferenceItem, value: boolean) => {
    if (!prefs) return;
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);

    try {
      const res = await fetch('/api/v1/notification-preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      }
    } catch (err) {
      console.error('Failed to update preference:', err);
    }
  };

  const handleAddAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cropName, district, targetPrice, condition }),
      });
      const data = await res.json();
      if (data.success) {
        setAlerts((prev) => [data.alert, ...prev]);
      }
    } catch (err) {
      console.error('Failed to add market alert:', err);
    }
  };

  const handleDeleteAlert = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/alerts/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setAlerts((prev) => prev.filter((a) => a.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete alert:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      <Navbar />
      <SyncManager />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 space-y-6">
        {/* Back Link */}
        <Link
          href="/notifications"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Notifications</span>
        </Link>

        {/* Page Title */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-xl border border-slate-200 dark:border-slate-700 space-y-2">
          <div className="flex items-center space-x-2">
            <Settings className="w-6 h-6 text-amber-500" />
            <h1 className="text-xl sm:text-2xl font-extrabold">{t('notifications.settingsTitle')}</h1>
          </div>
          <p className="text-xs text-slate-500">
            Control in-app notification categories and configure mandi price threshold alerts.
          </p>
        </div>

        {/* Required Notification Disclaimer Notice (Correction #7) */}
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2.5">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Required Transactional Workflow Notice</p>
            <p className="text-[11px] text-emerald-800">
              Critical transaction updates (e.g. order confirmations, ready for pickup, quality inspections) remain active to prevent workflow disruptions. Optional categories can be toggled below.
            </p>
          </div>
        </div>

        {saveSuccess && (
          <div className="p-3 rounded-xl bg-emerald-500 text-white text-xs font-bold flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>Notification preferences updated successfully!</span>
          </div>
        )}

        {/* Preferences Toggles Card */}
        {prefs && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-xl border border-slate-200 dark:border-slate-700 space-y-4">
            <h2 className="font-bold text-base border-b border-slate-150 dark:border-slate-700 pb-2">
              In-App Notification Categories
            </h2>

            <div className="space-y-3">
              {[
                { key: 'enableInApp', label: 'Master In-App Notifications', desc: 'Enable optional in-app alerts' },
                { key: 'enableOffers', label: 'Offer & Bidding Updates', desc: 'New offers, counter-offers, acceptances' },
                { key: 'enableOrders', label: 'Order Fulfillment Alerts', desc: 'Order status changes and milestone receipts' },
                { key: 'enableTransport', label: 'Transportation Updates', desc: 'Transport requests and driver assignments' },
                { key: 'enableStorage', label: 'Storage & Warehouse Alerts', desc: 'Storage reservations and check-in updates' },
                { key: 'enableMarket', label: 'Market Price Alerts', desc: 'Mandi price threshold notifications' },
                { key: 'enableWeather', label: 'Agricultural Weather Advisories', desc: 'Rainfall and harvest advisory alerts' },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  <div>
                    <span className="font-bold text-xs text-slate-800 dark:text-white block">{item.label}</span>
                    <span className="text-[11px] text-slate-400">{item.desc}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={(prefs as any)[item.key]}
                    onChange={(e) => handleTogglePreference(item.key as any, e.target.checked)}
                    className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Market Alerts Config Card */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-xl border border-slate-200 dark:border-slate-700 space-y-6">
          <div>
            <h2 className="font-bold text-base flex items-center gap-2">
              <Store className="w-5 h-5 text-emerald-600" />
              Configure Mandi Price Alerts
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Receive alerts when market modal price crosses your target threshold during data queries.
            </p>
          </div>

          {/* Alert Creation Form */}
          <form onSubmit={handleAddAlert} className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Crop</label>
              <select
                value={cropName}
                onChange={(e) => setCropName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
              >
                <option value="Onion">Onion</option>
                <option value="Potato">Potato</option>
                <option value="Tomato">Tomato</option>
                <option value="Turmeric">Turmeric</option>
                <option value="Soybean">Soybean</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">District</label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
              >
                <option value="Nashik">Nashik</option>
                <option value="Pune">Pune</option>
                <option value="Sangli">Sangli</option>
                <option value="Latur">Latur</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Condition & Price (₹)</label>
              <div className="flex gap-1">
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as any)}
                  className="px-2 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                >
                  <option value="ABOVE">≥</option>
                  <option value="BELOW">≤</option>
                </select>
                <input
                  type="number"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                  placeholder="2500"
                />
              </div>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-900 hover:bg-emerald-800 text-amber-300 text-xs font-bold flex items-center justify-center gap-1 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Alert</span>
              </button>
            </div>
          </form>

          {/* Configured Alerts List */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Market Alerts ({alerts.length})</h3>
            {alerts.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No custom market price alerts configured.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {alerts.map((alert) => (
                  <div key={alert.id} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div>
                      <span className="font-extrabold text-xs text-slate-800 dark:text-white">{alert.cropName} ({alert.district})</span>
                      <p className="text-[11px] text-emerald-600 font-bold mt-0.5">
                        Trigger when price {alert.condition === 'ABOVE' ? '≥' : '≤'} ₹{alert.targetPrice}/Qtl
                      </p>
                    </div>

                    <button
                      onClick={() => handleDeleteAlert(alert.id)}
                      className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
                      title="Delete Alert"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
