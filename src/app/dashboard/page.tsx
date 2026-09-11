'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { VerificationGateModal } from '@/components/verification/VerificationGateModal';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { Sprout, Building2, ShieldCheck, ShieldAlert, TrendingUp, Users, Truck, Warehouse, CloudSun, Bot, Lock, ArrowUpRight, CheckCircle2 } from 'lucide-react';

// Sample Mandi Dataset for Market Prices Active Preview (No Fake Live API claimed)
const SAMPLE_MANDI_PRICES = [
  { crop: 'कांदा (Onion)', market: 'निफाड (Niphad, Nashik)', modalPrice: '₹ 2,450 / क्विंटल', trend: '+ 5%' },
  { crop: 'सोयाबीन (Soyabean)', market: 'लातूर (Latur)', modalPrice: '₹ 4,800 / क्विंटल', trend: '+ 2%' },
  { crop: 'गहू (Wheat)', market: 'पुणे (Pune)', modalPrice: '₹ 2,650 / क्विंटल', trend: 'स्थिर (Stable)' },
  { crop: 'टोमॅटो (Tomato)', market: 'नारायणगाव (Narayangaon)', modalPrice: '₹ 1,800 / क्विंटल', trend: '- 3%' },
];

import { MarketWidget } from '@/components/dashboard/MarketWidget';
import { WeatherWidget } from '@/components/dashboard/WeatherWidget';

