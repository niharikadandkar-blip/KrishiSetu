'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { SyncManager } from '@/components/offline/SyncManager';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { OrderItem, OrderStatus } from '@/lib/types/phase5';
import {
  ShoppingBag,
  Sprout,
  MapPin,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  AlertCircle,
  History,
  ArrowRight,
  Sparkles,
  FileText,
  Truck,
  Eye,
} from 'lucide-react';

export default function OrdersPage() {
  const { t } = useTranslation();

  const [user, setUser] = useState<any>({
    id: 'dev-user-farmer-1',
    name: 'रमेश पाटील (Ramesh Patil)',
    role: 'FARMER',
    mobileVerified: true,
    profileVerified: true,
  });

  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

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
    fetchOrders();
  }, [user.id, user.role, activeTab]);

  const fetchOrders = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/v1/orders?userId=${user.id}&role=${user.role}&statusCategory=${activeTab}`);
      const data = await res.json();
      if (data.success && data.orders) {
        setOrders(data.orders);
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status: OrderStatus) => {
    switch (status) {
      case 'ORDER_CREATED':
      case 'CONFIRMED':
        return 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300';
      case 'PICKUP_PLANNED':
      case 'READY_FOR_PICKUP':
      case 'PICKED_UP':
      case 'IN_TRANSIT':
      case 'DELIVERED':
      case 'RECEIPT_PENDING':
        return 'bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-300';
      case 'COMPLETED':
        return 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300';
      case 'CANCELLED':
        return 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-300';
      default:
        return 'bg-slate-100 text-slate-700';
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-amber-50 dark:from-slate-900 dark:via-slate-800 dark:to-emerald-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans">
      <Navbar />
      <SyncManager />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-2">
            <Truck className="w-3.5 h-3.5" />
            {user.role === 'FARMER' ? t('orders.farmerTitle') : t('orders.buyerTitle')}
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {user.role === 'FARMER' ? t('orders.farmerTitle') : t('orders.buyerTitle')}
          </h1>
          <p className="text-slate-600 dark:text-slate-300 mt-1 text-sm">
            {user.role === 'FARMER' ? t('orders.subFarmer') : t('orders.subBuyer')}
          </p>
        </div>

        {/* Status Message Banner */}
        {message && (
          <div
            className={`p-4 rounded-xl mb-6 border flex items-start gap-3 ${
              message.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-200'
                : 'bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/50 dark:border-rose-800 dark:text-rose-200'
            }`}
          >
            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />}
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        )}

        {/* Status Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none border-b border-slate-200 dark:border-slate-700/60">
          {[
            { id: 'ALL', label: t('orders.tabAll') },
            { id: 'ACTIVE', label: t('orders.tabActive') },
            { id: 'COMPLETED', label: t('orders.tabCompleted') },
            { id: 'CANCELLED', label: t('orders.tabCancelled') },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === tab.id
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Orders List Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Clock className="w-6 h-6 animate-spin mr-2" />
            <span className="text-sm font-medium">{t('common.loading')}</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-12 text-center border border-dashed border-slate-300 dark:border-slate-700 shadow-sm">
            <ShoppingBag className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              {t('orders.noOrders')}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Produce orders generated from accepted commitments will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white dark:bg-slate-800/90 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Row: Order Number & Status */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                        {order.orderNumber}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mt-1">
                        <Sprout className="w-4 h-4 text-emerald-600" />
                        {order.cropName} {order.variety && `(${order.variety})`}
                      </h3>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${getStatusBadgeClass(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                  </div>

                  {/* Order Details Grid */}
                  <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl mb-4 border border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="text-slate-500 block">Quantity</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {order.quantity} {order.unit}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block">{t('orders.agreedValueLabel')}</span>
                      <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                        ₹{order.agreedTotalValue.toLocaleString()}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block">Counterparty</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {user.role === 'FARMER' ? order.buyerName : order.farmerName}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block">Location</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-emerald-600" />
                        {order.publicVillage}, {order.publicDistrict}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-400">
                    Created {new Date(order.createdAt).toLocaleDateString()}
                  </span>

                  <Link
                    href={`/orders/${order.id}`}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow flex items-center gap-1.5 transition-all"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Deal Receipt</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
