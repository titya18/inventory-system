import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import dayjs from "dayjs";
import { SlidersHorizontal, Search, History } from "lucide-react";
import Pagination from "../components/Pagination";
import VisibleColumnsSelector from "@/components/VisibleColumnsSelector";
import ExportDropdown from "@/components/ExportDropdown";
import { AssetReportRow, BranchType } from "@/data_types/types";
import { getAssetReport, getAssetSaleHistory, AssetSaleHistoryItem } from "@/api/stock";
import { getAllBranches } from "@/api/branch";
import { useAppContext } from "@/hooks/useAppContext";

const columns = ["No", "Product", "Type", "SKU", "Barcode", "Branch", "Serial No", "Asset Code", "MAC Address", "Status", "Created At"];

const statusBadge = (status: string) => {
  switch (status) {
    case "IN_STOCK":    return "badge bg-success";
    case "SOLD":        return "badge bg-danger";
    case "RESERVED":    return "badge bg-warning";
    case "TRANSFERRED": return "badge bg-info";
    case "DAMAGED":     return "badge bg-dark";
    case "LOST":        return "badge bg-dark";
    default:            return "badge bg-secondary";
  }
};

const AssetReport: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState<AssetReportRow[]>([]);
  const [branches, setBranches] = useState<BranchType[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [visibleCols, setVisibleCols] = useState(columns);

  // History modal
  const [historyRow, setHistoryRow] = useState<AssetReportRow | null>(null);
  const [historyItems, setHistoryItems] = useState<AssetSaleHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const { user } = useAppContext();

  const search = searchParams.get("search") || "";
  const page = Number(searchParams.get("page") || 1);
  const pageSize = Number(searchParams.get("pageSize") || 20);
  const selectedBranch = searchParams.get("branchId") ? Number(searchParams.get("branchId")) : undefined;
  const selectedStatus = searchParams.get("status") || "";
  const selectedTracking = searchParams.get("trackingType") || "";

  const updateParams = (params: Record<string, any>) => {
    const p = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([k, v]) => {
      if (!v) p.delete(k); else p.set(k, String(v));
    });
    setSearchParams(p);
  };

  const fetchBranches = useCallback(async () => {
    try {
      const data = await getAllBranches();
      setBranches(data as BranchType[]);
    } catch {}
  }, []);

  useEffect(() => { fetchBranches(); }, [fetchBranches]);

  useEffect(() => {
    const branchId = selectedBranch || undefined;
    setLoading(true);
    getAssetReport(page, pageSize, search || undefined, branchId, selectedStatus || undefined, selectedTracking || undefined)
      .then((res) => {
        setRows(res.data || []);
        setTotal(res.pagination?.total || 0);
        setSummary(res.summary || {});
      })
      .catch(() => { setRows([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [search, page, pageSize, selectedBranch, selectedStatus, selectedTracking]);

  const openHistory = async (r: AssetReportRow) => {
    setHistoryRow(r);
    setHistoryItems([]);
    setHistoryLoading(true);
    try {
      const data = await getAssetSaleHistory(r.id);
      setHistoryItems(data);
    } catch {
      setHistoryItems([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const exportData = useMemo(() => rows.map((r, i) => ({
    No: (page - 1) * pageSize + i + 1,
    Product: r.productName,
    Type: r.productType,
    SKU: r.sku,
    Barcode: r.barcode || "",
    Branch: r.branchName,
    "Serial No": r.serialNumber || "",
    "Asset Code": r.assetCode || "",
    "MAC Address": r.macAddress || "",
    Status: r.status,
    "Created At": dayjs(r.createdAt).format("DD/MMM/YYYY HH:mm"),
  })), [rows, page, pageSize]);

  const totalItems = Object.values(summary).reduce((a, b) => a + b, 0);

  return (
    <div className="pt-0">
      <div className="space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          {[
            { label: "Total",        value: totalItems,                                                cls: "" },
            { label: "In Stock",     value: summary["IN_STOCK"]    || 0,                              cls: "text-green-600" },
            { label: "Sold",         value: summary["SOLD"]        || 0,                              cls: "text-red-600" },
            { label: "Reserved",     value: summary["RESERVED"]    || 0,                              cls: "text-yellow-600" },
            { label: "Transferred",  value: summary["TRANSFERRED"] || 0,                              cls: "text-blue-600" },
            { label: "Damaged/Lost", value: (summary["DAMAGED"] || 0) + (summary["LOST"] || 0),       cls: "text-gray-600" },
          ].map((c) => (
            <div key={c.label} className="panel py-3 px-4">
              <div className="text-xs text-gray-500">{c.label}</div>
              <div className={`text-xl font-bold ${c.cls}`}>{c.value}</div>
            </div>
          ))}
        </div>

        <div className="panel">
          <div className="dataTable-wrapper dataTable-loading no-footer sortable searchable">
            <div className="flex flex-col gap-2 mb-4">
              {/* Row 1: filter bar + actions */}
              <div className="flex items-center gap-2">
                <div className="flex items-center flex-1 border rounded-lg px-3 py-1.5 gap-2 min-w-0">
                  <div className="flex items-center gap-1 text-gray-500 shrink-0">
                    <SlidersHorizontal size={14} />
                    <span className="text-xs font-semibold uppercase tracking-wide">Filter</span>
                  </div>
                  <div className="h-5 border-l border-gray-300 shrink-0" />
                  <Search size={14} className="text-gray-400 shrink-0" />
                  <input
                    type="text"
                    className="flex-1 outline-none text-sm bg-transparent min-w-0"
                    placeholder="Search product, serial, asset, MAC..."
                    value={search}
                    onChange={(e) => updateParams({ search: e.target.value, page: 1 })}
                  />
                  <div className="hidden sm:flex items-center gap-2 shrink-0">
                    {user?.roleType === "ADMIN" && (
                      <select value={selectedBranch || ""} onChange={(e) => updateParams({ branchId: e.target.value, page: 1 })} className="border rounded-md px-2 py-1 text-sm outline-none cursor-pointer bg-white">
                        <option value="">All Branches</option>
                        {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    )}
                    <select value={selectedStatus} onChange={(e) => updateParams({ status: e.target.value, page: 1 })} className="border rounded-md px-2 py-1 text-sm outline-none cursor-pointer bg-white">
                      <option value="">All Status</option>
                      <option value="IN_STOCK">In Stock</option>
                      <option value="SOLD">Sold</option>
                      <option value="RESERVED">Reserved</option>
                      <option value="TRANSFERRED">Transferred</option>
                      <option value="DAMAGED">Damaged</option>
                      <option value="LOST">Lost</option>
                      <option value="REMOVED">Removed</option>
                    </select>
                    <select value={selectedTracking} onChange={(e) => updateParams({ trackingType: e.target.value, page: 1 })} className="border rounded-md px-2 py-1 text-sm outline-none cursor-pointer bg-white">
                      <option value="">All Types</option>
                      <option value="ASSET_ONLY">Asset Only</option>
                      <option value="MAC_ONLY">MAC Only</option>
                      <option value="ASSET_AND_MAC">Asset + MAC</option>
                    </select>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-2 shrink-0">
                  <VisibleColumnsSelector allColumns={columns} visibleColumns={visibleCols} onToggleColumn={(c) => setVisibleCols((p) => p.includes(c) ? p.filter((x) => x !== c) : [...p, c])} />
                  <ExportDropdown data={exportData} prefix="Asset_Report" />
                </div>
              </div>

              {/* Row 2: mobile controls */}
              <div className="flex sm:hidden items-center gap-2 flex-wrap">
                {user?.roleType === "ADMIN" && (
                  <select value={selectedBranch || ""} onChange={(e) => updateParams({ branchId: e.target.value, page: 1 })} className="form-select !w-36 shrink-0">
                    <option value="">All Branches</option>
                    {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                )}
                <select value={selectedStatus} onChange={(e) => updateParams({ status: e.target.value, page: 1 })} className="form-select !w-32 shrink-0">
                  <option value="">All Status</option>
                  <option value="IN_STOCK">In Stock</option>
                  <option value="SOLD">Sold</option>
                  <option value="RESERVED">Reserved</option>
                  <option value="TRANSFERRED">Transferred</option>
                  <option value="DAMAGED">Damaged</option>
                  <option value="LOST">Lost</option>
                  <option value="REMOVED">Removed</option>
                </select>
                <select value={selectedTracking} onChange={(e) => updateParams({ trackingType: e.target.value, page: 1 })} className="form-select !w-36 shrink-0">
                  <option value="">All Types</option>
                  <option value="ASSET_ONLY">Asset Only</option>
                  <option value="MAC_ONLY">MAC Only</option>
                  <option value="ASSET_AND_MAC">Asset + MAC</option>
                </select>
                <VisibleColumnsSelector allColumns={columns} visibleColumns={visibleCols} onToggleColumn={(c) => setVisibleCols((p) => p.includes(c) ? p.filter((x) => x !== c) : [...p, c])} />
                <ExportDropdown data={exportData} prefix="Asset_Report" />
              </div>
            </div>

            <div className="dataTable-container">
              {loading ? (
                <p>Loading...</p>
              ) : (
                <table className="dataTable-table min-w-full whitespace-nowrap">
                  <thead>
                    <tr>
                      {columns.map((col) => visibleCols.includes(col) && (
                        <th key={col} className="px-3 py-2 text-left font-medium">{col}</th>
                      ))}
                      <th className="px-3 py-2 text-left font-medium">History</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length ? rows.map((r, i) => (
                      <tr key={r.id}>
                        {visibleCols.includes("No") && <td>{(page - 1) * pageSize + i + 1}</td>}
                        {visibleCols.includes("Product") && <td>{r.productName}</td>}
                        {visibleCols.includes("Type") && (
                          <td>
                            <span className={`badge text-xs ${r.productType === "SecondHand" ? "badge-outline-warning" : "badge-outline-primary"}`}>
                              {r.productType === "SecondHand" ? "SH" : "New"}
                            </span>
                          </td>
                        )}
                        {visibleCols.includes("SKU") && <td>{r.sku}</td>}
                        {visibleCols.includes("Barcode") && <td>{r.barcode || "—"}</td>}
                        {visibleCols.includes("Branch") && <td>{r.branchName}</td>}
                        {visibleCols.includes("Serial No") && <td className="font-mono text-xs">{r.serialNumber || "—"}</td>}
                        {visibleCols.includes("Asset Code") && <td className="font-mono text-xs">{r.assetCode || "—"}</td>}
                        {visibleCols.includes("MAC Address") && <td className="font-mono text-xs">{r.macAddress || "—"}</td>}
                        {visibleCols.includes("Status") && (
                          <td><span className={`${statusBadge(r.status)} text-xs`}>{r.status}</span></td>
                        )}
                        {visibleCols.includes("Created At") && (
                          <td className="text-xs text-gray-500">{dayjs(r.createdAt).format("DD/MMM/YYYY HH:mm")}</td>
                        )}
                        <td>
                          <button
                            onClick={() => openHistory(r)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="View sale history"
                          >
                            <History size={14} />
                          </button>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={columns.length + 1} className="text-center py-6 text-gray-500">No records found</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={(p) => updateParams({ page: p })}
              onPageSizeChange={(s) => updateParams({ pageSize: s, page: 1 })}
            />
          </div>
        </div>
      </div>

      {/* Usage History Modal */}
      {historyRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setHistoryRow(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 flex flex-col" style={{ maxHeight: "80vh" }} onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className="px-5 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                    <History size={16} className="text-indigo-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">Usage History</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{historyRow.productName}</p>
                  </div>
                </div>
                <button onClick={() => setHistoryRow(null)} className="w-7 h-7 rounded-full bg-gray-100 hover:bg-red-100 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors text-xs flex-shrink-0">✕</button>
              </div>
              {/* Serial badge */}
              <div className="mt-3 inline-flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
                <span className="text-xs text-gray-400">S/N</span>
                <span className="font-mono text-xs font-semibold text-gray-700">{historyRow.serialNumber || historyRow.assetCode || "—"}</span>
              </div>
            </div>

            {/* Body — timeline */}
            <div className="overflow-y-auto flex-1 px-5 py-4">
              {historyLoading ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-300">
                  <div className="w-6 h-6 border-2 border-gray-200 border-t-indigo-400 rounded-full animate-spin" />
                  <span className="text-xs">Loading...</span>
                </div>
              ) : historyItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <History size={28} className="text-gray-200" />
                  <p className="text-sm text-gray-400">No usage history found</p>
                  <p className="text-xs text-gray-300">This serial has never been sold or assigned</p>
                </div>
              ) : (
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-3.5 top-2 bottom-2 w-px bg-gray-100" />

                  <div className="space-y-1">
                    {historyItems.map((h, idx) => {
                      const isSale = h.type === "SALE";
                      const isReturned = !!h.returnedAt;
                      return (
                        <div key={idx} className="relative flex gap-4 pb-4">
                          {/* Dot */}
                          <div className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold shadow-sm ${isSale ? "bg-blue-500" : "bg-amber-400"}`}>
                            {isSale ? "S" : "C"}
                          </div>

                          {/* Card */}
                          <div className="flex-1 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                            {/* Top row */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${isSale ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                                  {isSale ? "Invoice" : "CEQ"}
                                </span>
                                <span className="text-sm font-semibold text-gray-800 truncate">{h.ref}</span>
                              </div>
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${isReturned ? "bg-gray-100 text-gray-500" : isSale ? "bg-red-100 text-red-600" : h.status === "RENTED" ? "bg-yellow-100 text-yellow-700" : h.status === "INSTALLED" ? "bg-purple-100 text-purple-700" : "bg-red-100 text-red-600"}`}>
                                {isReturned ? "Returned" : h.status}
                              </span>
                            </div>

                            {/* Customer */}
                            <div className="mt-2 flex items-baseline gap-1">
                              <span className="text-sm font-medium text-gray-700">{h.customerName}</span>
                              {h.customerPhone && <span className="text-xs text-gray-400">· {h.customerPhone}</span>}
                            </div>

                            {/* Meta */}
                            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-400">
                              {h.branchName && <span>{h.branchName}</span>}
                              <span>{isSale ? "Sold" : "Assigned"}: {dayjs(h.date).format("DD MMM YYYY")}</span>
                              {h.returnedAt && <span>· Returned: {dayjs(h.returnedAt).format("DD MMM YYYY")}</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-gray-100 flex-shrink-0 flex items-center justify-between">
              <span className="text-xs text-gray-400">{historyItems.length} record{historyItems.length !== 1 ? "s" : ""}</span>
              <button onClick={() => setHistoryRow(null)} className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetReport;
