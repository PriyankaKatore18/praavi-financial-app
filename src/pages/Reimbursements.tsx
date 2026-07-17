/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { 
  Send, Plus, RefreshCw, Check, AlertTriangle, X, Landmark, Clock, ArrowRight
} from "lucide-react";
import { api } from "../services/api";
import { formatIndianCurrency } from "../domain/finance/calculations";
import { ReimbursementStatus } from "../types";

export default function Reimbursements() {
  const [claims, setClaims] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [isOpen, setIsOpen] = useState(false);
  const [spentAccount, setSpentAccount] = useState("");
  const [reimbursingAccount, setReimbursingAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Office Tea & Coffee");
  const [purpose, setPurpose] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchReimbursements = async () => {
    try {
      setLoading(true);
      setError(null);
      const [rRes, aRes] = await Promise.all([
        api.reimbursements.getAll(),
        api.accounts.getAll()
      ]);
      setClaims(rRes);
      setAccounts(aRes.filter(a => a.id.startsWith("ba-")));

      if (aRes.length > 0) {
        setSpentAccount(aRes[0].id);
        setReimbursingAccount(aRes.find(a => a.id.includes("current"))?.id || aRes[0].id);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load reimbursement claims list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReimbursements();
  }, []);

  const handleCreateClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0 || !purpose) {
      setCreateError("Please complete all required claim details.");
      return;
    }

    try {
      await api.reimbursements.create({
        date: new Date().toISOString().split("T")[0],
        spent_from_account_id: spentAccount,
        amount: Number(amount),
        category_note: category,
        reimbursed_by_account_id: reimbursingAccount || undefined,
        purpose,
        status: ReimbursementStatus.PENDING
      });

      setAmount("");
      setPurpose("");
      setIsOpen(false);
      fetchReimbursements();
    } catch (err: any) {
      setCreateError(err.message || "Failed to submit reimbursement claim.");
    }
  };

  const handleApproveSettle = async (id: string, corporateAccountId: string) => {
    try {
      await api.reimbursements.update(id, {
        status: ReimbursementStatus.REIMBURSED,
        reimbursed_by_account_id: corporateAccountId
      });
      fetchReimbursements();
    } catch (err: any) {
      alert("Failed to settle reimbursement claim: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reimbursements & Claims</h1>
          <p className="text-sm text-slate-500">Submit claims for personal office expenses and reconcile settling inter-bank compensations.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchReimbursements} 
            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-slate-800 shadow-sm"
          >
            <RefreshCw size={14} />
          </button>
          <button 
            onClick={() => setIsOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm"
          >
            <Plus size={14} />
            <span>Submit New Claim</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-64 bg-slate-100 rounded-xl animate-pulse" />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {claims.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm italic">
              No active reimbursement claims logged. Submit one using the actions panel.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="p-3 pl-4">Claim Date</th>
                    <th className="p-3">Expense Category</th>
                    <th className="p-3">Purpose / Voucher Note</th>
                    <th className="p-3 font-mono">Spent Account</th>
                    <th className="p-3 font-mono">Reimbursing Account</th>
                    <th className="p-3">Status Claim</th>
                    <th className="p-3 text-right">Amount (₹)</th>
                    <th className="p-3 text-center pr-4">Settle Claim</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                  {claims.map((r: any) => {
                    const isPending = r.status === ReimbursementStatus.PENDING;
                    return (
                      <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 pl-4 font-mono font-medium text-slate-500">{r.date}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 border border-slate-200">
                            {r.category_note}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-slate-800">{r.purpose}</td>
                        <td className="p-3 text-xs font-mono font-bold uppercase text-slate-500">{r.spent_from_account_id.replace("ba-", "")}</td>
                        <td className="p-3 text-xs font-mono font-bold uppercase text-slate-500">
                          {r.reimbursed_by_account_id ? r.reimbursed_by_account_id.replace("ba-", "") : "Not Settled"}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono border uppercase ${
                            isPending ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">{formatIndianCurrency(r.amount)}</td>
                        <td className="p-3 text-center pr-4">
                          {isPending ? (
                            <button
                              onClick={() => {
                                const corp = r.reimbursed_by_account_id || reimbursingAccount;
                                handleApproveSettle(r.id, corp);
                              }}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded shadow-xs"
                            >
                              Approve
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-mono font-bold uppercase">Settled</span>
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
      )}

      {/* Submit Claim Modal Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <div className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-6 z-50 animate-scale-up">
            <h2 className="text-lg font-bold text-slate-900 mb-2">Submit Reimbursement Claim</h2>
            <p className="text-xs text-slate-500 mb-4">Reimburse personal expenses spent on behalf of corporate operations.</p>

            {createError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-semibold mb-4 flex items-center gap-2">
                <AlertTriangle size={14} className="shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateClaim} className="space-y-4">
              {/* Spent From */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Spent Personal/Partner Account *</label>
                <select
                  value={spentAccount}
                  onChange={(e) => setSpentAccount(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 focus:outline-none"
                  required
                >
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              {/* Reimbursing corporate account */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Settling Corporate Account *</label>
                <select
                  value={reimbursingAccount}
                  onChange={(e) => setReimbursingAccount(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 focus:outline-none"
                  required
                >
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Expense Amount (₹) *</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 1850"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-850 font-mono font-bold focus:outline-none"
                  required
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Expense Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 focus:outline-none"
                  required
                >
                  <option value="Office Tea & Coffee">Office Tea & Coffee</option>
                  <option value="Server Cloud Hosting">Server Cloud Hosting</option>
                  <option value="Subscriptions & Softwares">Subscriptions & Softwares</option>
                  <option value="Stationery & Printouts">Stationery & Printouts</option>
                  <option value="Client Dinner Entertainment">Client Dinner Entertainment</option>
                  <option value="Travel Fuel Allowance">Travel Fuel Allowance</option>
                </select>
              </div>

              {/* Purpose */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Claim Purpose Details *</label>
                <input
                  type="text"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g. Purchased tea packets from local grocery store"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-850 focus:outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-850 hover:bg-slate-50 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded animate-pulse"
                >
                  Submit Claim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
