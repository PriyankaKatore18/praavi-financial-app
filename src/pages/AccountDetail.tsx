/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { 
  ArrowLeft, RefreshCw, AlertCircle, TrendingUp, TrendingDown, 
  ArrowRightLeft, FileText, Send, CheckSquare, Coins, HelpCircle, Plus
} from "lucide-react";
import { api } from "../services/api";
import { formatIndianCurrency } from "../domain/finance/calculations";
import AddPaymentModal from "../components/AddPaymentModal";

interface AccountDetailProps {
  accountId: string;
  onBack: () => void;
}

export default function AccountDetail({ accountId, onBack }: AccountDetailProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.accounts.getById(accountId);
      setData(res);
    } catch (err: any) {
      setError(err.message || "Failed to load account ledger history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [accountId]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-1/4" />
        <div className="h-32 bg-slate-200 rounded-xl" />
        <div className="h-64 bg-slate-200 rounded-xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center max-w-lg mx-auto mt-12">
        <AlertCircle className="mx-auto text-rose-500 mb-3" size={40} />
        <h3 className="font-bold text-slate-900">Failed to Load Statement</h3>
        <p className="text-sm text-slate-600 mt-1 mb-4">{error}</p>
        <button onClick={onBack} className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-semibold hover:bg-rose-505">
          Back to Accounts
        </button>
      </div>
    );
  }

  const { account, history } = data;

  // Aggregate all transactions chronologically
  const items: any[] = [];

  // 1. Landed Payments Inflow
  if (history.payments) {
    history.payments.forEach((p: any) => {
      items.push({
        id: `p-${p.id}`,
        date: p.payment_date,
        type: "Payment Inflow",
        icon: FileText,
        color: "text-emerald-600 bg-emerald-50",
        description: `Client Invoiced: ${p.client_name}`,
        flow: "inflow",
        amount: p.payment_amount
      });
    });
  }

  // 2. Manual Transfers (Outflow or Inflow depending on source vs target)
  if (history.manual_transfers) {
    history.manual_transfers.forEach((t: any) => {
      const isInflow = t.to_account_id === accountId;
      items.push({
        id: `mt-${t.id}`,
        date: t.date,
        type: "Manual Transfer",
        icon: ArrowRightLeft,
        color: isInflow ? "text-blue-600 bg-blue-50" : "text-slate-600 bg-slate-50",
        description: isInflow 
          ? `Received cash from: ${t.from_account_id.replace("ba-", "").toUpperCase()} (${t.purpose})`
          : `Sent cash to: ${t.to_account_id.replace("ba-", "").toUpperCase()} (${t.purpose})`,
        flow: isInflow ? "inflow" : "outflow",
        amount: t.amount
      });
    });
  }

  // 3. Distribution Transfers (Outflow or Inflow depending on source vs target)
  if (history.distribution_transfers) {
    history.distribution_transfers.forEach((t: any) => {
      const isInflow = t.destination_account_id === accountId || t.marketing_card_id === accountId;
      items.push({
        id: `dt-${t.id}`,
        date: t.updated_at ? t.updated_at.substring(0, 10) : t.created_at.substring(0, 10),
        type: "Distribution Route",
        icon: Coins,
        color: isInflow ? "text-emerald-600 bg-emerald-50" : "text-slate-600 bg-slate-50",
        description: isInflow
          ? `Routed from client invoice landed in: ${t.source_account_id.replace("ba-", "").toUpperCase()}`
          : `Routed to sub-account: ${t.destination_account_id ? t.destination_account_id.replace("ba-", "").toUpperCase() : t.marketing_card_id}`,
        flow: isInflow ? "inflow" : "outflow",
        amount: t.amount
      });
    });
  }

  // 4. Reimbursements
  if (history.reimbursements) {
    history.reimbursements.forEach((r: any) => {
      if (r.spent_from_account_id === accountId) {
        items.push({
          id: `re-spent-${r.id}`,
          date: r.date,
          type: "Personal Expenses Claim",
          icon: Send,
          color: "text-rose-600 bg-rose-50",
          description: `Spent claim: ${r.category_note} (${r.purpose})`,
          flow: "outflow",
          amount: r.amount
        });
      }
      if (r.reimbursed_by_account_id === accountId && r.status === "approved") {
        items.push({
          id: `re-settled-${r.id}`,
          date: r.date,
          type: "Reimbursement Settled",
          icon: Send,
          color: "text-slate-600 bg-slate-50",
          description: `Settled claim: ${r.category_note} (${r.purpose})`,
          flow: "outflow",
          amount: r.amount
        });
      }
    });
  }

  // 5. Payroll disbursements
  if (history.payrolls) {
    history.payrolls.forEach((p: any) => {
      items.push({
        id: `pr-${p.id}`,
        date: p.paid_date ? p.paid_date.substring(0, 10) : p.scheduled_date,
        type: "Salary Disbursement",
        icon: CheckSquare,
        color: "text-rose-600 bg-rose-50",
        description: `Contractor salary paid: ${p.employee_name}`,
        flow: "outflow",
        amount: p.amount
      });
    });
  }

  // 6. Arrears disbursements
  if (history.arrears) {
    history.arrears.forEach((a: any) => {
      items.push({
        id: `ar-${a.id}`,
        date: a.date_paid ? a.date_paid.substring(0, 10) : a.entry_date,
        type: "Arrears Disbursement",
        icon: Coins,
        color: "text-rose-600 bg-rose-50",
        description: `Outstanding arrears paid: ${a.employee_name}`,
        flow: "outflow",
        amount: a.amount_owed
      });
    });
  }

  // 7. Drawings logs
  if (history.drawings) {
    history.drawings.forEach((d: any) => {
      items.push({
        id: `dr-${d.id}`,
        date: d.drawing_date,
        type: "Drawing Log",
        icon: HelpCircle,
        color: "text-rose-600 bg-rose-50",
        description: `Cash withdrawal / Card spend: ${d.category} (${d.purpose})`,
        flow: "outflow",
        amount: d.amount
      });
    });
  }

  // Sort descending chronologically
  const sortedItems = items.sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack} 
            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-all shadow-xs shrink-0"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{account.name} Statement</h1>
            <p className="text-xs text-slate-500 font-mono uppercase tracking-wider">Account ID: {accountId} | Ledger Transactions List</p>
          </div>
        </div>
        
        {accountId.startsWith("ba-") && (
          <button 
            onClick={() => setIsAddPaymentOpen(true)} 
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 border border-emerald-700 rounded-lg text-xs font-bold text-white hover:bg-emerald-500 shadow-sm transition-all self-start sm:self-auto"
          >
            <Plus size={12} />
            <span>Log Client Inflow</span>
          </button>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Opening cash</span>
          <h4 className="font-mono text-base font-bold text-slate-700 mt-1">{formatIndianCurrency(account.opening_balance)}</h4>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Computed Book Balance</span>
          <h4 className="font-mono text-base font-bold text-slate-900 mt-1">{formatIndianCurrency(account.sheet_balance)}</h4>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Variance</span>
            <h4 className={`font-mono text-base font-bold mt-1 ${account.variance !== 0 ? "text-amber-600" : "text-emerald-600"}`}>
              {formatIndianCurrency(account.variance)}
            </h4>
          </div>
          <span className={`px-2 py-0.5 rounded text-[9px] font-mono border uppercase font-bold ${
            account.variance !== 0 ? "bg-amber-100 text-amber-800 border-amber-200" : "bg-emerald-100 text-emerald-800 border-emerald-200"
          }`}>
            {account.variance !== 0 ? "discrepancy" : "reconciled"}
          </span>
        </div>
      </div>

      {/* Chronological ledger table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Chronological Transaction Log</h3>
          <button onClick={fetchDetail} className="text-slate-400 hover:text-slate-700">
            <RefreshCw size={14} className="animate-spin-once" />
          </button>
        </div>

        {sortedItems.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm italic">
            No transactions found affecting this account's cash flow ledger.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-3 pl-4">Value Date</th>
                  <th className="p-3">Category Type</th>
                  <th className="p-3">Transaction Description / Reference Notes</th>
                  <th className="p-3 text-right pr-6">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {sortedItems.map(item => {
                  const Icon = item.icon;
                  const isInflow = item.flow === "inflow";
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 pl-4 font-mono font-medium text-slate-500">{item.date}</td>
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${
                          isInflow ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-700 border-slate-200"
                        }`}>
                          <Icon size={10} />
                          <span>{item.type}</span>
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-slate-700 leading-normal">{item.description}</td>
                      <td className={`p-3 text-right pr-6 font-mono font-bold ${
                        isInflow ? "text-emerald-600" : "text-slate-900"
                      }`}>
                        {isInflow ? "+" : "-"}{formatIndianCurrency(item.amount)}
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
        isOpen={isAddPaymentOpen} 
        onClose={() => setIsAddPaymentOpen(false)} 
        onSuccess={fetchDetail} 
        initialAccountId={accountId}
      />
    </div>
  );
}
