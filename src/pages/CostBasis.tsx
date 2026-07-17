/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { 
  UserSquare, Edit2, RefreshCw, AlertTriangle, ToggleLeft, ToggleRight, Check, X
} from "lucide-react";
import { api } from "../services/api";
import { formatIndianCurrency } from "../domain/finance/calculations";
import { CostCategory } from "../types";

export default function CostBasis() {
  const [costBasisList, setCostBasisList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Group selector
  const [activeGroup, setActiveGroup] = useState<"salaries" | "overheads">("salaries");

  // Edit modal
  const [editItem, setEditItem] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [editError, setEditError] = useState<string | null>(null);

  const fetchCostBasisList = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.costBasis.getAll();
      setCostBasisList(res);
    } catch (err: any) {
      setError(err.message || "Failed to retrieve cost basis configurations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCostBasisList();
  }, []);

  const handleUpdateCostBasis = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);

    if (!editName || !editAmount || isNaN(Number(editAmount))) {
      setEditError("Please fill out all fields with valid configurations.");
      return;
    }

    try {
      await api.costBasis.update(editItem.id, {
        name: editName,
        monthly_amount: Number(editAmount),
        is_active: editActive
      });

      setEditItem(null);
      fetchCostBasisList();
    } catch (err: any) {
      setEditError(err.message || "Failed to update cost basis.");
    }
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    try {
      await api.costBasis.update(id, { is_active: !current });
      setCostBasisList(costBasisList.map(item => item.id === id ? { ...item, is_active: !current } : item));
    } catch (err: any) {
      alert("Failed to toggle state: " + err.message);
    }
  };

  const groupedBasis = costBasisList.filter(item => {
    const isSalary = item.category === CostCategory.TEAM_WEBDEV || item.category === CostCategory.TEAM_DM || item.category === CostCategory.MANAGEMENT;
    return activeGroup === "salaries" ? isSalary : !isSalary;
  });

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case CostCategory.TEAM_WEBDEV: return "Web Dev Salary";
      case CostCategory.TEAM_DM: return "Digital Marketing Salary";
      case CostCategory.MANAGEMENT: return "Management Salary";
      case CostCategory.OVERHEAD: return "Office Overhead";
      default: return cat.toUpperCase().replace("_", " ");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Cost Basis Settings</h1>
          <p className="text-sm text-slate-500">Edit contractor monthly salary weights, office rent shares, and software subscription baselines.</p>
        </div>
        <button 
          onClick={fetchCostBasisList} 
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 shadow-sm transition-all"
        >
          <RefreshCw size={12} />
          <span>Sync Cost Basis</span>
        </button>
      </div>

      {/* Info Warning */}
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm flex items-start gap-3 shadow-sm">
        <AlertTriangle className="text-amber-600 mt-0.5 shrink-0" size={18} />
        <div>
          <span className="font-bold">Operational Rule:</span>
          <span className="ml-1">
            Modifying reference salary weights or overhead parameters will <span className="font-bold underline">only apply to future client invoices</span>. Past historical distributions remain locked to preserve audit consistency.
          </span>
        </div>
      </div>

      {/* Selector Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-6">
          <button 
            onClick={() => setActiveGroup("salaries")}
            className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
              activeGroup === "salaries" ? "border-emerald-500 text-emerald-600" : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            Contractor Base Salaries ({costBasisList.filter(i => i.category === CostCategory.TEAM_WEBDEV || i.category === CostCategory.TEAM_DM || i.category === CostCategory.MANAGEMENT).length})
          </button>
          <button 
            onClick={() => setActiveGroup("overheads")}
            className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
              activeGroup === "overheads" ? "border-emerald-500 text-emerald-600" : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            Office Overheads & Rent ({costBasisList.filter(i => i.category === CostCategory.OVERHEAD).length})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-64 bg-slate-100 rounded-xl animate-pulse" />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-3 pl-4">Cost Basis Item</th>
                  <th className="p-3">Reference Category</th>
                  <th className="p-3">Monthly Reference Amount</th>
                  <th className="p-3 text-center">Status state</th>
                  <th className="p-3 text-center pr-4">Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                {groupedBasis.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 pl-4">
                      <div className="flex items-center gap-2">
                        <UserSquare size={16} className="text-slate-400" />
                        <span className="font-semibold text-slate-800">{item.name}</span>
                      </div>
                    </td>
                    <td className="p-3 text-xs uppercase font-semibold text-slate-500 font-mono">
                      {getCategoryLabel(item.category)}
                    </td>
                    <td className="p-3 font-mono font-bold text-slate-900">{formatIndianCurrency(item.monthly_amount)}</td>
                    <td className="p-3 text-center">
                      <button 
                        onClick={() => handleToggleActive(item.id, item.is_active)}
                        className="focus:outline-none"
                      >
                        {item.is_active ? (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full font-bold">
                            Active (Factored)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 bg-slate-150 border border-slate-200 text-slate-600 rounded-full font-bold">
                            Deactivated
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="p-3 text-center pr-4">
                      <button 
                        onClick={() => {
                          setEditItem(item);
                          setEditName(item.name);
                          setEditAmount(String(item.monthly_amount));
                          setEditActive(item.is_active);
                        }}
                        className="p-1 rounded text-emerald-600 hover:bg-emerald-50 hover:text-emerald-800"
                        title="Edit Baseline configuration"
                      >
                        <Edit2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setEditItem(null)} />
          <div className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-6 z-50 animate-scale-up">
            <h2 className="text-lg font-bold text-slate-900 mb-2">Adjust Cost Weight</h2>
            <p className="text-xs text-slate-500 mb-4">Overwrite baseline weight parameters. Modifying this item will not change historical client payment allocations.</p>

            {editError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-semibold mb-4">
                {editError}
              </div>
            )}

            <form onSubmit={handleUpdateCostBasis} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Item Label/Name *</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-850 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Monthly Cost/Salary Amount (₹) *</label>
                <input
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  placeholder="e.g. 35000"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-850 font-mono font-bold focus:outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-700">Factored in Calculations</span>
                  <span className="text-[10px] text-slate-400">If False, this cost weight is skipped on next invoice</span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditActive(!editActive)}
                  className="focus:outline-none"
                >
                  {editActive ? (
                    <ToggleRight className="text-emerald-500" size={36} />
                  ) : (
                    <ToggleLeft className="text-slate-400" size={36} />
                  )}
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditItem(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-850 hover:bg-slate-50 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded"
                >
                  Update Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
