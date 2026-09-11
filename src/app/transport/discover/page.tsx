'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { SyncManager } from '@/components/offline/SyncManager';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { Truck, MapPin, ShieldCheck, Search, Filter, Phone, ArrowRight, CheckCircle2 } from 'lucide-react';

import { InteractiveMapView } from '@/components/map/InteractiveMapView';
import { MapMarker } from '@/lib/types/phase7';

export default function FindTransportPage() {
  const { t } = useTranslation();

  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [district, setDistrict] = useState('');
  const [vehicleType, setVehicleType] = useState('');

  const [selectedVehicle, setSelectedVehicle] = useState<any | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);

  // Transport Request Form State
  const [cropCategory, setCropCategory] = useState('Onion');
  const [quantity, setQuantity] = useState('50');
  const [pickupVillage, setPickupVillage] = useState('Sogras');
  const [pickupTaluka, setPickupTaluka] = useState('Chandwad');
  const [pickupDistrict, setPickupDistrict] = useState('Nashik');
  const [deliveryVillage, setDeliveryVillage] = useState('Vashi');
  const [deliveryTaluka, setDeliveryTaluka] = useState('Navi Mumbai');
  const [deliveryDistrict, setDeliveryDistrict] = useState('Thane');
  const [scheduledDate, setScheduledDate] = useState('2026-09-15');

  const [requesting, setRequesting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams();
      if (district) query.set('district', district);
      if (vehicleType) query.set('vehicleType', vehicleType);

      const res = await fetch(`/api/v1/map/providers?${query.toString()}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setVehicles(data.providers || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, [district, vehicleType]);

  const mapMarkers: MapMarker[] = vehicles.map((v) => ({
    id: v.id,
    title: `${v.vehicleType} (${v.vehicleNumber})`,
    subtitle: `Provider: ${v.contactName} • Capacity: ${v.capacity} ${v.capacityUnit} • ${v.district}`,
    location: v.discoveryLocation || { latitude: 19.7515, longitude: 75.7139 },
    type: 'TRANSPORT',
    isDiscoveryApproximate: true,
  }));

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) return;

    setRequesting(true);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/v1/transport', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          arrangementType: 'KRISHISETU_PROVIDER',
          providerId: selectedVehicle.providerId,
          vehicleId: selectedVehicle.id,
          cropCategory,
          quantity: parseFloat(quantity),
          unit: 'Quintal',
          pickupVillage,
          pickupTaluka,
          pickupDistrict,
          deliveryVillage,
          deliveryTaluka,
          deliveryDistrict,
          scheduledPickupDate: scheduledDate,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to create transport request');
      }

      setSuccessMsg('Transport request submitted successfully! Redirecting...');
      setTimeout(() => {
        window.location.href = `/transport/${data.request.id}`;
      }, 1500);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      <Navbar />
      <SyncManager />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 space-y-6">
        <div className="bg-emerald-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-800 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-800 text-amber-300 text-xs font-bold uppercase tracking-wider">
            <Truck className="w-4 h-4" />
            {t('transport.findTitle')}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {t('transport.findTitle')}
          </h1>
          <p className="text-sm text-emerald-100/90 leading-relaxed max-w-2xl">
            {t('transport.findSub')}
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
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
            >
              <option value="">All Vehicle Types</option>
              <option value="PICKUP_TRUCK">Pickup Truck (1-2 Tonnes)</option>
              <option value="MINI_TRUCK">Mini Truck (3-5 Tonnes)</option>
              <option value="HEAVY_TRUCK">Heavy Truck (10+ Tonnes)</option>
              <option value="TRACTOR_TRAILER">Tractor Trailer</option>
              <option value="COLD_REFRIGERATED_TRUCK">Cold Refrigerated Truck</option>
            </select>
          </div>
        </div>

        {/* Phase 7 Geographic Map View */}
        <InteractiveMapView markers={mapMarkers} height="360px" />

        {/* Vehicles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <p className="text-sm text-slate-500 col-span-full text-center py-12">{t('common.loading')}</p>
          ) : vehicles.length === 0 ? (
            <div className="col-span-full py-12 text-center space-y-3">
              <Truck className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-base font-bold text-slate-700 dark:text-slate-300">No transport providers found</p>
              <p className="text-xs text-slate-400">Try adjusting your district or vehicle type filter.</p>
            </div>
          ) : (
            vehicles.map((v) => (
              <div key={v.id} className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                      {v.vehicleType}
                    </span>
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4" />
                      {v.provider.verificationStatus === 'PROFILE_VERIFIED' ? 'Verified Provider' : 'Mobile Verified'}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">
                    {v.provider.businessName || v.provider.contactName}
                  </h3>

                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                    <p className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                      {v.provider.village || 'Village'}, {v.provider.district}
                    </p>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      Capacity: {v.capacity} {v.capacityUnit} | Reg: {v.vehicleNumber}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Service Areas: {v.serviceAreaDistricts}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedVehicle(v);
                    setShowRequestModal(true);
                  }}
                  className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all"
                >
                  {t('transport.requestTransportCta')}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Request Modal */}
        {showRequestModal && selectedVehicle && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Request Transport from {selectedVehicle.provider.businessName || selectedVehicle.provider.contactName}
              </h3>

              {successMsg && (
                <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-800 text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  {successMsg}
                </div>
              )}

              <form onSubmit={handleRequestSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold mb-1">Crop Category *</label>
                    <input type="text" required value={cropCategory} onChange={(e) => setCropCategory(e.target.value)} className="w-full p-3 rounded-xl border bg-slate-50 dark:bg-slate-900" />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Quantity (Quintal) *</label>
                    <input type="number" required value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full p-3 rounded-xl border bg-slate-50 dark:bg-slate-900" />
                  </div>
                </div>

                <div className="border-t pt-3 space-y-2">
                  <h4 className="font-bold text-slate-900 dark:text-white">Pickup Location</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <input type="text" placeholder="Village" value={pickupVillage} onChange={(e) => setPickupVillage(e.target.value)} className="p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-900" />
                    <input type="text" placeholder="Taluka" value={pickupTaluka} onChange={(e) => setPickupTaluka(e.target.value)} className="p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-900" />
                    <input type="text" placeholder="District" value={pickupDistrict} onChange={(e) => setPickupDistrict(e.target.value)} className="p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-900" />
                  </div>
                </div>

                <div className="border-t pt-3 space-y-2">
                  <h4 className="font-bold text-slate-900 dark:text-white">Delivery Destination</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <input type="text" placeholder="Village/City" value={deliveryVillage} onChange={(e) => setDeliveryVillage(e.target.value)} className="p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-900" />
                    <input type="text" placeholder="Taluka" value={deliveryTaluka} onChange={(e) => setDeliveryTaluka(e.target.value)} className="p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-900" />
                    <input type="text" placeholder="District" value={deliveryDistrict} onChange={(e) => setDeliveryDistrict(e.target.value)} className="p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-900" />
                  </div>
                </div>

                <div>
                  <label className="block font-bold mb-1">Scheduled Pickup Date *</label>
                  <input type="date" required value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className="w-full p-3 rounded-xl border bg-slate-50 dark:bg-slate-900" />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t">
                  <button type="button" onClick={() => setShowRequestModal(false)} className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 font-bold">Cancel</button>
                  <button type="submit" disabled={requesting} className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold disabled:opacity-50">
                    {requesting ? t('common.loading') : 'Submit Request'}
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
