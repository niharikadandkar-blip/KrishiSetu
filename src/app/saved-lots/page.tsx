'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { SyncManager } from '@/components/offline/SyncManager';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { SavedListingItem } from '@/lib/types/phase3';
import { Bookmark, BookmarkCheck, MapPin, Eye, Sprout } from 'lucide-react';

export default function SavedLotsPage() {
  const { t } = useTranslation();

  const [user, setUser] = useState<any>({
    id: 'dev-user-buyer-1',
    name: 'अनिल देशमुख (Anil Deshmukh)',
    role: 'BUYER',
  });

  const [savedItems, setSavedItems] = useState<SavedListingItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
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
    fetchSavedListings();
  }, [user.id]);

  const fetchSavedListings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/saved-listings?userId=${user.id}`);
      const data = await res.json();
      if (data.success && data.savedListings) {
        setSavedItems(data.savedListings);
      }
    } catch (e) {
      console.error('Failed to fetch saved listings:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSaved = async (lotId: string) => {
    try {
      const res = await fetch('/api/v1/saved-listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, lotId }),
      });
      const data = await res.json();
      if (data.success && !data.saved) {
        setSavedItems((prev) => prev.filter((item) => item.lotId !== lotId));
      }
    } catch (e) {
      console.error('Failed to remove bookmark:', e);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-amber-50 dark:from-slate-900 dark:via-slate-800 dark:to-emerald-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans">
      <Navbar />
      <SyncManager />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-xs font-semibold uppercase tracking-wider mb-2">
            <Bookmark className="w-3.5 h-3.5" />
            {t('savedListings.title')}
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t('savedListings.title')}
          </h1>
          <p className="text-slate-600 dark:text-slate-300 mt-1 text-sm">
            {t('savedListings.sub')}
          </p>
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-500 font-medium">
            {t('common.loading')}
          </div>
        ) : savedItems.length === 0 ? (
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-12 text-center border border-dashed border-slate-300 dark:border-slate-700 shadow-sm">
            <Bookmark className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              {t('savedListings.noSaved')}
            </h3>
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold"
            >
              Explore Marketplace
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedItems.map((item) => {
              const lot = item.lot;
              return (
                <div
                  key={item.id}
                  className="bg-white dark:bg-slate-800/90 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                          {lot.cropName}
                          {lot.variety && <span className="text-xs font-normal text-slate-500 ml-1">({lot.variety})</span>}
                        </h3>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                          {lot.publicVillage}, {lot.publicDistrict}
                        </p>
                      </div>

                      <button
                        onClick={() => handleRemoveSaved(lot.id)}
                        className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 hover:bg-amber-100 transition-colors"
                        title="Remove bookmark"
                      >
                        <BookmarkCheck className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl mb-4 border border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="text-slate-500 block">Available</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {lot.quantityAvailable} {lot.unit}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Asking Price</span>
                        <span className="font-semibold text-emerald-600">
                          ₹{lot.askPricePerUnit}/{lot.unit}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60">
                    <Link
                      href={`/lots/${lot.id}`}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-1 transition-all"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View Details
                    </Link>
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
