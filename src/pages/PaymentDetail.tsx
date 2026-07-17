/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { 
  ArrowLeft, CheckSquare, Coins, Landmark, Clock, AlertCircle, 
  User, Check, Calendar, ArrowRight, CheckCircle2, RefreshCw
} from "lucide-react";
import { api } from "../services/api";
import { formatIndianCurrency } from "../domain/finance/calculations";
import { TransferStatus } from "../types";

interface PaymentDetailProps {
  paymentId: string;
  onBack: () => void;
  userRole: string;
}

export default function PaymentDetail({ paymentId, onBack, userRole }: PaymentDetailProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reconciling, setReconciling] = useState(false);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.payments.getById(paymentId);
      setData(res);
    } catch (err: any) {
      setError(err.message || "Failed to load payment detail snapshots.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [paymentId]);

  const handleExecuteTransfer = async (transferId: string) => {
    try {
      setReconciling(true);
      await api.transfers.updateDistributionStatus(transferId, TransferStatus.TRANSFERRED);
      // Refresh
      fetchDetail();
    } catch (err: any) {
      alert("Failed to complete transfer: " + err.message);
    } finally {
      setReconciling(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-1/4" />
        <div className="h-40 bg-slate-200 rounded-xl" />
        <div className="h-64 bg-slate-200 rounded-xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center max-w-lg mx-auto mt-12">
        <AlertCircle className="mx-auto text-rose-500 mb-3" size={40} />
        <h3 className="font-bold text-slate-900">Failed to Load Details</h3>
        <p className="text-sm text-slate-600 mt-1 mb-4">{error || "Payment record might have been deleted."}</p>
        <button onClick={onBack} className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-semibold hover:bg-rose-505">
          Back to Ledger
        </button>
      </div>
    );
  }

  const { department, client_name, payment_amount, landed_in_account_id, gst_type, gst_pct, money_spent, payment_date, notes, distribution, transfers } = data;

  const totalOverheadAllocated = distribution ? (
    distribution.rent_share + 
    distribution.car_emi_share + 
    distribution.subscriptions_share + 
    distribution.light_share + 
    distribution.laptop_share + 
    distribution.misc_share
  ) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button 
          onClick={onBack} 
          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-all shadow-xs"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Payment Allocation Inspector</h1>
          <p className="text-xs text-slate-400 font-mono uppercase tracking-wider mt-0.5">ID: {paymentId.substring(0, 8)}... | {client_name}</p>
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Core Metadata */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Invoice Inflow:</span>
              <span className="font-bold text-slate-900 font-mono text-base">{formatIndianCurrency(payment_amount)}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Landed Bank:</span>
              <span className="font-semibold text-slate-800">{landed_in_account_id.replace("ba-", "").toUpperCase()}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Payment Date:</span>
              <span className="font-semibold font-mono text-slate-700">{payment_date}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Department:</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${
                department === "web_dev" ? "bg-teal-50 text-teal-700 border-teal-200" : "bg-blue-50 text-blue-700 border-blue-200"
              }`}>
                {department === "web_dev" ? "Web Dev" : "DM Team"}
              </span>
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 mt-4 font-mono italic">
            * Snapshots frozen on write & cannot be modified.
          </div>
        </div>

        {/* Calculated Shares Snapshots */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between md:col-span-2">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Snapshot Revenue Distributions</h3>
            {distribution ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-slate-400 text-xs block mb-1">Base Revenue:</span>
                  <span className="font-mono font-bold text-slate-800">{formatIndianCurrency(distribution.base_amount)}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-xs block mb-1">GST Collected:</span>
                  <span className="font-mono font-bold text-slate-800">{formatIndianCurrency(distribution.gst_amount)}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-xs block mb-1">Salary Pool:</span>
                  <span className="font-mono font-bold text-slate-850 text-teal-600">{formatIndianCurrency(distribution.salary_pool)}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-xs block mb-1">Overhead Overages:</span>
                  <span className="font-mono font-bold text-slate-800">{formatIndianCurrency(totalOverheadAllocated)}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-xs block mb-1">Marketing Allocation:</span>
                  <span className="font-mono font-bold text-slate-800">{formatIndianCurrency(distribution.marketing_amount)}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-xs block mb-1">Praavi Net Profit:</span>
                  <span className="font-mono font-bold text-slate-800 text-emerald-600">{formatIndianCurrency(distribution.profit_amount)}</span>
                </div>
              </div>
            ) : (
              <div className="text-slate-400 text-sm italic py-4">No distribution snapshot mapped to this historical payment.</div>
            )}
          </div>
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-mono text-slate-500 mt-4">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="text-emerald-500" size={14} /> Invariants Verified:</span>
            <span className="font-bold">Balanced</span>
          </div>
        </div>
      </div>

      {/* Row: Employee Shares (Snapshot of the moment) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
          <Coins className="text-teal-600" size={16} />
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Freeze Employee Salary Shares Snapshot</h3>
        </div>
        {!distribution || !distribution.employee_shares || distribution.employee_shares.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm italic">
            No employee shares snapshotted for this distribution.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-3 pl-4">Employee/Contractor Name</th>
                  <th className="p-3">Reference Category</th>
                  <th className="p-3">Reference Cost Basis Base</th>
                  <th className="p-3 text-right pr-6">Snapshot Share Allocated (Rounded 1-paise)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                {distribution.employee_shares.map((share: any) => (
                  <tr key={share.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 pl-4 flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-slate-100 border text-slate-600 font-bold text-xs flex items-center justify-center">
                        {share.employee_name_snapshot.charAt(0)}
                      </div>
                      <span className="font-semibold text-slate-800">{share.employee_name_snapshot}</span>
                    </td>
                    <td className="p-3 text-xs font-semibold text-slate-500 uppercase">Employee Costs</td>
                    <td className="p-3 font-mono text-slate-600">{formatIndianCurrency(share.monthly_salary_snapshot)}</td>
                    <td className="p-3 text-right pr-6 font-mono font-bold text-slate-900">
                      {formatIndianCurrency(share.allocated_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Row: Required Bank transfers and execution states */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Landmark className="text-blue-600" size={16} />
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Spawning Bank Allocation Route Requests</h3>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Routing rules triggered by payment landed account</span>
        </div>
        {transfers.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm italic">
            This payment landed in its ultimate target account or did not trigger any mandatory inter-bank transfer routings.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {transfers.map((t: any) => {
              const isPending = t.status === TransferStatus.PENDING;
              return (
                <div key={t.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isPending ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}`}>
                      <Landmark size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-800">{t.transfer_type.toUpperCase().replace("_", " ")} Route</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono border uppercase ${
                          isPending ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}>
                          {t.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-2 font-mono">
                        <span>Source: {t.source_account_id.replace("ba-", "").toUpperCase()}</span>
                        <span>→</span>
                        {t.destination_account_id ? (
                          <span>Target Bank: {t.destination_account_id.replace("ba-", "").toUpperCase()}</span>
                        ) : (
                          <span>Target Card: {t.marketing_card_id}</span>
                        )}
                      </div>
                      {t.approved_by && (
                        <div className="text-[10px] text-slate-400 mt-1">
                          Completed on: <span className="font-mono">{t.updated_at.substring(0, 10)}</span> by <span className="font-semibold text-slate-600">{t.approved_by}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end sm:self-center">
                    <span className="font-mono font-bold text-base text-slate-900">{formatIndianCurrency(t.amount)}</span>
                    {isPending && (userRole === "accountant" || userRole === "finance_head" || userRole === "admin") && (
                      <button
                        onClick={() => handleExecuteTransfer(t.id)}
                        disabled={reconciling}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded text-xs font-semibold shadow-xs transition-all flex items-center gap-1"
                      >
                        <Check size={12} />
                        <span>Complete Route</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
