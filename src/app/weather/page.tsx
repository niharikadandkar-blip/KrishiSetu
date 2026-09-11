'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { SyncManager } from '@/components/offline/SyncManager';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import {
  Sun,
  Cloud,
  CloudRain,
  CloudLightning,
  Wind,
  Droplets,
  MapPin,
  Calendar,
  Info,
  ShieldCheck,
  WifiOff,
} from 'lucide-react';
import { WeatherObservationItem, WeatherForecastItem } from '@/lib/types/phase8';

export default function WeatherPage() {
  const { t } = useTranslation();

  const [district, setDistrict] = useState<string>('Nashik');
  const [weather, setWeather] = useState<WeatherObservationItem | null>(null);
  const [forecast, setForecast] = useState<WeatherForecastItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isOffline, setIsOffline] = useState<boolean>(false);

  useEffect(() => {
    setIsOffline(!navigator.onLine);
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchWeatherData = async () => {
    setLoading(true);
    try {
      const resWx = await fetch(`/api/v1/weather?district=${district}`);
      const dataWx = await resWx.json();
      if (dataWx.success) setWeather(dataWx.weather);

      const resFc = await fetch(`/api/v1/weather/forecast?district=${district}&days=5`);
      const dataFc = await resFc.json();
      if (dataFc.success) setForecast(dataFc.forecast || []);

      if (dataWx.success && dataWx.weather) {
        localStorage.setItem(`krishisetu_wx_${district}`, JSON.stringify(dataWx.weather));
      }
    } catch (err) {
      console.error('Failed to fetch weather:', err);
      const cached = localStorage.getItem(`krishisetu_wx_${district}`);
      if (cached) {
        try {
          setWeather(JSON.parse(cached));
        } catch (e) {}
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeatherData();
  }, [district]);

  const getWeatherIcon = (condition: string) => {
    switch (condition) {
      case 'Rainy':
        return <CloudRain className="w-8 h-8 text-sky-400" />;
      case 'Cloudy':
        return <Cloud className="w-8 h-8 text-slate-300" />;
      case 'Thunderstorm':
        return <CloudLightning className="w-8 h-8 text-amber-400" />;
      case 'Sunny':
      default:
        return <Sun className="w-8 h-8 text-amber-400 animate-spin-slow" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      <Navbar />
      <SyncManager />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 space-y-6">
        {/* Header Hero */}
        <div className="bg-gradient-to-br from-sky-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-sky-800 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 text-xs font-bold uppercase tracking-wider border border-sky-500/30">
            <Sun className="w-4 h-4" />
            {t('weather.title')}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {t('weather.title')}
          </h1>
          <p className="text-sm text-sky-100/90 leading-relaxed max-w-2xl">
            {t('weather.subtitle')}
          </p>
        </div>

        {/* Offline Banner */}
        {isOffline && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center space-x-3 text-amber-900 text-xs font-medium">
            <WifiOff className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-bold">Viewing Cached Weather Data (Offline Mode)</p>
              <p className="text-[11px] text-amber-700">Connect to internet for real-time weather observations.</p>
            </div>
          </div>
        )}

        {/* District Selector */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center gap-4">
          <div className="w-full sm:w-80">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {t('weather.selectArea')}
            </label>
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-semibold"
            >
              <option value="Nashik">Nashik District (नाशिक)</option>
              <option value="Pune">Pune District (पुणे)</option>
              <option value="Sangli">Sangli District (सांगली)</option>
              <option value="Latur">Latur District (लातूर)</option>
              <option value="Nagpur">Nagpur District (नागपूर)</option>
            </select>
          </div>

          <div className="text-xs text-slate-500 italic flex items-center gap-1.5 pt-2 sm:pt-4">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{t('weather.weatherNotice')}</span>
          </div>
        </div>

        {/* Weather Observation Main Box */}
        {weather && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-gradient-to-br from-slate-900 to-sky-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-sky-800 flex flex-col justify-between space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-5 h-5 text-sky-400" />
                  <span className="font-extrabold text-lg">{weather.district}, {weather.state}</span>
                </div>
                <span className="text-[10px] text-sky-300 bg-sky-900/80 px-2.5 py-1 rounded">
                  {weather.isDemoData ? 'IMD Sandbox' : 'Verified IMD'}
                </span>
              </div>

              <div className="flex items-center space-x-6">
                {getWeatherIcon(weather.condition)}
                <div>
                  <div className="text-5xl font-black tracking-tight text-white">
                    {weather.temperatureC}°C
                  </div>
                  <div className="text-sm font-bold text-sky-200 mt-1 uppercase tracking-wide">
                    {weather.condition}
                  </div>
                </div>
              </div>

              {/* Weather Stats Grid */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-sky-800/80 text-xs">
                <div className="flex items-center space-x-2">
                  <Droplets className="w-4 h-4 text-sky-400" />
                  <div>
                    <span className="text-[10px] text-sky-300 block">Humidity</span>
                    <span className="font-bold text-white">{weather.humidityPct}%</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <CloudRain className="w-4 h-4 text-sky-400" />
                  <div>
                    <span className="text-[10px] text-sky-300 block">Rainfall</span>
                    <span className="font-bold text-white">{weather.rainfallMm} mm</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Wind className="w-4 h-4 text-sky-400" />
                  <div>
                    <span className="text-[10px] text-sky-300 block">Wind</span>
                    <span className="font-bold text-white">{weather.windSpeedKmh} km/h</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Agricultural Advisory Card */}
            <div className="bg-emerald-900 text-white p-6 rounded-3xl shadow-xl border border-emerald-800 flex flex-col justify-between space-y-4">
              <div>
                <span className="inline-block px-3 py-1 bg-emerald-800 text-amber-300 text-xs font-bold rounded-full uppercase tracking-wider mb-2">
                  {t('weather.agriAdvisory')}
                </span>
                <h4 className="font-extrabold text-base text-white">Harvest & Logistics Planning</h4>
                <p className="text-xs text-emerald-100/90 mt-2 leading-relaxed">
                  {weather.agContextHint}
                </p>
              </div>

              <div className="text-[11px] text-emerald-200/80 italic border-t border-emerald-800 pt-3">
                Advisory suggestions are informative planning hints and do not guarantee crop outcomes.
              </div>
            </div>
          </div>
        )}

        {/* 5-Day Forecast Grid */}
        {forecast.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-xl border border-slate-200 dark:border-slate-700 space-y-4">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base">{t('weather.forecast')}</h3>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {forecast.map((f, i) => (
                <div key={i} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center space-y-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">{f.date}</span>
                  <div className="flex justify-center">{getWeatherIcon(f.condition)}</div>
                  <span className="text-xs font-semibold text-slate-900 dark:text-white block">{f.condition}</span>
                  <div className="text-xs text-slate-500">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{f.maxTempC}°</span> / {f.minTempC}°C
                  </div>
                  {f.rainfallProbPct > 20 && (
                    <span className="inline-block px-2 py-0.5 bg-sky-100 text-sky-800 text-[10px] font-bold rounded">
                      Rain {f.rainfallProbPct}%
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
