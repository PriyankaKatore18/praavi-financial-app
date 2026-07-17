/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { 
  Calculator, Sparkles, Landmark, Coins, HelpCircle, 
  CheckSquare, ArrowRight, ShieldCheck, ChevronRight
} from "lucide-react";
import { api } from "../services/api";
import { formatIndianCurrency, calculatePaymentDistribution } from "../domain/finance/calculations";
import { Department, GSTType } from "../types";

export default function CalculatorPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [costBasis, setCostBasis] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Inputs
  const [amount, setAmount] = useState("100000");
  const [department, setDepartment] = useState<Department>(Department.WEB_DEV);
  const [landedAccount, setLandedAccount] = useState("");
  const [gstType, setGstType] = useState<GSTType>(GSTType.INCLUSIVE);

  useEffect(() => {
    const loadCalcBasis = async () => {
      try {
        const [aRes, cRes, sRes] = await Promise.all([
          api.accounts.getAll(),
          api.costBasis.getAll(),
          api.settings.get()
        ]);
        setAccounts(aRes);
        setCostBasis(cRes);
        setSettings(sRes);
        if (aRes.length > 0) {
          setLandedAccount(aRes[0].id);
        }
      } catch (err) {
        console.error("Failed to load calculator constants.", err);
      } finally {
        setLoading(false);
      }
    };
    loadCalcBasis();
  }, []);

  const numAmt = Number(amount);
  const isValid = !isNaN(numAmt) && numAmt > 0 && landedAccount && settings && costBasis.length > 0;

  let result: any = null;
  let gstPct = 0;
  if (isValid) {
    try {
      result = calculatePaymentDistribution(
        numAmt,
        department,
        landedAccount,
        gstType,
        costBasis,
        settings,
        accounts
      );
      const acc = accounts.find(a => a.id === landedAccount);
      if (acc) {
        gstPct = (acc.name.toLowerCase().includes("sbi current") || acc.name.toLowerCase().includes("axis current")) ? 18 : 0;
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Percent calculation
  const getPercentOfBase = (val: number) => {
    if (!result || result.base_amount === 0) return 0;
    return Math.round((val / result.base_amount) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">What-If Revenue Calculator</h1>
        <p className="text-sm text-slate-500">Simulate pricing models, calculate GST overheads, and preview distribution splits in real-time.</p>
      </div>

      {loading ? (
        <div className="h-64 bg-slate-100 rounded-xl animate-pulse" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel: Inputs */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Simulation Inputs</h3>

            {/* Invoiced Gross Amount */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Gross Invoice Amount (₹)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 100000"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 font-mono font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Department selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Business Department
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
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
                Simulated Bank Account
              </label>
              <select
                value={landedAccount}
                onChange={(e) => setLandedAccount(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-emerald-500"
              >
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                GST Rate: {gstPct}% ({gstPct > 0 ? "SBI/Axis Current" : "Savings/Reserve"})
              </span>
            </div>

            {/* GST structure */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Tax Treatment
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setGstType(GSTType.INCLUSIVE)}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all ${
                    gstType === GSTType.INCLUSIVE
                      ? "bg-slate-900 border-slate-900 text-white"
                      : "bg-slate-50 border-slate-200 text-slate-600"
                  }`}
                >
                  Inclusive (Within)
                </button>
                <button
                  onClick={() => setGstType(GSTType.EXCLUSIVE)}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all ${
                    gstType === GSTType.EXCLUSIVE
                      ? "bg-slate-900 border-slate-900 text-white"
                      : "bg-slate-50 border-slate-200 text-slate-600"
                  }`}
                >
                  Exclusive (Add-On)
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel: Simulation Outputs */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 space-y-6 flex flex-col justify-between">
            {!result ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm italic py-12 text-center">
                <Calculator size={48} className="mb-2 text-slate-300" />
                <span>Adjust simulation parameters to inspect allocations.</span>
              </div>
            ) : (
              <>
                <div>
                  <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Computed Distribution Results</h3>
                    <span className="text-xs text-emerald-600 font-bold font-mono">₹ INVARIANTS BALANCED</span>
                  </div>

                  {/* Highlights row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div className="p-3 bg-slate-50 border rounded-lg text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Base Net Amount</span>
                      <h4 className="font-mono text-base font-bold text-slate-800 mt-1">{formatIndianCurrency(result.base_amount)}</h4>
                    </div>
                    <div className="p-3 bg-slate-50 border rounded-lg text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400">GST Collected ({gstPct}%)</span>
                      <h4 className="font-mono text-base font-bold text-slate-800 mt-1">{formatIndianCurrency(result.gst_amount)}</h4>
                    </div>
                    <div className="p-3 bg-slate-50 border rounded-lg text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Total Gross Inflow</span>
                      <h4 className="font-mono text-base font-bold text-emerald-600 mt-1">{formatIndianCurrency(result.base_amount + result.gst_amount)}</h4>
                    </div>
                  </div>

                  {/* Segment Ratio visual bar */}
                  <div className="space-y-2 mb-6">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Relative Split of Base Revenue:</span>
                    <div className="w-full h-4 rounded-full bg-slate-100 overflow-hidden flex">
                      <div style={{ width: `${getPercentOfBase(result.salary_pool)}%` }} className="bg-teal-500 h-full" title="Salary Pool" />
                      <div style={{ width: `${getPercentOfBase(result.rent_emi_total)}%` }} className="bg-amber-500 h-full" title="Rent/EMI Overheads" />
                      <div style={{ width: `${getPercentOfBase(result.subscriptions_misc_total)}%` }} className="bg-orange-400 h-full" title="Subscriptions/Misc Overheads" />
                      <div style={{ width: `${getPercentOfBase(result.marketing_amount)}%` }} className="bg-pink-500 h-full" title="Marketing Card" />
                      <div style={{ width: `${getPercentOfBase(result.profit_amount)}%` }} className="bg-emerald-500 h-full" title="Praavi Net Profit" />
                    </div>
                  </div>

                  {/* List breakdown */}
                  <div className="divide-y divide-slate-100 text-sm">
                    {/* Salary Pool */}
                    <div className="py-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-teal-500 shrink-0" />
                        <span className="text-slate-600 font-medium">Salary Pool Allocation:</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-slate-900">{formatIndianCurrency(result.salary_pool)}</span>
                        <span className="text-slate-400 font-mono text-xs ml-2">({getPercentOfBase(result.salary_pool)}%)</span>
                      </div>
                    </div>

                    {/* Overhead rent emi */}
                    <div className="py-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0" />
                        <span className="text-slate-600 font-medium">Rent & EMI Overheads Share:</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-slate-900">{formatIndianCurrency(result.rent_emi_total)}</span>
                        <span className="text-slate-400 font-mono text-xs ml-2">({getPercentOfBase(result.rent_emi_total)}%)</span>
                      </div>
                    </div>

                    {/* Overhead sub misc */}
                    <div className="py-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-orange-400 shrink-0" />
                        <span className="text-slate-600 font-medium">Subscriptions & Misc Overheads Share:</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-slate-900">{formatIndianCurrency(result.subscriptions_misc_total)}</span>
                        <span className="text-slate-400 font-mono text-xs ml-2">({getPercentOfBase(result.subscriptions_misc_total)}%)</span>
                      </div>
                    </div>

                    {/* Marketing */}
                    <div className="py-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-pink-500 shrink-0" />
                        <span className="text-slate-600 font-medium">Departmental Marketing Card:</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-slate-900">{formatIndianCurrency(result.marketing_amount)}</span>
                        <span className="text-slate-400 font-mono text-xs ml-2">({getPercentOfBase(result.marketing_amount)}%)</span>
                      </div>
                    </div>

                    {/* Profit */}
                    <div className="py-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
                        <span className="text-slate-600 font-semibold">Praavi Net Profit:</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-emerald-600 text-sm">{formatIndianCurrency(result.profit_amount)}</span>
                        <span className="text-slate-400 font-mono text-xs ml-2">({getPercentOfBase(result.profit_amount)}%)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Info block */}
                <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 text-xs text-emerald-800 font-mono leading-normal">
                  <span className="font-bold uppercase tracking-wider block mb-1">Mathematical Formula:</span>
                  <span>Base Amount (Inflow - GST) = Salary Pool + Rent Share + Car EMI Share + Subscriptions Share + Light Share + Laptop Share + Misc Share + Marketing Share + Profit Share. Enforced 100% to 1-paise precision.</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
