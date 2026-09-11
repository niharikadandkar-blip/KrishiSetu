'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { SyncManager } from '@/components/offline/SyncManager';
import { VerificationGateModal } from '@/components/verification/VerificationGateModal';
import { BidModal } from '@/components/bidding/BidModal';
import { VoiceInput } from '@/components/voice/VoiceInput';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { LotItem, MarketBenchmarkItem } from '@/lib/types/phase2';
import { getCachedLots, saveLotsToCache } from '@/lib/offline/indexedDBStore';
import { 
  Sprout, 
  MapPin, 
  Search, 
  Filter, 
  ShieldCheck, 
  DollarSign, 
  Calendar, 
  Lock, 
  CheckCircle2, 
  CloudSun, 
  TrendingUp, 
  Bookmark, 
  BookmarkCheck, 
  SlidersHorizontal, 
  Layers, 
  Package, 
  Eye, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  Check, 
  X,
  Target
} from 'lucide-react';

export default function MarketplacePage() {
  const { t } = useTranslation();

  // User session
  const [user, setUser] = useState<any>({
    id: 'dev-user-buyer-1',
    name: 'अनिल देशमुख (Anil Deshmukh)',
    role: 'BUYER',
    mobileVerified: true,
    profileVerified: false,
  });

  // Search & Filter state
  const [radiusKm, setRadiusKm] = useState<number>(30);
  const [cropFilter, setCropFilter] = useState<string>('ALL');
  const [gradeFilter, setGradeFilter] = useState<string>('ALL');
  const [packagingFilter, setPackagingFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<string>('distance');
  const [searchText, setSearchText] = useState<string>('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);

  const [lots, setLots] = useState<LotItem[]>([]);
  const [savedLotIds, setSavedLotIds] = useState<Set<string>>(new Set());
  const [benchmarks, setBenchmarks] = useState<MarketBenchmarkItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Buyer Requirement (RFQ) & Explainable Match Drawer
  const [showRfqDrawer, setShowRfqDrawer] = useState<boolean>(false);
  const [rfqCrop, setRfqCrop] = useState<string>('Onion');
  const [rfqQuantity, setRfqQuantity] = useState<string>('100');
  const [rfqBudgetPrice, setRfqBudgetPrice] = useState<string>('2500');
  const [rfqDeliveryDistrict, setRfqDeliveryDistrict] = useState<string>('Pune');
  const [matchedLots, setMatchedLots] = useState<any[]>([]);
  const [fetchingMatches, setFetchingMatches] = useState<boolean>(false);

  // Modals & Gating
  const [selectedLotForBid, setSelectedLotForBid] = useState<LotItem | null>(null);
  const [isVerificationGateOpen, setIsVerificationGateOpen] = useState<boolean>(false);
  const [isBidModalOpen, setIsBidModalOpen] = useState<boolean>(false);

  useEffect(() => {
    // Read session cookie
    const cookie = document.cookie
      .split('; ')
      .find((row) => row.startsWith('krishisetu_session='));
    if (cookie) {
      try {
        const val = JSON.parse(decodeURIComponent(cookie.split('=')[1]));
        if (val && val.name) setUser((prev: any) => ({ ...prev, ...val }));
      } catch (e) {}
    }

    fetchMarketplaceData();
    fetchSavedLotIds();
  }, [radiusKm, cropFilter, gradeFilter, packagingFilter, sortBy, searchText]);

  const fetchMarketplaceData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Nearby Lots API with search & filter parameters
      const params = new URLSearchParams({
        lat: '18.5204',
        lng: '73.8567',
        radiusKm: radiusKm.toString(),
        crop: cropFilter,
        grade: gradeFilter,
        packaging: packagingFilter,
        sortBy,
        q: searchText,
      });

      const res = await fetch(`/api/v1/lots/nearby?${params.toString()}`);
      const data = await res.json();
      
      if (data.success && data.lots) {
        setLots(data.lots);
        saveLotsToCache(data.lots);
      } else {
        const cached = await getCachedLots();
        setLots(cached);
      }

      // 2. Fetch Mandi Benchmarks API
      const bRes = await fetch('/api/v1/market-benchmarks?district=Pune');
      const bData = await bRes.json();
      if (bData.success && bData.benchmarks) {
        setBenchmarks(bData.benchmarks);
      }
    } catch (err) {
      console.warn('Network query failed, using offline IndexedDB cache:', err);
      const cached = await getCachedLots();
      setLots(cached);
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedLotIds = async () => {
    try {
      const res = await fetch(`/api/v1/saved-listings?userId=${user.id}`);
      const data = await res.json();
      if (data.success && data.savedListings) {
        const ids = new Set<string>(data.savedListings.map((s: any) => s.lotId));
        setSavedLotIds(ids);
      }
    } catch (e) {}
  };

  const handleToggleBookmark = async (lotId: string) => {
    try {
      const res = await fetch('/api/v1/saved-listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, lotId }),
      });
      const data = await res.json();
      if (data.success) {
        setSavedLotIds((prev) => {
          const next = new Set(prev);
          if (data.saved) next.add(lotId);
          else next.delete(lotId);
          return next;
        });
      }
    } catch (e) {
      console.error('Bookmark error:', e);
    }
  };

  const handleCalculateMatches = async (e: React.FormEvent) => {
    e.preventDefault();
    setFetchingMatches(true);

    try {
      // Create Requirement RFQ
      const postRes = await fetch('/api/v1/buyer-requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyerId: user.id,
          targetCrop: rfqCrop,
          requiredQuantity: parseFloat(rfqQuantity) || 100,
          budgetPricePerUnit: parseFloat(rfqBudgetPrice) || 2500,
          deliveryDistrict: rfqDeliveryDistrict,
          requiredByDate: new Date(Date.now() + 7 * 86400000).toISOString(),
        }),
      });

      const postData = await postRes.json();
      if (postData.success && postData.requirement) {
        // Fetch explainable match score breakdown against marketplace lots
        const getRes = await fetch(`/api/v1/buyer-requirements?buyerId=${user.id}&rfqId=${postData.requirement.id}`);
        const getData = await getRes.json();
        if (getData.success && getData.matches) {
          setMatchedLots(getData.matches);
        }
      }
    } catch (err) {
      console.error('Failed to calculate matches:', err);
    } finally {
      setFetchingMatches(false);
    }
  };

  const handlePrebookClick = async (lot: LotItem) => {
    if (!user.profileVerified) {
      setIsVerificationGateOpen(true);
      return;
    }

    try {
      const res = await fetch(`/api/v1/lots/${lot.id}/prebook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lotId: lot.id,
          buyerId: user.id,
          buyerType: 'INDIVIDUAL',
          quantityBooked: Math.min(10, lot.quantityAvailable),
          unitPrice: lot.askPricePerUnit,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchMarketplaceData();
      }
    } catch (e) {
      alert(t('common.error'));
    }
  };

  const handleBidClick = (lot: LotItem) => {
    if (!user.profileVerified) {
      setIsVerificationGateOpen(true);
      return;
    }
    setSelectedLotForBid(lot);
    setIsBidModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-amber-50 dark:from-slate-900 dark:via-slate-800 dark:to-emerald-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 space-y-6">
        {/* Header & Sourcing Requirement CTA */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Sprout className="w-8 h-8 text-emerald-600" />
              {t('marketplace.title')}
            </h1>
            <p className="text-slate-600 dark:text-slate-300 mt-1 text-sm">
              {t('marketplace.sub')}
            </p>
          </div>

          <button
            onClick={() => setShowRfqDrawer(!showRfqDrawer)}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md transition-all shrink-0"
          >
            <Target className="w-4 h-4" />
            {showRfqDrawer ? 'Hide Requirement Matching' : t('buyerRequirements.postRfq')}
          </button>
        </div>

        {/* Mandi Price Benchmark Drawer */}
        {benchmarks.length > 0 && (
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-5 shadow-sm border border-emerald-100 dark:border-slate-700/60">
            <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-3 flex items-center gap-1.5">
              <CloudSun className="w-4 h-4" />
              {t('marketplace.benchmarkHeader')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {benchmarks.map((b) => (
                <div key={b.id} className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white text-sm">{b.cropName}</span>
                    <span className="text-[11px] text-slate-500 block">{b.mandiName}, {b.district}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">₹{b.modalPrice}</span>
                    <span className="text-[10px] text-slate-400 block">/Quintal</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BUYER REQUIREMENT (RFQ) & DETERMINISTIC EXPLAINABLE MATCHING DRAWER */}
        {showRfqDrawer && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-md border-2 border-amber-400 dark:border-amber-500/60 animate-fade-in space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-amber-500" />
                {t('buyerRequirements.title')}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {t('buyerRequirements.sub')}
              </p>
            </div>

            <form onSubmit={handleCalculateMatches} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {t('buyerRequirements.targetCrop')}
                </label>
                <select
                  value={rfqCrop}
                  onChange={(e) => setRfqCrop(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500"
                >
                  <option value="Onion">Onion (कांदा)</option>
                  <option value="Soybean">Soybean (सोयाबीन)</option>
                  <option value="Wheat">Wheat (गहू)</option>
                  <option value="Cotton">Cotton (कापूस)</option>
                  <option value="Tomato">Tomato (टोमॅटो)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {t('buyerRequirements.requiredQuantity')} (Quintal)
                </label>
                <input
                  type="number"
                  value={rfqQuantity}
                  onChange={(e) => setRfqQuantity(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {t('buyerRequirements.budgetPrice')} (₹)
                </label>
                <input
                  type="number"
                  value={rfqBudgetPrice}
                  onChange={(e) => setRfqBudgetPrice(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={fetchingMatches}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {fetchingMatches ? t('common.loading') : 'Find Explainable Matches'}
                </button>
              </div>
            </form>

            {/* Explainable Match Breakdown Results */}
            {matchedLots.length > 0 && (
              <div className="pt-4 border-t border-slate-100 dark:border-slate-700/60 space-y-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  {t('buyerRequirements.matchingTitle')} ({matchedLots.length} Lots Evaluated)
                </h3>

                <div className="space-y-3">
                  {matchedLots.map(({ lot, matchResult }) => (
                    <div
                      key={lot.id}
                      className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white text-base">
                            {lot.cropName} {lot.variety && `(${lot.variety})`}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-900">
                            {matchResult.totalScore}% Match Score ({matchResult.matchGrade})
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          ₹{lot.askPricePerUnit}/Quintal • {lot.quantityAvailable} {lot.unit} Available • {lot.publicVillage}, {lot.publicDistrict}
                        </p>

                        {/* Factor Score Breakdown List (Mandatory Correction #2) */}
                        <div className="mt-2 space-y-1">
                          {matchResult.factors.map((f: any, idx: number) => (
                            <div key={idx} className="text-[11px] flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                              {f.matched ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              ) : (
                                <X className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                              )}
                              <span>{f.explanation}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          href={`/lots/${lot.id}`}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all"
                        >
                          Inspect & Order
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* SEARCH, FILTER & SORTING CONTROLS */}
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-5 shadow-sm border border-emerald-100 dark:border-slate-700/60 space-y-4">
          {/* Main Search Bar & Radius Slider */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            {/* Search Text & Voice Input */}
            <div className="relative md:col-span-2 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search by crop, variety, village, or district..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <VoiceInput
                onTranscriptSelect={(t) => setSearchText(t)}
                onCommandResolved={(cmd) => {
                  if (cmd.query) setSearchText(cmd.query);
                }}
              />
            </div>

            {/* Sort By Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 shrink-0">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs font-semibold"
              >
                <option value="distance">Nearest Distance</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="harvest_date">Earliest Harvest Date</option>
                <option value="newest">Newest Listings</option>
              </select>
            </div>
          </div>

          {/* Radial Radius & Advanced Filter Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-slate-100 dark:border-slate-700/60">
            <div className="flex items-center gap-3">
              <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-xs font-semibold">{t('marketplace.radiusKm')}{radiusKm} km</span>
              <input
                type="range"
                min="5"
                max="150"
                step="5"
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
                className="w-32 accent-emerald-600 cursor-pointer"
              />
            </div>

            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              {showAdvancedFilters ? 'Hide Multi-Attribute Filters' : 'Advanced Quality & Packaging Filters'}
            </button>
          </div>

          {/* Advanced Multi-Attribute Filters */}
          {showAdvancedFilters && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Crop Grade</label>
                <select
                  value={gradeFilter}
                  onChange={(e) => setGradeFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs font-medium"
                >
                  <option value="ALL">All Grades</option>
                  <option value="Grade A">Grade A (Premium)</option>
                  <option value="Grade B">Grade B (Standard)</option>
                  <option value="Grade C">Grade C (Processing)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Packaging Format</label>
                <select
                  value={packagingFilter}
                  onChange={(e) => setPackagingFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs font-medium"
                >
                  <option value="ALL">All Packaging</option>
                  <option value="Gunny Bags">Gunny / Jute Bags</option>
                  <option value="Plastic Crates">Plastic Crates</option>
                  <option value="Loose / Bulk">Loose / Bulk</option>
                  <option value="Wooden Boxes">Wooden Boxes</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Crop Type Filter</label>
                <select
                  value={cropFilter}
                  onChange={(e) => setCropFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs font-medium"
                >
                  <option value="ALL">{t('marketplace.allCrops')}</option>
                  <option value="Onion">Onion (कांदा)</option>
                  <option value="Soybean">Soybean (सोयाबीन)</option>
                  <option value="Wheat">Wheat (गहू)</option>
                  <option value="Cotton">Cotton (कापूस)</option>
                  <option value="Tomato">Tomato (टोमॅटो)</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* PRODUCE LISTINGS GRID */}
        {loading ? (
          <div className="text-center py-16 text-slate-500 font-medium">
            {t('common.loading')}
          </div>
        ) : lots.length === 0 ? (
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-700 shadow-sm">
            <Sprout className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              {t('marketplace.noLotsFound')}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Try adjusting your search radius or clearing crop/grade filters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lots.map((lot) => {
              const isSaved = savedLotIds.has(lot.id);
              return (
                <div
                  key={lot.id}
                  className="bg-white dark:bg-slate-800/90 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Top Row: Title & Bookmark Toggle */}
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
                        onClick={() => handleToggleBookmark(lot.id)}
                        className={`p-2 rounded-xl transition-colors ${
                          isSaved
                            ? 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400'
                            : 'bg-slate-100 text-slate-400 hover:bg-slate-200 dark:bg-slate-700'
                        }`}
                        title={isSaved ? 'Bookmarked' : 'Bookmark lot'}
                      >
                        {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Lot Details Grid */}
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
                      <div>
                        <span className="text-slate-500 block">Distance</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          ~{lot.distanceKm} km
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Grade</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {lot.grade || 'Standard'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center gap-2">
                    <Link
                      href={`/lots/${lot.id}`}
                      className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1 transition-all"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Link>

                    <button
                      onClick={() => handlePrebookClick(lot)}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-1 transition-all"
                    >
                      {t('marketplace.prebookCta')}
                    </button>

                    <button
                      onClick={() => handleBidClick(lot)}
                      className="px-3 py-2.5 rounded-xl border border-emerald-600 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 font-semibold text-xs transition-all"
                    >
                      {t('marketplace.bidCta')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <SyncManager />

      <VerificationGateModal
        isOpen={isVerificationGateOpen}
        onClose={() => setIsVerificationGateOpen(false)}
        userId={user.id}
        onVerificationComplete={() => setUser((p: any) => ({ ...p, profileVerified: true }))}
      />

      {selectedLotForBid && (
        <BidModal
          isOpen={isBidModalOpen}
          onClose={() => setIsBidModalOpen(false)}
          lotId={selectedLotForBid.id}
          userId={user.id}
          bidderRole="BUYER"
          askPrice={selectedLotForBid.askPricePerUnit}
          quantityAvailable={selectedLotForBid.quantityAvailable}
          unit={selectedLotForBid.unit}
          onBidSubmitted={() => {
            fetchMarketplaceData();
          }}
        />
      )}
    </div>
  );
}
