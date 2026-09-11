'use client';

import React from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { Sprout, Building2, ShieldCheck, ArrowRight, TrendingUp, Users, Truck } from 'lucide-react';

export default function LandingPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col font-sans">
      
      {/* Navbar Header */}
      <Navbar />

      {/* Hero Banner Section with Agricultural Context Overlay */}
      <section className="relative bg-emerald-950 text-white overflow-hidden py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-b border-emerald-900">
        
        {/* Background Visual Pattern / Gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-950 via-emerald-900/90 to-emerald-950/80 z-10" />
        
        {/* Authentic Farm Visual Background */}
        <div 
          className="absolute inset-0 opacity-25 bg-cover bg-center mix-blend-overlay z-0"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1600&auto=format&fit=crop')`,
          }}
        />

        <div className="relative z-20 max-w-5xl mx-auto text-center space-y-6">
          
          {/* Trust Pill Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-900/80 border border-emerald-700 text-amber-300 text-xs font-semibold shadow-sm">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>{t('landing.trustBadges.verified')}</span>
          </div>

          {/* Main Title & Tagline */}
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            {t('landing.title')}
          </h1>

          <p className="text-base sm:text-lg text-emerald-100 max-w-3xl mx-auto font-normal leading-relaxed">
            {t('landing.subtitle')}
          </p>

          {/* Call to Action Button */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/onboarding"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-emerald-950 font-bold text-base shadow-lg shadow-amber-500/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
            >
              <span>{t('landing.cta')}</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

          {/* Trust Features Strip */}
          <div className="pt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 text-emerald-200 text-xs font-medium max-w-4xl mx-auto border-t border-emerald-800/80">
            <div className="flex items-center justify-center gap-2 py-2">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>{t('landing.trustBadges.verified')}</span>
            </div>
            <div className="flex items-center justify-center gap-2 py-2">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              <span>{t('landing.trustBadges.directAccess')}</span>
            </div>
            <div className="flex items-center justify-center gap-2 py-2">
              <Users className="w-4 h-4 text-amber-400" />
              <span>{t('landing.trustBadges.languageSupport')}</span>
            </div>
          </div>

        </div>
      </section>

      {/* Role Selection Cards Section */}
      <section className="py-14 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-stone-900">
            {t('onboarding.selectRoleTitle')}
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 mt-2">
            {t('brand.tagline')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          
          {/* Farmer Card */}
          <Link
            href="/onboarding?role=FARMER"
            className="group bg-white rounded-2xl p-6 sm:p-8 border-2 border-stone-200 hover:border-emerald-600 shadow-sm hover:shadow-xl transition-all flex flex-col items-center text-center cursor-pointer"
          >
            <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Sprout className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-stone-900 mb-2">
              👨‍🌾 {t('landing.farmerCard')}
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 mb-6 leading-relaxed">
              {t('landing.farmerDesc')}
            </p>
            <div className="mt-auto px-6 py-2.5 rounded-xl bg-emerald-800 group-hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2">
              <span>{t('onboarding.roleFarmer')}</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

          {/* Buyer Card */}
          <Link
            href="/onboarding?role=BUYER"
            className="group bg-white rounded-2xl p-6 sm:p-8 border-2 border-stone-200 hover:border-amber-500 shadow-sm hover:shadow-xl transition-all flex flex-col items-center text-center cursor-pointer"
          >
            <div className="w-20 h-20 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Building2 className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-stone-900 mb-2">
              🏢 {t('landing.buyerCard')}
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 mb-6 leading-relaxed">
              {t('landing.buyerDesc')}
            </p>
            <div className="mt-auto px-6 py-2.5 rounded-xl bg-amber-600 group-hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-2">
              <span>{t('onboarding.roleBuyer')}</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-stone-900 text-stone-400 py-8 px-4 text-center text-xs border-t border-stone-800">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-bold text-amber-400">
            <Sprout className="w-5 h-5 text-amber-500" />
            <span>कृषीसेतू (KrishiSetu) — Smart India Hackathon 2026</span>
          </div>
          <div>
            Built with production foundations for Indian Agriculture.
          </div>
        </div>
      </footer>

    </div>
  );
}
