'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { SyncManager } from '@/components/offline/SyncManager';
import { VoiceInput } from '@/components/voice/VoiceInput';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Store,
  MapPin,
  Calendar,
  AlertTriangle,
  Info,
  Layers,
  Sparkles,
  ArrowRight,
  WifiOff,
} from 'lucide-react';
import {
  MarketPriceRecordItem,
  HistoricalTrendResult,
  PriceOutlookResult,
  NearbyMarketComparisonItem,
} from '@/lib/types/phase8';

export default function MarketIntelligencePage() {
  const { t } = useTranslation();

  const [crop, setCrop] = useState<string>('Onion');
  const [district, setDistrict] = useState<string>('Nashik');
  const [loading, setLoading] = useState<boolean>(true);

  const [currentPrices, setCurrentPrices] = useState<MarketPriceRecordItem[]>([]);
  const [historicalTrend, setHistoricalTrend] = useState<HistoricalTrendResult | null>(null);
  const [nearbyMarkets, setNearbyMarkets] = useState<NearbyMarketComparisonItem[]>([]);
  const [outlook, setOutlook] = useState<PriceOutlookResult | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(false);

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

  const fetchMarketData = async () => {
    setLoading(true);
    try {
      // 1. Current Prices
      const resCurrent = await fetch(`/api/v1/market-intelligence?crop=${crop}&district=${district}`);
      const dataCurrent = await resCurrent.json();
      if (dataCurrent.success) setCurrentPrices(dataCurrent.prices || []);

      // 2. Historical Trend
      const resHist = await fetch(`/api/v1/market-intelligence/history?crop=${crop}&days=30`);
      const dataHist = await resHist.json();
      if (dataHist.success) setHistoricalTrend(dataHist.history || null);

      // 3. Nearby Comparison
      const resNearby = await fetch(`/api/v1/market-intelligence/nearby?crop=${crop}&district=${district}`);
      const dataNearby = await resNearby.json();
      if (dataNearby.success) setNearbyMarkets(dataNearby.nearbyMarkets || []);

      // 4. Price Outlook
      const resOutlook = await fetch(`/api/v1/market-intelligence/outlook?crop=${crop}`);
      const dataOutlook = await resOutlook.json();
      if (dataOutlook.success) setOutlook(dataOutlook.outlook || null);

      // Save to localStorage for offline cache fallback
      if (dataCurrent.success && dataCurrent.prices) {
        localStorage.setItem(`krishisetu_mkt_${crop}_${district}`, JSON.stringify(dataCurrent.prices));
      }
    } catch (err) {
      console.error('Failed to fetch market data:', err);
      // Try offline localStorage fallback
      const cached = localStorage.getItem(`krishisetu_mkt_${crop}_${district}`);
      if (cached) {
        try {
          setCurrentPrices(JSON.parse(cached));
        } catch (e) {}
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketData();
  }, [crop, district]);

  const selectedRecord = currentPrices[0] || null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      <Navbar />
      <SyncManager />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 space-y-6">
        {/* Header Hero */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-700 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wider border border-emerald-500/30">
            <Store className="w-4 h-4" />
            {t('market.title')}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {t('market.title')}
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">
            {t('market.subtitle')}
          </p>
        </div>

        {/* Offline Cache Banner */}
        {isOffline && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center space-x-3 text-amber-900 text-xs font-medium">
            <WifiOff className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-bold">Viewing Cached Market Data (Offline Mode)</p>
              <p className="text-[11px] text-amber-700">Connect to internet to refresh latest APMC mandi benchmark prices.</p>
            </div>
          </div>
        )}

        {/* Filters Bar */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-end gap-4">
          <div className="w-full sm:w-1/3">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {t('market.selectCrop')}
            </label>
            <select
              value={crop}
              onChange={(e) => setCrop(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="Onion">Onion (कांदा)</option>
              <option value="Potato">Potato (बटाटा)</option>
              <option value="Tomato">Tomato (टोमॅटो)</option>
              <option value="Turmeric">Turmeric (हळद)</option>
              <option value="Wheat">Wheat (गहू)</option>
              <option value="Soybean">Soybean (सोयाबीन)</option>
              <option value="Cotton">Cotton (कापूस)</option>
              <option value="Grapes">Grapes (द्राक्षे)</option>
            </select>
          </div>

          <div className="w-full sm:w-1/3">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {t('market.selectDistrict')}
            </label>
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="Nashik">Nashik (नाशिक)</option>
              <option value="Pune">Pune (पुणे)</option>
              <option value="Ahmednagar">Ahmednagar (अहमदनगर)</option>
              <option value="Solapur">Solapur (सोलापूर)</option>
              <option value="Sangli">Sangli (सांगली)</option>
              <option value="Latur">Latur (लातूर)</option>
              <option value="Nagpur">Nagpur (नागपूर)</option>
              <option value="Mumbai Suburban">Mumbai APMC / Vashi</option>
            </select>
          </div>

          <div className="w-full sm:w-1/3 flex items-center gap-2">
            <VoiceInput
              onCommandResolved={(cmd) => {
                if (cmd.crop) {
                  const capitalized = cmd.crop.charAt(0).toUpperCase() + cmd.crop.slice(1);
                  setCrop(capitalized);
                }
              }}
            />
          </div>
        </div>

        {/* Current Benchmark Price Cards */}
        {selectedRecord && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Modal Price Primary Card */}
            <div className="md:col-span-2 bg-gradient-to-br from-emerald-900 to-teal-950 text-white p-6 rounded-3xl shadow-xl border border-emerald-800 flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-800 text-amber-300 uppercase">
                  {selectedRecord.mandiName}
                </span>
                <span className="text-[10px] text-emerald-200 bg-emerald-900/80 px-2.5 py-1 rounded">
                  {selectedRecord.isDemoData ? t('market.demoDataNotice') : 'Verified Source'}
                </span>
              </div>

              <div>
                <span className="text-xs text-emerald-200 font-semibold block">{t('market.modalPrice')}</span>
                <div className="text-4xl font-black text-amber-400 tracking-tight mt-1">
                  ₹{selectedRecord.modalPrice.toLocaleString()} <span className="text-sm font-bold text-white">/ {selectedRecord.unit}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-emerald-800/80 flex items-center justify-between text-xs text-emerald-100">
                <span>Arrivals: {selectedRecord.arrivalsQuantity} {selectedRecord.unit}</span>
                <span>Date: {selectedRecord.marketDate}</span>
              </div>
            </div>

            {/* Min Price Card */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
              <div>
                <span className="text-xs text-slate-500 font-medium block">{t('market.minPrice')}</span>
                <div className="text-2xl font-black text-slate-800 dark:text-white mt-1">
                  ₹{selectedRecord.minPrice.toLocaleString()}
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">Lowest recorded mandi trade price for {selectedRecord.cropName}</p>
            </div>

            {/* Max Price Card */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
              <div>
                <span className="text-xs text-slate-500 font-medium block">{t('market.maxPrice')}</span>
                <div className="text-2xl font-black text-slate-800 dark:text-white mt-1">
                  ₹{selectedRecord.maxPrice.toLocaleString()}
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">Highest recorded mandi trade price for premium grade</p>
            </div>
          </div>
        )}

        {/* What This Means For You (Farmer Interpretation Box) */}
        {historicalTrend && (
          <div className="p-6 rounded-3xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-3">
            <div className="flex items-center space-x-2 text-amber-900 dark:text-amber-200">
              <Sparkles className="w-5 h-5 text-amber-600" />
              <h3 className="font-extrabold text-sm uppercase tracking-wider">{t('market.whatThisMeans')}</h3>
            </div>

            <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-amber-600 font-bold">•</span>
                <span>
                  Modal price in <strong>{historicalTrend.mandiName}</strong> has shown a{' '}
                  <strong className={historicalTrend.percentageChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                    {historicalTrend.percentageChange >= 0 ? '+' : ''}{historicalTrend.percentageChange}% {historicalTrend.trend.toLowerCase()} movement
                  </strong> over the past 30 days.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600 font-bold">•</span>
                <span>
                  Current benchmark is ₹{selectedRecord?.modalPrice} / {selectedRecord?.unit}. Compare nearby mandi rates before committing transport.
                </span>
              </li>
            </ul>
          </div>
        )}

        {/* Price Trend Indicator Card */}
        {outlook && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-700 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">{t('market.priceOutlook')}</h3>
              </div>
              <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                Historical Trend Indicator
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
              <div>
                <span className="text-xs text-slate-500 font-medium">30-Day Trend Indicator:</span>
                <div className="flex items-center space-x-2 mt-1">
                  {outlook.outlook === 'UPWARD' && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800">
                      <TrendingUp className="w-4 h-4 mr-1" /> UPWARD TREND
                    </span>
                  )}
                  {outlook.outlook === 'DOWNWARD' && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800">
                      <TrendingDown className="w-4 h-4 mr-1" /> DOWNWARD TREND
                    </span>
                  )}
                  {outlook.outlook === 'STABLE' && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-slate-200 text-slate-800">
                      <Minus className="w-4 h-4 mr-1" /> STABLE PRICE RANGE
                    </span>
                  )}
                  {outlook.outlook === 'INSUFFICIENT_DATA' && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800">
                      <AlertTriangle className="w-4 h-4 mr-1" /> INSUFFICIENT DATA
                    </span>
                  )}
                </div>
              </div>

              <div className="text-xs text-slate-500 italic border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-slate-700 pt-2 sm:pt-0 sm:pl-4">
                <Info className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
                {outlook.disclaimer || t('market.probabilityDisclaimer')}
              </div>
            </div>
          </div>
        )}

        {/* Nearby Mandi Price Comparison */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-xl border border-slate-200 dark:border-slate-700 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-700 pb-3">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base">{t('market.nearbyComparison')}</h3>
            <span className="text-xs text-slate-500">Sorted by Nearest Geodesic Distance</span>
          </div>

          {/* Contextual Warning */}
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>{t('market.contextualWarning')}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {nearbyMarkets.map((m) => (
              <div key={m.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">{m.mandiName}</span>
                    <span className="text-[10px] text-slate-400">{m.district}</span>
                  </div>
                  <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                    ₹{m.modalPrice.toLocaleString()} <span className="text-xs font-normal text-slate-500">/ {m.unit}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Range: ₹{m.minPrice} - ₹{m.maxPrice}</p>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    ~{m.distanceKm} km ({m.distanceLabel})
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
