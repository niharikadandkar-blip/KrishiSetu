'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { SyncManager } from '@/components/offline/SyncManager';
import { VerificationGateModal } from '@/components/verification/VerificationGateModal';
import { BidModal } from '@/components/bidding/BidModal';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { 
  Sprout, 
  MapPin, 
  ShieldCheck, 
  Calendar, 
  DollarSign, 
  Package, 
  Bookmark, 
  BookmarkCheck, 
  Lock, 
  CheckCircle2, 
  TrendingUp, 
  Layers, 
  Ruler, 
  Percent, 
  Share2, 
  ArrowLeft,
  ShoppingBag
} from 'lucide-react';

export default function LotDetailPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const lotId = params?.id as string;

  // Active user session
  const [user, setUser] = useState<any>({
    id: 'dev-user-buyer-1',
    name: 'अनिल देशमुख (Anil Deshmukh)',
    role: 'BUYER',
    mobileVerified: true,
    profileVerified: false,
  });

  const [lot, setLot] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [savingBookmark, setSavingBookmark] = useState<boolean>(false);

  // Modals & Gating
  const [isVerificationGateOpen, setIsVerificationGateOpen] = useState<boolean>(false);
  const [isBidModalOpen, setIsBidModalOpen] = useState<boolean>(false);
  const [prebookSuccess, setPrebookSuccess] = useState<string | null>(null);

  useEffect(() => {
    // Read session cookie if present
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
    if (lotId) {
      fetchLotDetails();
      checkIfSaved();
    }
  }, [lotId, user.id]);

  const fetchLotDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/lots/${lotId}?userId=${user.id}`);
      const data = await res.json();
      if (data.success && data.lot) {
        setLot(data.lot);
      }
    } catch (err) {
      console.error('Failed to fetch lot details:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkIfSaved = async () => {
    try {
      const res = await fetch(`/api/v1/saved-listings?userId=${user.id}`);
      const data = await res.json();
      if (data.success && data.savedListings) {
        const saved = data.savedListings.some((s: any) => s.lotId === lotId);
        setIsSaved(saved);
      }
    } catch (e) {}
  };

  const handleToggleSave = async () => {
    setSavingBookmark(true);
    try {
      const res = await fetch('/api/v1/saved-listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, lotId }),
      });
      const data = await res.json();
      if (data.success) {
        setIsSaved(data.saved);
      }
    } catch (e) {
      console.error('Bookmark toggle error:', e);
    } finally {
      setSavingBookmark(false);
    }
  };

  const handlePrebookClick = async () => {
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
      if (res.ok && data.success) {
        setPrebookSuccess(`Pre-booked ${data.prebooking.quantityBooked} ${lot.unit} successfully!`);
        fetchLotDetails();
      }
    } catch (e) {
      console.error('Pre-booking error:', e);
    }
  };

  const handleBidClick = () => {
    if (!user.profileVerified) {
      setIsVerificationGateOpen(true);
      return;
    }
    setIsBidModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col font-sans">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-slate-500 font-medium">
          {t('common.loading')}
        </div>
      </div>
    );
  }

  if (!lot) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col font-sans">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <Sprout className="w-12 h-12 text-slate-400 mb-3" />
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Produce lot not found</h2>
          <button
            onClick={() => router.push('/marketplace')}
            className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold"
          >
            Back to Marketplace
          </button>
        </div>
      </div>
    );
  }

  const photos: string[] = lot.photoUrls || [];
  const isOwner = user.id === lot.farmerId;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-amber-50 dark:from-slate-900 dark:via-slate-800 dark:to-emerald-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans">
      <Navbar />
      <SyncManager />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">
        {/* Back Button & Header Actions */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Marketplace
          </button>

          <button
            onClick={handleToggleSave}
            disabled={savingBookmark}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
              isSaved
                ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
            }`}
          >
            {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
            {isSaved ? t('listingDetail.savedBookmark') : t('listingDetail.saveBookmark')}
          </button>
        </div>

        {prebookSuccess && (
          <div className="p-4 rounded-xl mb-6 bg-emerald-50 border border-emerald-200 text-emerald-900 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-200 text-sm font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            {prebookSuccess}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Info (Left 2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Photos Carousel / Sample Image */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700">
              {photos.length > 0 ? (
                <div className="aspect-video w-full relative bg-slate-900">
                  <img
                    src={photos[0]}
                    alt={lot.cropName}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 bg-black/60 text-white text-[11px] px-3 py-1 rounded-full backdrop-blur-sm font-semibold">
                    {lot.alreadyHarvested ? 'Harvested Produce' : 'Harvest Pre-Booking'}
                  </div>
                </div>
              ) : (
                <div className="aspect-video w-full bg-gradient-to-br from-emerald-100 to-amber-100 dark:from-slate-800 dark:to-emerald-950 flex flex-col items-center justify-center text-slate-400">
                  <Sprout className="w-16 h-16 text-emerald-500 mb-2" />
                  <span className="text-xs font-semibold">No crop photos uploaded</span>
                </div>
              )}

              <div className="p-6">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                      {lot.cropName}
                      {lot.variety && <span className="text-sm font-normal text-slate-500 ml-2">({lot.variety})</span>}
                    </h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                      {lot.publicVillage}, {lot.publicTaluka}, {lot.publicDistrict}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-500 block">Asking Price</span>
                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                      ₹{lot.askPricePerUnit}
                      <span className="text-xs font-normal text-slate-500"> / {lot.unit}</span>
                    </span>
                  </div>
                </div>

                {isOwner && (
                  <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-200 font-medium">
                    {t('listingDetail.ownerView')}
                  </div>
                )}
              </div>
            </div>

            {/* Quality Parameters */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                <Layers className="w-5 h-5 text-amber-500" />
                {t('listingDetail.qualitySection')}
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 block mb-0.5">Grade</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                    {lot.grade || 'Standard'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 block mb-0.5 flex items-center gap-1">
                    <Ruler className="w-3 h-3 text-slate-400" /> Size (mm)
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                    {lot.sizeMm ? `${lot.sizeMm} mm` : 'N/A'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 block mb-0.5">Maturity / Colour</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                    {lot.maturityColour || 'N/A'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 block mb-0.5 flex items-center gap-1">
                    <Percent className="w-3 h-3 text-slate-400" /> Moisture %
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                    {lot.moisturePct ? `${lot.moisturePct}%` : 'N/A'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 block mb-0.5">Damage %</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                    {lot.damagePct ? `${lot.damagePct}%` : 'N/A'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 block mb-0.5 flex items-center gap-1">
                    <Package className="w-3 h-3 text-slate-400" /> Packaging
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                    {lot.packagingType || 'Loose / Bulk'}
                  </span>
                </div>
              </div>
            </div>

            {/* Location Privacy Card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
                <Lock className="w-4 h-4 text-emerald-600" />
                Location & Privacy Model
              </h3>

              {lot.farmAddress ? (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs space-y-1">
                  <div className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Authorized Counterparty Access Unlocked:
                  </div>
                  <div className="text-slate-700 dark:text-slate-300 font-medium">{lot.farmAddress}</div>
                  {lot.latitude && lot.longitude && (
                    <div className="text-slate-500 text-[11px]">
                      GPS Coordinates: {lot.latitude}, {lot.longitude}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
                  <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1">
                    {t('marketplace.protectedLocNote')}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Public listing shows approx village area ({lot.publicVillage}, {lot.publicTaluka}, {lot.publicDistrict}).
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Actions & Farmer Profile */}
          <div className="space-y-6">
            {/* Action Card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-emerald-100 dark:border-slate-700 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
                <span className="text-xs text-slate-500">Available Quantity</span>
                <span className="text-lg font-bold text-slate-900 dark:text-white">
                  {lot.quantityAvailable} {lot.unit}
                </span>
              </div>

              {!isOwner && (
                <div className="space-y-3 pt-2">
                  <button
                    onClick={handlePrebookClick}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    {t('marketplace.prebookCta')}
                  </button>

                  <button
                    onClick={handleBidClick}
                    className="w-full py-3 rounded-xl border border-emerald-600 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 font-bold text-sm transition-all flex items-center justify-center gap-2"
                  >
                    <TrendingUp className="w-4 h-4" />
                    {t('marketplace.bidCta')}
                  </button>
                </div>
              )}
            </div>

            {/* Farmer Profile Card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                {t('listingDetail.farmerVerification')}
              </h3>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 font-bold flex items-center justify-center text-sm">
                  {lot.farmer?.name?.charAt(0) || 'F'}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    {lot.farmer?.name || 'Farmer'}
                    {lot.farmer?.profileVerified && (
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    )}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {lot.farmer?.profileVerified ? 'DigiLocker Verified Farmer' : 'Mobile Verified Farmer'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Verification Gate Modal */}
      <VerificationGateModal
        isOpen={isVerificationGateOpen}
        onClose={() => setIsVerificationGateOpen(false)}
        userId={user.id}
        onVerificationComplete={() => {
          setUser((prev: any) => ({ ...prev, profileVerified: true }));
          setIsVerificationGateOpen(false);
        }}
      />

      {/* Bid Modal */}
      {isBidModalOpen && (
        <BidModal
          isOpen={isBidModalOpen}
          onClose={() => setIsBidModalOpen(false)}
          lotId={lot.id}
          userId={user.id}
          bidderRole="BUYER"
          askPrice={lot.askPricePerUnit}
          quantityAvailable={lot.quantityAvailable}
          unit={lot.unit}
          onBidSubmitted={() => {
            fetchLotDetails();
          }}
        />
      )}
    </div>
  );
}
