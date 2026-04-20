import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import dayjs from "dayjs";
import { SlidersHorizontal, Search } from "lucide-react";
import Pagination from "../components/Pagination";
import VisibleColumnsSelector from "@/components/VisibleColumnsSelector";
import ExportDropdown from "@/components/ExportDropdown";
import { AssetReportRow, BranchType } from "@/data_types/types";
import { getAssetReport } from "@/api/stock";
import { getAllBranches } from "@/api/branch";
import { useAppContext } from "@/hooks/useAppContext";

const columns = ["No", "Product", "Type", "SKU", "Barcode", "Branch", "Serial No", "Asset Code", "MAC Address", "Status", "Created At"];

const statusBadge = (status: string) => {
  switch (status) {
    case "IN_STOCK":   return "badge bg-success";
    case "SOLD":       return "badge bg-danger";
    case "RESERVED":   return "badge bg-warning";
    case "TRANSFERRED": return "badge bg-info";
    case "DAMAGED":    return "badge bg-dark";
    case "LOST":       return "badge bg-dark";
    default:           return "badge bg-secondary";
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
    const branchId = user?.roleType === "ADMIN" && selectedBranch ? selectedBranch : undefined;
    setLoading(true);
    getAssetReport(page, pageSize, search || undefined, branchId, selectedStatus || undefined, selectedTracking || undefined)
      .then((res) => {
        setRows(res.data || []);
        setTotal(res.pagination?.total || 0);
        setSummary(res.summary || {});
      })
      .catch(() => { setRows([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [search, page, pageSize, selectedBranch, selectedStatus, selectedTracking, user?.roleType]);

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
            { label: "Total", value: totalItems, cls: "" },
            { label: "In Stock", value: summary["IN_STOCK"] || 0, cls: "text-green-600" },
            { label: "Sold", value: summary["SOLD"] || 0, cls: "text-red-600" },
            { label: "Reserved", value: summary["RESERVED"] || 0, cls: "text-yellow-600" },
            { label: "Transferred", value: summary["TRANSFERRED"] || 0, cls: "text-blue-600" },
            { label: "Damaged/Lost", value: (summary["DAMAGED"] || 0) + (summary["LOST"] || 0), cls: "text-gray-600" },
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
              {/* Row 1: bordered search bar + actions */}
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
                  {/* Dropdowns inside bar — desktop only */}
                  <div className="hidden sm:flex items-center gap-2 shrink-0">
                    {user?.roleType === "ADMIN" && (
                      <select
                        value={selectedBranch || ""}
                        onChange={(e) => updateParams({ branchId: e.target.value, page: 1 })}
                        className="border rounded-md px-2 py-1 text-sm outline-none cursor-pointer bg-white"
                      >
                        <option value="">All Branches</option>
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    )}
                    <select
                      value={selectedStatus}
                      onChange={(e) => updateParams({ status: e.target.value, page: 1 })}
                      className="border rounded-md px-2 py-1 text-sm outline-none cursor-pointer bg-white"
                    >
                      <option value="">All Status</option>
                      <option value="IN_STOCK">In Stock</option>
                      <option value="SOLD">Sold</option>
                      <option value="RESERVED">Reserved</option>
                      <option value="TRANSFERRED">Transferred</option>
                      <option value="DAMAGED">Damaged</option>
                      <option value="LOST">Lost</option>
                      <option value="REMOVED">Removed</option>
                    </select>
                    <select
                      value={selectedTracking}
                      onChange={(e) => updateParams({ trackingType: e.target.value, page: 1 })}
                      className="border rounded-md px-2 py-1 text-sm outline-none cursor-pointer bg-white"
                    >
                      <option value="">All Types</option>
                      <option value="ASSET_ONLY">Asset Only</option>
                      <option value="MAC_ONLY">MAC Only</option>
                      <option value="ASSET_AND_MAC">Asset + MAC</option>
                    </select>
                  </div>
                </div>
                {/* Columns + Export — desktop only */}
                <div className="hidden sm:flex items-center gap-2 shrink-0">
                  <VisibleColumnsSelector allColumns={columns} visibleColumns={visibleCols} onToggleColumn={(c) => setVisibleCols((p) => p.includes(c) ? p.filter((x) => x !== c) : [...p, c])} />
                  <ExportDropdown data={exportData} prefix="Asset_Report" />
                </div>
              </div>

              {/* Row 2: all controls — mobile only */}
              <div className="flex sm:hidden items-center gap-2 flex-wrap">
                {user?.roleType === "ADMIN" && (
                  <select
                    value={selectedBranch || ""}
                    onChange={(e) => updateParams({ branchId: e.target.value, page: 1 })}
                    className="form-select !w-36 shrink-0"
                  >
                    <option value="">All Branches</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                )}
                <select
                  value={selectedStatus}
                  onChange={(e) => updateParams({ status: e.target.value, page: 1 })}
                  className="form-select !w-32 shrink-0"
                >
                  <option value="">All Status</option>
                  <option value="IN_STOCK">In Stock</option>
                  <option value="SOLD">Sold</option>
                  <option value="RESERVED">Reserved</option>
                  <option value="TRANSFERRED">Transferred</option>
                  <option value="DAMAGED">Damaged</option>
                  <option value="LOST">Lost</option>
                  <option value="REMOVED">Removed</option>
                </select>
                <select
                  value={selectedTracking}
                  onChange={(e) => updateParams({ trackingType: e.target.value, page: 1 })}
                  className="form-select !w-36 shrink-0"
                >
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
                      {columns.map((col) =>
                        visibleCols.includes(col) && (
                          <th key={col} className="px-3 py-2 text-left font-medium">{col}</th>
                        )
                      )}
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
                      </tr>
                    )) : (
                      <tr><td colSpan={columns.length} className="text-center py-6 text-gray-500">No records found</td></tr>
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
    </div>
  );
};

export default AssetReport;
