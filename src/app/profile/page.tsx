'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { User, Sprout, Building2, ShieldCheck, ShieldAlert, Save, CheckCircle2 } from 'lucide-react';

export default function ProfilePage() {
  const { t } = useTranslation();

  const [user, setUser] = useState<any>({
    id: 'dev-user-123',
    name: 'रमेश पाटील (Ramesh Patil)',
    mobile: '9876543210',
    role: 'FARMER',
    mobileVerified: true,
    profileVerified: false,
  });

  const [mainCrop, setMainCrop] = useState('कांदा (Onion)');
  const [otherCrops, setOtherCrops] = useState('गहू, सोयाबीन (Wheat, Soyabean)');
  const [farmArea, setFarmArea] = useState('3.5');

  const [businessName, setBusinessName] = useState('पाटील ॲग्रो ट्रेडींग');
  const [businessType, setBusinessType] = useState('TRADER');

  const [savedNotice, setSavedNotice] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const cookie = document.cookie
      .split('; ')
      .find((row) => row.startsWith('krishisetu_session='));
    if (cookie) {
      try {
        const val = JSON.parse(decodeURIComponent(cookie.split('=')[1]));
        if (val && val.name) {
          setUser((prev: any) => ({ ...prev, ...val }));
        }
      } catch (e) {
        console.error('Session read error:', e);
      }
    }
  }, []);

  const [reputation, setReputation] = useState<any>(null);
  const [userReviews, setUserReviews] = useState<any[]>([]);

  useEffect(() => {
    if (user && user.id) {
      fetch(`/api/v1/reputation/${user.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setReputation(data.summary);
          }
        })
        .catch((err) => console.error('Fetch reputation error:', err));

      fetch(`/api/v1/reputation/${user.id}/reviews`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setUserReviews(data.reviews);
          }
        })
        .catch((err) => console.error('Fetch reviews error:', err));
    }
  }, [user?.id]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSavedNotice(false);

    try {
      await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          role: user.role,
          farmerData: {
            mainCrop,
            otherCrops,
            farmArea: parseFloat(farmArea) || 0,
          },
          buyerData: {
            businessName,
            businessType,
          },
        }),
      });

      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 3000);
    } catch (err) {
      console.error('Profile save error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col font-sans">
      <Navbar userSession={user} />

      <main className="flex-1 max-w-3xl mx-auto w-full p-4 sm:p-6 lg:p-8 space-y-6">
        
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xl">
              <User className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-stone-900">{user.name}</h1>
              <p className="text-xs text-stone-500 font-medium">+91 {user.mobile}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-800">
            {user.profileVerified ? (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>{t('dashboard.profileVerified')}</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <span>{t('dashboard.mobileVerified')}</span>
              </>
            )}
          </div>
        </div>

        {/* Trust & Reputation Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200 space-y-4">
          <div className="border-b border-stone-100 pb-3">
            <h2 className="text-lg font-bold text-stone-900">{t('trust.trustTitle')}</h2>
            <p className="text-xs text-stone-500">{t('trust.trustSubtitle')}</p>
          </div>

          {reputation && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 text-center">
                <span className="block text-xs font-semibold text-stone-500">{t('trust.completedCount')}</span>
                <span className="text-lg font-black text-stone-800">{reputation.completedTransactionCount}</span>
              </div>
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 text-center">
                <span className="block text-xs font-semibold text-stone-500">{t('trust.avgRating')}</span>
                <span className="text-lg font-black text-amber-600">
                  {reputation.averageRating > 0 ? `⭐ ${reputation.averageRating}` : 'N/A'}
                </span>
              </div>
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 text-center col-span-2 sm:col-span-2">
                <span className="block text-xs font-semibold text-stone-500 mb-1">Verification Badges</span>
                <div className="flex flex-wrap gap-1 justify-center">
                  {reputation.verificationBadges?.map((badge: string, idx: number) => (
                    <span key={idx} className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {badge}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="pt-2">
            <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wide mb-2">{t('trust.reviewsCount')} ({userReviews.length})</h3>
            {userReviews.length === 0 ? (
              <p className="text-xs text-stone-400 italic">{t('trust.noReviews')}</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {userReviews.map((rev) => (
                  <div key={rev.id} className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs space-y-1">
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-stone-800">{rev.reviewerName || 'Order Participant'}</span>
                      <span className="text-amber-600">{'⭐'.repeat(rev.rating)} ({rev.rating}/5)</span>
                    </div>
                    {rev.comment && <p className="text-stone-600 font-medium">{rev.comment}</p>}
                    <span className="text-[10px] text-stone-400 block">{new Date(rev.createdAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Profile Details Form */}
        <form onSubmit={handleSaveProfile} className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-stone-200 space-y-6">
          <h2 className="text-lg font-bold text-stone-900 border-b border-stone-100 pb-3 flex items-center gap-2">
            {user.role === 'FARMER' ? <Sprout className="w-5 h-5 text-emerald-700" /> : <Building2 className="w-5 h-5 text-amber-700" />}
            {user.role === 'FARMER' ? t('profile.farmerInfo') : t('profile.buyerInfo')}
          </h2>

          {savedNotice && (
            <div className="p-3 rounded-xl bg-emerald-100 text-emerald-900 text-xs font-bold text-center flex items-center justify-center gap-2 border border-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <span>{t('profile.profileSaved')}</span>
            </div>
          )}

          {user.role === 'FARMER' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  {t('profile.mainCrop')}
                </label>
                <input
                  type="text"
                  value={mainCrop}
                  onChange={(e) => setMainCrop(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-xs font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  {t('profile.otherCrops')}
                </label>
                <input
                  type="text"
                  value={otherCrops}
                  onChange={(e) => setOtherCrops(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-xs font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  {t('profile.farmArea')}
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={farmArea}
                  onChange={(e) => setFarmArea(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-xs font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  {t('profile.businessName')}
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-xs font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  {t('profile.businessType')}
                </label>
                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-xs font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                >
                  <option value="TRADER">Trader (व्यापारी)</option>
                  <option value="WHOLESALER">Wholesaler (घाऊक विक्रेता)</option>
                  <option value="PROCESSOR">Processor (प्रक्रियादार)</option>
                  <option value="RETAILER">Retailer (किरकोळ विक्रेता)</option>
                  <option value="FPO">FPO (शेतकरी उत्पादक कंपनी)</option>
                  <option value="EXPORTER">Exporter (निर्यातक)</option>
                </select>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs shadow transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? t('common.loading') : t('profile.saveProfile')}</span>
          </button>
        </form>

      </main>
    </div>
  );
}

