/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { 
  Users, TrendingUp, AlertTriangle, Plus, Landmark, 
  Coins, Check, RefreshCw, Clock, ArrowRight, X, AlertCircle
} from "lucide-react";
import { api } from "../services/api";
import { formatIndianCurrency } from "../domain/finance/calculations";
import { ArrearsStatus, CostCategory } from "../types";

export default function SalaryPoolTracker() {
  const [data, setData] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [costBasis, setCostBasis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Settlement modal state
  const [settleItem, setSettleItem] = useState<any | null>(null);
  const [settleAccount, setSettleAccount] = useState("");
  const [settleError, setSettleError] = useState<string | null>(null);

  // Arrears request modal state
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [selectedCostBasis, setSelectedCostBasis] = useState("");
  const [arrearsAmount, setArrearsAmount] = useState("");
  const [requestNote, setRequestNote] = useState("");
  const [requestError, setRequestError] = useState<string | null>(null);

  // Person-wise outstanding editor modal state
  const [isOwedOpen, setIsOwedOpen] = useState(false);
  const [owedCostBasis, setOwedCostBasis] = useState("");
  const [owedAmount, setOwedAmount] = useState("");
  const [owedNote, setOwedNote] = useState("");
  const [owedError, setOwedError] = useState<string | null>(null);

  const fetchTrackerData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [pRes, aRes, cRes] = await Promise.all([
        api.salaryPool.getData(),
        api.accounts.getAll(),
        api.costBasis.getAll()
      ]);
      setData(pRes);
      setAccounts(aRes.filter(a => a.id.startsWith("ba-")));
      const employeeCostBasis = cRes.filter(c => c.category === CostCategory.TEAM_WEBDEV || c.category === CostCategory.TEAM_DM || c.category === CostCategory.MANAGEMENT);
      setCostBasis(employeeCostBasis);
      
      if (employeeCostBasis.length > 0) {
        setSelectedCostBasis(employeeCostBasis[0].id);
        setOwedCostBasis(employeeCostBasis[0].id);
      }
      if (aRes.length > 0) {
        setSettleAccount(aRes[0].id);
      }
    } catch (err: any) {
      setError(err.message || "Failed to retrieve salary pool and arrears datasets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrackerData();
  }, []);

  const handleCreateArrearsRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequestError(null);

    const cb = costBasis.find(c => c.id === selectedCostBasis);
    if (!cb || !arrearsAmount || isNaN(Number(arrearsAmount))) {
      setRequestError("Please fill out all required fields.");
      return;
    }

    try {
      await api.salaryPool.addArrearsEntry({
        employee_name: cb.name,
        employee_cost_basis_id: cb.id,
        amount_owed: Number(arrearsAmount),
        entry_date: new Date().toISOString().split("T")[0],
        note: requestNote
      });

      setArrearsAmount("");
      setRequestNote("");
      setIsRequestOpen(false);
      fetchTrackerData();
    } catch (err: any) {
      setRequestError(err.message || "Failed to log arrears request.");
    }
  };

  const handleUpdatePersonOwed = async (e: React.FormEvent) => {
    e.preventDefault();
    setOwedError(null);

    const cb = costBasis.find(c => c.id === owedCostBasis);
    if (!cb || owedAmount === "") {
      setOwedError("Please fill out all required fields.");
      return;
    }

    try {
      await api.salaryPool.addPersonOwed({
        employee_name: cb.name,
        employee_cost_basis_id: cb.id,
        amount_owed: Number(owedAmount),
        note: owedNote
      });

      setOwedAmount("");
      setOwedNote("");
      setIsOwedOpen(false);
      fetchTrackerData();
    } catch (err: any) {
      setOwedError(err.message || "Failed to update outstanding arrears.");
    }
  };

  const handleSettleArrears = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettleError(null);

    if (!settleItem || !settleAccount) {
      setSettleError("Please select a source payment account.");
      return;
    }

    try {
      await api.salaryPool.updateArrearsStatus(settleItem.id, ArrearsStatus.PAID, settleAccount);
      setSettleItem(null);
      fetchTrackerData();
    } catch (err: any) {
      setSettleError(err.message || "Failed to settle arrears.");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-slate-200 rounded-xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center max-w-lg mx-auto mt-12">
        <AlertCircle className="mx-auto text-rose-500 mb-3" size={40} />
        <h3 className="font-bold text-slate-900">Failed to Load Arrears</h3>
        <p className="text-sm text-slate-600 mt-1 mb-4">{error}</p>
        <button onClick={fetchTrackerData} className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-semibold hover:bg-rose-505">
          Retry
        </button>
      </div>
    );
  }

  const { summary, arrears, person_owed } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Salary Pool & Arrears</h1>
          <p className="text-sm text-slate-500">Track cumulative allocation inflows, outstanding arrears debts, and chronological settlements.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsOwedOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 shadow-sm"
          >
            <Plus size={14} />
            <span>Edit Person Outstanding</span>
          </button>
          <button 
            onClick={() => setIsRequestOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm"
          >
            <Plus size={14} />
            <span>Create Arrears Request</span>
          </button>
        </div>
      </div>

      {/* Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Cumulative Inflow */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Cumulative Inflow Allocations</span>
          <h3 className="text-xl font-bold text-slate-900 mt-2">{formatIndianCurrency(summary.cumulative_inflow)}</h3>
          <p className="text-[10px] text-slate-400 mt-1">Sum of active distributions landed in SBI / Axis.</p>
        </div>

        {/* Cumulative Outflow */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Cumulative Outflows (Disbursed)</span>
          <h3 className="text-xl font-bold text-slate-900 mt-2">{formatIndianCurrency(summary.cumulative_outflow)}</h3>
          <p className="text-[10px] text-slate-400 mt-1">Paid payrolls and paid arrears ledger items.</p>
        </div>

        {/* Available Pool */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Available Pool Balance</span>
          <h3 className="text-xl font-bold text-teal-600 mt-2">{formatIndianCurrency(summary.available_pool)}</h3>
          <p className="text-[10px] text-slate-400 mt-1">Liquid bookkeeping cash ready to pay contractor salaries.</p>
        </div>
      </div>

      {/* Row 2: Person-wise Outstanding Arrears */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="text-slate-600" size={16} />
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Person-wise Cumulative Arrears Outstanding</h3>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Arrears accumulate across invoices & do not reset monthly</span>
        </div>
        {person_owed.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm italic">
            Prism clean state! No active arrears outstanding across all 20 team members.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-3 pl-4">Contractor/Employee Name</th>
                  <th className="p-3">Cost Basis Mapping</th>
                  <th className="p-3">Reference Note</th>
                  <th className="p-3 text-right pr-6">Outstanding Debt (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                {person_owed.map((owed: any) => (
                  <tr key={owed.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 pl-4 font-semibold text-slate-800">{owed.employee_name}</td>
                    <td className="p-3 text-xs font-semibold text-slate-500 uppercase font-mono">{owed.employee_cost_basis_id.substring(0, 12)}...</td>
                    <td className="p-3 text-xs font-semibold text-slate-500">{owed.note || "No reference tag."}</td>
                    <td className="p-3 text-right pr-6 font-mono font-bold text-slate-900">
                      {formatIndianCurrency(owed.amount_owed)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Row 3: Arrears Ledger */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
          <Coins className="text-teal-600" size={16} />
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Arrears Request Log & Settlement</h3>
        </div>
        {arrears.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm italic">
            No arrears ledger entries logged.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-3 pl-4">Request Date</th>
                  <th className="p-3">Contractor Name</th>
                  <th className="p-3">State Status</th>
                  <th className="p-3 font-mono">Paid Date</th>
                  <th className="p-3 font-mono">Paid From</th>
                  <th className="p-3 text-right">Settlement Amount</th>
                  <th className="p-3 text-center pr-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                {arrears.map((item: any) => {
                  const isPending = item.status === ArrearsStatus.PENDING;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 pl-4 font-mono font-medium text-slate-500">{item.entry_date}</td>
                      <td className="p-3 font-semibold text-slate-800">{item.employee_name}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono border uppercase ${
                          isPending ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-xs">{item.date_paid ? item.date_paid.substring(0, 10) : "-"}</td>
                      <td className="p-3 text-xs font-mono font-bold uppercase">{item.paid_from_account_id ? item.paid_from_account_id.replace("ba-", "") : "-"}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">{formatIndianCurrency(item.amount_owed)}</td>
                      <td className="p-3 text-center pr-4">
                        {isPending ? (
                          <button
                            onClick={() => {
                              setSettleItem(item);
                            }}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded shadow-xs"
                          >
                            Release
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-mono font-bold uppercase">Settled</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Settlement account selector modal */}
      {settleItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSettleItem(null)} />
          <div className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-6 z-50">
            <h2 className="text-lg font-bold text-slate-900 mb-2">Release Arrears Payment</h2>
            <p className="text-xs text-slate-500 mb-4">Select the payment account to disburse <span className="font-bold text-slate-800">{formatIndianCurrency(settleItem.amount_owed)}</span> to <span className="font-bold text-slate-800">{settleItem.employee_name}</span>.</p>

            {settleError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-semibold mb-4">
                {settleError}
              </div>
            )}

            <form onSubmit={handleSettleArrears} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Source Bank Account *
                </label>
                <select
                  value={settleAccount}
                  onChange={(e) => setSettleAccount(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none"
                  required
                >
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name} (Computed balance: {formatIndianCurrency(a.sheet_balance)})</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSettleItem(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded"
                >
                  Approve Disbursement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Arrears Request Modal */}
      {isRequestOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsRequestOpen(false)} />
          <div className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-6 z-50">
            <h2 className="text-lg font-bold text-slate-900 mb-2">Log Arrears Claim Request</h2>
            <p className="text-xs text-slate-500 mb-4">Creates a pending request ledger line for contractor arrears settlements.</p>

            {requestError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-semibold mb-4">
                {requestError}
              </div>
            )}

            <form onSubmit={handleCreateArrearsRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Contractor/Employee *
                </label>
                <select
                  value={selectedCostBasis}
                  onChange={(e) => setSelectedCostBasis(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none"
                  required
                >
                  {costBasis.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.category.toUpperCase().replace("TEAM_", "").replace("_", " ")})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Arrears Amount (₹) *
                </label>
                <input
                  type="number"
                  value={arrearsAmount}
                  onChange={(e) => setArrearsAmount(e.target.value)}
                  placeholder="e.g. 15000"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-850 font-mono font-bold focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Reason Note
                </label>
                <input
                  type="text"
                  value={requestNote}
                  onChange={(e) => setRequestNote(e.target.value)}
                  placeholder="e.g. June unpaid split invoice"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-850 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRequestOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-850 hover:bg-slate-50 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded"
                >
                  Log Claim Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Person Outstanding Modal */}
      {isOwedOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsOwedOpen(false)} />
          <div className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-6 z-50">
            <h2 className="text-lg font-bold text-slate-900 mb-2">Edit Person Cumulative Outstanding</h2>
            <p className="text-xs text-slate-500 mb-4">Overwrite or establish the starting cumulative debt for an employee. Outstanding balances accumulate across client invoices and do not reset.</p>

            {owedError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-semibold mb-4">
                {owedError}
              </div>
            )}

            <form onSubmit={handleUpdatePersonOwed} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Contractor/Employee *
                </label>
                <select
                  value={owedCostBasis}
                  onChange={(e) => setOwedCostBasis(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none"
                  required
                >
                  {costBasis.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Cumulative Debt Amount (₹) *
                </label>
                <input
                  type="number"
                  value={owedAmount}
                  onChange={(e) => setOwedAmount(e.target.value)}
                  placeholder="e.g. 24000"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-850 font-mono font-bold focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Reference Note
                </label>
                <input
                  type="text"
                  value={owedNote}
                  onChange={(e) => setOwedNote(e.target.value)}
                  placeholder="e.g. Starting outstanding balance from Excel"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-850 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOwedOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-850 hover:bg-slate-50 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded"
                >
                  Update Debt Balance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
