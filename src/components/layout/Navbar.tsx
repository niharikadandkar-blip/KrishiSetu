'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { Language } from '@/lib/types';
import { Globe, ShieldCheck, ShieldAlert, Sprout, User, Bookmark, ShoppingBag, ListPlus, Truck, Warehouse, Store, Sun, Bell } from 'lucide-react';
import { VoiceActionBar } from '@/components/voice/VoiceActionBar';
import { AITaskAgent } from '@/components/ai/AITaskAgent';

function NotificationBell() {
  const [unreadCount, setUnreadCount] = React.useState<number>(0);

  React.useEffect(() => {
    async function checkUnread() {
      try {
        const res = await fetch('/api/v1/notifications/unread-count');
        const data = await res.json();
        if (data.success && typeof data.unreadCount === 'number') {
          setUnreadCount(data.unreadCount);
        }
      } catch (e) {
        // Silently handle if unauthenticated
      }
    }
    checkUnread();
  }, []);

  return (
    <Link
      href="/notifications"
      className="relative p-2 rounded-lg bg-emerald-800/80 hover:bg-emerald-800 text-amber-300 transition-colors flex items-center justify-center"
      title="Notifications Center"
      aria-label={`Notifications Center, ${unreadCount} unread`}
    >
      <Bell className="w-4 h-4" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-amber-500 text-emerald-950 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-emerald-900 shadow">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Link>
  );
}

interface NavbarProps {
  userSession?: {
    name: string;
    role: string;
    mobileVerified: boolean;
    profileVerified: boolean;
  } | null;
}

export const Navbar: React.FC<NavbarProps> = ({ userSession }) => {
  const { language, setLanguage, t } = useTranslation();

  return (
    <header className="sticky top-0 z-40 bg-emerald-900 text-white shadow-md border-b border-emerald-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-6">
          <Link href={userSession ? "/dashboard" : "/"} className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-full bg-amber-500 text-emerald-950 flex items-center justify-center font-bold shadow-inner group-hover:scale-105 transition-transform">
              <Sprout className="w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-extrabold tracking-wide text-amber-300">
                {t('brand.name')}
              </span>
              <span className="text-[10px] text-emerald-200 tracking-wider font-medium uppercase">
                {t('brand.nameEn')}
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-4 text-xs font-semibold text-emerald-100">
            <Link href="/marketplace" className="hover:text-amber-300 transition-colors flex items-center gap-1">
              <ShoppingBag className="w-3.5 h-3.5" />
              {t('nav.marketplace')}
            </Link>
            <Link href="/market-intelligence" className="hover:text-amber-300 transition-colors flex items-center gap-1 text-amber-300">
              <Store className="w-3.5 h-3.5" />
              {t('market.title')}
            </Link>
            <Link href="/weather" className="hover:text-amber-300 transition-colors flex items-center gap-1 text-sky-300">
              <Sun className="w-3.5 h-3.5" />
              {t('weather.title')}
            </Link>
            <Link href="/orders" className="hover:text-amber-300 transition-colors flex items-center gap-1">
              <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
              {t('orders.farmerNav')}
            </Link>
            <Link href="/transport/discover" className="hover:text-amber-300 transition-colors flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-amber-300" />
              {t('transport.nav')}
            </Link>
            <Link href="/storage/discover" className="hover:text-amber-300 transition-colors flex items-center gap-1">
              <Warehouse className="w-3.5 h-3.5 text-amber-300" />
              {t('storage.nav')}
            </Link>
          </nav>
        </div>

        {/* Right Section: Verification Badge, Language Switcher & Actions */}
        <div className="flex items-center gap-3 sm:gap-4">
          
          {/* User Verification Status Indicator if Logged In */}
          {userSession && (
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/60 border border-emerald-700/60">
              {userSession.profileVerified ? (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-300">{t('dashboard.profileVerified')}</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <span className="text-amber-300">{t('dashboard.mobileVerified')}</span>
                </>
              )}
            </div>
          )}

          {/* Language Selector Dropdown */}
          <div className="relative flex items-center gap-1 bg-emerald-800/80 hover:bg-emerald-800 px-2.5 py-1.5 rounded-lg border border-emerald-700 text-xs font-medium cursor-pointer transition-colors">
            <Globe className="w-4 h-4 text-amber-400" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer pr-1"
              aria-label="Select Application Language"
            >
              <option value="mr" className="bg-emerald-900 text-white">मराठी</option>
              <option value="hi" className="bg-emerald-900 text-white">हिंदी</option>
              <option value="en" className="bg-emerald-900 text-white">English</option>
            </select>
          </div>

          {/* Voice Input Assistant Trigger */}
          <VoiceActionBar />

          {/* AI Task Agent Drawer Launcher */}
          <AITaskAgent />

          {/* Notification Bell Icon */}
          <NotificationBell />

          {/* User Profile Link or Auth Button */}
          {userSession ? (
            <Link
              href="/profile"
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-emerald-950 px-3 py-1.5 rounded-lg font-bold text-xs shadow transition-colors"
            >
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">{userSession.name}</span>
            </Link>
          ) : (
            <Link
              href="/onboarding"
              className="bg-amber-500 hover:bg-amber-400 text-emerald-950 px-4 py-1.5 rounded-lg font-bold text-xs shadow transition-colors"
            >
              {t('nav.getStarted')}
            </Link>
          )}

        </div>
      </div>
    </header>
  );
};
