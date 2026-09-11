'use client';

import React, { useState } from 'react';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { DollarSign, X, ArrowRight, ShieldCheck } from 'lucide-react';

interface BidModalProps {
  isOpen: boolean;
  onClose: () => void;
  lotId: string;
  userId: string;
  bidderRole: 'FARMER' | 'BUYER';
  askPrice: number;
  quantityAvailable: number;
  unit: string;
  onBidSubmitted: () => void;
}

export const BidModal: React.FC<BidModalProps> = ({
  isOpen,
  onClose,
  lotId,
  userId,
  bidderRole,
  askPrice,
  quantityAvailable,
  unit,
  onBidSubmitted,
}) => {
  const { t } = useTranslation();

  const [offeredPrice, setOfferedPrice] = useState<number>(askPrice);
  const [quantity, setQuantity] = useState<number>(quantityAvailable);
  const [paymentTermsDays, setPaymentTermsDays] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmitBid = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/v1/lots/${lotId}/bids`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lotId,
          bidderId: userId,
          bidderRole,
          offeredPricePerUnit: Number(offeredPrice),
          quantity: Number(quantity),
          paymentTermsDays: Number(paymentTermsDays),
        }),
      });

      const data = await res.json();
      if (data.success) {
        onBidSubmitted();
        onClose();
      } else {
        setErrorMsg(data.message || t('common.error'));
      }
    } catch (e) {
      setErrorMsg(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 relative">
        
        <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">{t('bidding.title')}</h3>
              <p className="text-xs text-stone-500">Ask Price: ₹{askPrice} / {unit}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-2.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-300 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmitBid} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              {t('bidding.offeredPrice')} *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-stone-500 text-xs font-bold">₹</span>
              <input
                type="number"
                value={offeredPrice}
                onChange={(e) => setOfferedPrice(Number(e.target.value))}
                className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-stone-300 text-xs font-bold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              {t('bidding.quantity')} ({unit}) *
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              max={quantityAvailable}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-xs font-bold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              {t('bidding.paymentTerms')} *
            </label>
            <select
              value={paymentTermsDays}
              onChange={(e) => setPaymentTermsDays(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            >
              <option value={0}>{t('bidding.instantCash')}</option>
              <option value={7}>7 {t('bidding.creditDays')}</option>
              <option value={15}>15 {t('bidding.creditDays')}</option>
            </select>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-stone-300 text-stone-700 text-xs font-bold hover:bg-stone-50"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-emerald-950 text-xs font-extrabold shadow flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <span>{loading ? t('common.loading') : 'Submit Offer'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
