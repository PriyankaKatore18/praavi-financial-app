/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { 
  DollarSign, TrendingUp, AlertTriangle, ArrowRight, ShieldCheck, 
  HelpCircle, ChevronRight, PieChart, Landmark, Clock, RefreshCw, Plus
} from "lucide-react";
import { api } from "../services/api";
import { formatIndianCurrency } from "../domain/finance/calculations";
import AddPaymentModal from "../components/AddPaymentModal";

interface DashboardProps {
  setActivePage: (page: string) => void;
  setSelectedId?: (id: string) => void;
}

export default function Dashboard({ setActivePage, setSelectedId }: DashboardProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.dashboard.getSummary();
      setData(res);
    } catch (err: any) {
      setError(err.message || "Failed to fetch dashboard statistics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/4" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-64 bg-slate-200 rounded-xl md:col-span-2" />
          <div className="h-64 bg-slate-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center max-w-lg mx-auto mt-12">
        <AlertTriangle className="mx-auto text-rose-500 mb-3" size={40} />
        <h3 className="font-bold text-slate-900">Failed to Load Dashboard</h3>
        <p className="text-sm text-slate-600 mt-1 mb-4">{error || "Please verify server is listening."}</p>
        <button onClick={fetchDashboard} className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-semibold hover:bg-rose-500">
          Retry Connection
        </button>
      </div>
    );
  }

  const { quick_stats, monthly_trend, bank_accounts, marketing_cards, recent_payments, pending_transfers } = data;

  const totalRevenue = quick_stats.webdev_revenue + quick_stats.dm_revenue;
  const webdevPct = totalRevenue > 0 ? Math.round((quick_stats.webdev_revenue / totalRevenue) * 100) : 0;
  const dmPct = totalRevenue > 0 ? 100 - webdevPct : 0;

  // Find max monthly trend amount to scale custom SVG bar height
  const maxTrendVal = monthly_trend.length > 0 ? Math.max(...monthly_trend.map((t: any) => t.amount)) : 1;

  return (
    <div className="space-y-6">
      {/* Top Welcome Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Financial Command Centre</h1>
          <p className="text-sm text-slate-500">Consolidated financial records & real-time accounts mapping.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button 
            onClick={() => setIsAddPaymentOpen(true)} 
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 border border-emerald-700 rounded-lg text-xs font-bold text-white hover:bg-emerald-500 shadow-sm transition-all"
          >
            <Plus size={12} />
            <span>Log Client Payment</span>
          </button>
          <button 
            onClick={fetchDashboard} 
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 shadow-sm transition-all"
          >
            <RefreshCw size={12} />
            <span>Sync Live Balances</span>
          </button>
        </div>
      </div>

      {/* Warning on non-zero Account Variances */}
      {quick_stats.account_variance_total > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm flex items-start gap-3 shadow-sm">
          <AlertTriangle className="text-amber-600 mt-0.5 shrink-0" size={18} />
          <div className="flex-1">
            <span className="font-bold">Account Variance Detected!</span>
            <span className="ml-1">
              There is an active discrepancy of <span className="font-semibold">{formatIndianCurrency(quick_stats.account_variance_total)}</span> between the computed sheet balances and physical actual balances. Please perform bank reconciliation.
            </span>
          </div>
          <button 
            onClick={() => setActivePage("accounts")} 
            className="text-xs font-bold text-amber-700 hover:text-amber-900 shrink-0"
          >
            Reconcile Accounts →
          </button>
        </div>
      )}

      {/* Bento Grid: Core Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Core Stat 1: Total Revenue */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Received Revenue</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600"><TrendingUp size={16} /></span>
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-bold text-slate-900">{formatIndianCurrency(totalRevenue)}</h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Payments: <span className="font-semibold text-slate-600">{quick_stats.total_payments_count}</span> rows
            </p>
          </div>
        </div>

        {/* Core Stat 2: Salary Pool Available */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Available Salary Pool</span>
            <span className="p-1.5 rounded-lg bg-teal-50 text-teal-600"><Clock size={16} /></span>
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-bold text-slate-900">{formatIndianCurrency(quick_stats.available_salary_pool)}</h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Unspent available salary ledger cash.
            </p>
          </div>
        </div>

        {/* Core Stat 3: GST Liability */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">GST Liability</span>
            <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600"><AlertTriangle size={16} /></span>
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-bold text-slate-900">{formatIndianCurrency(quick_stats.gst_liability)}</h3>
            <p className="text-[11px] text-slate-400 mt-1">
              18% GST collected on Current accounts.
            </p>
          </div>
        </div>

        {/* Core Stat 4: Bank Ledger Total */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Computed Bank Balance</span>
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600"><Landmark size={16} /></span>
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-bold text-slate-900">{formatIndianCurrency(quick_stats.bank_balance_total)}</h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Across 6 verified bank accounts.
            </p>
          </div>
        </div>
      </div>

      {/* Split Charts & Snapshots */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Card: Monthly trend */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-2">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Monthly Inflow Revenue Trend</h3>
          {monthly_trend.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm italic">
              No historical data available yet. Please add a client payment.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Custom SVG Bar Chart */}
              <div className="h-44 w-full flex items-end justify-between gap-6 pt-6 px-2">
                {monthly_trend.map((t: any) => {
                  const barHeight = Math.max(10, Math.round((t.amount / maxTrendVal) * 120));
                  return (
                    <div key={t.month} className="flex-1 flex flex-col items-center group relative">
                      {/* Hover Tooltip */}
                      <div className="absolute -top-8 scale-0 group-hover:scale-100 bg-slate-950 text-slate-200 px-2 py-1 text-[10px] rounded font-mono z-20 shadow-lg whitespace-nowrap transition-all">
                        {formatIndianCurrency(t.amount)}
                      </div>
                      <div 
                        style={{ height: `${barHeight}px` }} 
                        className="w-full bg-emerald-500 hover:bg-emerald-400 rounded-t transition-all cursor-pointer relative shadow-sm"
                      />
                      <span className="text-[10px] font-mono text-slate-400 mt-2 whitespace-nowrap">
                        {t.month}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Card: Contributions */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Department Contributions</h3>
            <div className="space-y-5">
              {/* Pie/Ratio bar */}
              <div className="w-full h-4 rounded-full bg-slate-100 overflow-hidden flex">
                <div style={{ width: `${webdevPct}%` }} className="bg-emerald-500 h-full" title={`Web Dev: ${webdevPct}%`} />
                <div style={{ width: `${dmPct}%` }} className="bg-blue-500 h-full" title={`Digital Marketing: ${dmPct}%`} />
              </div>

              {/* Legend with values */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-slate-600 font-medium">Web Development</span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-slate-800">{formatIndianCurrency(quick_stats.webdev_revenue)}</span>
                    <span className="text-slate-400 font-mono ml-1.5">({webdevPct}%)</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-blue-500 shrink-0" />
                    <span className="text-slate-600 font-medium">Digital Marketing</span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-slate-800">{formatIndianCurrency(quick_stats.dm_revenue)}</span>
                    <span className="text-slate-400 font-mono ml-1.5">({dmPct}%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 mt-4">
            <span>Total allocated profits:</span>
            <span className="font-bold text-slate-700">{formatIndianCurrency(quick_stats.total_profit_allocated)}</span>
          </div>
        </div>
      </div>

      {/* Bank snapshot & transfers list */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Accounts snapshot */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Bank Accounts Balance Snapshots</h3>
            <button onClick={() => setActivePage("accounts")} className="text-xs font-semibold text-emerald-600 hover:text-emerald-500">
              Manage Balances →
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {bank_accounts.map((acc: any) => (
              <div key={acc.id} className="p-3 px-4 flex items-center justify-between text-sm hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-2.5">
                  <span className={`h-2 w-2 rounded-full ${acc.is_active ? "bg-emerald-500" : "bg-slate-300"}`} />
                  <span className="font-medium text-slate-700">{acc.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-slate-900 font-bold">{formatIndianCurrency(acc.sheet_balance || 0)}</span>
                  {acc.variance !== 0 ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-100 text-amber-800 border border-amber-200 font-semibold" title="Reconciliation Discrepancy">
                      Discrepancy: {formatIndianCurrency(acc.variance)}
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold">
                      Matched
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Pending allocations */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Pending Distribution Transfers</h3>
              <button onClick={() => setActivePage("transfers")} className="text-xs font-semibold text-emerald-600 hover:text-emerald-500">
                Execute Transfers →
              </button>
            </div>
            {pending_transfers.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm italic">
                All client payment allocations have been completely routed. No pending transfers.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {pending_transfers.map((t: any) => (
                  <div key={t.id} className="p-3 px-4 flex items-center justify-between text-sm hover:bg-slate-50 transition-colors">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-800">{t.transfer_type.toUpperCase().replace("_", " ")}</span>
                      <span className="text-[10px] text-slate-400">Source: {t.source_account_id.replace("ba-", "").toUpperCase()}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-slate-900">{formatIndianCurrency(t.amount)}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 border border-amber-200">
                        Pending
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="p-4 bg-slate-50 border-t border-slate-100 text-center text-xs text-slate-500 font-mono">
            Requires accountant/admin approval to release.
          </div>
        </div>
      </div>

      <AddPaymentModal 
        isOpen={isAddPaymentOpen} 
        onClose={() => setIsAddPaymentOpen(false)} 
        onSuccess={fetchDashboard} 
      />
    </div>
  );
}
