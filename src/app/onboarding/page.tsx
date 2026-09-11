'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { Role, Language } from '@/lib/types';
import { INDIAN_LOCATIONS, getDistricts, getTalukas } from '@/lib/services/locationService';
import { Sprout, Building2, ShieldCheck, MapPin, Phone, User, CheckCircle2, ArrowRight, RotateCcw, AlertCircle, Navigation } from 'lucide-react';

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language, setLanguage, t } = useTranslation();

  // Onboarding Step State (1: Language -> 2: Role -> 3: Details -> 4: OTP -> 5: Location)
  const [step, setStep] = useState<number>(1);

  // Form State
  const [role, setRole] = useState<Role>('FARMER');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');

  // Location State
  const [selectedState, setSelectedState] = useState('Maharashtra (महाराष्ट्र)');
  const [selectedDistrict, setSelectedDistrict] = useState('Pune (पुणे)');
  const [selectedTaluka, setSelectedTaluka] = useState('Haveli (हवेली)');
  const [selectedVillage, setSelectedVillage] = useState('');
  const [geoCoords, setGeoCoords] = useState<{ lat?: number; lng?: number } | null>(null);

  // Status & Error Messages
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [otpMessage, setOtpMessage] = useState<string | null>(null);
  const [otpTimer, setOtpTimer] = useState<number>(0);
  const [createdUser, setCreatedUser] = useState<any>(null);

  // Pre-select role if passed via query param
  useEffect(() => {
    const roleParam = searchParams.get('role');
    if (roleParam === 'BUYER' || roleParam === 'FARMER') {
      setRole(roleParam);
      setStep(2);
    }
  }, [searchParams]);

  // Timer effect for OTP resend cooldown
  useEffect(() => {
    let interval: any = null;
    if (otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpTimer]);

  // Step 3 -> 4: Send OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim() || name.length < 2) {
      setErrorMessage(t('common.required') + ': ' + t('onboarding.enterName'));
      return;
    }
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setErrorMessage(t('onboarding.enterMobile'));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile }),
      });
      const data = await res.json();
      if (data.success) {
        setOtpMessage(data.message);
        setOtpTimer(data.resendTimeoutSec || 30);
        setStep(4); // Move to OTP step
      } else {
        setErrorMessage(data.message);
      }
    } catch (err) {
      setErrorMessage(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  // Step 4 -> 5: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (otp.length !== 6) {
      setErrorMessage(t('onboarding.enterOtp'));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, mobile, role, language, otp }),
      });
      const data = await res.json();
      if (data.success) {
        setCreatedUser(data.user);
        setStep(5); // Move to Location step
      } else {
        setErrorMessage(data.message);
      }
    } catch (err) {
      setErrorMessage(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  // Browser Geolocation Helper
  const handleUseGeolocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGeoCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setOtpMessage(t('onboarding.locationDetected'));
        },
        (error) => {
          setErrorMessage('Geolocation access denied or unavailable.');
        }
      );
    } else {
      setErrorMessage('Geolocation is not supported by your browser.');
    }
  };

  // Step 5 -> Finish: Save Location & Transition to Dashboard (App Access!)
  const handleSaveLocationAndAccessApp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      if (createdUser?.id) {
        await fetch('/api/location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: createdUser.id,
            state: selectedState,
            district: selectedDistrict,
            taluka: selectedTaluka,
            village: selectedVillage,
            latitude: geoCoords?.lat,
            longitude: geoCoords?.lng,
          }),
        });
      }
      
      // Immediate App Access to Dashboard!
      router.push('/dashboard');
    } catch (err) {
      console.error('Location save error:', err);
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 max-w-2xl mx-auto w-full p-4 sm:p-6 flex flex-col justify-center">
      
      {/* Onboarding Progress Header */}
      <div className="bg-white rounded-2xl p-6 shadow-md border border-stone-200 mb-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
            {step === 1 && t('onboarding.stepLanguage')}
            {step === 2 && t('onboarding.stepRole')}
            {step === 3 && t('onboarding.stepRegistration')}
            {step === 4 && t('onboarding.stepOtp')}
            {step === 5 && t('onboarding.stepLocation')}
          </span>
          <span className="text-xs font-semibold text-stone-500">
            Step {step} of 5
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-stone-100 h-2.5 rounded-full overflow-hidden">
          <div
            className="bg-emerald-600 h-full transition-all duration-300 rounded-full"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>
      </div>

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* STEP 1: LANGUAGE SELECTION */}
      {step === 1 && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-md border border-stone-200 space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-bold text-stone-900">
              {t('onboarding.stepLanguage')}
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              Select your preferred language / आपली आवडती भाषा निवडा
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={() => setLanguage('mr')}
              className={`p-4 rounded-xl border-2 text-left flex items-center justify-between font-bold text-sm transition-all ${
                language === 'mr'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-950'
                  : 'border-stone-200 hover:border-stone-300 text-stone-800'
              }`}
            >
              <div>
                <div className="text-base font-extrabold">मराठी</div>
                <div className="text-xs text-stone-500 font-normal">Primary Regional Experience</div>
              </div>
              {language === 'mr' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
            </button>

            <button
              onClick={() => setLanguage('hi')}
              className={`p-4 rounded-xl border-2 text-left flex items-center justify-between font-bold text-sm transition-all ${
                language === 'hi'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-950'
                  : 'border-stone-200 hover:border-stone-300 text-stone-800'
              }`}
            >
              <div>
                <div className="text-base font-extrabold">हिंदी</div>
                <div className="text-xs text-stone-500 font-normal">Hindi Language Interface</div>
              </div>
              {language === 'hi' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
            </button>

            <button
              onClick={() => setLanguage('en')}
              className={`p-4 rounded-xl border-2 text-left flex items-center justify-between font-bold text-sm transition-all ${
                language === 'en'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-950'
                  : 'border-stone-200 hover:border-stone-300 text-stone-800'
              }`}
            >
              <div>
                <div className="text-base font-extrabold">English</div>
                <div className="text-xs text-stone-500 font-normal">English Language Interface</div>
              </div>
              {language === 'en' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
            </button>
          </div>

          <button
            onClick={() => setStep(2)}
            className="w-full py-3.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-sm shadow transition-colors flex items-center justify-center gap-2"
          >
            <span>{t('onboarding.continue')}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* STEP 2: ROLE SELECTION */}
      {step === 2 && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-md border border-stone-200 space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-bold text-stone-900">
              {t('onboarding.selectRoleTitle')}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Farmer Card */}
            <div
              onClick={() => setRole('FARMER')}
              className={`p-6 rounded-2xl border-2 cursor-pointer transition-all text-center flex flex-col items-center ${
                role === 'FARMER'
                  ? 'border-emerald-600 bg-emerald-50/70 shadow-md'
                  : 'border-stone-200 hover:border-stone-300 bg-white'
              }`}
            >
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mb-3">
                <Sprout className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-stone-900 mb-1">
                👨‍🌾 {t('onboarding.roleFarmer')}
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                {t('onboarding.roleFarmerDesc')}
              </p>
            </div>

            {/* Buyer Card */}
            <div
              onClick={() => setRole('BUYER')}
              className={`p-6 rounded-2xl border-2 cursor-pointer transition-all text-center flex flex-col items-center ${
                role === 'BUYER'
                  ? 'border-amber-600 bg-amber-50/70 shadow-md'
                  : 'border-stone-200 hover:border-stone-300 bg-white'
              }`}
            >
              <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mb-3">
                <Building2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-stone-900 mb-1">
                🏢 {t('onboarding.roleBuyer')}
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                {t('onboarding.roleBuyerDesc')}
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setStep(1)}
              className="py-3 px-4 rounded-xl border border-stone-300 text-stone-700 font-semibold text-xs hover:bg-stone-50"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex-1 py-3.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-sm shadow transition-colors flex items-center justify-center gap-2"
            >
              <span>{t('onboarding.continue')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: REGISTRATION FORM */}
      {step === 3 && (
        <form onSubmit={handleSendOtp} className="bg-white rounded-2xl p-6 sm:p-8 shadow-md border border-stone-200 space-y-5">
          <div className="text-center mb-2">
            <h2 className="text-xl font-bold text-stone-900">
              {t('onboarding.stepRegistration')}
            </h2>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1.5">
              <User className="w-4 h-4 text-emerald-700" />
              {t('onboarding.enterName')} *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ramesh Patil / रमेश पाटील"
              className="w-full px-4 py-3 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-emerald-700" />
              {t('onboarding.enterMobile')} *
            </label>
            <div className="flex gap-2">
              <span className="px-3.5 py-3 rounded-xl bg-stone-100 border border-stone-300 text-sm font-semibold text-stone-600 flex items-center">
                +91
              </span>
              <input
                type="tel"
                maxLength={10}
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                placeholder="9876543210"
                className="flex-1 px-4 py-3 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="py-3 px-4 rounded-xl border border-stone-300 text-stone-700 font-semibold text-xs hover:bg-stone-50"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-sm shadow transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? t('common.loading') : t('onboarding.sendOtp')}
            </button>
          </div>
        </form>
      )}

      {/* STEP 4: OTP VERIFICATION */}
      {step === 4 && (
        <form onSubmit={handleVerifyOtp} className="bg-white rounded-2xl p-6 sm:p-8 shadow-md border border-stone-200 space-y-5">
          <div className="text-center">
            <h2 className="text-xl font-bold text-stone-900">
              {t('onboarding.stepOtp')}
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              {t('onboarding.otpSentTo')}<strong className="text-stone-800">+91 {mobile}</strong>
            </p>
          </div>

          {/* Dev OTP Banner Hint */}
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold text-center">
            {t('onboarding.devOtpHint')}
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5 text-center">
              {t('onboarding.enterOtp')}
            </label>
            <input
              type="text"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              className="w-full text-center tracking-widest text-2xl font-bold px-4 py-3 rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              required
            />
          </div>

          {/* Resend Control */}
          <div className="text-center text-xs">
            {otpTimer > 0 ? (
              <span className="text-stone-500 font-medium">
                {t('onboarding.resendOtp')} in {otpTimer}s
              </span>
            ) : (
              <button
                type="button"
                onClick={handleSendOtp}
                className="text-emerald-700 font-bold hover:underline flex items-center justify-center gap-1 mx-auto"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {t('onboarding.resendOtp')}
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-sm shadow transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? t('common.loading') : t('onboarding.verifyOtp')}
          </button>
        </form>
      )}

      {/* STEP 5: LOCATION SELECTOR */}
      {step === 5 && (
        <form onSubmit={handleSaveLocationAndAccessApp} className="bg-white rounded-2xl p-6 sm:p-8 shadow-md border border-stone-200 space-y-5">
          <div className="text-center">
            <h2 className="text-xl font-bold text-stone-900">
              {t('onboarding.locationTitle')}
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              {t('onboarding.locationSub')}
            </p>
          </div>

          {/* Geolocation Button */}
          <button
            type="button"
            onClick={handleUseGeolocation}
            className="w-full py-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
          >
            <Navigation className="w-4 h-4 text-emerald-700" />
            <span>{t('onboarding.useCurrentLocation')}</span>
          </button>

          {otpMessage && (
            <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-900 text-xs font-semibold text-center">
              {otpMessage}
            </div>
          )}

          {/* Cascading Location Selectors */}
          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                {t('onboarding.selectState')} *
              </label>
              <select
                value={selectedState}
                onChange={(e) => {
                  setSelectedState(e.target.value);
                  const districts = getDistricts(e.target.value);
                  if (districts.length > 0) {
                    setSelectedDistrict(districts[0]);
                    const talukas = getTalukas(e.target.value, districts[0]);
                    setSelectedTaluka(talukas[0] || '');
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              >
                {INDIAN_LOCATIONS.map((l) => (
                  <option key={l.state} value={l.state}>{l.state}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                {t('onboarding.selectDistrict')} *
              </label>
              <select
                value={selectedDistrict}
                onChange={(e) => {
                  setSelectedDistrict(e.target.value);
                  const talukas = getTalukas(selectedState, e.target.value);
                  setSelectedTaluka(talukas[0] || '');
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              >
                {getDistricts(selectedState).map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                {t('onboarding.selectTaluka')}
              </label>
              <select
                value={selectedTaluka}
                onChange={(e) => setSelectedTaluka(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              >
                {getTalukas(selectedState, selectedDistrict).map((tName) => (
                  <option key={tName} value={tName}>{tName}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                {t('onboarding.selectVillage')}
              </label>
              <input
                type="text"
                value={selectedVillage}
                onChange={(e) => setSelectedVillage(e.target.value)}
                placeholder="e.g. Uruli Kanchan / उरुळी कांचन"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-emerald-950 font-extrabold text-sm shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span>{t('onboarding.finishOnboarding')}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>
      )}

    </main>
  );
}

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-stone-100 flex flex-col">
      <Navbar />
      <Suspense fallback={
        <div className="flex-1 flex items-center justify-center text-xs font-bold text-stone-500">
          Loading Onboarding...
        </div>
      }>
        <OnboardingContent />
      </Suspense>
    </div>
  );
}
