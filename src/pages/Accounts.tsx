/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { 
  Landmark, CreditCard, Eye, RefreshCw, Edit2, AlertTriangle, 
  CheckCircle2, ArrowRightLeft, DollarSign, Wallet, Plus
} from "lucide-react";
import { api } from "../services/api";
import { formatIndianCurrency } from "../domain/finance/calculations";
import AddPaymentModal from "../components/AddPaymentModal";

interface AccountsProps {
  setActivePage: (page: string) => void;
  setSelectedId: (id: string) => void;
  userRole: string;
}

export default function Accounts({ setActivePage, setSelectedId, userRole }: AccountsProps) {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setInits] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [selectedAccountForPayment, setSelectedAccountForPayment] = useState<string | undefined>(undefined);

  // Reconcile modal
  const [reconcileAccount, setReconcileAccount] = useState<any | null>(null);
  const [actualBalanceInput, setActualBalanceInput] = useState("");
  const [reconcileError, setReconcileError] = useState<string | null>(null);

  const fetchAccountsList = async () => {
    try {
      setInits(true);
      setError(null);
      const res = await api.accounts.getAll();
      setAccounts(res);
    } catch (err: any) {
      setError(err.message || "Failed to retrieve account ledger status.");
    } finally {
      setInits(false);
    }
  };

  useEffect(() => {
    fetchAccountsList();
  }, []);

  const handleUpdateReconcile = async (e: React.FormEvent) => {
    e.preventDefault();
    setReconcileError(null);
    if (!reconcileAccount) return;

    const val = Number(actualBalanceInput);
    if (isNaN(val)) {
      setReconcileError("Physical balance must be a valid number.");
      return;
    }

    try {
      await api.accounts.updateActualBalance(reconcileAccount.id, val);
      setReconcileAccount(null);
      setActualBalanceInput("");
      fetchAccountsList();
    } catch (err: any) {
      setReconcileError(err.message || "Failed to log physical balance.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Bank Accounts & Marketing Cards</h1>
          <p className="text-sm text-slate-500">Track computed bookkeeping balances, input verified bank statement balances, and analyze variances.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button 
            onClick={() => {
              setSelectedAccountForPayment(undefined);
              setIsAddPaymentOpen(true);
            }} 
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 border border-emerald-700 rounded-lg text-xs font-bold text-white hover:bg-emerald-500 shadow-sm transition-all"
          >
            <Plus size={12} />
            <span>Log Client Payment</span>
          </button>
          <button 
            onClick={fetchAccountsList} 
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 shadow-sm transition-all"
          >
            <RefreshCw size={12} />
            <span>Sync Bank Ledgers</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-44 bg-slate-200 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Section: Bank Accounts */}
          <div>
            <div className="flex items-center gap-2 mb-4 border-b pb-2">
              <Landmark className="text-blue-600" size={18} />
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Bookkeeping Accounts</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {accounts.filter(a => a.id.startsWith("ba-")).map(acc => {
                const isDiscrepancy = acc.variance !== 0;
                return (
                  <div key={acc.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between hover:border-slate-300 transition-all">
                    {/* Header bar */}
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${acc.is_active ? "bg-emerald-500" : "bg-slate-300"}`} />
                        <span className="font-bold text-slate-800 text-sm">{acc.name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">{(acc.type || acc.account_type || "bank").toUpperCase()}</span>
                    </div>

                    {/* Balances list */}
                    <div className="p-4 space-y-2.5 text-xs text-slate-600 font-medium">
                      <div className="flex justify-between">
                        <span>Opening Cash (Apr 1):</span>
                        <span className="font-mono font-bold text-slate-600">{formatIndianCurrency(acc.opening_balance)}</span>
                      </div>
                      <div className="flex justify-between border-b pb-2">
                        <span>Computed Sheet Cash:</span>
                        <span className="font-mono font-bold text-slate-800 text-sm">{formatIndianCurrency(acc.sheet_balance)}</span>
                      </div>
                      <div className="flex justify-between text-slate-700">
                        <span>Actual Statement Cash:</span>
                        <span className="font-mono font-bold text-slate-850">{formatIndianCurrency(acc.actual_balance)}</span>
                      </div>
                    </div>

                    {/* Variance status bar */}
                    <div className={`p-3 px-4 flex items-center justify-between text-xs border-t ${
                      isDiscrepancy 
                        ? "bg-amber-50/70 text-amber-900 border-amber-100" 
                        : "bg-emerald-50/50 text-emerald-900 border-emerald-100"
                    }`}>
                      <div className="flex items-center gap-1.5">
                        {isDiscrepancy ? (
                          <>
                            <AlertTriangle size={14} className="text-amber-600" />
                            <span className="font-bold">Variance: {formatIndianCurrency(acc.variance)}</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={14} className="text-emerald-600" />
                            <span className="font-semibold text-emerald-800">Balanced (Matched)</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => {
                            setSelectedAccountForPayment(acc.id);
                            setIsAddPaymentOpen(true);
                          }}
                          className="p-1.5 rounded text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 transition-colors"
                          title="Log Client Payment to this account"
                        >
                          <Plus size={14} />
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedId(acc.id);
                            setActivePage("accounts_detail");
                          }}
                          className="p-1.5 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                          title="View Ledger Statement"
                        >
                          <Eye size={14} />
                        </button>
                        {(userRole === "finance_head" || userRole === "admin") && (
                          <button 
                            onClick={() => {
                              setReconcileAccount(acc);
                              setActualBalanceInput(String(acc.actual_balance));
                            }}
                            className="p-1.5 rounded text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-colors"
                            title="Perform Statement Reconciliation"
                          >
                            <Edit2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section: Marketing Cards */}
          <div>
            <div className="flex items-center gap-2 mb-4 border-b pb-2">
              <CreditCard className="text-pink-600" size={18} />
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Marketing Budgets Cards</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {accounts.filter(a => a.id.startsWith("mc-")).map(card => {
                return (
                  <div key={card.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between hover:border-slate-300 transition-all">
                    {/* Header */}
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-pink-500" />
                        <span className="font-bold text-slate-800 text-sm">{card.name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">CREDIT CARD</span>
                    </div>

                    {/* Body */}
                    <div className="p-5 flex items-center justify-between">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Available Balance</span>
                        <h4 className="font-mono text-xl font-bold text-slate-900">{formatIndianCurrency(card.sheet_balance)}</h4>
                      </div>
                      <div className="text-right text-xs text-slate-500">
                        <div>Account ID: <span className="font-mono font-semibold">{card.id}</span></div>
                        <div className="mt-1">Inflow source: <span className="font-semibold text-pink-600 uppercase text-[10px]">{card.id.includes("webdev") ? "Web Dev Marketing" : "DM Marketing"}</span></div>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 border-t flex items-center justify-between text-xs text-slate-400 px-4 font-mono">
                      <span>Card Budget Type: Frozen Snapshot Router</span>
                      <button 
                        onClick={() => {
                          setSelectedId(card.id);
                          setActivePage("accounts_detail");
                        }}
                        className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 flex items-center gap-1 font-sans"
                      >
                        <Eye size={12} />
                        <span>Inspect Statement</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Actual Statement Balance Input Modal */}
      {reconcileAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setReconcileAccount(null)} />
          <div className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-6 z-50 animate-scale-up">
            <h2 className="text-lg font-bold text-slate-900 mb-2">Reconcile Physical Statement</h2>
            <p className="text-xs text-slate-500 mb-4">Input the ending balance directly from your verified physical bank statement for <span className="font-bold text-slate-800">{reconcileAccount.name}</span>.</p>

            {reconcileError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-semibold mb-4">
                {reconcileError}
              </div>
            )}

            <form onSubmit={handleUpdateReconcile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Computed bookkeeping Cash:
                </label>
                <div className="p-2 rounded bg-slate-50 text-sm font-mono font-bold text-slate-600 border border-slate-100">
                  {formatIndianCurrency(reconcileAccount.sheet_balance)}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Physical Statement Cash Balance (₹) *
                </label>
                <input
                  type="number"
                  value={actualBalanceInput}
                  onChange={(e) => setActualBalanceInput(e.target.value)}
                  placeholder="e.g. 500000"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-850 font-mono font-bold focus:outline-none focus:border-emerald-500"
                  required
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReconcileAccount(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded"
                >
                  Save & Reconcile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AddPaymentModal 
        isOpen={isAddPaymentOpen} 
        onClose={() => {
          setIsAddPaymentOpen(false);
          setSelectedAccountForPayment(undefined);
        }} 
        onSuccess={fetchAccountsList} 
        initialAccountId={selectedAccountForPayment}
      />
    </div>
  );
}
