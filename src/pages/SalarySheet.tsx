/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { 
  Users, Sparkles, Coins, RefreshCw, Landmark, HelpCircle, ArrowRight
} from "lucide-react";
import { api } from "../services/api";
import { formatIndianCurrency, calculatePaymentDistribution } from "../domain/finance/calculations";
import { Department, GSTType, CostCategory } from "../types";

export default function SalarySheet() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Simulation calculator inputs
  const [simAmount, setSimAmount] = useState("150000");
  const [simDept, setSimDept] = useState<Department>(Department.WEB_DEV);
  const [simAccount, setSimAccount] = useState("");
  const [simGstType, setSimGstType] = useState<GSTType>(GSTType.INCLUSIVE);

  const fetchEmployeesList = async () => {
    try {
      setLoading(true);
      const [eRes, aRes, sRes] = await Promise.all([
        api.costBasis.getAll(),
        api.accounts.getAll(),
        api.settings.get()
      ]);
      // Filter only employee categories
      setEmployees(eRes.filter(c => c.category === CostCategory.TEAM_WEBDEV || c.category === CostCategory.TEAM_DM || c.category === CostCategory.MANAGEMENT));
      setAccounts(aRes);
      setSettings(sRes);
      if (aRes.length > 0) {
        setSimAccount(aRes[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployeesList();
  }, []);

  // Compute live simulated shares
  let simResult: any = null;
  if (!loading && simAmount && !isNaN(Number(simAmount)) && simAccount && settings) {
    try {
      simResult = calculatePaymentDistribution(
        Number(simAmount),
        simDept,
        simAccount,
        simGstType,
        employees, // cost basis references
        settings,
        accounts
      );
    } catch (err) {
      console.error("Live sheet calculation failed", err);
    }
  }

  // Group employees
  const webdevStaff = employees.filter(e => e.category === CostCategory.TEAM_WEBDEV && e.is_active);
  const dmStaff = employees.filter(e => e.category === CostCategory.TEAM_DM && e.is_active);
  const mgmtStaff = employees.filter(e => e.category === CostCategory.MANAGEMENT && e.is_active);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reference Salary Sheet</h1>
          <p className="text-sm text-slate-500">Active monthly base salaries for employee groupings & simulated payment splits.</p>
        </div>
        <button 
          onClick={fetchEmployeesList} 
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 shadow-sm transition-all"
        >
          <RefreshCw size={12} />
          <span>Sync Employee Weights</span>
        </button>
      </div>

      {loading ? (
        <div className="h-64 bg-slate-100 rounded-xl animate-pulse" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Employee Weights lists */}
          <div className="lg:col-span-2 space-y-6">
            {/* Web Dev staff list */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-teal-500" />
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Web Development Team (8 active contractors)</h3>
                </div>
              </div>
              <div className="divide-y divide-slate-100 text-sm">
                {webdevStaff.map(e => (
                  <div key={e.id} className="p-3 px-4 flex items-center justify-between font-medium">
                    <span className="text-slate-800">{e.name}</span>
                    <span className="font-mono text-slate-600">{formatIndianCurrency(e.monthly_amount)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* DM staff list */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Digital Marketing Team (10 active contractors)</h3>
                </div>
              </div>
              <div className="divide-y divide-slate-100 text-sm">
                {dmStaff.map(e => (
                  <div key={e.id} className="p-3 px-4 flex items-center justify-between font-medium">
                    <span className="text-slate-800">{e.name}</span>
                    <span className="font-mono text-slate-600">{formatIndianCurrency(e.monthly_amount)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Management staff list */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-500" />
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">General Management (2 active members)</h3>
                </div>
              </div>
              <div className="divide-y divide-slate-100 text-sm">
                {mgmtStaff.map(e => (
                  <div key={e.id} className="p-3 px-4 flex items-center justify-between font-medium">
                    <span className="text-slate-800">{e.name}</span>
                    <span className="font-mono text-slate-600">{formatIndianCurrency(e.monthly_amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Real-time split preview card */}
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b pb-2">
                <Sparkles className="text-emerald-500" size={16} />
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Proportional Preview Simulator</h3>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Simulate Trial Inflow (₹)</label>
                <input
                  type="number"
                  value={simAmount}
                  onChange={(e) => setSimAmount(e.target.value)}
                  placeholder="e.g. 150000"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 font-mono font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Department */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Simulate Department</label>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-bold">
                  <button
                    onClick={() => setSimDept(Department.WEB_DEV)}
                    className={`py-1.5 rounded border transition-all ${
                      simDept === Department.WEB_DEV ? "bg-teal-50 border-teal-500 text-teal-700" : "bg-slate-50 border-slate-200 text-slate-600"
                    }`}
                  >
                    Web Dev Team
                  </button>
                  <button
                    onClick={() => setSimDept(Department.DIGITAL_MARKETING)}
                    className={`py-1.5 rounded border transition-all ${
                      simDept === Department.DIGITAL_MARKETING ? "bg-blue-50 border-blue-500 text-blue-700" : "bg-slate-50 border-slate-200 text-slate-600"
                    }`}
                  >
                    DM Team
                  </button>
                </div>
              </div>

              {/* Account */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Simulated Landing Account</label>
                <select
                  value={simAccount}
                  onChange={(e) => setSimAccount(e.target.value)}
                  className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
                >
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              {/* GST Type */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Simulated Tax Treatment</label>
                <select
                  value={simGstType}
                  onChange={(e) => setSimGstType(e.target.value as GSTType)}
                  className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
                >
                  <option value={GSTType.INCLUSIVE}>GST Inclusive (Within)</option>
                  <option value={GSTType.EXCLUSIVE}>GST Exclusive (Add-on)</option>
                </select>
              </div>
            </div>

            {/* Output Panel */}
            {simResult && (
              <div className="bg-slate-900 text-slate-200 p-5 rounded-xl border border-slate-800 shadow-lg space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span className="text-[10px] uppercase font-mono text-emerald-400">Salary Pool Generated</span>
                  <span className="font-mono text-sm font-bold text-white">{formatIndianCurrency(simResult.salary_pool)}</span>
                </div>

                <div className="space-y-2 text-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider mb-1">Individual Contractor Payouts:</span>
                  
                  {simResult.employee_shares.map((share: any) => (
                    <div key={share.employee_cost_basis_id} className="flex justify-between items-center">
                      <span className="text-slate-300 font-medium truncate pr-4">{share.employee_name_snapshot}</span>
                      <span className="font-mono font-bold text-white shrink-0">{formatIndianCurrency(share.allocated_amount)}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-slate-800 text-[10px] text-slate-400 font-mono leading-normal">
                  * Live proportional payout of active salary pool. Enforces exact 1-paise fraction distribution.
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
