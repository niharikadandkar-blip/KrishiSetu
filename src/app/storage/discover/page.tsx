'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { SyncManager } from '@/components/offline/SyncManager';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { Warehouse, MapPin, Search, ArrowRight, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';

import { InteractiveMapView } from '@/components/map/InteractiveMapView';
import { MandiIntelligenceWidget } from '@/components/map/MandiIntelligenceWidget';
import { MapMarker } from '@/lib/types/phase7';

export default function FindStoragePage() {
  const { t } = useTranslation();

  const [facilities, setFacilities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [district, setDistrict] = useState('');
  const [facilityType, setFacilityType] = useState('');

  const [selectedFacility, setSelectedFacility] = useState<any | null>(null);
  const [showReservationModal, setShowReservationModal] = useState(false);

  // Storage Reservation Form State
  const [cropName, setCropName] = useState('Potato');
  const [quantity, setQuantity] = useState('20');
  const [unit, setUnit] = useState('Quintal');
  const [checkInDate, setCheckInDate] = useState('2026-09-20');
  const [durationDays, setDurationDays] = useState('14');

  const [reserving, setReserving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchFacilities = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams();
      if (district) query.set('district', district);
      if (facilityType) query.set('facilityType', facilityType);

      const res = await fetch(`/api/v1/map/storage?${query.toString()}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setFacilities(data.facilities || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFacilities();
  }, [district, facilityType]);

  const mapMarkers: MapMarker[] = facilities.map((f) => ({
    id: f.id,
    title: f.facilityName,
    subtitle: `${f.facilityType} • Available: ${f.availableCapacity} ${f.capacityUnit} • ₹${f.pricePerUnitPerDay}/${f.capacityUnit}/day`,
    location: f.discoveryLocation || { latitude: 19.7515, longitude: 75.7139 },
    type: 'STORAGE',
    isDiscoveryApproximate: true,
  }));

  const handleReservationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFacility) return;

    setReserving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/v1/storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facilityId: selectedFacility.id,
          cropName,
          quantity: parseFloat(quantity),
          unit,
          expectedCheckInDate: checkInDate,
          durationDays: parseInt(durationDays),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Storage reservation failed');
      }

      setSuccessMsg('Storage reservation requested successfully! Redirecting...');
      setTimeout(() => {
        window.location.href = `/storage/${data.request.id}`;
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setReserving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      <Navbar />
      <SyncManager />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 space-y-6">
        <div className="bg-emerald-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-800 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-800 text-amber-300 text-xs font-bold uppercase tracking-wider">
            <Warehouse className="w-4 h-4" />
            {t('storage.findTitle')}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {t('storage.findTitle')}
          </h1>
          <p className="text-sm text-emerald-100/90 leading-relaxed max-w-2xl">
            {t('storage.findSub')}
          </p>
        </div>

        {/* Filters Bar */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-1 w-full relative">
            <Search className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by District (e.g. Nashik, Pune)..."
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
            />
          </div>

          <div className="w-full sm:w-64">
            <select
              value={facilityType}
              onChange={(e) => setFacilityType(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
            >
              <option value="">All Facility Types</option>
              <option value="COLD_STORAGE">Cold Storage</option>
              <option value="WAREHOUSE">Agri Warehouse</option>
              <option value="GODOWN">Local Storage Godown</option>
              <option value="CONTROLLED_ATMOSPHERE">Controlled Atmosphere Cold Chain</option>
            </select>
          </div>
        </div>

        {/* Phase 7 Geographic Map View */}
        <InteractiveMapView markers={mapMarkers} height="360px" />

        {/* APMC Mandi Benchmark Location Intelligence */}
        <MandiIntelligenceWidget />

        {/* Facilities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <p className="text-sm text-slate-500 col-span-full text-center py-12">{t('common.loading')}</p>
          ) : facilities.length === 0 ? (
            <div className="col-span-full py-12 text-center space-y-3">
              <Warehouse className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-base font-bold text-slate-700 dark:text-slate-300">No storage facilities found</p>
              <p className="text-xs text-slate-400">Try adjusting your district or facility type filter.</p>
            </div>
          ) : (
            facilities.map((f) => (
              <div key={f.id} className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                      {f.facilityType}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Last Updated: {new Date(f.updatedAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">
                    {f.facilityName}
                  </h3>

                  <div className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">{t('storage.availableCapacity')}</span>
                      <span className="font-extrabold text-emerald-700 dark:text-emerald-300 text-sm">
                        {f.availableCapacity} / {f.totalCapacity} {f.capacityUnit}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Rate: ₹{f.pricePerUnitPerDay} / {f.capacityUnit} / day
                    </p>
                  </div>

                  <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                    <p className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                      {f.village || 'Village'}, {f.district}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Crops: {f.supportedCrops}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedFacility(f);
                    setShowReservationModal(true);
                  }}
                  className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all"
                >
                  {t('storage.requestStorageCta')}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Reservation Modal */}
        {showReservationModal && selectedFacility && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Reserve Storage at {selectedFacility.facilityName}
              </h3>

              {errorMsg && (
                <div className="p-4 rounded-2xl bg-rose-50 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  {errorMsg}
                </div>
              )}

              {successMsg && (
                <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  {successMsg}
                </div>
              )}

              <form onSubmit={handleReservationSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold mb-1">Produce / Crop Name *</label>
                  <input type="text" required value={cropName} onChange={(e) => setCropName(e.target.value)} className="w-full p-3 rounded-xl border bg-slate-50 dark:bg-slate-900" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold mb-1">Quantity *</label>
                    <input type="number" required value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full p-3 rounded-xl border bg-slate-50 dark:bg-slate-900" />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Unit *</label>
                    <select value={unit} onChange={(e) => setUnit(e.target.value)} className="w-full p-3 rounded-xl border bg-slate-50 dark:bg-slate-900">
                      <option value="Quintal">Quintal</option>
                      <option value="Tonne">Tonne</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold mb-1">Expected Check-In *</label>
                    <input type="date" required value={checkInDate} onChange={(e) => setCheckInDate(e.target.value)} className="w-full p-3 rounded-xl border bg-slate-50 dark:bg-slate-900" />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Duration (Days) *</label>
                    <input type="number" required value={durationDays} onChange={(e) => setDurationDays(e.target.value)} className="w-full p-3 rounded-xl border bg-slate-50 dark:bg-slate-900" />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border text-slate-600 dark:text-slate-400">
                  <p className="font-bold text-slate-900 dark:text-white">Estimated Storage Cost</p>
                  <p className="text-xs">
                    Approx. ₹{Math.round(parseFloat(quantity || '0') * selectedFacility.pricePerUnitPerDay * parseInt(durationDays || '1'))}
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t">
                  <button type="button" onClick={() => setShowReservationModal(false)} className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 font-bold">Cancel</button>
                  <button type="submit" disabled={reserving} className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold disabled:opacity-50">
                    {reserving ? t('common.loading') : 'Submit Reservation'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