export default function DashboardPage() {
  const { t } = useTranslation();

  // User session state (read from cookie / localStorage or mock defaults for dev)
  const [user, setUser] = useState<{
    id: string;
    name: string;
    role: 'FARMER' | 'BUYER';
    mobileVerified: boolean;
    profileVerified: boolean;
  }>({
    id: 'dev-user-123',
    name: 'रमेश पाटील (Ramesh Patil)',
    role: 'FARMER',
    mobileVerified: true,
    profileVerified: false,
  });

  // Modal & Active View States
  const [isGateOpen, setIsGateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'grid' | 'prices' | 'buyers'>('grid');

  useEffect(() => {
    // Read session from client cookie if present
    const cookie = document.cookie
      .split('; ')
      .find((row) => row.startsWith('krishisetu_session='));
    if (cookie) {
      try {
        const val = JSON.parse(decodeURIComponent(cookie.split('=')[1]));
        if (val && val.name) {
          setUser((prev) => ({ ...prev, ...val }));
        }
      } catch (e) {
        console.error('Session read error:', e);
      }
    }
  }, []);

  const handleSellCropClick = () => {
    if (!user.profileVerified) {
      // Trigger Verification Gate Modal for high-trust action!
      setIsGateOpen(true);
    } else {
      alert('Profile is verified! Proceeding to Crop Listing form.');
    }
  };

  const handleVerificationComplete = () => {
    setUser((prev) => ({ ...prev, profileVerified: true }));
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col font-sans">
      
      {/* Navbar with Verification Badge */}
      <Navbar userSession={user} />

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Welcome Header & Verification Status Banner */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-stone-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-stone-500 text-xs font-semibold uppercase tracking-wider">
              {user.role === 'FARMER' ? '👨‍🌾 Farmer Dashboard' : '🏢 Buyer Dashboard'}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900">
              {t('dashboard.welcome')} {user.name}
            </h1>
            <p className="text-xs sm:text-sm text-stone-600 font-medium">
              {t('dashboard.whatDoYouWantToDo')}
            </p>
          </div>

          {/* Verification Status Card */}
          <div className="w-full md:w-auto p-4 rounded-xl border flex items-center justify-between gap-4 bg-stone-50 border-stone-200">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold">
                {user.profileVerified ? (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-800">{t('dashboard.profileVerified')}</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    <span className="text-amber-800">{t('dashboard.mobileVerified')}</span>
                  </>
                )}
              </div>
              <p className="text-[11px] text-stone-500 max-w-xs">
                {user.profileVerified
                  ? 'Identity verified. Full marketplace access enabled.'
                  : t('dashboard.unverifiedNotice')}
              </p>
            </div>

            {!user.profileVerified && (
              <button
                onClick={() => setIsGateOpen(true)}
                className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow shrink-0 transition-colors"
              >
                {t('dashboard.verifyNow')}
              </button>
            )}
          </div>
        </div>

        {/* PHASE 8 MARKET INTELLIGENCE & WEATHER COMPACT WIDGETS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <MarketWidget />
          <WeatherWidget />
        </div>

        {/* View Toggle Tabs */}
        <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
          <button
            onClick={() => setActiveTab('grid')}
            className={`px-4 py-2 rounded-lg font-bold text-xs transition-colors ${
              activeTab === 'grid'
                ? 'bg-emerald-800 text-white shadow-sm'
                : 'bg-white text-stone-600 hover:bg-stone-200'
            }`}
          >
            {user.role === 'FARMER' ? '🌾 Farmer Services' : '🏢 Buyer Services'}
          </button>
          <button
            onClick={() => setActiveTab('prices')}
            className={`px-4 py-2 rounded-lg font-bold text-xs transition-colors ${
              activeTab === 'prices'
                ? 'bg-emerald-800 text-white shadow-sm'
                : 'bg-white text-stone-600 hover:bg-stone-200'
            }`}
          >
            💰 {t('dashboard.farmerActions.marketPrices')}
          </button>
        </div>

        {/* MAIN SERVICES GRID */}
        {activeTab === 'grid' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* FARMER ACTION 1: Sell Crop (HIGH TRUST - VERIFICATION GATED) */}
            <div
              onClick={handleSellCropClick}
              className="group bg-white rounded-2xl p-6 border-2 border-emerald-600 hover:border-emerald-700 shadow-md hover:shadow-xl transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Sprout className="w-7 h-7" />
                </div>
                {!user.profileVerified ? (
                  <span className="px-2.5 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-bold flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    Verification Needed
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-900 text-[10px] font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Ready
                  </span>
                )}
              </div>

              <div>
                <h3 className="text-lg font-bold text-stone-900 mb-1 group-hover:text-emerald-700 transition-colors">
                  🌾 {t('dashboard.farmerActions.sellCrop')}
                </h3>
                <p className="text-xs text-stone-600">
                  {t('dashboard.farmerActions.sellCropDesc')}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between text-xs font-bold text-emerald-800">
                <span>{user.profileVerified ? 'List Produce' : 'Verify & List'}</span>
                <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
            </div>

            {/* FARMER ACTION 2: Market Prices (Active Preview) */}
            <div
              onClick={() => setActiveTab('prices')}
              className="group bg-white rounded-2xl p-6 border border-stone-200 hover:border-emerald-600 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
            >
              <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold mb-4">
                <TrendingUp className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-stone-900 mb-1 group-hover:text-emerald-700 transition-colors">
                  💰 {t('dashboard.farmerActions.marketPrices')}
                </h3>
                <p className="text-xs text-stone-600">
                  {t('dashboard.farmerActions.marketPricesDesc')}
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between text-xs font-bold text-amber-700">
                <span>View Mandi Rates</span>
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>

            {/* FARMER ACTION 3: Find Buyers */}
            <div
              onClick={() => alert('Buyer Directory preview: Connecting local registered buyers.')}
              className="group bg-white rounded-2xl p-6 border border-stone-200 hover:border-emerald-600 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
            >
              <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold mb-4">
                <Users className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-stone-900 mb-1 group-hover:text-emerald-700 transition-colors">
                  👥 {t('dashboard.farmerActions.findBuyers')}
                </h3>
                <p className="text-xs text-stone-600">
                  {t('dashboard.farmerActions.findBuyersDesc')}
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between text-xs font-bold text-blue-700">
                <span>Browse Buyers</span>
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>

            {/* FUTURE PHASE FEATURE: Transport (Phase 6) */}
            <div className="bg-stone-50 rounded-2xl p-6 border border-stone-200/80 text-stone-400 flex flex-col justify-between opacity-80">
              <div className="flex items-start justify-between mb-4">
                <div className="w-14 h-14 rounded-2xl bg-stone-200 text-stone-500 flex items-center justify-center font-bold">
                  <Truck className="w-7 h-7" />
                </div>
                <span className="px-2.5 py-1 rounded-full bg-stone-200 text-stone-700 text-[10px] font-bold">
                  Phase 6
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-stone-700 mb-1">
                  🚚 {t('dashboard.farmerActions.transport')}
                </h3>
                <p className="text-xs text-stone-500">
                  {t('dashboard.farmerActions.transportDesc')}
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-stone-200 text-[11px] font-semibold text-stone-400">
                {t('dashboard.comingSoon')}
              </div>
            </div>

            {/* FUTURE PHASE FEATURE: Storage / Cold Chain (Phase 6) */}
            <div className="bg-stone-50 rounded-2xl p-6 border border-stone-200/80 text-stone-400 flex flex-col justify-between opacity-80">
              <div className="flex items-start justify-between mb-4">
                <div className="w-14 h-14 rounded-2xl bg-stone-200 text-stone-500 flex items-center justify-center font-bold">
                  <Warehouse className="w-7 h-7" />
                </div>
                <span className="px-2.5 py-1 rounded-full bg-stone-200 text-stone-700 text-[10px] font-bold">
                  Phase 6
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-stone-700 mb-1">
                  📦 {t('dashboard.farmerActions.storage')}
                </h3>
                <p className="text-xs text-stone-500">
                  {t('dashboard.farmerActions.storageDesc')}
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-stone-200 text-[11px] font-semibold text-stone-400">
                {t('dashboard.comingSoon')}
              </div>
            </div>

            {/* FUTURE PHASE FEATURE: Weather (Phase 8) */}
            <div className="bg-stone-50 rounded-2xl p-6 border border-stone-200/80 text-stone-400 flex flex-col justify-between opacity-80">
              <div className="flex items-start justify-between mb-4">
                <div className="w-14 h-14 rounded-2xl bg-stone-200 text-stone-500 flex items-center justify-center font-bold">
                  <CloudSun className="w-7 h-7" />
                </div>
                <span className="px-2.5 py-1 rounded-full bg-stone-200 text-stone-700 text-[10px] font-bold">
                  Phase 8
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-stone-700 mb-1">
                  🌦️ {t('dashboard.farmerActions.weather')}
                </h3>
                <p className="text-xs text-stone-500">
                  {t('dashboard.farmerActions.weatherDesc')}
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-stone-200 text-[11px] font-semibold text-stone-400">
                {t('dashboard.comingSoon')}
              </div>
            </div>

            {/* FUTURE PHASE FEATURE: KrishiSetu AI Assistant (Phase 11) */}
            <div className="bg-stone-50 rounded-2xl p-6 border border-stone-200/80 text-stone-400 flex flex-col justify-between opacity-80 sm:col-span-2 lg:col-span-3">
              <div className="flex items-start justify-between mb-4">
                <div className="w-14 h-14 rounded-2xl bg-stone-200 text-stone-500 flex items-center justify-center font-bold">
                  <Bot className="w-7 h-7" />
                </div>
                <span className="px-2.5 py-1 rounded-full bg-stone-200 text-stone-700 text-[10px] font-bold">
                  Phase 11
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-stone-700 mb-1">
                  🤖 {t('dashboard.farmerActions.askKrishiSetu')}
                </h3>
                <p className="text-xs text-stone-500">
                  {t('dashboard.farmerActions.askKrishiSetuDesc')}
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-stone-200 text-[11px] font-semibold text-stone-400">
                {t('dashboard.comingSoon')}
              </div>
            </div>

          </div>
        )}

        {/* MARKET PRICES ACTIVE PREVIEW TAB */}
        {activeTab === 'prices' && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h2 className="text-lg font-bold text-stone-900">
                  💰 ताजे बाजार भाव (Regional Mandi Prices)
                </h2>
                <p className="text-xs text-stone-500">
                  Sample market intelligence dataset for Maharashtra APMC mandis.
                </p>
              </div>
              <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                Sample Mandi Data
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-700">
                <thead className="bg-stone-100 text-stone-900 font-bold border-b border-stone-200">
                  <tr>
                    <th className="p-3">पीक (Crop)</th>
                    <th className="p-3">मंडी (Mandi Location)</th>
                    <th className="p-3">सरासरी भाव (Modal Price)</th>
                    <th className="p-3">कल (Trend)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {SAMPLE_MANDI_PRICES.map((row, idx) => (
                    <tr key={idx} className="hover:bg-stone-50">
                      <td className="p-3 font-bold text-stone-900">{row.crop}</td>
                      <td className="p-3">{row.market}</td>
                      <td className="p-3 font-extrabold text-emerald-800">{row.modalPrice}</td>
                      <td className="p-3 font-semibold text-stone-600">{row.trend}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

      {/* Verification Gate Modal Popup */}
      <VerificationGateModal
        isOpen={isGateOpen}
        onClose={() => setIsGateOpen(false)}
        userId={user.id}
        onVerificationComplete={handleVerificationComplete}
      />

    </div>
  );
}
