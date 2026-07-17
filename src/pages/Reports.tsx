/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { 
  FileSpreadsheet, Printer, RefreshCw, Landmark, Download, Eye, FileText, CheckCircle2
} from "lucide-react";
import { api } from "../services/api";
import { formatIndianCurrency } from "../domain/finance/calculations";

export default function Reports() {
  const [metrics, setMetrics] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeReport, setActiveReport] = useState<"pl" | "tax" | "reconcile">("pl");

  const fetchReportsData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [mRes, aRes] = await Promise.all([
        api.dashboard.getSummary(),
        api.accounts.getAll()
      ]);
      setMetrics(mRes);
      setAccounts(aRes);
    } catch (err: any) {
      setError(err.message || "Failed to load audit metrics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsData();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/4" />
        <div className="h-96 bg-slate-200 rounded-xl" />
      </div>
    );
  }

  // Derived tax summary
  const totalGstLanded = metrics?.totals?.gst_holding || 0;
  const totalTdsWithheld = metrics?.totals?.tds_withheld || 0;
  const netCorporateProfit = metrics?.totals?.profit_holding || 0;
  const totalOwedArrears = metrics?.arrears_outstanding || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tax & Corporate Filings Reports</h1>
          <p className="text-sm text-slate-500">Generate formatted financial summaries, active GST liabilities tables, and bank statement variance sheets.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 shadow-sm transition-all"
          >
            <Printer size={12} />
            <span>Print Report Sheet</span>
          </button>
          <button 
            onClick={fetchReportsData} 
            className="p-1.5 bg-white border rounded-lg text-slate-500 hover:text-slate-800"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Selector Grid tabs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => setActiveReport("pl")}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeReport === "pl" ? "bg-emerald-50/50 border-emerald-500 shadow-xs" : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider mb-1">Monthly Ledger Report</span>
          <h4 className="text-sm font-bold text-slate-800">Profit & Loss Summary</h4>
          <span className="text-xs text-slate-400 font-medium">Revenues vs overheads breakdown.</span>
        </button>

        <button
          onClick={() => setActiveReport("tax")}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeReport === "tax" ? "bg-emerald-50/50 border-emerald-500 shadow-xs" : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider mb-1">GST & TDS Schedules</span>
          <h4 className="text-sm font-bold text-slate-800">Tax Filing Declarations</h4>
          <span className="text-xs text-slate-400 font-medium">Landed GST holding vs TDS assets.</span>
        </button>

        <button
          onClick={() => setActiveReport("reconcile")}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeReport === "reconcile" ? "bg-emerald-50/50 border-emerald-500 shadow-xs" : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider mb-1">Bank Statement Variance</span>
          <h4 className="text-sm font-bold text-slate-800">Reconciliation Sheets</h4>
          <span className="text-xs text-slate-400 font-medium">Identify ledger statement discrepancies.</span>
        </button>
      </div>

      {/* Printable Report Worksheet */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6 max-w-4xl mx-auto space-y-8" id="printable-area">
        {/* Worksheet Letterhead */}
        <div className="flex justify-between items-start border-b pb-6">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">PRAAVI CONSULTANTS PRIVATE LIMITED</h2>
            <p className="text-xs font-mono text-slate-500 uppercase tracking-wider">Financial Audit Worksheet | 3000 Ingress Node</p>
            <p className="text-[10px] text-slate-400">GSTIN: 07AAFCP9201L1ZS | Corporate Head Office, New Delhi</p>
          </div>
          <div className="text-right text-xs text-slate-500 font-medium space-y-0.5">
            <div>Filing Quarter: <span className="font-bold text-slate-800">Q1 FY26</span></div>
            <div>Generated: <span className="font-mono">{new Date().toLocaleDateString("en-IN")}</span></div>
            <span className="inline-flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full font-bold uppercase mt-1">
              <CheckCircle2 size={8} />
              <span>Certified Audit Ready</span>
            </span>
          </div>
        </div>

        {activeReport === "pl" && (
          /* Report 1: P&L Summary */
          <div className="space-y-6">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-1.5">Profit & Loss Bookkeeping Ledger</h3>
            
            <div className="space-y-3 text-sm text-slate-700">
              <div className="flex justify-between font-medium border-b py-2">
                <span>Gross Revenue Client Billing Inflows (Base + GST additions):</span>
                <span className="font-mono font-bold text-slate-900">{formatIndianCurrency(metrics.totals?.gross_received || 0)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500 py-1 pl-4">
                <span>Less: Accumulated GST Liabilities holding (To settle with government):</span>
                <span className="font-mono text-slate-950">-{formatIndianCurrency(totalGstLanded)}</span>
              </div>
              <div className="flex justify-between font-semibold border-b py-2">
                <span>Net Operating Revenue Inflow:</span>
                <span className="font-mono text-slate-900">{formatIndianCurrency(metrics.totals?.net_revenue || 0)}</span>
              </div>
              <div className="flex justify-between text-slate-600 py-2">
                <span>Disbursed Contractors/Employee Base Salaries:</span>
                <span className="font-mono font-semibold">-{formatIndianCurrency(metrics.totals?.payroll_paid || 0)}</span>
              </div>
              <div className="flex justify-between text-slate-600 py-2">
                <span>Total Settled Personal Expenses Reimbursements:</span>
                <span className="font-mono font-semibold">-{formatIndianCurrency(metrics.totals?.reimbursements_paid || 0)}</span>
              </div>
              <div className="flex justify-between text-slate-600 border-b pb-3 py-2">
                <span>Partners Drawing Outflows:</span>
                <span className="font-mono font-semibold">-{formatIndianCurrency(metrics.totals?.drawings_paid || 0)}</span>
              </div>
              <div className="flex justify-between font-bold text-emerald-700 bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100 text-base">
                <span>Net Corporate Retained Earnings Balance (Profit + Reserve holding):</span>
                <span className="font-mono">{formatIndianCurrency(netCorporateProfit)}</span>
              </div>
            </div>
          </div>
        )}

        {activeReport === "tax" && (
          /* Report 2: GST & TDS Schedules */
          <div className="space-y-6">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-1.5">Tax Filing & Hold Liabilities</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="p-4 bg-slate-50 rounded-xl border space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">GST Hold Reserves (Awaiting Settle)</span>
                <h4 className="font-mono text-lg font-bold text-slate-800">{formatIndianCurrency(totalGstLanded)}</h4>
                <p className="text-[10px] text-slate-500">Accumulated 18% GST tax landed from inclusive & exclusive client billing invoices.</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">TDS Assets (withheld by clients)</span>
                <h4 className="font-mono text-lg font-bold text-slate-800">{formatIndianCurrency(totalTdsWithheld)}</h4>
                <p className="text-[10px] text-slate-500">Cumulative 10% TDS assets withheld at source from client payments.</p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-500 leading-normal">
              <div>* Enforces strict compliance with Indian financial regulations.</div>
              <div>* Praavi Accountants must verify client Form 26AS matching logs once per quarter to claim the TDS credit of <span className="font-bold text-slate-800">{formatIndianCurrency(totalTdsWithheld)}</span>.</div>
            </div>
          </div>
        )}

        {activeReport === "reconcile" && (
          /* Report 3: Reconciliation Discrepancy report */
          <div className="space-y-6">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-1.5">Reconciliation Statement: Bookkeeping vs Statement Physicals</h3>
            
            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                    <th className="p-3 pl-4">Bank Ledger Item</th>
                    <th className="p-3">Computed Cash</th>
                    <th className="p-3">Physical statement Cash</th>
                    <th className="p-3 text-right pr-4">Variance Discrepancy (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-slate-700 font-medium">
                  {accounts.map(acc => {
                    const isDiscrepancy = acc.variance !== 0;
                    return (
                      <tr key={acc.id} className="hover:bg-slate-50">
                        <td className="p-3 pl-4 font-bold text-slate-800">{acc.name}</td>
                        <td className="p-3 font-mono">{formatIndianCurrency(acc.sheet_balance)}</td>
                        <td className="p-3 font-mono">{formatIndianCurrency(acc.actual_balance)}</td>
                        <td className={`p-3 text-right pr-4 font-mono font-bold ${isDiscrepancy ? "text-amber-600" : "text-emerald-600"}`}>
                          {isDiscrepancy ? formatIndianCurrency(acc.variance) : "Balanced (0.00)"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Audit Sign-off lines */}
        <div className="grid grid-cols-2 gap-12 pt-12 border-t text-xs font-semibold text-slate-500 text-center">
          <div className="space-y-12">
            <div className="h-0.5 bg-slate-200 max-w-xs mx-auto" />
            <div>Prepared By: Accountant Partner Signature</div>
          </div>
          <div className="space-y-12">
            <div className="h-0.5 bg-slate-200 max-w-xs mx-auto" />
            <div>Approved By: Director/Finance Head Authorization</div>
          </div>
        </div>
      </div>
    </div>
  );
}
