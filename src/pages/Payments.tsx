/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { 
  Plus, Search, Filter, Eye, Trash2, Download, ToggleLeft, ToggleRight, 
  HelpCircle, AlertTriangle, Check, ArrowRight, X, Sparkles, CheckSquare
} from "lucide-react";
import { api } from "../services/api";
import { formatIndianCurrency, calculatePaymentDistribution } from "../domain/finance/calculations";
import { Department, GSTType } from "../types";
import AddPaymentModal from "../components/AddPaymentModal";

interface PaymentsProps {
  setActivePage: (page: string) => void;
  setSelectedId: (id: string) => void;
  userRole: string;
}

export default function Payments({ setActivePage, setSelectedId, userRole }: PaymentsProps) {
  const [payments, setPayments] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [costBasis, setCostBasis] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [activeTab, setActiveTab] = useState<"all" | "web_dev" | "digital_marketing">("all");
  const [search, setSearch] = useState("");
  const [accountFilter, setAccountFilter] = useState("");
  const [gstFilter, setGstFilter] = useState("");
  const [moneySpentFilter, setMoneySpentFilter] = useState("");

  // Creation modal state
  const [isOpen, setIsOpen] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [pRes, aRes, cRes, sRes] = await Promise.all([
        api.payments.getAll(),
        api.accounts.getAll(),
        api.costBasis.getAll(),
        api.settings.get()
      ]);
      setPayments(pRes);
      setAccounts(aRes);
      setCostBasis(cRes);
      setSettings(sRes);
    } catch (err: any) {
      setError(err.message || "Failed to load payments ledger.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleSpent = async (id: string, currentStatus: boolean) => {
    try {
      await api.payments.update(id, { money_spent: !currentStatus });
      setPayments(payments.map(p => p.id === id ? { ...p, money_spent: !currentStatus } : p));
    } catch (err: any) {
      alert("Failed to toggle spent status: " + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you absolutely sure you want to delete this payment? All associated distribution snapshots and transfer requests will be permanently deleted.")) {
      return;
    }
    try {
      await api.payments.delete(id);
      setPayments(payments.filter(p => p.id !== id));
    } catch (err: any) {
      alert("Failed to delete payment: " + err.message);
    }
  };

  // Filter payments
  const filteredPayments = payments.filter(p => {
    const matchesTab = activeTab === "all" || p.department === activeTab;
    const matchesSearch = p.client_name.toLowerCase().includes(search.toLowerCase()) || 
                          (p.notes && p.notes.toLowerCase().includes(search.toLowerCase()));
    const matchesAccount = !accountFilter || p.landed_in_account_id === accountFilter;
    const matchesGST = !gstFilter || 
                     (gstFilter === "with_gst" && p.gst_pct > 0) || 
                     (gstFilter === "no_gst" && p.gst_pct === 0);
    const matchesSpent = !moneySpentFilter || 
                       (moneySpentFilter === "spent" && p.money_spent) || 
                       (moneySpentFilter === "unspent" && !p.money_spent);
    return matchesTab && matchesSearch && matchesAccount && matchesGST && matchesSpent;
  });

  // Export CSV
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Payment Date,Department,Client Name,Landed Account,Amount,Base Amount,GST Amount,Salary Pool,Money Spent,Notes\n";

    for (const p of filteredPayments) {
      const acc = accounts.find(a => a.id === p.landed_in_account_id)?.name || "Unknown";
      const base = p.distribution?.base_amount || p.payment_amount;
      const gst = p.distribution?.gst_amount || 0;
      const sal = p.distribution?.salary_pool || 0;
      csvContent += `"${p.payment_date}","${p.department}","${p.client_name.replace(/"/g, '""')}","${acc}",${p.payment_amount},${base},${gst},${sal},"${p.money_spent ? "YES" : "NO"}","${(p.notes || "").replace(/"/g, '""')}"\n`;
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Praavi_Payments_Ledger_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Payments Ledger</h1>
          <p className="text-sm text-slate-500">Log incoming invoices, inspect snapshot splits, and manage salary-pool spending states.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleExportCSV} 
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 shadow-sm"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
          {(userRole === "accountant" || userRole === "finance_head" || userRole === "admin") && (
            <button 
              onClick={() => setIsOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm shadow-emerald-950/20"
            >
              <Plus size={14} />
              <span>Log Client Payment</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-6">
          <button 
            onClick={() => setActiveTab("all")}
            className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
              activeTab === "all" ? "border-emerald-500 text-emerald-600" : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            All Departments ({payments.length})
          </button>
          <button 
            onClick={() => setActiveTab("web_dev")}
            className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
              activeTab === "web_dev" ? "border-emerald-500 text-emerald-600" : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            Web Development ({payments.filter(p => p.department === "web_dev").length})
          </button>
          <button 
            onClick={() => setActiveTab("digital_marketing")}
            className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
              activeTab === "digital_marketing" ? "border-emerald-500 text-emerald-600" : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            Digital Marketing ({payments.filter(p => p.department === "digital_marketing").length})
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients, notes..."
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <select 
          value={accountFilter} 
          onChange={(e) => setAccountFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 p-1.5 focus:outline-none"
        >
          <option value="">All Bank Accounts</option>
          {accounts.map(a => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>

        <select 
          value={gstFilter} 
          onChange={(e) => setGstFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 p-1.5 focus:outline-none"
        >
          <option value="">All GST States</option>
          <option value="with_gst">18% GST Accounts Only</option>
          <option value="no_gst">0% GST Savings Accounts</option>
        </select>

        <select 
          value={moneySpentFilter} 
          onChange={(e) => setMoneySpentFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 p-1.5 focus:outline-none"
        >
          <option value="">All Spending States</option>
          <option value="unspent">Active (In available pool)</option>
          <option value="spent">Spent (Excluded from pool)</option>
        </select>
      </div>

      {/* Grid List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredPayments.length === 0 ? (
          <div className="py-12 text-center text-slate-500 italic text-sm">
            No matching client payments logged. Create one using the action button above!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-3 pl-4">Payment Date</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Client Name</th>
                  <th className="p-3">Landed Account</th>
                  <th className="p-3">GST Type</th>
                  <th className="p-3">Total Inflow</th>
                  <th className="p-3">Salary Pool</th>
                  <th className="p-3 text-center">In Salary Pool?</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredPayments.map(p => {
                  const acc = accounts.find(a => a.id === p.landed_in_account_id)?.name || "Unknown";
                  const base = p.distribution?.base_amount || p.payment_amount;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 pl-4 font-mono font-medium text-slate-600">{p.payment_date}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          p.department === "web_dev" 
                            ? "bg-teal-50 text-teal-700 border-teal-200" 
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}>
                          {p.department === "web_dev" ? "Web Dev" : "DM Team"}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-slate-800">{p.client_name}</td>
                      <td className="p-3 text-slate-600 font-medium">{acc}</td>
                      <td className="p-3 font-mono text-xs">
                        {p.gst_type.toUpperCase()} ({p.gst_pct * 100}%)
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-900">{formatIndianCurrency(p.payment_amount)}</td>
                      <td className="p-3 font-mono font-bold text-slate-700">
                        {p.distribution ? formatIndianCurrency(p.distribution.salary_pool) : "N/A"}
                      </td>
                      <td className="p-3 text-center">
                        <button 
                          onClick={() => handleToggleSpent(p.id, p.money_spent)}
                          className="focus:outline-none"
                          title="Click to toggle availability in salary pool"
                        >
                          {p.money_spent ? (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-rose-50 border border-rose-200 text-rose-700 rounded-full font-bold">
                              No (Spent)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full font-bold">
                              Yes (Active)
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="p-3 text-center flex items-center justify-center gap-2">
                        <button 
                          onClick={() => {
                            setSelectedId(p.id);
                            setActivePage("payments_detail");
                          }} 
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                          title="Inspect Snapshots"
                        >
                          <Eye size={16} />
                        </button>
                        {userRole === "admin" && (
                          <button 
                            onClick={() => handleDelete(p.id)} 
                            className="p-1.5 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                            title="Delete Ledger Entry"
                          >
                            <Trash2 size={16} />
                          </button>
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

      <AddPaymentModal 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        onSuccess={fetchData} 
      />
    </div>
  );
}
