/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { 
  ShieldAlert, RefreshCw, Eye, EyeOff, Search, Calendar, User
} from "lucide-react";
import { api } from "../services/api";

export default function AuditLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search filter
  const [search, setSearch] = useState("");

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.auditLogs.getAll();
      setLogs(res);
    } catch (err: any) {
      setError(err.message || "Failed to retrieve audit trail.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getLogDetails = (log: any) => {
    if (log.field_name) {
      return `Updated field "${log.field_name}" on ${log.entity_type} (ID: ${log.entity_id}) from "${log.old_value ?? ''}" to "${log.new_value ?? ''}"`;
    }
    return `Administrative action on ${log.entity_type || 'system'} (ID: ${log.entity_id || 'n/a'})`;
  };

  const filteredLogs = logs.filter(log => {
    const q = search.toLowerCase();
    const userName = (log.user_name || "").toLowerCase();
    const action = (log.action || "").toLowerCase();
    const details = getLogDetails(log).toLowerCase();
    return userName.includes(q) || action.includes(q) || details.includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Security Audit Logs</h1>
          <p className="text-sm text-slate-500">Chronological history of ledger updates, bookkeeping transfers, settings overrides, and administrative sign-ins.</p>
        </div>
        <button 
          onClick={fetchLogs} 
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 shadow-sm transition-all"
        >
          <RefreshCw size={12} />
          <span>Sync Audit Trail</span>
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <span className="absolute left-3 top-2 text-slate-400">
            <Search size={16} />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter audit logs by email, action, or metadata detail..."
            className="w-full pl-9 pr-4 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="h-64 bg-slate-150 rounded-xl animate-pulse" />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm italic">
              No audit logs matched the search criteria.
            </div>
          ) : (
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                    <th className="p-3 pl-4">Timestamp (UTC)</th>
                    <th className="p-3">Triggering Accountant</th>
                    <th className="p-3">Operational Action</th>
                    <th className="p-3">Detailed Parameters / Reference Notes</th>
                    <th className="p-3">Access IP/Node</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px] font-semibold text-slate-600">
                  {filteredLogs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 pl-4 font-mono font-medium text-slate-500">
                        {new Date(log.created_at).toLocaleString("en-IN")}
                      </td>
                      <td className="p-3 flex items-center gap-1.5 font-bold text-slate-700">
                        <User size={12} className="text-slate-400" />
                        <span>{log.user_name || "System"}</span>
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 text-slate-700 border rounded font-mono uppercase tracking-wide">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3 text-slate-700 leading-normal font-medium">{getLogDetails(log)}</td>
                      <td className="p-3 font-mono text-slate-400">3000 Ingress</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
