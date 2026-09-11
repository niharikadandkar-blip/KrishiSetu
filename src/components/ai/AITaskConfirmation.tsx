'use client';

import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, ShieldCheck } from 'lucide-react';

interface AITaskConfirmationProps {
  previewPayload: Record<string, any>;
  onConfirmed: (result: any) => void;
  onCancel: () => void;
}

export function AITaskConfirmation({
  previewPayload,
  onConfirmed,
  onCancel,
}: AITaskConfirmationProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/ai/agent/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          previewId: previewPayload.previewId,
          actionType: previewPayload.actionType,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Confirmation failed. State may have changed.');
        return;
      }

      onConfirmed(data);
    } catch (err: any) {
      setError(err.message || 'Network error during action confirmation');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-3xl p-5 space-y-4 text-slate-900 dark:text-slate-100 shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-sm">
          <ShieldCheck className="w-5 h-5 text-amber-600" />
          <span>Action Confirmation Required</span>
        </div>
        <span className="text-[10px] bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 px-2 py-0.5 rounded font-mono font-bold uppercase">
          {previewPayload.actionType}
        </span>
      </div>

      <p className="text-xs text-slate-600 dark:text-slate-300">
        Please review the proposed parameters below before executing this action:
      </p>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-xs space-y-2">
        {previewPayload.cropName && (
          <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
            <span className="text-slate-500">Crop:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{previewPayload.cropName}</span>
          </div>
        )}
        {previewPayload.quantityAvailable && (
          <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
            <span className="text-slate-500">Quantity:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {previewPayload.quantityAvailable} {previewPayload.unit || 'Quintal'}
            </span>
          </div>
        )}
        {previewPayload.askPricePerUnit && (
          <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
            <span className="text-slate-500">Ask Price:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              ₹{previewPayload.askPricePerUnit.toLocaleString('en-IN')} / Qtl
            </span>
          </div>
        )}
        {previewPayload.totalValue && (
          <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
            <span className="text-slate-500">Est. Total Value:</span>
            <span className="font-extrabold text-slate-900 dark:text-white">
              ₹{previewPayload.totalValue.toLocaleString('en-IN')}
            </span>
          </div>
        )}
        {previewPayload.district && (
          <div className="flex justify-between">
            <span className="text-slate-500">District:</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">{previewPayload.district}</span>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-100 border border-red-300 text-red-900 text-xs rounded-xl flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Confirmation Blocked</p>
            <p className="text-[11px]">{error}</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          onClick={onCancel}
          disabled={submitting}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={submitting}
          className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-colors flex items-center gap-1.5 disabled:opacity-50"
        >
          {submitting ? (
            <span>Executing...</span>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              <span>Confirm & Execute</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
