'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { SyncManager } from '@/components/offline/SyncManager';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { Truck, Warehouse, Plus, CheckCircle2, Clock, AlertCircle, Building2, User } from 'lucide-react';

export default function ProviderDashboardPage() {
  const { t } = useTranslation();

  const [provider, setProvider] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add Vehicle Form State
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [vehicleType, setVehicleType] = useState('MINI_TRUCK');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [capacity, setCapacity] = useState('5');
  const [supportedCrops, setSupportedCrops] = useState('Onion, Potato, Tomato, Vegetables');
  const [serviceAreaDistricts, setServiceAreaDistricts] = useState('Nashik, Pune, Ahmednagar');
  const [pricingMethod, setPricingMethod] = useState('NEGOTIABLE');

  // Add Facility Form State
  const [showFacilityModal, setShowFacilityModal] = useState(false);
  const [facilityName, setFacilityName] = useState('');
  const [facilityType, setFacilityType] = useState('COLD_STORAGE');
  const [totalCapacity, setTotalCapacity] = useState('100');
  const [facilityCrops, setFacilityCrops] = useState('Potato, Onion, Fruit, Grains');
  const [pricePerUnitPerDay, setPricePerUnitPerDay] = useState('15');

  const fetchProviderData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/providers');
      const data = await res.json();
      if (res.ok && data.success) {
        setProvider(data.provider);
      } else {
        setError(data.message || 'Failed to load provider profile');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load provider profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviderData();
  }, []);

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/providers?action=ADD_VEHICLE', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: provider.id,
          vehicleType,
          vehicleNumber,
          capacity: parseFloat(capacity),
          capacityUnit: 'Quintal',
          supportedCrops,
          serviceAreaDistricts,
          pricingMethod,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to add vehicle');

      setShowVehicleModal(false);
      fetchProviderData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/providers?action=ADD_FACILITY', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: provider.id,
          facilityName,
          facilityType,
          totalCapacity: parseFloat(totalCapacity),
          capacityUnit: 'Quintal',
          supportedCrops: facilityCrops,
          pricePerUnitPerDay: parseFloat(pricePerUnitPerDay),
          state: provider.state || 'Maharashtra',
          district: provider.district || 'Nashik',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to add facility');

      setShowFacilityModal(false);
      fetchProviderData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      <Navbar />
      <SyncManager />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-emerald-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-800">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-800 text-amber-300 text-xs font-bold uppercase tracking-wider mb-2">
              <Building2 className="w-4 h-4" />
              {t('providers.dashboardTitle')}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {provider?.businessName || provider?.contactName || 'Provider Dashboard'}
            </h1>
            <p className="text-xs text-emerald-200 mt-1">
              {provider?.village}, {provider?.taluka}, {provider?.district} | Contact: {provider?.contactMobile}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/providers/onboarding"
              className="px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold transition-all border border-emerald-700"
            >
              Edit Profile
            </Link>
          </div>
        </div>

        {!provider && !loading && (
          <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-4">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
            <h3 className="text-lg font-bold">No Provider Profile Found</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              You haven't registered as a service provider yet. Register to offer transport or storage facilities.
            </p>
            <Link
              href="/providers/onboarding"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md"
            >
              Register Service Provider Profile
            </Link>
          </div>
        )}

        {provider && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Transport Vehicles Section */}
            {provider.hasTransportServices && (
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-xl border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Truck className="w-5 h-5 text-emerald-600" />
                    Transport Fleet & Vehicles ({provider.vehicles?.length || 0})
                  </h2>
                  <button
                    onClick={() => setShowVehicleModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add Vehicle
                  </button>
                </div>

                <div className="space-y-3">
                  {provider.vehicles?.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No vehicles added yet.</p>
                  ) : (
                    provider.vehicles?.map((v: any) => (
                      <div key={v.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                            {v.vehicleType} — {v.vehicleNumber}
                          </h4>
                          <p className="text-xs text-slate-500">
                            Capacity: {v.capacity} {v.capacityUnit} | Rates: {v.pricingMethod}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Districts: {v.serviceAreaDistricts}
                          </p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                          {v.isAvailable ? 'Available' : 'Busy'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Storage Facilities Section */}
            {provider.hasStorageServices && (
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-xl border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Warehouse className="w-5 h-5 text-emerald-600" />
                    Storage Facilities ({provider.facilities?.length || 0})
                  </h2>
                  <button
                    onClick={() => setShowFacilityModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add Facility
                  </button>
                </div>

                <div className="space-y-3">
                  {provider.facilities?.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No storage facilities added yet.</p>
                  ) : (
                    provider.facilities?.map((f: any) => (
                      <div key={f.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                            {f.facilityName} ({f.facilityType})
                          </h4>
                          <p className="text-xs text-slate-500">
                            Total Capacity: {f.totalCapacity} {f.capacityUnit} | ₹{f.pricePerUnitPerDay}/unit/day
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Crops: {f.supportedCrops}
                          </p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                          Active
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Add Vehicle Modal */}
        {showVehicleModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Add Transport Vehicle</h3>
              <form onSubmit={handleAddVehicle} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold mb-1">Vehicle Type</label>
                  <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} className="w-full p-3 rounded-xl border bg-slate-50 dark:bg-slate-900">
                    <option value="PICKUP_TRUCK">Pickup Truck (1-2 Tonnes)</option>
                    <option value="MINI_TRUCK">Mini Truck (3-5 Tonnes)</option>
                    <option value="HEAVY_TRUCK">Heavy Truck (10+ Tonnes)</option>
                    <option value="TRACTOR_TRAILER">Tractor Trailer</option>
                    <option value="COLD_REFRIGERATED_TRUCK">Cold Refrigerated Truck</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1">Vehicle Registration Number *</label>
                  <input type="text" required value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} placeholder="e.g. MH 15 AB 1234" className="w-full p-3 rounded-xl border bg-slate-50 dark:bg-slate-900" />
                </div>

                <div>
                  <label className="block font-bold mb-1">Capacity (Quintals) *</label>
                  <input type="number" required value={capacity} onChange={(e) => setCapacity(e.target.value)} className="w-full p-3 rounded-xl border bg-slate-50 dark:bg-slate-900" />
                </div>

                <div>
                  <label className="block font-bold mb-1">Supported Crops *</label>
                  <input type="text" required value={supportedCrops} onChange={(e) => setSupportedCrops(e.target.value)} className="w-full p-3 rounded-xl border bg-slate-50 dark:bg-slate-900" />
                </div>

                <div>
                  <label className="block font-bold mb-1">Service Area Districts *</label>
                  <input type="text" required value={serviceAreaDistricts} onChange={(e) => setServiceAreaDistricts(e.target.value)} className="w-full p-3 rounded-xl border bg-slate-50 dark:bg-slate-900" />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowVehicleModal(false)} className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 font-bold">Cancel</button>
                  <button type="submit" className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold">Save Vehicle</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Facility Modal */}
        {showFacilityModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Add Storage Facility</h3>
              <form onSubmit={handleAddFacility} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold mb-1">Facility Name *</label>
                  <input type="text" required value={facilityName} onChange={(e) => setFacilityName(e.target.value)} placeholder="e.g. Nashik Cold Storage Godown" className="w-full p-3 rounded-xl border bg-slate-50 dark:bg-slate-900" />
                </div>

                <div>
                  <label className="block font-bold mb-1">Facility Type</label>
                  <select value={facilityType} onChange={(e) => setFacilityType(e.target.value)} className="w-full p-3 rounded-xl border bg-slate-50 dark:bg-slate-900">
                    <option value="COLD_STORAGE">Cold Storage</option>
                    <option value="WAREHOUSE">Agri Warehouse</option>
                    <option value="GODOWN">Local Storage Godown</option>
                    <option value="CONTROLLED_ATMOSPHERE">Controlled Atmosphere Cold Chain</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1">Total Capacity (Quintals) *</label>
                  <input type="number" required value={totalCapacity} onChange={(e) => setTotalCapacity(e.target.value)} className="w-full p-3 rounded-xl border bg-slate-50 dark:bg-slate-900" />
                </div>

                <div>
                  <label className="block font-bold mb-1">Price per Quintal per Day (₹) *</label>
                  <input type="number" required value={pricePerUnitPerDay} onChange={(e) => setPricePerUnitPerDay(e.target.value)} className="w-full p-3 rounded-xl border bg-slate-50 dark:bg-slate-900" />
                </div>

                <div>
                  <label className="block font-bold mb-1">Supported Crops *</label>
                  <input type="text" required value={facilityCrops} onChange={(e) => setFacilityCrops(e.target.value)} className="w-full p-3 rounded-xl border bg-slate-50 dark:bg-slate-900" />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowFacilityModal(false)} className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 font-bold">Cancel</button>
                  <button type="submit" className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold">Save Facility</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
