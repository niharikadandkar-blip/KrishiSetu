'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { SyncManager } from '@/components/offline/SyncManager';
import { VerificationGateModal } from '@/components/verification/VerificationGateModal';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { NegotiationTimelineEvent } from '@/lib/types/phase4';
import { 
  Sprout, 
  MapPin, 
  TrendingUp, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ShieldCheck, 
  AlertCircle, 
  History, 
  DollarSign, 
  ArrowRight,
  Sparkles,
  MessageSquare
} from 'lucide-react';

export default function FarmerOffersPage() {
  const { t } = useTranslation();

  // Active user session
  const [user, setUser] = useState<any>({
    id: 'dev-user-farmer-1',
    name: 'रमेश पाटील (Ramesh Patil)',
    role: 'FARMER',
    mobileVerified: true,
    profileVerified: true,
  });

  const [offers, setOffers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(true);

  // Counter Modal State
  const [selectedOfferForCounter, setSelectedOfferForCounter] = useState<any>(null);
  const [counterPrice, setCounterPrice] = useState<string>('');
  const [counterQuantity, setCounterQuantity] = useState<string>('');
  const [submittingCounter, setSubmittingCounter] = useState<boolean>(false);

  // Timeline Modal State
  const [selectedTimelineOffer, setSelectedTimelineOffer] = useState<any>(null);
  const [timelineEvents, setTimelineEvents] = useState<NegotiationTimelineEvent[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState<boolean>(false);

  // Status Alert Banner
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isVerificationGateOpen, setIsVerificationGateOpen] = useState<boolean>(false);

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
    fetchIncomingOffers();
  }, [user.id]);

  const fetchIncomingOffers = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/v1/offers?userId=${user.id}&role=FARMER`);
      const data = await res.json();
      if (data.success && data.offers) {
        setOffers(data.offers);
      }
    } catch (err) {
      console.error('Failed to fetch incoming offers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (bidId: string, action: 'ACCEPT' | 'REJECT' | 'COUNTER') => {
    if (action === 'ACCEPT' && !navigator.onLine) {
      setMessage({
        type: 'info',
        text: t('offers.offlineAcceptWarning'),
      });
      return;
    }

    if (!user.profileVerified) {
      setIsVerificationGateOpen(true);
      return;
    }

    if (action === 'COUNTER') {
      const offer = offers.find((o) => o.id === bidId);
      setSelectedOfferForCounter(offer);
      setCounterPrice(offer ? offer.offeredPricePerUnit.toString() : '');
      setCounterQuantity(offer ? offer.quantity.toString() : '');
      return;
    }

    try {
      const res = await fetch(`/api/v1/bids/${bidId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bidId,
          userId: user.id,
          action,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (action === 'ACCEPT') {
          setMessage({
            type: 'success',
            text: t('offers.commitmentNotice'),
          });
        } else {
          setMessage({
            type: 'success',
            text: data.message || `Offer negotiation action processed successfully.`,
          });
        }
        fetchIncomingOffers();
      } else {
        setMessage({
          type: 'error',
          text: data.message || 'Action failed',
        });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Network request failed' });
    }
  };

  const handleSubmitCounter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOfferForCounter) return;

    setSubmittingCounter(true);
    try {
      const res = await fetch(`/api/v1/bids/${selectedOfferForCounter.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bidId: selectedOfferForCounter.id,
          userId: user.id,
          action: 'COUNTER',
          counterPricePerUnit: parseFloat(counterPrice) || selectedOfferForCounter.offeredPricePerUnit,
          counterQuantity: parseFloat(counterQuantity) || selectedOfferForCounter.quantity,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({
          type: 'success',
          text: t('offers.counterSubmittedSuccess'),
        });
        setSelectedOfferForCounter(null);
        fetchIncomingOffers();
      } else {
        setMessage({ type: 'error', text: data.message || t('common.error') });
      }
    } catch (e) {
      setMessage({ type: 'error', text: t('common.error') });
    } finally {
      setSubmittingCounter(false);
    }
  };

  const handleOpenTimeline = async (offer: any) => {
    setSelectedTimelineOffer(offer);
    setLoadingTimeline(true);
    try {
      const res = await fetch(`/api/v1/offers/${offer.id}`);
      const data = await res.json();
      if (data.success && data.timeline) {
        setTimelineEvents(data.timeline);
      }
    } catch (e) {
      console.error('Failed to fetch timeline:', e);
    } finally {
      setLoadingTimeline(false);
    }
  };

  const handleGenerateOrder = async (acceptedOfferId: string) => {
    try {
      const res = await fetch('/api/v1/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acceptedOfferId, userId: user.id }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.order) {
        setMessage({ type: 'success', text: t('orders.orderCreatedSuccess') });
        window.location.href = `/orders/${data.order.id}`;
      } else {
        setMessage({ type: 'error', text: data.message || t('common.error') });
      }
    } catch (e) {
      setMessage({ type: 'error', text: t('common.error') });
    }
  };

  const filteredOffers = offers.filter((o) => {
    if (activeTab === 'ALL') return true;
    return o.status === activeTab;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-amber-50 dark:from-slate-900 dark:via-slate-800 dark:to-emerald-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans">
      <Navbar />
      <SyncManager />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-2">
            <TrendingUp className="w-3.5 h-3.5" />
            {t('offers.farmerTitle')}
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t('offers.farmerTitle')}
          </h1>
          <p className="text-slate-600 dark:text-slate-300 mt-1 text-sm">
            {t('offers.farmerSub')}
          </p>
        </div>

        {/* Status Message Banner */}
        {message && (
          <div
            className={`p-4 rounded-xl mb-6 border flex items-start gap-3 ${
              message.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-200'
                : message.type === 'info'
                ? 'bg-sky-50 border-sky-200 text-sky-900 dark:bg-sky-950/50 dark:border-sky-800 dark:text-sky-200'
                : 'bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/50 dark:border-rose-800 dark:text-rose-200'
            }`}
          >
            {message.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
            {message.type === 'info' && <Sparkles className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />}
            {message.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />}
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        )}

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none border-b border-slate-200 dark:border-slate-700/60">
          {[
            { id: 'ALL', label: t('offers.tabAll') },
            { id: 'PENDING', label: t('offers.tabPending') },
            { id: 'COUNTERED', label: t('offers.tabCountered') },
            { id: 'ACCEPTED', label: t('offers.tabAccepted') },
            { id: 'REJECTED', label: t('offers.tabRejected') },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Offers Grid */}
        {loading ? (
          <div className="text-center py-16 text-slate-500 font-medium">
            {t('common.loading')}
          </div>
        ) : filteredOffers.length === 0 ? (
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-12 text-center border border-dashed border-slate-300 dark:border-slate-700 shadow-sm">
            <TrendingUp className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              {t('offers.noOffers')}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Incoming offers from verified buyers will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredOffers.map((offer) => {
              const diff = offer.offeredPricePerUnit - (offer.lot?.askPricePerUnit || offer.offeredPricePerUnit);
              const isPending = offer.status === 'PENDING';

              return (
                <div
                  key={offer.id}
                  className="bg-white dark:bg-slate-800/90 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          {offer.bidder?.name || 'Verified Buyer'}
                          {offer.bidder?.profileVerified && (
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          )}
                        </h3>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Sprout className="w-3.5 h-3.5 text-emerald-600" />
                          {offer.lot?.cropName} {offer.lot?.variety && `(${offer.lot.variety})`}
                        </p>
                      </div>

                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        offer.status === 'PENDING'
                          ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300'
                          : offer.status === 'ACCEPTED'
                          ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300'
                          : offer.status === 'COUNTERED'
                          ? 'bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-300'
                          : 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-300'
                      }`}>
                        {offer.status}
                      </span>
                    </div>

                    {/* Offer Parameters Comparison */}
                    <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl mb-4 border border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="text-slate-500 block">Offered Price</span>
                        <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                          ₹{offer.offeredPricePerUnit}
                          <span className="text-[10px] text-slate-400 font-normal"> / {offer.lot?.unit}</span>
                        </span>
                        {diff !== 0 && (
                          <span className={`text-[10px] block font-semibold ${diff > 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {diff > 0 ? `+₹${diff}` : `-₹${Math.abs(diff)}`} vs Listed Ask Price
                          </span>
                        )}
                      </div>

                      <div>
                        <span className="text-slate-500 block">Quantity Requested</span>
                        <span className="text-base font-bold text-slate-800 dark:text-slate-200">
                          {offer.quantity} {offer.lot?.unit}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Negotiation Timeline Trigger */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleOpenTimeline(offer)}
                      className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1 transition-all"
                    >
                      <History className="w-3.5 h-3.5 text-slate-500" />
                      Timeline
                    </button>

                    {offer.status === 'ACCEPTED' && (
                      <button
                        onClick={() => handleGenerateOrder(offer.id)}
                        className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-emerald-950 font-extrabold text-xs shadow transition-all flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        {t('orders.generateOrderCta')}
                      </button>
                    )}

                    {isPending && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleRespond(offer.id, 'ACCEPT')}
                          className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all"
                        >
                          {t('bidding.accept')}
                        </button>
                        <button
                          onClick={() => handleRespond(offer.id, 'COUNTER')}
                          className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all"
                        >
                          {t('bidding.counter')}
                        </button>
                        <button
                          onClick={() => handleRespond(offer.id, 'REJECT')}
                          className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all"
                        >
                          {t('bidding.reject')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* COUNTER OFFER MODAL */}
      {selectedOfferForCounter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {t('bidding.counterTitle')}
            </h3>

            <form onSubmit={handleSubmitCounter} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Counter Price (₹ per {selectedOfferForCounter.lot?.unit})
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={counterPrice}
                  onChange={(e) => setCounterPrice(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Counter Quantity ({selectedOfferForCounter.lot?.unit})
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={counterQuantity}
                  onChange={(e) => setCounterQuantity(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 font-bold"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedOfferForCounter(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                >
                  {t('common.cancel')}
                </button>

                <button
                  type="submit"
                  disabled={submittingCounter}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold"
                >
                  {submittingCounter ? t('common.loading') : 'Send Counter Offer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHRONOLOGICAL NEGOTIATION TIMELINE MODAL */}
      {selectedTimelineOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <History className="w-5 h-5 text-emerald-600" />
                {t('offers.timelineTitle')}
              </h3>
              <button
                onClick={() => setSelectedTimelineOffer(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {loadingTimeline ? (
              <div className="py-8 text-center text-xs text-slate-500">{t('common.loading')}</div>
            ) : (
              <div className="space-y-4 py-2 max-h-80 overflow-y-auto">
                {timelineEvents.map((evt, idx) => (
                  <div key={evt.id} className="relative pl-6 border-l-2 border-emerald-500/40 space-y-1">
                    <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-emerald-600 ring-4 ring-white dark:ring-slate-800" />
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                      <span>{evt.bidderRole === 'FARMER' ? '👨‍🌾 Farmer Counter' : '🏢 Buyer Offer'}</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        {new Date(evt.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-emerald-600">
                      ₹{evt.offeredPricePerUnit}/unit for {evt.quantity} units
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Status: <span className="font-semibold text-slate-700 dark:text-slate-300">{evt.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

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
    </div>
  );
}
