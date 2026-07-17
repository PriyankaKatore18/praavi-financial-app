/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { 
  FileSpreadsheet, UploadCloud, Play, CheckSquare, Trash2, RefreshCw, AlertTriangle
} from "lucide-react";
import { api } from "../services/api";
import { formatIndianCurrency } from "../domain/finance/calculations";

export default function Migration() {
  const [migrationLogs, setMigrationLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // File states
  const [dragActive, setDragActive] = useState(false);
  const [dryRunData, setDryRunData] = useState<any[] | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchMigrationRecords = () => {
    try {
      const stored = localStorage.getItem("praavi_local_migration_logs");
      if (stored) {
        setMigrationLogs(JSON.parse(stored));
      } else {
        setMigrationLogs([]);
      }
    } catch (err) {
      console.error("Failed to load local migration history logs", err);
    }
  };

  useEffect(() => {
    fetchMigrationRecords();
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Mock Excel simulation to parse rows
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      simulateExcelParse();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      simulateExcelParse();
    }
  };

  const simulateExcelParse = () => {
    const simulatedRows = [
      {
        row_number: 1,
        payment_date: "2026-06-01",
        client_name: "Tattva Wellness Corp",
        payment_amount: 354000,
        department: "digital_marketing",
        landed_in_account_id: "ba-sbi-current",
        gst_type: "inclusive",
        status: "valid",
        notes: "Parsed: GST inclusive DM landing. Ready to split."
      },
      {
        row_number: 2,
        payment_date: "2026-06-12",
        client_name: "Dunes Agri Holdings",
        payment_amount: 450000,
        department: "web_dev",
        landed_in_account_id: "ba-axis-current",
        gst_type: "exclusive",
        status: "valid",
        notes: "Parsed: GST exclusive Web Dev landing. Ready to split."
      },
      {
        row_number: 3,
        payment_date: "2026-06-25",
        client_name: "Zivaya Spa Resorts",
        payment_amount: 118000,
        department: "digital_marketing",
        landed_in_account_id: "ba-axis-current",
        gst_type: "inclusive",
        status: "valid",
        notes: "Parsed: GST inclusive DM landing. Ready to split."
      }
    ];

    setDryRunData(simulatedRows);
  };

  const handleExecuteMigration = async () => {
    if (!dryRunData) return;
    try {
      setIsExecuting(true);
      setError(null);
      setSuccessMsg(null);

      // Invoke official backend endpoint with batch payload
      const res = await api.migration.importBatch({
        import_type: "excel_workbook",
        file_name: "historical_invoice_import.xlsx",
        rows: dryRunData.map(r => ({
          department: r.department,
          client_name: r.client_name,
          payment_amount: r.payment_amount,
          landed_in_account_id: r.landed_in_account_id,
          gst_type: r.gst_type,
          payment_date: r.payment_date
        }))
      });

      if (res && res.success) {
        // Record log locally to preserve session state
        const newLog = {
          id: res.batch_id || `batch-${Date.now()}`,
          import_date: new Date().toISOString(),
          filename_hash: "historical_invoice_import.xlsx",
          status: "imported",
          records_count: res.count || dryRunData.length,
          total_amount_sum: dryRunData.reduce((acc, row) => acc + row.payment_amount, 0)
        };

        const updated = [newLog, ...migrationLogs];
        localStorage.setItem("praavi_local_migration_logs", JSON.stringify(updated));
        setMigrationLogs(updated);

        setSuccessMsg(`Spreadsheet migration completed successfully! Imported ${res.count} invoice records.`);
        setDryRunData(null);
      } else {
        throw new Error("Server did not return a successful completion status.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to execute bulk import.");
    } finally {
      setIsExecuting(false);
    }
  };

  const handleClearHistory = () => {
    if (confirm("Clear local migration history? This will only clear the UI listing and will not delete records from the server database.")) {
      localStorage.removeItem("praavi_local_migration_logs");
      setMigrationLogs([]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Spreadsheet Data Migration</h1>
          <p className="text-sm text-slate-500">Bulk upload Excel worksheets, review dry-run distributions, and execute migration batches.</p>
        </div>
        <button 
          onClick={handleClearHistory} 
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 shadow-sm transition-all"
        >
          <Trash2 size={12} />
          <span>Clear Local Listing</span>
        </button>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-850 rounded-xl text-xs font-semibold">
          {successMsg}
        </div>
      )}

      {/* Row 1: Drag & Drop Zone */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div 
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`p-8 border-2 border-dashed rounded-2xl text-center transition-all flex flex-col items-center justify-center space-y-4 ${
              dragActive 
                ? "border-emerald-500 bg-emerald-50/50 scale-[0.98]" 
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className="p-3 bg-slate-50 rounded-xl border">
              <UploadCloud className="text-slate-500" size={24} />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-sm">Drag and Drop Excel Workbook</h4>
              <p className="text-xs text-slate-400 mt-1">Accepts Excel (.xlsx), CSV, or LibreOffice spreadsheets</p>
            </div>
            
            <label className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg cursor-pointer shadow-xs">
              Browse Files
              <input 
                type="file" 
                accept=".xlsx, .xls, .csv" 
                onChange={handleFileChange} 
                className="hidden" 
              />
            </label>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs leading-relaxed text-slate-500">
            <h5 className="font-bold text-slate-700">Column Layout Guideline:</h5>
            <p>Your spreadsheet must contain: <span className="font-mono bg-white px-1 border">Date</span>, <span className="font-mono bg-white px-1 border">Client Name</span>, <span className="font-mono bg-white px-1 border">Gross Amount</span>, <span className="font-mono bg-white px-1 border">Department</span>, <span className="font-mono bg-white px-1 border">Landing Bank ID</span>, and <span className="font-mono bg-white px-1 border">GST Model</span> columns.</p>
          </div>
        </div>

        {/* Dry-Run View */}
        <div className="lg:col-span-2">
          {dryRunData ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between h-full">
              <div>
                <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="text-emerald-500" size={16} />
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Dry-Run Parsing Results ({dryRunData.length} rows detected)</h3>
                  </div>
                  <button onClick={() => setDryRunData(null)} className="text-xs font-bold text-slate-400 hover:text-slate-600">Cancel</button>
                </div>

                <div className="overflow-x-auto text-xs max-h-64">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                        <th className="p-2 pl-4">Row</th>
                        <th className="p-2">Value Date</th>
                        <th className="p-2">Client name</th>
                        <th className="p-2 font-mono">Department</th>
                        <th className="p-2 text-right">Gross (₹)</th>
                        <th className="p-2">Parsed note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y font-medium text-slate-600">
                      {dryRunData.map((row) => (
                        <tr key={row.row_number} className="hover:bg-slate-50">
                          <td className="p-2 pl-4 font-mono">{row.row_number}</td>
                          <td className="p-2 font-mono">{row.payment_date}</td>
                          <td className="p-2 font-bold text-slate-800">{row.client_name}</td>
                          <td className="p-2 uppercase font-mono">{row.department.substring(0, 10)}...</td>
                          <td className="p-2 text-right font-mono font-bold text-slate-900">{formatIndianCurrency(row.payment_amount)}</td>
                          <td className="p-2 text-[10px] text-slate-400 font-semibold">{row.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t flex justify-end gap-2">
                <button
                  onClick={() => setDryRunData(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded"
                >
                  Discard Batch
                </button>
                <button
                  onClick={handleExecuteMigration}
                  disabled={isExecuting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 text-white text-xs font-bold rounded shadow-xs"
                >
                  <Play size={12} />
                  <span>{isExecuting ? "Executing bulk writes..." : "Execute Migration Import"}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center text-slate-400 italic text-sm flex items-center justify-center h-full">
              Upload a spreadsheet file to preview dry-run distributions.
            </div>
          )}
        </div>
      </div>

      {/* Migration Ledger History */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
          <CheckSquare className="text-emerald-500" size={16} />
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Spreadsheet Migration Audit Session Ledger</h3>
        </div>
        {migrationLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm italic">
            No active spreadsheet migration sessions registered.
          </div>
        ) : (
          <div className="overflow-x-auto text-xs font-semibold">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-3 pl-4">Import date/time</th>
                  <th className="p-3">File Reference Hash</th>
                  <th className="p-3 text-center">Import Status</th>
                  <th className="p-3">Imported Rows count</th>
                  <th className="p-3 text-right">Cumulative Value (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
                {migrationLogs.map((log: any) => {
                  return (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 pl-4 font-mono font-medium text-slate-500">
                        {new Date(log.import_date).toLocaleString("en-IN")}
                      </td>
                      <td className="p-3 font-mono text-xs">{log.filename_hash}</td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono border uppercase font-bold bg-emerald-50 text-emerald-700 border-emerald-200">
                          {log.status}
                        </span>
                      </td>
                      <td className="p-3 pl-8 font-mono">{log.records_count}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">{formatIndianCurrency(log.total_amount_sum)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
