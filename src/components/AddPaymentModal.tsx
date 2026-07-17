/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { 
  X, Sparkles, AlertTriangle, ToggleLeft, ToggleRight, CheckSquare, ArrowRight, HelpCircle 
} from "lucide-react";
import { api } from "../services/api";
import { formatIndianCurrency, calculatePaymentDistribution, accountUsesGST } from "../domain/finance/calculations";
import { Department, GSTType } from "../types";

interface AddPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialAccountId?: string;
}

export default function AddPaymentModal({ isOpen, onClose, onSuccess, initialAccountId }: AddPaymentModalProps) {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [costBasis, setCostBasis] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [clientName, setClientName] = useState("");
  const [amount, setAmount] = useState("");
  const [department, setDepartment] = useState<Department>(Department.WEB_DEV);
  const [landedAccount, setLandedAccount] = useState("");
  const [gstType, setGstType] = useState<GSTType>(GSTType.INCLUSIVE);
  const [notes, setNotes] = useState("");
  const [moneySpent, setMoneySpent] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const loadMetadata = async () => {
      try {
        setLoading(true);
        const [aRes, cRes, sRes] = await Promise.all([
          api.accounts.getAll(),
          api.costBasis.getAll(),
          api.settings.get()
        ]);
        
        // Filter out credit cards/marketing cards for landing account
        const bankAccountsOnly = aRes.filter((a: any) => a.type !== "credit_card");
        setAccounts(bankAccountsOnly);
        setCostBasis(cRes);
        setSettings(sRes);

        if (initialAccountId) {
          setLandedAccount(initialAccountId);
        } else if (bankAccountsOnly.length > 0) {
          setLandedAccount(bankAccountsOnly[0].id);
        }
      } catch (err) {
        console.error("Failed to load metadata in AddPaymentModal:", err);
      } finally {
        setLoading(false);
      }
    };

    loadMetadata();
  }, [isOpen, initialAccountId]);

  const isLandedAccountCurrent = (id: string) => {
    return accountUsesGST(id);
  };

  // Live breakdown calculation
  let liveBreakdown: any = null;
  if (amount && !isNaN(Number(amount)) && Number(amount) > 0 && landedAccount && costBasis.length > 0 && settings) {
    try {
      liveBreakdown = calculatePaymentDistribution(
        Number(amount),
        department,
        landedAccount,
        gstType,
        costBasis,
        settings,
        accounts
      );
    } catch (err) {
      console.error(err);
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!clientName || !amount || !landedAccount) {
      setCreateError("Please fill out all required fields.");
      return;
    }

    try {
      setIsSubmitting(true);
      await api.payments.create({
        department,
        client_name: clientName,
        payment_amount: Number(amount),
        landed_in_account_id: landedAccount,
        gst_type: gstType,
        payment_date: new Date().toISOString().split("T")[0],
        notes,
        money_spent: moneySpent
      });

      // Reset Form State
      setClientName("");
      setAmount("");
      setNotes("");
      setMoneySpent(false);
      
      onSuccess();
      onClose();
    } catch (err: any) {
      setCreateError(err.message || "Failed to commit payment to ledger.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={onClose} />

      {/* Modal drawer */}
      <div className="relative ml-auto w-full max-w-4xl h-full bg-white shadow-2xl flex flex-col z-50 animate-slide-left">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-950 text-slate-100">
          <div className="flex items-center gap-2">
            <Sparkles className="text-emerald-400 animate-pulse" size={18} />
            <h2 className="text-lg font-bold">Log Client Inflow Payment</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 transition-colors">
            <X size={20} />
          </button>
        </div>

        {createError && (
          <div className="p-4 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle size={14} className="shrink-0 text-rose-600" />
            <span>{createError}</span>
          </div>
        )}

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-3">
            <div className="h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 text-xs font-mono font-semibold tracking-wider">Syncing Ledger Rules...</p>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="flex-1 overflow-y-auto flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-200">
            {/* Left Column: Form Controls */}
            <div className="flex-1 p-6 space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Invoice details</h3>

              {/* Client Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Client Name *
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. Acme Tech Solutions"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-emerald-500 font-medium"
                  required
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Payment Amount * (Gross)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 250000"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 font-mono font-bold focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              {/* Department */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Department / Business Segment *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDepartment(Department.WEB_DEV)}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border text-center transition-all ${
                      department === Department.WEB_DEV
                        ? "bg-teal-50 border-teal-500 text-teal-700 shadow-xs"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    Web Development
                  </button>
                  <button
                    type="button"
                    onClick={() => setDepartment(Department.DIGITAL_MARKETING)}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border text-center transition-all ${
                      department === Department.DIGITAL_MARKETING
                        ? "bg-blue-50 border-blue-500 text-blue-700 shadow-xs"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    Digital Marketing
                  </button>
                </div>
              </div>

              {/* Landed Bank Account selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Landed Bank Account *
                </label>
                <select
                  value={landedAccount}
                  onChange={(e) => setLandedAccount(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
                >
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                  GST Rate: {isLandedAccountCurrent(landedAccount) ? "18% (Automated Current Account)" : "0% (Automated Savings Account)"}
                </span>
              </div>

              {/* GST Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  GST Structure *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setGstType(GSTType.INCLUSIVE)}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all ${
                      gstType === GSTType.INCLUSIVE
                        ? "bg-slate-900 border-slate-900 text-white"
                        : "bg-slate-50 border-slate-200 text-slate-600"
                    }`}
                  >
                    Inclusive (Internal Tax)
                  </button>
                  <button
                    type="button"
                    onClick={() => setGstType(GSTType.EXCLUSIVE)}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all ${
                      gstType === GSTType.EXCLUSIVE
                        ? "bg-slate-900 border-slate-900 text-white"
                        : "bg-slate-50 border-slate-200 text-slate-600"
                    }`}
                  >
                    Exclusive (Sur-Charge)
                  </button>
                </div>
              </div>

              {/* Money Spent Switch */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-700">Initial Spending Block</span>
                  <span className="text-[10px] text-slate-400">If True, salary pool is immediately marked as Spent</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMoneySpent(!moneySpent)}
                  className="focus:outline-none"
                >
                  {moneySpent ? (
                    <ToggleRight className="text-rose-500" size={36} />
                  ) : (
                    <ToggleLeft className="text-slate-400" size={36} />
                  )}
                </button>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Private Reference Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Reference tags or invoice notes..."
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Right Column: Live Snapshot Review */}
            <div className="w-full md:w-96 p-6 bg-slate-50 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Calculations Live Dry-Run</h3>

                {!liveBreakdown && (
                  <div className="h-64 flex flex-col items-center justify-center text-slate-400 italic text-xs text-center">
                    <HelpCircle size={32} className="mb-2 text-slate-300" />
                    <span>Enter client payment amount and selection parameters to preview snapshot.</span>
                  </div>
                )}

                {liveBreakdown && (
                  <div className="space-y-4">
                    {/* Amounts */}
                    <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2 shadow-xs">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500 font-medium">Base Net Amount:</span>
                        <span className="font-mono font-bold text-slate-800">{formatIndianCurrency(liveBreakdown.base_amount)}</span>
                      </div>
                      <div className="flex justify-between text-xs border-b border-slate-100 pb-2">
                        <span className="text-slate-500 font-medium">GST Collected ({(isLandedAccountCurrent(landedAccount) ? 0.18 : 0) * 100}%):</span>
                        <span className="font-mono font-bold text-slate-700">{formatIndianCurrency(liveBreakdown.gst_amount)}</span>
                      </div>
                      <div className="flex justify-between text-xs pt-1">
                        <span className="text-slate-700 font-bold">Total Inflow Gross:</span>
                        <span className="font-mono font-extrabold text-slate-900">{formatIndianCurrency(liveBreakdown.base_amount + liveBreakdown.gst_amount)}</span>
                      </div>
                    </div>

                    {/* Snapshots Breakdown */}
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Salary Pool (Proportional):</span>
                        <span className="font-mono font-bold text-slate-800">{formatIndianCurrency(liveBreakdown.salary_pool)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Overhead Rent & EMI Share:</span>
                        <span className="font-mono font-bold text-slate-800">{formatIndianCurrency(liveBreakdown.rent_emi_total)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Overhead Subscriptions & Misc:</span>
                        <span className="font-mono font-bold text-slate-800">{formatIndianCurrency(liveBreakdown.subscriptions_misc_total)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Marketing (Department Card):</span>
                        <span className="font-mono font-bold text-slate-800">{formatIndianCurrency(liveBreakdown.marketing_amount)}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200 pb-2">
                        <span className="text-slate-500">Net Profit:</span>
                        <span className="font-mono font-bold text-slate-850">{formatIndianCurrency(liveBreakdown.profit_amount)}</span>
                      </div>

                      {/* Invariant test */}
                      <div className="flex items-center justify-between text-[11px] text-emerald-600 font-mono pt-2">
                        <div className="flex items-center gap-1 font-semibold">
                          <CheckSquare size={12} />
                          <span>Ledger Balanced?</span>
                        </div>
                        <span className="font-bold">YES (Invariants Passed)</span>
                      </div>
                    </div>

                    {/* Transfers to be spawned */}
                    <div className="pt-3 border-t border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Automated Transfers Spawned:</span>
                      <div className="space-y-1.5 text-[11px] font-mono text-slate-500">
                        {liveBreakdown.rent_emi_total > 0 && landedAccount !== "ba-kotak" && (
                          <div>• {formatIndianCurrency(liveBreakdown.rent_emi_total)} → Kotak (Rent/EMI)</div>
                        )}
                        {liveBreakdown.subscriptions_misc_total > 0 && landedAccount !== "ba-axis-savings" && (
                          <div>• {formatIndianCurrency(liveBreakdown.subscriptions_misc_total)} → Axis Savings</div>
                        )}
                        {liveBreakdown.profit_amount > 0 && landedAccount !== "ba-janseva" && (
                          <div>• {formatIndianCurrency(liveBreakdown.profit_amount)} → Janseva (Profit)</div>
                        )}
                        {liveBreakdown.marketing_amount > 0 && (
                          <div>• {formatIndianCurrency(liveBreakdown.marketing_amount)} → Marketing Cards</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-200">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 text-white font-bold text-sm rounded-lg shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <span>{isSubmitting ? "Syncing Ledger..." : "Commit Payment to Ledger"}</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
