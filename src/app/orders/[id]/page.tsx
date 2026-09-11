'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { SyncManager } from '@/components/offline/SyncManager';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { OrderItem, OrderStatus, OrderTimelineEventItem } from '@/lib/types/phase5';
import {
  Sprout,
  MapPin,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  AlertCircle,
  FileText,
  Truck,
  Phone,
  User,
  Share2,
  Package,
  Calendar,
  Ban,
  ArrowLeft,
  DollarSign,
  Sparkles,
  History,
  Warehouse,
} from 'lucide-react';

import { InteractiveMapView } from '@/components/map/InteractiveMapView';
import { OrderRouteGeographicDetails, MapMarker } from '@/lib/types/phase7';
import { Navigation, ExternalLink, Globe } from 'lucide-react';

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = params?.id as string;
  const { t } = useTranslation();

  const [user, setUser] = useState<any>({
    id: 'dev-user-farmer-1',
    name: 'रमेश पाटील (Ramesh Patil)',
    role: 'FARMER',
    mobileVerified: true,
    profileVerified: true,
  });

  const [order, setOrder] = useState<OrderItem | null>(null);
  const [routeDetails, setRouteDetails] = useState<OrderRouteGeographicDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Cancellation Modal
  const [isCancelModalOpen, setIsCancelModalOpen] = useState<boolean>(false);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [submittingAction, setSubmittingAction] = useState<boolean>(false);

  // Pickup Modal
  const [isPickupModalOpen, setIsPickupModalOpen] = useState<boolean>(false);
  const [pickupDate, setPickupDate] = useState<string>('');
  const [pickupAddress, setPickupAddress] = useState<string>('');

  useEffect(() => {
    const cookie = document.cookie
      .split('; ')
      .find((row) => row.startsWith('krishisetu_session='));
    if (cookie) {
      try {
        const val = JSON.parse(decodeURIComponent(cookie.split('=')[1]));
        if (val && val.name) setUser((prev: any) => ({ ...prev, ...val }));
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (orderId) fetchOrderDetails();
  }, [orderId, user.id]);

  const fetchOrderDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/orders/${orderId}?userId=${user.id}`);
      const data = await res.json();
      if (res.ok && data.success && data.order) {
        setOrder(data.order);
      } else {
        setError(data.message || t('common.error'));
      }

      // Fetch Phase 7 Geographic Route Details
      const routeRes = await fetch(`/api/v1/map/route/${orderId}`, {
        headers: { 'x-user-id': user.id },
      });
      const routeData = await routeRes.json();
      if (routeRes.ok && routeData.success) {
        setRouteDetails(routeData.route);
      }
    } catch (err) {
      setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleTransitionStatus = async (targetStatus: OrderStatus, notes?: string, extra?: any) => {
    if (targetStatus === 'COMPLETED' && !navigator.onLine) {
      setMessage({ type: 'info', text: t('offers.offlineAcceptWarning') });
      return;
    }

    setSubmittingAction(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/v1/orders/${orderId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          userId: user.id,
          targetStatus,
          notes,
          ...extra,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.order) {
        setOrder(data.order);
        setMessage({ type: 'success', text: data.message });
        setIsPickupModalOpen(false);
      } else {
        setMessage({ type: 'error', text: data.message || t('common.error') });
      }
    } catch (e) {
      setMessage({ type: 'error', text: t('common.error') });
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleCancelOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingAction(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/v1/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          userId: user.id,
          cancellationReason: cancelReason || 'Order cancelled by user.',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.order) {
        setOrder(data.order);
        setMessage({ type: 'success', text: data.message });
        setIsCancelModalOpen(false);
      } else {
        setMessage({ type: 'error', text: data.message || t('common.error') });
      }
    } catch (e) {
      setMessage({ type: 'error', text: t('common.error') });
    } finally {
      setSubmittingAction(false);
    }
  };

  const getStatusLabel = (status: OrderStatus) => {
    switch (status) {
      case 'ORDER_CREATED': return t('orders.statusOrderCreated');
      case 'CONFIRMED': return t('orders.statusConfirmed');
      case 'PICKUP_PLANNED': return t('orders.statusPickupPlanned');
      case 'READY_FOR_PICKUP': return t('orders.statusReadyForPickup');
      case 'PICKED_UP': return t('orders.statusPickedUp');
      case 'IN_TRANSIT': return t('orders.statusInTransit');
      case 'DELIVERED': return t('orders.statusDelivered');
      case 'RECEIPT_PENDING': return t('orders.statusReceiptPending');
      case 'COMPLETED': return t('orders.statusCompleted');
      case 'CANCELLED': return t('orders.statusCancelled');
      default: return status;
    }
  };

  const handleShareWhatsApp = () => {
    if (!order) return;
    const text = `*KrishiSetu Deal Receipt*\nOrder: ${order.orderNumber}\nCrop: ${order.cropName} (${order.quantity} ${order.unit})\nAgreed Value: ₹${order.agreedTotalValue}\nFarmer: ${order.farmerName} (${order.farmerMobile})\nBuyer: ${order.buyerName} (${order.buyerMobile})\nStatus: ${order.status}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col font-sans">
        <Navbar />
        <div className="flex-1 flex items-center justify-center py-20 text-slate-400">
          <Clock className="w-6 h-6 animate-spin mr-2" />
          <span>{t('common.loading')}</span>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col font-sans">
        <Navbar />
        <div className="flex-1 max-w-3xl mx-auto px-4 py-16 text-center">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Order Not Accessible</h2>
          <p className="text-sm text-slate-500 mb-6">{error || 'Order record not found or access unauthorized.'}</p>
          <Link href="/orders" className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold">
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  const isFarmer = order.farmerId === user.id;
  const isBuyer = order.buyerId === user.id;
  const isTerminal = ['COMPLETED', 'CANCELLED'].includes(order.status);
  const eligibleForCancel = ['ORDER_CREATED', 'CONFIRMED', 'PICKUP_PLANNED', 'READY_FOR_PICKUP'].includes(order.status);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-amber-50 dark:from-slate-900 dark:via-slate-800 dark:to-emerald-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans">
      <Navbar />
      <SyncManager />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 space-y-6">
        {/* Top Navigation Bar */}
        <div className="flex items-center justify-between">
          <Link
            href="/orders"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Orders
          </Link>

          <span className="text-xs text-slate-500">
            Order #{order.orderNumber}
          </span>
        </div>

        {/* Message Banner */}
        {message && (
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 ${
              message.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-200'
                : message.type === 'info'
                ? 'bg-sky-50 border-sky-200 text-sky-900 dark:bg-sky-950/50 dark:border-sky-800 dark:text-sky-200'
                : 'bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/50 dark:border-rose-800 dark:text-rose-200'
            }`}
          >
            {message.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
            {message.type === 'info' && <Sparkles className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />}
            {message.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />}
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        )}

        {/* ============================================================== */}
        {/* DEAL RECEIPT / ORDER CONFIRMATION CARD */}
        {/* ============================================================== */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 dark:border-slate-700 space-y-6">
          
          {/* Header & Status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700 pb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-xs font-black uppercase tracking-wider mb-2">
                <FileText className="w-3.5 h-3.5" />
                {t('orders.receiptTitle')}
              </div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                {order.cropName} {order.variety && `(${order.variety})`}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {t('orders.receiptSub')}
              </p>
            </div>

            <div className="flex flex-col items-start sm:items-end gap-1">
              <span className="px-3 py-1.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                {getStatusLabel(order.status)}
              </span>
              <span className="text-[10px] text-slate-400">
                Created: {new Date(order.createdAt).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Agreed Commercial Summary Box */}
          <div className="bg-gradient-to-br from-emerald-900 to-teal-950 text-white p-6 rounded-2xl shadow-inner flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <span className="text-xs text-emerald-200 font-semibold uppercase tracking-wider block">
                {t('orders.agreedValueLabel')}
              </span>
              <div className="text-3xl font-black text-amber-400 tracking-tight">
                ₹{order.agreedTotalValue.toLocaleString()}
              </div>
              <span className="text-xs text-emerald-100 block">
                ({order.quantity} {order.unit} @ ₹{order.agreedPricePerUnit} / {order.unit})
              </span>
            </div>

            <div className="text-xs text-emerald-100 space-y-1 border-t md:border-t-0 md:border-l border-emerald-700/60 pt-3 md:pt-0 md:pl-6">
              <div><strong className="text-white">Payment Terms:</strong> {order.paymentTermsDays === 0 ? 'Instant Cash / UPI' : `${order.paymentTermsDays} Days Credit`}</div>
              <div><strong className="text-white">Quality Grade:</strong> {order.grade || 'Standard'}</div>
              <div><strong className="text-white">Packaging:</strong> {order.packagingType || 'Standard Gunny Bags'}</div>
            </div>
          </div>

          {/* Notice Banner */}
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-medium flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>{t('orders.notPaidNotice')}</span>
          </div>

          {/* Transaction Participant Contact Cards (Protected Post-Acceptance Privacy) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            
            {/* Farmer Card */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block flex items-center gap-1">
                <User className="w-3.5 h-3.5" /> Farmer Details
              </span>
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                {order.farmerName}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <a href={`tel:${order.farmerMobile}`} className="hover:underline font-semibold">{order.farmerMobile}</a>
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {order.publicVillage}, {order.publicTaluka}, {order.publicDistrict}
              </div>
            </div>

            {/* Buyer Card */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider block flex items-center gap-1">
                <User className="w-3.5 h-3.5" /> Buyer Details
              </span>
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                {order.buyerName}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <a href={`tel:${order.buyerMobile}`} className="hover:underline font-semibold">{order.buyerMobile}</a>
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {order.publicDistrict} (Market Sourcing Hub)
              </div>
            </div>

          </div>

          {/* ============================================================== */}
          {/* PHASE 6 FULFILLMENT SERVICES AREA (TRANSPORTATION & STORAGE) */}
          {/* ============================================================== */}
          <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-6">
            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Truck className="w-5 h-5 text-emerald-600" />
              {t('fulfillment.sectionTitle')}
            </h4>

            {/* Transportation Fulfillment Card */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-emerald-600" /> Transportation
                </span>
                {order.transportRequests && order.transportRequests.length > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900">
                    {order.transportRequests[0].arrangementType}
                  </span>
                )}
              </div>

              {(!order.transportRequests || order.transportRequests.length === 0) ? (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-slate-400 font-medium">No transport arranged yet</span>
                  <Link href={`/transport/discover?orderId=${order.id}`} className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm">
                    {t('transport.findTransportBtn')}
                  </Link>
                </div>
              ) : (
                <div className="space-y-2 text-xs">
                  {order.transportRequests[0].arrangementType === 'FARMER_ARRANGED' && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 font-medium">{t('transport.farmerArranged')}</span>
                      <Link href={`/transport/${order.transportRequests[0].id}`} className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 font-bold text-xs">
                        {t('transport.manageTransportBtn')}
                      </Link>
                    </div>
                  )}
                  {order.transportRequests[0].arrangementType === 'BUYER_ARRANGED' && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 font-medium">{t('transport.buyerArranged')}</span>
                      <Link href={`/transport/${order.transportRequests[0].id}`} className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 font-bold text-xs">
                        {t('transport.manageTransportBtn')}
                      </Link>
                    </div>
                  )}
                  {order.transportRequests[0].arrangementType === 'KRISHISETU_PROVIDER' && (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">Status: {order.transportRequests[0].status}</p>
                        {order.transportRequests[0].driverName && (
                          <p className="text-[11px] text-slate-500">Driver: {order.transportRequests[0].driverName} ({order.transportRequests[0].driverMobile || 'Protected'})</p>
                        )}
                      </div>
                      <Link href={`/transport/${order.transportRequests[0].id}`} className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs">
                        {t('transport.viewDetailsBtn')}
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Storage Fulfillment Card */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Warehouse className="w-4 h-4 text-emerald-600" /> Storage & Warehousing
                </span>
                <Link href={`/storage/discover?orderId=${order.id}`} className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-700 font-bold text-[11px]">
                  {(!order.storageRequests || order.storageRequests.length === 0) ? t('storage.findStorageBtn') : t('storage.findAdditionalBtn')}
                </Link>
              </div>

              {(!order.storageRequests || order.storageRequests.length === 0) ? (
                <p className="text-xs text-slate-400 font-medium">No storage reservations arranged for this order.</p>
              ) : (
                <div className="space-y-2">
                  {order.storageRequests.map((st: any) => (
                    <div key={st.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border text-xs flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{st.cropName} ({st.quantity} {st.unit}) — {st.status}</p>
                        <p className="text-[10px] text-slate-400">Duration: {st.durationDays} Days | Check-In: {new Date(st.expectedCheckInDate).toLocaleDateString()}</p>
                      </div>
                      <Link href={`/storage/${st.id}`} className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[10px]">
                        View Reservation
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Separated Cost Breakdown */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-700 dark:text-slate-300">
                <span>{t('fulfillment.cropValue')}:</span>
                <span className="font-bold">₹{order.agreedTotalValue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>{t('fulfillment.transportCost')}:</span>
                <span className="font-semibold">{order.transportRequests?.[0]?.agreedTransportCost ? `₹${order.transportRequests[0].agreedTransportCost}` : 'Negotiable / TBD'}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>{t('fulfillment.storageCost')}:</span>
                <span className="font-semibold">{order.storageRequests?.[0]?.agreedStorageCost ? `₹${order.storageRequests[0].agreedStorageCost}` : 'None'}</span>
              </div>
              <div className="border-t border-emerald-200 dark:border-emerald-800 pt-2 flex justify-between font-extrabold text-sm text-emerald-900 dark:text-emerald-200">
                <span>{t('fulfillment.totalEstimate')} (Estimate Only):</span>
                <span>₹{(order.agreedTotalValue + (Number(order.transportRequests?.[0]?.agreedTransportCost) || 0) + (Number(order.storageRequests?.[0]?.agreedStorageCost) || 0)).toLocaleString()}</span>
              </div>
            </div>

            {/* PHASE 7 GEOGRAPHIC FULFILLMENT & ROUTE MAP */}
            {routeDetails && (
              <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-4 border border-slate-700 shadow-inner">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-5 h-5 text-emerald-400" />
                    <div>
                      <h5 className="font-bold text-sm text-white">Fulfillment Route & Navigation</h5>
                      {routeDetails.distance && (
                        <p className="text-xs text-slate-300">
                          {routeDetails.distance.distanceKm} km • {routeDetails.distance.label}
                        </p>
                      )}
                    </div>
                  </div>
                  {routeDetails.pickup.isExactAuthorized ? (
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Exact Address Authorized
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Discovery Approx Location
                    </span>
                  )}
                </div>

                <InteractiveMapView
                  height="260px"
                  markers={[
                    ...(routeDetails.pickup.location ? [{
                      id: 'pickup_pin',
                      title: `Pickup: ${routeDetails.pickup.village}`,
                      subtitle: routeDetails.pickup.address || undefined,
                      location: routeDetails.pickup.location,
                      type: 'PICKUP' as const,
                      isDiscoveryApproximate: !routeDetails.pickup.isExactAuthorized,
                    }] : []),
                    ...(routeDetails.delivery.location ? [{
                      id: 'delivery_pin',
                      title: `Delivery: ${routeDetails.delivery.village}`,
                      subtitle: routeDetails.delivery.address || undefined,
                      location: routeDetails.delivery.location,
                      type: 'DELIVERY' as const,
                      isDiscoveryApproximate: !routeDetails.delivery.isExactAuthorized,
                    }] : []),
                    ...(routeDetails.storageFacility?.location ? [{
                      id: 'storage_pin',
                      title: `Storage: ${routeDetails.storageFacility.facilityName}`,
                      subtitle: routeDetails.storageFacility.address || undefined,
                      location: routeDetails.storageFacility.location,
                      type: 'STORAGE' as const,
                      isDiscoveryApproximate: false,
                    }] : []),
                  ]}
                />

                {routeDetails.navigationHandoff && (
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 text-xs">
                    <span className="text-slate-400 font-medium">{t('map.navigation')}:</span>
                    <div className="flex items-center space-x-2">
                      {routeDetails.navigationHandoff.googleMapsUrl && (
                        <a
                          href={routeDetails.navigationHandoff.googleMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center space-x-1"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          <span>Google Maps</span>
                        </a>
                      )}
                      {routeDetails.navigationHandoff.openStreetMapUrl && (
                        <a
                          href={routeDetails.navigationHandoff.openStreetMapUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold flex items-center space-x-1"
                        >
                          <Globe className="w-3.5 h-3.5" />
                          <span>OpenStreetMap</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons Toolbar */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
            
            <button
              onClick={handleShareWhatsApp}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow flex items-center gap-1.5 transition-all"
            >
              <Share2 className="w-4 h-4" />
              {t('orders.shareWhatsApp')}
            </button>

            {/* Workflow Action Triggers */}
            <div className="flex items-center gap-2">
              
              {order.status === 'ORDER_CREATED' && (
                <button
                  onClick={() => handleTransitionStatus('CONFIRMED')}
                  disabled={submittingAction}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow transition-all disabled:opacity-50"
                >
                  {t('orders.actionConfirmOrder')}
                </button>
              )}

              {order.status === 'CONFIRMED' && (
                <button
                  onClick={() => setIsPickupModalOpen(true)}
                  disabled={submittingAction}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow transition-all disabled:opacity-50"
                >
                  {t('orders.actionPlanPickup')}
                </button>
              )}

              {order.status === 'PICKUP_PLANNED' && isFarmer && (
                <button
                  onClick={() => handleTransitionStatus('READY_FOR_PICKUP')}
                  disabled={submittingAction}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow transition-all disabled:opacity-50"
                >
                  {t('orders.actionMarkReady')}
                </button>
              )}

              {order.status === 'READY_FOR_PICKUP' && (
                <button
                  onClick={() => handleTransitionStatus('PICKED_UP')}
                  disabled={submittingAction}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow transition-all disabled:opacity-50"
                >
                  {t('orders.actionMarkPickedUp')}
                </button>
              )}

              {order.status === 'PICKED_UP' && (
                <button
                  onClick={() => handleTransitionStatus('IN_TRANSIT')}
                  disabled={submittingAction}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow transition-all disabled:opacity-50"
                >
                  {t('orders.actionMarkInTransit')}
                </button>
              )}

              {order.status === 'IN_TRANSIT' && (
                <button
                  onClick={() => handleTransitionStatus('DELIVERED')}
                  disabled={submittingAction}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow transition-all disabled:opacity-50"
                >
                  {t('orders.actionMarkDelivered')}
                </button>
              )}

              {order.status === 'DELIVERED' && isBuyer && (
                <button
                  onClick={() => handleTransitionStatus('RECEIPT_PENDING')}
                  disabled={submittingAction}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-emerald-950 font-black text-xs shadow transition-all disabled:opacity-50"
                >
                  {t('orders.actionInitiateInspection')}
                </button>
              )}

              {order.status === 'RECEIPT_PENDING' && isBuyer && (
                <button
                  onClick={() => handleTransitionStatus('COMPLETED')}
                  disabled={submittingAction}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow transition-all disabled:opacity-50"
                >
                  {t('orders.actionConfirmReceipt')}
                </button>
              )}

              {eligibleForCancel && (
                <button
                  onClick={() => setIsCancelModalOpen(true)}
                  className="px-3.5 py-2.5 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 font-bold text-xs transition-all"
                >
                  {t('orders.actionCancelOrder')}
                </button>
              )}

            </div>

          </div>

          <p className="text-[10px] text-slate-400 font-medium">
            {t('orders.whatsAppNotice')}
          </p>

        </div>

        {/* ============================================================== */}
        {/* REAL PERSISTED CHRONOLOGICAL TIMELINE */}
        {/* ============================================================== */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-xl border border-slate-200 dark:border-slate-700 space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-600" />
            Order Fulfillment Timeline History
          </h3>

          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-emerald-200 dark:before:bg-emerald-800">
            {order.timelineEvents?.map((evt: OrderTimelineEventItem) => (
              <div key={evt.id} className="relative flex items-start gap-3">
                <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-emerald-600 border-2 border-white dark:border-slate-800 shadow" />
                <div className="flex-1 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {getStatusLabel(evt.status as OrderStatus)}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(evt.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                    {evt.notes || `Order transitioned to ${evt.status}`}
                  </p>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold block mt-1">
                    By: {evt.actorName} ({evt.actorRole})
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>

      {/* Cancellation Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center gap-2 text-rose-600">
              <Ban className="w-6 h-6" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Cancel Order</h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Cancelling this order will release the commercial commitment quantity back to the produce lot inventory.
            </p>

            <form onSubmit={handleCancelOrder} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Cancellation Reason
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Weather disruption, transport delay..."
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  rows={3}
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow disabled:opacity-50"
                >
                  Confirm Cancellation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pickup Schedule Modal */}
      {isPickupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center gap-2 text-emerald-600">
              <Calendar className="w-6 h-6" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Schedule Pickup Details</h3>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleTransitionStatus('PICKUP_PLANNED', 'Pickup details scheduled', {
                  pickupPlannedDate: pickupDate,
                  pickupAddress: pickupAddress || order.pickupAddress,
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Target Pickup Date
                </label>
                <input
                  type="date"
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-bold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Pickup Location / Address
                </label>
                <input
                  type="text"
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  placeholder={`${order.publicVillage}, ${order.publicTaluka}`}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPickupModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow disabled:opacity-50"
                >
                  Save Pickup Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
