"use client";

import React, { useState } from "react";
import { UnifiedReportData, ReportFilterOptions } from "@/types";
import { reportsApi } from "@/lib/api/reports";
import { Button } from "@/components/ui/Button";
import {
  FileText,
  FileSpreadsheet,
  Download,
  Search,
  Calendar,
  Tractor,
  Layers,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
} from "lucide-react";

interface ReportPreviewTableProps {
  reportData: UnifiedReportData | null;
  filters: ReportFilterOptions;
  loading: boolean;
}

export function ReportPreviewTable({
  reportData,
  filters,
  loading,
}: ReportPreviewTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [downloadMessage, setDownloadMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Handle PDF Download
  const handleDownloadPdf = async () => {
    if (!reportData) return;
    setDownloadingPdf(true);
    setDownloadMessage(null);
    try {
      const res = await reportsApi.downloadPdf(filters);
      if (res.success) {
        setDownloadMessage({ type: "success", text: "PDF report downloaded successfully." });
      } else {
        setDownloadMessage({ type: "error", text: res.error || "Failed to download PDF." });
      }
    } catch {
      setDownloadMessage({ type: "error", text: "An error occurred while exporting PDF." });
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Handle Excel Download
  const handleDownloadExcel = async () => {
    if (!reportData) return;
    setDownloadingExcel(true);
    setDownloadMessage(null);
    try {
      const res = await reportsApi.downloadExcel(filters);
      if (res.success) {
        setDownloadMessage({ type: "success", text: "Excel spreadsheet downloaded successfully." });
      } else {
        setDownloadMessage({ type: "error", text: res.error || "Failed to download Excel." });
      }
    } catch {
      setDownloadMessage({ type: "error", text: "An error occurred while exporting Excel." });
    } finally {
      setDownloadingExcel(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center shadow-sm">
        <RefreshCw className="h-8 w-8 text-emerald-600 animate-spin mx-auto mb-3" />
        <h4 className="text-base font-semibold text-slate-800">Generating Report Preview...</h4>
        <p className="text-xs text-slate-500 mt-1">
          Querying authoritative database records and computing agronomic aggregations
        </p>
      </div>
    );
  }

  if (!reportData) return null;

  const { metadata, table_headers, table_rows, summary_cards } = reportData;

  // Filter rows by client-side search query
  const filteredRows = table_rows.filter((row) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return Object.values(row).some((val) =>
      String(val).toLowerCase().includes(query)
    );
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-8">
      {/* 1. Report Document Header Banner */}
      <div className="bg-slate-900 text-white p-5 border-b border-slate-800">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                {metadata.report_category.replace("_", " ")}
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(metadata.generated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} UTC
              </span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white">{metadata.report_title}</h2>
            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-300 mt-1.5">
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <Tractor className="h-3.5 w-3.5" />
                {metadata.farm_name}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-slate-300">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                {metadata.period.label}
              </span>
              <span>•</span>
              <span className="text-slate-300">
                <strong>{metadata.total_records}</strong> records analyzed
              </span>
            </div>
          </div>

          {/* Export Action Buttons */}
          <div className="flex items-center gap-2 self-stretch md:self-auto shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white text-xs"
            >
              {downloadingPdf ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Exporting PDF...
                </>
              ) : (
                <>
                  <FileText className="h-3.5 w-3.5 mr-1.5 text-rose-400" />
                  Download PDF
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadExcel}
              disabled={downloadingExcel}
              className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white text-xs"
            >
              {downloadingExcel ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Exporting Excel...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5 text-emerald-400" />
                  Download Excel
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Download notification banner */}
        {downloadMessage && (
          <div
            className={`mt-3 p-2.5 rounded-lg text-xs flex items-center gap-2 ${
              downloadMessage.type === "success"
                ? "bg-emerald-950/70 border border-emerald-800 text-emerald-200"
                : "bg-rose-950/70 border border-rose-800 text-rose-200"
            }`}
          >
            {downloadMessage.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            )}
            <span>{downloadMessage.text}</span>
          </div>
        )}
      </div>

      {/* 2. Specific Report KPI Summary Cards */}
      {summary_cards && Object.keys(summary_cards).length > 0 && (
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {Object.entries(summary_cards).map(([k, v]) => {
              const cleanKey = k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
              let displayVal = String(v);

              if (typeof v === "number") {
                if (
                  k.includes("revenue") ||
                  k.includes("income") ||
                  k.includes("profit") ||
                  k.includes("expenses") ||
                  k.includes("wage") ||
                  k.includes("paid") ||
                  k.includes("cost") ||
                  k.includes("value") ||
                  k.includes("outstanding")
                ) {
                  displayVal = `₹${Number(v).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`;
                } else if (k.includes("percentage") || k.includes("rate")) {
                  displayVal = `${Number(v).toFixed(1)}%`;
                } else if (k.includes("area")) {
                  displayVal = `${Number(v).toFixed(2)} acres`;
                } else {
                  displayVal = Number(v).toLocaleString("en-IN");
                }
              } else if (typeof v === "object" && v !== null) {
                displayVal = Object.entries(v)
                  .map(([subK, subV]) => `${subK}: ${subV}`)
                  .join(", ");
              }

              return (
                <div key={k} className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                  <p className="text-[11px] font-medium text-slate-500 truncate" title={cleanKey}>
                    {cleanKey}
                  </p>
                  <p className="text-sm font-bold text-slate-900 truncate mt-0.5" title={displayVal}>
                    {displayVal}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Search Bar for Table Rows */}
      <div className="p-3 border-b border-slate-200 bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Filter table rows..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
          />
        </div>
        <div className="text-xs text-slate-500">
          Showing <strong>{filteredRows.length}</strong> of {table_rows.length} records
        </div>
      </div>

      {/* 4. Table Preview */}
      <div className="overflow-x-auto">
        {filteredRows.length > 0 ? (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                <th className="py-2.5 px-3 font-semibold text-slate-500 uppercase tracking-wider text-[11px] w-12 text-center">
                  #
                </th>
                {table_headers.map((th, i) => (
                  <th
                    key={i}
                    className="py-2.5 px-3 font-semibold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap"
                  >
                    {th}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2.5 px-3 text-center text-slate-400 text-[11px] font-mono">
                    {rIdx + 1}
                  </td>
                  {table_headers.map((th, cIdx) => {
                    const cellVal = row[th];
                    const valStr = cellVal !== undefined && cellVal !== null ? String(cellVal) : "-";

                    // Badge formatting for statuses
                    const lower = valStr.toLowerCase();
                    const isStatusCol = th.toLowerCase().includes("status");

                    let badgeColor = "";
                    if (isStatusCol) {
                      if (lower.includes("paid") && !lower.includes("unpaid")) {
                        badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
                      } else if (lower.includes("growing") || lower.includes("active") || lower.includes("available")) {
                        badgeColor = "bg-blue-50 text-blue-700 border-blue-200";
                      } else if (lower.includes("unpaid") || lower.includes("failed") || lower.includes("retired")) {
                        badgeColor = "bg-rose-50 text-rose-700 border-rose-200";
                      } else if (lower.includes("pending") || lower.includes("maintenance")) {
                        badgeColor = "bg-amber-50 text-amber-700 border-amber-200";
                      }
                    }

                    // Monetary highlight
                    const isMonetary = valStr.startsWith("₹");

                    return (
                      <td key={cIdx} className="py-2.5 px-3 whitespace-nowrap text-slate-700">
                        {isStatusCol && badgeColor ? (
                          <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${badgeColor}`}>
                            {valStr}
                          </span>
                        ) : isMonetary ? (
                          <span className="font-semibold text-slate-900">{valStr}</span>
                        ) : (
                          valStr
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-8 text-center bg-slate-50/40">
            <Layers className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <h5 className="text-sm font-semibold text-slate-700">No Records Found</h5>
            <p className="text-xs text-slate-500 mt-1">
              No data matches your current date range and filter criteria. Try selecting &quot;All Time&quot; or clearing plot filters.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ReportPreviewTable;

