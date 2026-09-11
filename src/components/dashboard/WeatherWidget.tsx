'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sun, CloudRain, ArrowRight, MapPin } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { WeatherObservationItem } from '@/lib/types/phase8';

export function WeatherWidget() {
  const { t } = useTranslation();
  const [weather, setWeather] = useState<WeatherObservationItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWeather() {
      try {
        const res = await fetch('/api/v1/weather?district=Nashik');
        const data = await res.json();
        if (data.success && data.weather) {
          setWeather(data.weather);
        }
      } catch (err) {
        console.error('Failed to load weather widget:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchWeather();
  }, []);

  if (loading) {
    return (
      <div className="p-5 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 animate-pulse text-xs text-slate-400">
        Loading Weather Advisory...
      </div>
    );
  }

  if (!weather) return null;

  return (
    <div className="bg-gradient-to-br from-slate-900 to-sky-950 text-white rounded-3xl p-6 shadow-xl border border-sky-800 flex flex-col justify-between space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-sky-900 text-sky-300 rounded-lg">
            <Sun className="w-4 h-4" />
          </div>
          <span className="font-bold text-xs uppercase tracking-wider text-sky-200">Weather Advisory</span>
        </div>
        <span className="text-[10px] text-sky-300 flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {weather.district}
        </span>
      </div>

      <div className="flex items-center space-x-4">
        <div className="text-4xl font-black text-white">{weather.temperatureC}°C</div>
        <div>
          <span className="text-xs font-extrabold text-sky-300 block uppercase tracking-wide">{weather.condition}</span>
          <span className="text-[11px] text-slate-300">Humidity: {weather.humidityPct}%</span>
        </div>
      </div>

      <div className="pt-3 border-t border-sky-800 flex items-center justify-between">
        <span className="text-[10px] text-slate-400 truncate max-w-[180px]">Area Weather</span>
        <Link
          href="/weather"
          className="inline-flex items-center space-x-1 text-xs font-extrabold text-sky-400 hover:underline shrink-0"
        >
          <span>{t('weather.viewWeatherBtn')}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
