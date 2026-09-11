'use client';

import React, { useState } from 'react';
import { MapMarker, NavigationHandoff } from '@/lib/types/phase7';
import { MapPin, Navigation, ExternalLink, ShieldCheck, Layers, List, Map as MapIcon, WifiOff } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/LanguageContext';

interface InteractiveMapViewProps {
  markers: MapMarker[];
  center?: { latitude: number; longitude: number };
  zoom?: number;
  height?: string;
  isOfflineCached?: boolean;
  lastUpdated?: string;
  onMarkerSelect?: (marker: MapMarker) => void;
}

export function InteractiveMapView({
  markers,
  center = { latitude: 19.7515, longitude: 75.7139 }, // Maharashtra Center
  height = '400px',
  isOfflineCached = false,
  lastUpdated,
  onMarkerSelect,
}: InteractiveMapViewProps) {
  const { t } = useTranslation();
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(markers[0] || null);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

  const handlePinClick = (marker: MapMarker) => {
    setSelectedMarker(marker);
    if (onMarkerSelect) onMarkerSelect(marker);
  };

  return (
    <div className="w-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
      {/* Top Controls & Mode Switcher */}
      <div className="bg-slate-50 border-b border-gray-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
            <MapIcon className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-800">{t('map.mapView')}</h4>
            <p className="text-xs text-slate-500">
              {markers.length} {markers.length === 1 ? 'location' : 'locations'} in selected region
            </p>
          </div>
        </div>

        {/* List / Map View Toggle Switch */}
        <div className="inline-flex rounded-lg p-1 bg-slate-200 border border-slate-300">
          <button
            onClick={() => setViewMode('map')}
            className={`flex items-center space-x-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all ${
              viewMode === 'map'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span>{t('map.mapView')}</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center space-x-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all ${
              viewMode === 'list'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>{t('map.listView')}</span>
          </button>
        </div>
      </div>

      {/* Offline / Cached Stale Data Banner */}
      {isOfflineCached && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center space-x-2 text-amber-800 text-xs font-medium">
          <WifiOff className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            {t('map.offlineNotice')}
            {lastUpdated ? ` • ${t('map.lastUpdated')}${lastUpdated}` : ''}
          </span>
        </div>
      )}

      {/* Main View Area */}
      {viewMode === 'map' ? (
        <div className="relative w-full overflow-hidden bg-slate-900" style={{ height }}>
          {/* Interactive Map Visual Grid Canvas */}
          <div
            className="absolute inset-0 opacity-40 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]"
            style={{
              backgroundImage: `linear-gradient(to right, #1e293b 1px, transparent 1px), linear-gradient(to bottom, #1e293b 1px, transparent 1px)`,
              backgroundSize: '40px 40px',
            }}
          />

          {/* Map Base Attribution Overlay */}
          <div className="absolute top-2 right-2 bg-slate-800/80 backdrop-blur text-[10px] text-slate-300 px-2.5 py-1 rounded-md border border-slate-700">
            OpenStreetMap • Demo Provider
          </div>

          {/* Markers Layer */}
          <div className="absolute inset-0 p-8 flex flex-wrap items-center justify-around gap-6 overflow-auto">
            {markers.length === 0 ? (
              <div className="m-auto text-center text-slate-400 text-sm py-12">
                <MapPin className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-50" />
                <p>{t('map.noResults')}</p>
              </div>
            ) : (
              markers.map((marker) => {
                const isSelected = selectedMarker?.id === marker.id;
                return (
                  <button
                    key={marker.id}
                    onClick={() => handlePinClick(marker)}
                    className={`group relative flex flex-col items-center transition-all transform hover:scale-110 ${
                      isSelected ? 'z-20 scale-110' : 'z-10 opacity-90'
                    }`}
                  >
                    <div
                      className={`p-2.5 rounded-full shadow-lg border-2 flex items-center justify-center transition-colors ${
                        marker.type === 'STORAGE'
                          ? 'bg-blue-600 border-white text-white'
                          : marker.type === 'TRANSPORT'
                          ? 'bg-emerald-600 border-white text-white'
                          : marker.type === 'MANDI'
                          ? 'bg-amber-600 border-white text-white'
                          : 'bg-indigo-600 border-white text-white'
                      } ${isSelected ? 'ring-4 ring-emerald-400 ring-offset-2 ring-offset-slate-900' : ''}`}
                    >
                      <MapPin className="w-5 h-5" />
                    </div>

                    {/* Marker Badge Tag */}
                    <div
                      className={`mt-1.5 px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide whitespace-nowrap shadow-md transition-colors ${
                        isSelected
                          ? 'bg-emerald-500 text-slate-950 font-bold'
                          : 'bg-slate-800 text-slate-200 border border-slate-700'
                      }`}
                    >
                      {marker.title}
                      {marker.isDiscoveryApproximate && (
                        <span className="ml-1 text-[9px] text-amber-300 font-normal">(~Approx)</span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Selected Marker Detail Floating Card */}
          {selectedMarker && (
            <div className="absolute bottom-3 left-3 right-3 md:left-4 md:right-auto md:max-w-md bg-white/95 backdrop-blur-md rounded-xl p-4 shadow-xl border border-slate-200 z-30 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-start justify-between">
                <div>
                  <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-semibold rounded uppercase tracking-wider mb-1">
                    {selectedMarker.type}
                  </span>
                  <h5 className="font-semibold text-slate-900 text-sm">{selectedMarker.title}</h5>
                  {selectedMarker.subtitle && (
                    <p className="text-xs text-slate-600 mt-0.5">{selectedMarker.subtitle}</p>
                  )}
                </div>
                {selectedMarker.isDiscoveryApproximate && (
                  <span className="inline-flex items-center text-[10px] text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                    <ShieldCheck className="w-3 h-3 mr-1" />
                    Protected Area Pin
                  </span>
                )}
              </div>

              {/* Navigation Action Buttons */}
              <div className="mt-3 pt-3 border-t border-slate-150 flex items-center justify-between gap-2">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${selectedMarker.location.latitude},${selectedMarker.location.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center space-x-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>{t('map.openInGoogleMaps')}</span>
                  <ExternalLink className="w-3 h-3 ml-1 opacity-70" />
                </a>

                {selectedMarker.detailsUrl && (
                  <a
                    href={selectedMarker.detailsUrl}
                    className="inline-flex items-center justify-center px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors"
                  >
                    View Details
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Accessible Non-Map List Fallback */
        <div className="p-4 bg-slate-50 space-y-3 overflow-y-auto max-h-[500px]">
          {markers.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">{t('map.noResults')}</p>
          ) : (
            markers.map((marker) => (
              <div
                key={marker.id}
                className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:border-emerald-300 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-semibold rounded uppercase">
                      {marker.type}
                    </span>
                    <h5 className="font-semibold text-slate-900 text-sm">{marker.title}</h5>
                  </div>
                  {marker.subtitle && (
                    <p className="text-xs text-slate-600 mt-1">{marker.subtitle}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-0.5">
                    Location: {marker.location.latitude.toFixed(4)}°, {marker.location.longitude.toFixed(4)}°
                    {marker.isDiscoveryApproximate ? ' (~Approximate Centroid)' : ' (Exact)'}
                  </p>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${marker.location.latitude},${marker.location.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>{t('map.navigation')}</span>
                    <ExternalLink className="w-3 h-3 ml-1 opacity-70" />
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
