/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { 
  ArrowLeftRight, Plus, RefreshCw, Check, AlertTriangle, X, Landmark, Clock, Wallet
} from "lucide-react";
import { api } from "../services/api";
import { formatIndianCurrency } from "../domain/finance/calculations";
import { TransferStatus } from "../types";

export default function Transfers() {
  const [distTransfers, setDistTransfers] = useState<any[]>([]);
  const [manualTransfers, setManualTransfers] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter tabs
  const [activeTab, setActiveTab] = useState<"distribution" | "manual">("distribution");

  // Manual Transfer state
  const [isOpen, setIsOpen] = useState(false);
  const [fromAccount, setFromAccount] = useState("");
  const [toAccount, setToAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("Salary Pool Replenishment");
  const [refNum, setRefNum] = useState("");
  const [notes, setNotes] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchTransfersData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [tRes, aRes] = await Promise.all([
        api.transfers.getAll(),
        api.accounts.getAll()
      ]);
      setDistTransfers(tRes.distribution_transfers);
      setManualTransfers(tRes.manual_transfers);
      setAccounts(aRes.filter(a => a.id.startsWith("ba-")));

      if (aRes.length > 1) {
        setFromAccount(aRes[0].id);
        setToAccount(aRes[1].id);
      }
    } catch (err: any) {
      setError(err.message || "Failed to retrieve transfers logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfersData();
  }, []);

  const handleManualTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (fromAccount === toAccount) {
      setCreateError("Source and target bank accounts must be different.");
      return;
    }

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setCreateError("Please input a valid positive transfer amount.");
      return;
    }

    try {
      await api.transfers.createManual({
        from_account_id: fromAccount,
        to_account_id: toAccount,
        amount: Number(amount),
        purpose,
        reference_number: refNum,
        notes,
        date: new Date().toISOString().split("T")[0]
      });

      setAmount("");
      setRefNum("");
      setNotes("");
      setIsOpen(false);
      fetchTransfersData();
    } catch (err: any) {
      setCreateError(err.message || "Failed to log transfer.");
    }
  };

  const handleCompleteDistRoute = async (id: string) => {
    try {
      await api.transfers.updateDistributionStatus(id, TransferStatus.TRANSFERRED);
      fetchTransfersData();
    } catch (err: any) {
      alert("Failed to complete transfer: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Inter-Bank Funds Transfers</h1>
          <p className="text-sm text-slate-500">Track automatic allocations from invoices or record custom manual cash routings across bank accounts.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchTransfersData} 
            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-slate-800 shadow-sm"
          >
            <RefreshCw size={14} />
          </button>
          <button 
            onClick={() => setIsOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm"
          >
            <Plus size={14} />
            <span>Record Manual Transfer</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-6">
          <button 
            onClick={() => setActiveTab("distribution")}
            className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
              activeTab === "distribution" ? "border-emerald-500 text-emerald-600" : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            Automated Distributions ({distTransfers.length})
          </button>
          <button 
            onClick={() => setActiveTab("manual")}
            className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
              activeTab === "manual" ? "border-emerald-500 text-emerald-600" : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            Manual Bank Routings ({manualTransfers.length})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-64 bg-slate-100 rounded-xl animate-pulse" />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {activeTab === "distribution" ? (
            /* Distribution Transfers table */
            distTransfers.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm italic">
                No automatic distribution transfers spawned yet. Log a client payment to initiate routes.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="p-3 pl-4">Target Account/Card</th>
                      <th className="p-3">Route Type</th>
                      <th className="p-3">Associated Invoiced Client</th>
                      <th className="p-3">Source Account</th>
                      <th className="p-3">Status State</th>
                      <th className="p-3 text-right">Transfer Amount</th>
                      <th className="p-3 text-center pr-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                    {distTransfers.map((t: any) => {
                      const isPending = t.status === TransferStatus.PENDING;
                      return (
                        <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 pl-4 flex items-center gap-2">
                            <Landmark size={14} className="text-blue-500" />
                            <span className="font-semibold text-slate-800">
                              {t.destination_account_id ? t.destination_account_id.replace("ba-", "").toUpperCase() : t.marketing_card_id.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-3 text-xs font-semibold text-slate-500 uppercase font-mono">
                            {t.transfer_type.replace("_", " ")}
                          </td>
                          <td className="p-3 text-slate-700 font-semibold">{t.payment_client_name}</td>
                          <td className="p-3 font-mono text-xs">{t.source_account_id.replace("ba-", "").toUpperCase()}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono border uppercase ${
                              isPending ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            }`}>
                              {t.status}
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900">{formatIndianCurrency(t.amount)}</td>
                          <td className="p-3 text-center pr-4">
                            {isPending ? (
                              <button
                                onClick={() => handleCompleteDistRoute(t.id)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded shadow-xs"
                              >
                                Release
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-mono font-bold uppercase">Routed</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            /* Manual Transfers table */
            manualTransfers.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm italic">
                No manual inter-bank transfers logged in the current ledger session.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="p-3 pl-4">Transfer Date</th>
                      <th className="p-3">From Account</th>
                      <th className="p-3">To Account</th>
                      <th className="p-3">Purpose / Reference Notes</th>
                      <th className="p-3">Reference Voucher No.</th>
                      <th className="p-3 text-right pr-6">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                    {manualTransfers.map((m: any) => (
                      <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 pl-4 font-mono font-medium text-slate-500">{m.date}</td>
                        <td className="p-3 text-xs font-mono font-bold uppercase">{m.from_account_id.replace("ba-", "")}</td>
                        <td className="p-3 text-xs font-mono font-bold uppercase">{m.to_account_id.replace("ba-", "")}</td>
                        <td className="p-3 text-slate-700 font-semibold">{m.purpose} <span className="text-xs text-slate-400 block font-normal">{m.notes || ""}</span></td>
                        <td className="p-3 font-mono text-xs">{m.reference_number || "-"}</td>
                        <td className="p-3 text-right pr-6 font-mono font-bold text-slate-900">
                          {formatIndianCurrency(m.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      )}

      {/* Record Manual Transfer Modal Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <div className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-6 z-50 animate-scale-up">
            <h2 className="text-lg font-bold text-slate-900 mb-2">Record Inter-Bank Transfer</h2>
            <p className="text-xs text-slate-500 mb-4">Directly update the bookkeeping ledger balances to log manual cash adjustments between corporate bank accounts.</p>

            {createError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-semibold mb-4 flex items-center gap-2">
                <AlertTriangle size={14} className="shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleManualTransfer} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {/* From */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">From Account *</label>
                  <select
                    value={fromAccount}
                    onChange={(e) => setFromAccount(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 focus:outline-none"
                    required
                  >
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>{a.name.replace("Bank Account", "")}</option>
                    ))}
                  </select>
                </div>

                {/* To */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">To Account *</label>
                  <select
                    value={toAccount}
                    onChange={(e) => setToAccount(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 focus:outline-none"
                    required
                  >
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>{a.name.replace("Bank Account", "")}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Transfer Amount (₹) *</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 50000"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-850 font-mono font-bold focus:outline-none"
                  required
                />
              </div>

              {/* Purpose */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Purpose Category *</label>
                <select
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none"
                  required
                >
                  <option value="Salary Pool Replenishment">Salary Pool Replenishment</option>
                  <option value="Overheads Funding allocation">Overheads Funding allocation</option>
                  <option value="Director Drawing Log">Director Drawing Log</option>
                  <option value="Inter-Bank Balances Leveling">Inter-Bank Balances Leveling</option>
                </select>
              </div>

              {/* Reference */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Reference Bank IMPS/Voucher No.</label>
                <input
                  type="text"
                  value={refNum}
                  onChange={(e) => setRefNum(e.target.value)}
                  placeholder="e.g. IMPS192084128"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-850 focus:outline-none"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Reference Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Private comments..."
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
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded"
                >
                  Record Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
