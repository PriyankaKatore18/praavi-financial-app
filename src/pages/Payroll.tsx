/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { 
  CheckSquare, Plus, RefreshCw, Check, AlertTriangle, X, Landmark, Clock, Calendar
} from "lucide-react";
import { api } from "../services/api";
import { formatIndianCurrency } from "../domain/finance/calculations";
import { PayrollStatus, CostCategory } from "../types";

export default function Payroll() {
  const [payrollList, setPayrollList] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [costBasis, setCostBasis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Settlement modal state
  const [disburseItem, setDisburseItem] = useState<any | null>(null);
  const [disburseAccount, setDisburseAccount] = useState("");
  const [disburseError, setDisburseError] = useState<string | null>(null);

  // Form states
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCostBasis, setSelectedCostBasis] = useState("");
  const [amount, setAmount] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [notes, setNotes] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchPayrollData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [pRes, aRes, cRes] = await Promise.all([
        api.payroll.getAll(),
        api.accounts.getAll(),
        api.costBasis.getAll()
      ]);
      setPayrollList(pRes);
      setAccounts(aRes.filter(a => a.id.startsWith("ba-")));
      const employeeCostBasis = cRes.filter(c => c.category === CostCategory.TEAM_WEBDEV || c.category === CostCategory.TEAM_DM || c.category === CostCategory.MANAGEMENT);
      setCostBasis(employeeCostBasis);

      if (employeeCostBasis.length > 0) {
        setSelectedCostBasis(employeeCostBasis[0].id);
        const firstActive = employeeCostBasis[0];
        setAmount(String(firstActive.monthly_amount));
      }
      if (aRes.length > 0) {
        setDisburseAccount(aRes[0].id);
      }
      setScheduleDate(new Date().toISOString().split("T")[0]);
    } catch (err: any) {
      setError(err.message || "Failed to retrieve scheduled payroll.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayrollData();
  }, []);

  const handleCostBasisChange = (id: string) => {
    setSelectedCostBasis(id);
    const cb = costBasis.find(c => c.id === id);
    if (cb) {
      setAmount(String(cb.monthly_amount));
    }
  };

  const handleCreatePayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    const cb = costBasis.find(c => c.id === selectedCostBasis);
    if (!cb || !amount || isNaN(Number(amount)) || !scheduleDate) {
      setCreateError("Please complete all required fields.");
      return;
    }

    try {
      await api.payroll.create({
        employee_name: cb.name,
        employee_cost_basis_id: cb.id,
        amount: Number(amount),
        scheduled_date: scheduleDate,
        notes
      });

      setNotes("");
      setIsOpen(false);
      fetchPayrollData();
    } catch (err: any) {
      setCreateError(err.message || "Failed to log payroll entry.");
    }
  };

  const handleDisbursePayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    setDisburseError(null);

    if (!disburseItem || !disburseAccount) {
      setDisburseError("Please select a valid payout bank account.");
      return;
    }

    try {
      await api.payroll.updateStatus(disburseItem.id, PayrollStatus.PAID, disburseAccount);
      setDisburseItem(null);
      fetchPayrollData();
    } catch (err: any) {
      setDisburseError(err.message || "Failed to complete payroll release.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Salaries & Payroll</h1>
          <p className="text-sm text-slate-500">Manage monthly contractor payables, audit scheduled vouchers, and release salary disbursements.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchPayrollData} 
            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-slate-800 shadow-sm"
          >
            <RefreshCw size={14} />
          </button>
          <button 
            onClick={() => setIsOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm"
          >
            <Plus size={14} />
            <span>Log Payroll Voucher</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-64 bg-slate-100 rounded-xl animate-pulse" />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {payrollList.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm italic">
              No scheduled payroll records logged.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="p-3 pl-4">Scheduled Date</th>
                    <th className="p-3">Contractor / Employee Name</th>
                    <th className="p-3">Reference Voucher Notes</th>
                    <th className="p-3">Status Claim</th>
                    <th className="p-3 font-mono">Paid Date</th>
                    <th className="p-3 font-mono">Paid From</th>
                    <th className="p-3 text-right">Disbursement (₹)</th>
                    <th className="p-3 text-center pr-4">Process</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                  {payrollList.map((p: any) => {
                    const isPending = p.status === PayrollStatus.PENDING;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 pl-4 font-mono font-medium text-slate-500">{p.scheduled_date}</td>
                        <td className="p-3 font-semibold text-slate-800">{p.employee_name}</td>
                        <td className="p-3 font-semibold text-slate-500">{p.notes || "-"}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono border uppercase ${
                            isPending ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-xs">{p.paid_date ? p.paid_date.substring(0, 10) : "-"}</td>
                        <td className="p-3 text-xs font-mono font-bold uppercase text-slate-500">
                          {p.paid_from_account_id ? p.paid_from_account_id.replace("ba-", "") : "-"}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">{formatIndianCurrency(p.amount)}</td>
                        <td className="p-3 text-center pr-4">
                          {isPending ? (
                            <button
                              onClick={() => {
                                setDisburseItem(p);
                              }}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded shadow-xs"
                            >
                              Pay Out
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-mono font-bold uppercase">Disbursed</span>
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

      {/* Disburse Modal */}
      {disburseItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setDisburseItem(null)} />
          <div className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-6 z-50 animate-scale-up">
            <h2 className="text-lg font-bold text-slate-900 mb-2">Process Salary Release</h2>
            <p className="text-xs text-slate-500 mb-4">Confirm direct bank release of <span className="font-bold text-slate-800">{formatIndianCurrency(disburseItem.amount)}</span> to contractor <span className="font-bold text-slate-800">{disburseItem.employee_name}</span>.</p>

            {disburseError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-semibold mb-4">
                {disburseError}
              </div>
            )}

            <form onSubmit={handleDisbursePayroll} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Disburse From Bank Account *
                </label>
                <select
                  value={disburseAccount}
                  onChange={(e) => setDisburseAccount(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none"
                  required
                >
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name} (Computed: {formatIndianCurrency(a.sheet_balance)})</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDisburseItem(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded"
                >
                  Approve Salary Release
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Voucher Modal Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <div className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-6 z-50 animate-scale-up">
            <h2 className="text-lg font-bold text-slate-900 mb-2">Create Scheduled Payroll Voucher</h2>
            <p className="text-xs text-slate-500 mb-4">Log contractor monthly base payables.</p>

            {createError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-semibold mb-4 flex items-center gap-2">
                <AlertTriangle size={14} className="shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreatePayroll} className="space-y-4">
              {/* Employee */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Contractor/Employee *</label>
                <select
                  value={selectedCostBasis}
                  onChange={(e) => handleCostBasisChange(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 focus:outline-none"
                  required
                >
                  {costBasis.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.category.toUpperCase().replace("TEAM_", "").replace("_", " ")})</option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Monthly Salary (₹) *</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 35000"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-850 font-mono font-bold focus:outline-none"
                  required
                />
              </div>

              {/* Scheduled Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Scheduled Payout Date *</label>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-850 focus:outline-none"
                  required
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Voucher Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. June Monthly Pay Cycle"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-850 focus:outline-none"
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
                  Log Scheduled Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
