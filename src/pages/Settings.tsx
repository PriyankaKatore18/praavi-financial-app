/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { 
  Settings2, RefreshCw, Save, AlertTriangle, HelpCircle, ToggleLeft, ToggleRight, Check
} from "lucide-react";
import { api } from "../services/api";
import { formatIndianCurrency } from "../domain/finance/calculations";

export default function Settings() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editable settings inputs
  const [profitPercent, setProfitPercent] = useState("");
  const [marketingPercent, setMarketingPercent] = useState("");
  const [currentMonth, setCurrentMonth] = useState("");
  const [webDevCap, setWebDevCap] = useState("");
  const [dmCap, setDmCap] = useState("");

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.settings.get();
      setSettings(res);

      setProfitPercent(String(res.profit_percentage));
      setMarketingPercent(String(res.marketing_percentage));
      setCurrentMonth(String(res.current_month));
      setWebDevCap(String(res.webdev_marketing_card_cap));
      setDmCap(String(res.dm_marketing_card_cap));
    } catch (err: any) {
      setError(err.message || "Failed to load corporate parameters.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const profit = Number(profitPercent);
    const mkt = Number(marketingPercent);
    const mNum = Number(currentMonth);
    const wdCap = Number(webDevCap);
    const dCap = Number(dmCap);

    if (isNaN(profit) || isNaN(mkt) || isNaN(mNum) || isNaN(wdCap) || isNaN(dCap)) {
      setError("Please ensure all numeric inputs are valid positive values.");
      return;
    }

    if (profit + mkt >= 100) {
      setError("Combined Profit and Marketing percentages must be less than 100% to leave room for salaries & overheads.");
      return;
    }

    try {
      setSaving(true);
      await api.settings.update({
        profit_percentage: profit,
        marketing_percentage: mkt,
        current_month: mNum,
        webdev_marketing_card_cap: wdCap,
        dm_marketing_card_cap: dCap
      });
      setSuccess(true);
      fetchSettings();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to save settings parameters.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/4" />
        <div className="h-64 bg-slate-200 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Corporate System Settings</h1>
        <p className="text-sm text-slate-500">Tune target margin parameters, active salary month calendars, and credit card expenditure constraints.</p>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-850 rounded-xl text-xs font-semibold flex items-center gap-2">
          <Check size={14} className="text-emerald-600" />
          <span>Parameter metrics updated and recorded securely in audit log.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
        {/* Section 1: Profit Allocation ratios */}
        <div className="p-6 space-y-4">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">1. Client Inflows Splitting Ratios</h3>
          <p className="text-xs text-slate-500 leading-normal">Configure the percentage of invoice funds routed to the Corporate Profit Account and Corporate Marketing pools prior to overhead and salary releases.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Profit margin */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Profit Holding Allocation Percentage (%)</label>
              <div className="relative">
                <input
                  type="number"
                  value={profitPercent}
                  onChange={(e) => setProfitPercent(e.target.value)}
                  placeholder="e.g. 20"
                  className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 font-mono font-bold focus:outline-none"
                  required
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">%</span>
              </div>
            </div>

            {/* Marketing margin */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Marketing Holding Allocation Percentage (%)</label>
              <div className="relative">
                <input
                  type="number"
                  value={marketingPercent}
                  onChange={(e) => setMarketingPercent(e.target.value)}
                  placeholder="e.g. 10"
                  className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 font-mono font-bold focus:outline-none"
                  required
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Active calendar month */}
        <div className="p-6 space-y-4">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">2. Operating Fiscal Month Cycle</h3>
          <p className="text-xs text-slate-500 leading-normal">Update the active bookkeeping operating month cycle. Changing this updates dashboard reports and default salary sheet schedule titles.</p>
          
          <div className="max-w-xs">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Current Active Bookkeeping Month No.</label>
            <input
              type="number"
              value={currentMonth}
              onChange={(e) => setCurrentMonth(e.target.value)}
              placeholder="e.g. 1"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 font-mono font-bold focus:outline-none"
              min="1"
              required
            />
          </div>
        </div>

        {/* Section 3: Credit Card Spending Constraints */}
        <div className="p-6 space-y-4">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">3. Corporate Credit Card Limits (Maximum Caps)</h3>
          <p className="text-xs text-slate-500 leading-normal">Define maximum allowable sheet balance thresholds for departmental credit cards. Prevents accidental over-spending.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Web Dev cap */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Web Dev Marketing Card Cap (₹)</label>
              <input
                type="number"
                value={webDevCap}
                onChange={(e) => setWebDevCap(e.target.value)}
                placeholder="e.g. 50000"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 font-mono font-bold focus:outline-none"
                required
              />
            </div>

            {/* DM cap */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">DM Marketing Card Cap (₹)</label>
              <input
                type="number"
                value={dmCap}
                onChange={(e) => setDmCap(e.target.value)}
                placeholder="e.g. 50000"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 font-mono font-bold focus:outline-none"
                required
              />
            </div>
          </div>
        </div>

        {/* Footer controls */}
        <div className="p-4 px-6 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-mono">* Adjusting rules triggers structured logs for internal audit.</span>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <Save size={14} />
            <span>{saving ? "Saving Parameter Changes..." : "Commit Settings Variables"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
