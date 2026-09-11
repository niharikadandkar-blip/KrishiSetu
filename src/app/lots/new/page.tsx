'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { SyncManager } from '@/components/offline/SyncManager';
import { VerificationGateModal } from '@/components/verification/VerificationGateModal';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { offlineQueue } from '@/lib/offline/offlineQueue';
import { 
  Sprout, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Package, 
  ChevronDown, 
  ChevronUp, 
  Save, 
  Send, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  Camera,
  Layers,
  Percent,
  Ruler
} from 'lucide-react';

export default function CreateLotPage() {
  const { t } = useTranslation();
  const router = useRouter();

  // User session
  const [user, setUser] = useState<any>({
    id: 'dev-user-farmer-1',
    name: 'रमेश पाटील (Ramesh Patil)',
    role: 'FARMER',
    mobileVerified: true,
    profileVerified: false,
    district: 'Pune',
    taluka: 'Haveli',
    village: 'Manjari',
  });

  // Modal gating
  const [isVerificationGateOpen, setIsVerificationGateOpen] = useState<boolean>(false);

  // Form State
  // 1. Essential Fields
  const [cropName, setCropName] = useState<string>('Onion');
  const [variety, setVariety] = useState<string>('Bhima Super');
  const [quantityAvailable, setQuantityAvailable] = useState<string>('50');
  const [unit, setUnit] = useState<string>('Quintal');
  const [askPricePerUnit, setAskPricePerUnit] = useState<string>('2400');
  const [expectedHarvestDate, setExpectedHarvestDate] = useState<string>(
    new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0]
  );
  const [alreadyHarvested, setAlreadyHarvested] = useState<boolean>(false);

  // Location
  const [publicVillage, setPublicVillage] = useState<string>('Manjari');
  const [publicTaluka, setPublicTaluka] = useState<string>('Haveli');
  const [publicDistrict, setPublicDistrict] = useState<string>('Pune');

  // 2. Optional Quality Parameters (Progressive Disclosure)
  const [showAdvancedQuality, setShowAdvancedQuality] = useState<boolean>(false);
  const [grade, setGrade] = useState<string>('Grade A');
  const [sizeMm, setSizeMm] = useState<string>('55');
  const [maturityColour, setMaturityColour] = useState<string>('Deep Pink');
  const [moisturePct, setMoisturePct] = useState<string>('12');
  const [damagePct, setDamagePct] = useState<string>('2');
  const [packagingType, setPackagingType] = useState<string>('Gunny Bags');
  const [photoUrlInput, setPhotoUrlInput] = useState<string>(
    'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=600&auto=format&fit=crop&q=80'
  );

  // Status & Feedback
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    // Read session cookie if present
    const cookie = document.cookie
      .split('; ')
      .find((row) => row.startsWith('krishisetu_session='));
    if (cookie) {
      try {
        const val = JSON.parse(decodeURIComponent(cookie.split('=')[1]));
        if (val && val.name) {
          setUser((prev: any) => ({ ...prev, ...val }));
          if (val.village) setPublicVillage(val.village);
          if (val.taluka) setPublicTaluka(val.taluka);
          if (val.district) setPublicDistrict(val.district);
        }
      } catch (e) {}
    }
  }, []);

  const buildPayload = () => {
    const idempotencyKey = `lot-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    return {
      farmerId: user.id,
      cropName,
      variety: variety || undefined,
      quantityAvailable: parseFloat(quantityAvailable) || 0,
      unit,
      askPricePerUnit: parseFloat(askPricePerUnit) || 0,
      expectedHarvestDate: new Date(expectedHarvestDate).toISOString(),
      alreadyHarvested,
      publicVillage,
      publicTaluka,
      publicDistrict,
      latitude: 18.5204, // Default GPS reference for demonstration
      longitude: 73.8567,
      farmAddress: `${publicVillage}, ${publicTaluka}, ${publicDistrict}`,
      
      // Quality
      grade: grade || undefined,
      sizeMm: sizeMm ? parseFloat(sizeMm) : undefined,
      maturityColour: maturityColour || undefined,
      moisturePct: moisturePct ? parseFloat(moisturePct) : undefined,
      damagePct: damagePct ? parseFloat(damagePct) : undefined,
      packagingType: packagingType || undefined,
      photoUrls: photoUrlInput ? [photoUrlInput] : [],
      
      idempotencyKey,
    };
  };

  const handleSaveOfflineDraft = async () => {
    setMessage(null);
    try {
      const payload = buildPayload();
      await offlineQueue.addMutation('/api/v1/lots', 'POST', payload);
      setMessage({
        type: 'info',
        text: 'Draft lot listing saved offline to IndexedDB. It will automatically sync when connected!',
      });
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message || 'Failed to save offline draft.',
      });
    }
  };

  const handleSubmitOnline = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // Profile verification gate check
    if (!user.profileVerified) {
      setIsVerificationGateOpen(true);
      return;
    }

    setSubmitting(true);
    const payload = buildPayload();

    try {
      const res = await fetch('/api/v1/lots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': payload.idempotencyKey,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setMessage({
          type: 'success',
          text: 'Produce lot listed successfully on KrishiSetu marketplace!',
        });
        setTimeout(() => {
          router.push('/marketplace');
        }, 1500);
      } else {
        setMessage({
          type: 'error',
          text: data.message || 'Failed to publish produce lot.',
        });
      }
    } catch (err: any) {
      // Network failed - save to offline queue seamlessly
      console.warn('Network error during publishing, fallback to offline queue:', err);
      await offlineQueue.addMutation('/api/v1/lots', 'POST', payload);
      setMessage({
        type: 'info',
        text: 'Offline mode active: Produce lot saved to local sync queue. Will publish automatically upon network reconnect.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-amber-50 dark:from-slate-900 dark:via-slate-800 dark:to-emerald-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans">
      <Navbar />
      <SyncManager />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-2">
            <Sprout className="w-3.5 h-3.5" />
            {t('lotCreation.title')}
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t('lotCreation.title')}
          </h1>
          <p className="text-slate-600 dark:text-slate-300 mt-1 text-sm">
            List your crop directly to verified buyers with direct pricing, quality parameters, and harvest pre-booking.
          </p>
        </div>

        {/* Status Message Alert */}
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
            {message.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />}
            {message.type === 'info' && <Sparkles className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />}
            {message.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />}
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmitOnline} className="space-y-6">
          {/* SECTION 1: ESSENTIAL CROP DETAILS */}
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-6 shadow-sm border border-emerald-100 dark:border-slate-700/60">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
              <Sprout className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              {t('lotCreation.essentialHeader')}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Crop Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {t('lotCreation.cropName')} *
                </label>
                <select
                  value={cropName}
                  onChange={(e) => setCropName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  <option value="Onion">Onion (कांदा)</option>
                  <option value="Soybean">Soybean (सोयाबीन)</option>
                  <option value="Wheat">Wheat (गहू)</option>
                  <option value="Cotton">Cotton (कापूस)</option>
                  <option value="Tomato">Tomato (टोमॅटो)</option>
                  <option value="Pomegranate">Pomegranate (डाळिंब)</option>
                  <option value="Grapes">Grapes (द्राक्षे)</option>
                  <option value="Sugarcane">Sugarcane (ऊस)</option>
                </select>
              </div>

              {/* Variety */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {t('lotCreation.variety')}
                </label>
                <input
                  type="text"
                  value={variety}
                  onChange={(e) => setVariety(e.target.value)}
                  placeholder="e.g. Bhima Super, JS 335, Lokwan"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Quantity & Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    {t('lotCreation.quantity')} *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={quantityAvailable}
                    onChange={(e) => setQuantityAvailable(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    {t('lotCreation.unit')}
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Quintal">Quintal (क्विंटल)</option>
                    <option value="Tonne">Tonne (टन)</option>
                    <option value="Kg">Kg (किलो)</option>
                  </select>
                </div>
              </div>

              {/* Ask Price */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {t('lotCreation.askPrice')} (₹/{unit}) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-medium text-sm">₹</span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={askPricePerUnit}
                    onChange={(e) => setAskPricePerUnit(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              {/* Expected Harvest Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {t('lotCreation.harvestDate')} *
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="date"
                    value={expectedHarvestDate}
                    onChange={(e) => setExpectedHarvestDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              {/* Harvest Status Toggle */}
              <div className="flex items-center gap-3 pt-6">
                <input
                  type="checkbox"
                  id="alreadyHarvestedToggle"
                  checked={alreadyHarvested}
                  onChange={(e) => setAlreadyHarvested(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                />
                <label htmlFor="alreadyHarvestedToggle" className="text-sm font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
                  {t('lotCreation.alreadyHarvested')}
                </label>
              </div>
            </div>

            {/* Public Location Inputs */}
            <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-700/60">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                {t('lotCreation.farmLocation')}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Village</label>
                  <input
                    type="text"
                    value={publicVillage}
                    onChange={(e) => setPublicVillage(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Taluka</label>
                  <input
                    type="text"
                    value={publicTaluka}
                    onChange={(e) => setPublicTaluka(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">District</label>
                  <input
                    type="text"
                    value={publicDistrict}
                    onChange={(e) => setPublicDistrict(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: OPTIONAL QUALITY & PACKAGING (PROGRESSIVE DISCLOSURE) */}
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl shadow-sm border border-emerald-100 dark:border-slate-700/60 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAdvancedQuality(!showAdvancedQuality)}
              className="w-full p-6 text-left flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    {t('lotCreation.advancedHeader')}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Add grade, moisture, sizing, and packaging to attract premium institutional buyers.
                  </p>
                </div>
              </div>
              <div className="text-slate-400">
                {showAdvancedQuality ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
            </button>

            {showAdvancedQuality && (
              <div className="p-6 pt-0 border-t border-slate-100 dark:border-slate-700/60 grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
                {/* Grade */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    {t('lotCreation.grade')}
                  </label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Grade A">Grade A (Premium Quality)</option>
                    <option value="Grade B">Grade B (Standard Market)</option>
                    <option value="Grade C">Grade C (Processing Quality)</option>
                  </select>
                </div>

                {/* Size (mm) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Ruler className="w-3.5 h-3.5 text-slate-400" />
                    {t('lotCreation.sizeMm')}
                  </label>
                  <input
                    type="number"
                    value={sizeMm}
                    onChange={(e) => setSizeMm(e.target.value)}
                    placeholder="e.g. 50-60 mm"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Maturity / Colour */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    {t('lotCreation.maturityColour')}
                  </label>
                  <input
                    type="text"
                    value={maturityColour}
                    onChange={(e) => setMaturityColour(e.target.value)}
                    placeholder="e.g. Deep Pink, 90% Mature"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Moisture % */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Percent className="w-3.5 h-3.5 text-slate-400" />
                    {t('lotCreation.moisturePct')}
                  </label>
                  <input
                    type="number"
                    value={moisturePct}
                    onChange={(e) => setMoisturePct(e.target.value)}
                    placeholder="e.g. 12%"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Damage % */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    {t('lotCreation.damagePct')}
                  </label>
                  <input
                    type="number"
                    value={damagePct}
                    onChange={(e) => setDamagePct(e.target.value)}
                    placeholder="e.g. 2%"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Packaging Type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Package className="w-3.5 h-3.5 text-slate-400" />
                    {t('lotCreation.packagingType')}
                  </label>
                  <select
                    value={packagingType}
                    onChange={(e) => setPackagingType(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Gunny Bags">Gunny / Jute Bags (बारदान गोणी)</option>
                    <option value="Plastic Crates">Plastic Crates (प्लास्टिक क्रेट्स)</option>
                    <option value="Loose / Bulk">Loose / Bulk (मोकळे)</option>
                    <option value="Wooden Boxes">Wooden Boxes (लाकडी पेटी)</option>
                    <option value="Net Bags">Net Mesh Bags (जाळीदार पिशवी)</option>
                  </select>
                </div>

                {/* Photo URL */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5 text-slate-400" />
                    Crop Photo URL / Sample Evidence
                  </label>
                  <input
                    type="url"
                    value={photoUrlInput}
                    onChange={(e) => setPhotoUrlInput(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={handleSaveOfflineDraft}
              className="w-full sm:w-auto px-5 py-3 rounded-xl border border-emerald-600 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 font-semibold text-sm transition-all flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {t('lotCreation.saveDraftOffline')}
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-7 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-sm shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              {submitting ? t('common.loading') : t('lotCreation.publishOnline')}
            </button>
          </div>
        </form>
      </main>

      {/* Verification Gate Modal */}
      <VerificationGateModal
        isOpen={isVerificationGateOpen}
        onClose={() => setIsVerificationGateOpen(false)}
        userId={user.id}
        onVerificationComplete={() => {
          setUser((prev: any) => ({ ...prev, profileVerified: true }));
          setIsVerificationGateOpen(false);
          setMessage({
            type: 'success',
            text: 'Profile verified! You can now publish your produce lot.',
          });
        }}
      />
    </div>
  );
}
