'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { ShieldAlert, CheckCircle2, XCircle, AlertCircle, Clock, Filter, Send } from 'lucide-react';

export default function AdminReportsPage() {
  const { t } = useTranslation();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [newStatus, setNewStatus] = useState<string>('UNDER_REVIEW');
  const [moderationNote, setModerationNote] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (statusFilter) query.set('status', statusFilter);
      if (categoryFilter) query.set('category', categoryFilter);

      const res = await fetch(`/api/v1/admin/reports?${query.toString()}`);
      const data = await res.json();
      if (data.success) {
        setReports(data.reports);
      }
    } catch (err) {
      console.error('Fetch admin reports error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [statusFilter, categoryFilter]);

  const handleUpdateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport) return;

    setSubmitting(true);
    setActionSuccess(false);

    try {
      const res = await fetch(`/api/v1/admin/reports/${selectedReport.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          moderationNote,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setActionSuccess(true);
        setModerationNote('');
        setSelectedReport(null);
        fetchReports();
      }
    } catch (err) {
      console.error('Update report error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">OPEN</span>;
      case 'UNDER_REVIEW':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">UNDER REVIEW</span>;
      case 'RESOLVED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">RESOLVED</span>;
      case 'DISMISSED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-stone-200 text-stone-700 border border-stone-300">DISMISSED</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-600">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col font-sans">
      <Navbar userSession={{ role: 'ADMIN', name: 'System Admin', mobileVerified: true, profileVerified: true }} />

      <main className="flex-1 max-w-6xl mx-auto w-full p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-stone-900 flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-red-600" />
              {t('reports.adminTitle')}
            </h1>
            <p className="text-xs text-stone-500">{t('reports.adminSubtitle')}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-stone-300 text-xs font-semibold bg-stone-50 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="OPEN">OPEN</option>
              <option value="UNDER_REVIEW">UNDER REVIEW</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="DISMISSED">DISMISSED</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-stone-300 text-xs font-semibold bg-stone-50 focus:outline-none"
            >
              <option value="">All Categories</option>
              <option value="NON_PAYMENT">Non-Payment</option>
              <option value="NON_DELIVERY">Non-Delivery</option>
              <option value="QUALITY_MISMATCH">Quality Mismatch</option>
              <option value="FRAUD">Fraud</option>
              <option value="UNPROFESSIONAL_BEHAVIOR">Unprofessional Behavior</option>
              <option value="HARASSMENT">Harassment</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs font-bold text-stone-400">Loading safety reports...</div>
        ) : reports.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-stone-200">
            <p className="text-sm font-semibold text-stone-500">{t('reports.noReports')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {reports.map((report) => (
                <div
                  key={report.id}
                  onClick={() => {
                    setSelectedReport(report);
                    setNewStatus(report.status);
                  }}
                  className={`bg-white rounded-2xl p-5 border cursor-pointer transition-all shadow-sm ${
                    selectedReport?.id === report.id ? 'border-emerald-600 ring-2 ring-emerald-500/20' : 'border-stone-200 hover:border-stone-400'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-stone-100 text-stone-700 uppercase tracking-wide">
                        {report.category}
                      </span>
                      <h3 className="text-sm font-bold text-stone-900 mt-1">Report #{report.id.substring(0, 8)}</h3>
                    </div>
                    {getStatusBadge(report.status)}
                  </div>

                  <p className="text-xs text-stone-700 font-medium line-clamp-2 my-2">{report.description}</p>

                  <div className="flex flex-wrap items-center justify-between text-[11px] text-stone-400 border-t border-stone-100 pt-2 font-medium">
                    <span>Filed by: <strong>{report.reporterName || 'User'}</strong></span>
                    <span>{new Date(report.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Selected Report Action & Details Panel */}
            <div className="bg-white rounded-2xl p-6 border border-stone-200 space-y-4 h-fit sticky top-6">
              {selectedReport ? (
                <>
                  <h2 className="text-base font-bold text-stone-900 border-b border-stone-100 pb-2">
                    Manage Case #{selectedReport.id.substring(0, 8)}
                  </h2>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-stone-400 block">Category:</span>
                      <strong className="text-stone-800">{selectedReport.category}</strong>
                    </div>
                    <div>
                      <span className="text-stone-400 block">Full Description:</span>
                      <p className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-stone-800 text-xs font-medium">
                        {selectedReport.description}
                      </p>
                    </div>
                  </div>

                  {/* Moderation Notes History */}
                  <div className="space-y-2 pt-2 border-t border-stone-100">
                    <h3 className="text-xs font-bold text-stone-700">Moderation History ({selectedReport.moderationNotes?.length || 0})</h3>
                    <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                      {selectedReport.moderationNotes?.map((m: any) => (
                        <div key={m.id} className="p-2.5 rounded-lg bg-stone-50 text-[11px] border border-stone-200">
                          <span className="font-bold text-stone-800">{m.reviewerName || 'Admin'}:</span> {m.note}
                          <span className="block text-[9px] text-stone-400 mt-1">{new Date(m.createdAt).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Form */}
                  <form onSubmit={handleUpdateReport} className="space-y-3 pt-2 border-t border-stone-100">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">Update Status</label>
                      <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-medium focus:ring-2 focus:ring-emerald-600"
                      >
                        <option value="OPEN">OPEN</option>
                        <option value="UNDER_REVIEW">UNDER REVIEW</option>
                        <option value="RESOLVED">RESOLVED</option>
                        <option value="DISMISSED">DISMISSED</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">{t('reports.moderationNoteLabel')}</label>
                      <textarea
                        rows={3}
                        value={moderationNote}
                        onChange={(e) => setModerationNote(e.target.value)}
                        placeholder="Add internal moderation note or decision rationale..."
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-medium focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-3 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      <span>{submitting ? 'Updating...' : t('reports.updateStatusBtn')}</span>
                    </button>
                  </form>
                </>
              ) : (
                <div className="text-center py-8 text-xs font-medium text-stone-400">
                  Select a safety report from the list to manage and update.
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
