/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { 
  HelpCircle, Plus, RefreshCw, AlertTriangle, X, Landmark, CreditCard, ArrowRight
} from "lucide-react";
import { api } from "../services/api";
import { formatIndianCurrency } from "../domain/finance/calculations";
import { DrawingType } from "../types";

export default function Drawings() {
  const [drawingsList, setDrawingsList] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [isOpen, setIsOpen] = useState(false);
  const [drawingType, setDrawingType] = useState<DrawingType>(DrawingType.BANK_ACCOUNT);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [selectedCard, setSelectedCard] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Director Personal Drawing");
  const [purpose, setPurpose] = useState("");
  const [notes, setNotes] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchDrawings = async () => {
    try {
      setLoading(true);
      setError(null);
      const [dRes, aRes] = await Promise.all([
        api.drawings.getAll(),
        api.accounts.getAll()
      ]);
      setDrawingsList(dRes);
      setAccounts(aRes);

      const banks = aRes.filter(a => a.id.startsWith("ba-"));
      const cards = aRes.filter(a => a.id.startsWith("mc-"));
      if (banks.length > 0) setSelectedAccount(banks[0].id);
      if (cards.length > 0) setSelectedCard(cards[0].id);
    } catch (err: any) {
      setError(err.message || "Failed to load drawings records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrawings();
  }, []);

  const handleCreateDrawing = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0 || !purpose) {
      setCreateError("Please complete all required fields.");
      return;
    }

    try {
      await api.drawings.create({
        drawing_type: drawingType,
        amount: Number(amount),
        drawing_date: new Date().toISOString().split("T")[0],
        category,
        purpose,
        account_id: drawingType === DrawingType.BANK_ACCOUNT ? selectedAccount : undefined,
        marketing_card_id: drawingType === DrawingType.MARKETING_CARD ? selectedCard : undefined,
        notes
      });

      setAmount("");
      setPurpose("");
      setNotes("");
      setIsOpen(false);
      fetchDrawings();
    } catch (err: any) {
      setCreateError(err.message || "Failed to log drawing.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Partner & Director Drawings</h1>
          <p className="text-sm text-slate-500">Record cash withdrawals by directors or direct marketing spends that deduct from corporate accounts.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchDrawings} 
            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-slate-800 shadow-sm"
          >
            <RefreshCw size={14} />
          </button>
          <button 
            onClick={() => setIsOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm"
          >
            <Plus size={14} />
            <span>Log Drawing / Card Spend</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-64 bg-slate-100 rounded-xl animate-pulse" />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {drawingsList.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm italic">
              No drawings or card spending events logged.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="p-3 pl-4">Value Date</th>
                    <th className="p-3">Drawing Type</th>
                    <th className="p-3">Spent From Source</th>
                    <th className="p-3">Spent Category</th>
                    <th className="p-3">Purpose / Voucher Description</th>
                    <th className="p-3 text-right pr-6">Debit Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                  {drawingsList.map((d: any) => (
                    <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 pl-4 font-mono font-medium text-slate-500">{d.drawing_date}</td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 border border-slate-200 font-bold uppercase">
                          {d.drawing_type === DrawingType.BANK_ACCOUNT ? <Landmark size={10} /> : <CreditCard size={10} />}
                          <span>{d.drawing_type.replace("_", " ")}</span>
                        </span>
                      </td>
                      <td className="p-3 font-mono text-xs text-slate-500 uppercase">
                        {d.drawing_type === DrawingType.BANK_ACCOUNT 
                          ? d.account_id?.replace("ba-", "") 
                          : d.marketing_card_id?.replace("mc-", "")
                        }
                      </td>
                      <td className="p-3 text-slate-700 font-semibold">{d.category}</td>
                      <td className="p-3 text-slate-600 font-medium">{d.purpose} <span className="text-xs text-slate-400 block font-normal">{d.notes || ""}</span></td>
                      <td className="p-3 text-right pr-6 font-mono font-bold text-rose-600">
                        -{formatIndianCurrency(d.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Log Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <div className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-6 z-50 animate-scale-up">
            <h2 className="text-lg font-bold text-slate-900 mb-2">Log Partner Drawing / Spend</h2>
            <p className="text-xs text-slate-500 mb-4">Directly subtract funds from bookkeeping balances for partner withdrawals or credit card purchases.</p>

            {createError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-semibold mb-4 flex items-center gap-2">
                <AlertTriangle size={14} className="shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateDrawing} className="space-y-4">
              {/* Type toggle */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Source Asset Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDrawingType(DrawingType.BANK_ACCOUNT)}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all ${
                      drawingType === DrawingType.BANK_ACCOUNT
                        ? "bg-slate-900 border-slate-900 text-white shadow-xs"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    Corporate Bank Account
                  </button>
                  <button
                    type="button"
                    onClick={() => setDrawingType(DrawingType.MARKETING_CARD)}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all ${
                      drawingType === DrawingType.MARKETING_CARD
                        ? "bg-slate-900 border-slate-900 text-white shadow-xs"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    Marketing Budgets Card
                  </button>
                </div>
              </div>

              {/* Source Asset selection */}
              {drawingType === DrawingType.BANK_ACCOUNT ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Source Bank Account *</label>
                  <select
                    value={selectedAccount}
                    onChange={(e) => setSelectedAccount(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 focus:outline-none"
                    required
                  >
                    {accounts.filter(a => a.id.startsWith("ba-")).map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Source Marketing Card *</label>
                  <select
                    value={selectedCard}
                    onChange={(e) => setSelectedCard(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 focus:outline-none"
                    required
                  >
                    {accounts.filter(a => a.id.startsWith("mc-")).map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Debit Amount (₹) *</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 50000"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-850 font-mono font-bold focus:outline-none"
                  required
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Spending Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 focus:outline-none"
                  required
                >
                  <option value="Director Personal Drawing">Director Personal Drawing</option>
                  <option value="Direct Meta Ads Payment">Direct Meta Ads Payment</option>
                  <option value="Server/SaaS direct credit card buy">Server/SaaS direct credit card buy</option>
                  <option value="Office Petty Cash Withdrawal">Office Petty Cash Withdrawal</option>
                </select>
              </div>

              {/* Purpose */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Debit Purpose Description *</label>
                <input
                  type="text"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g. Director self draw for monthly expenses"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-850 focus:outline-none"
                  required
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Internal Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Approved voucher #DW19024"
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
                  Log Debit Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
