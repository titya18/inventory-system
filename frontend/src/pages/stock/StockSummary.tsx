import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowUpZA, faArrowDownAZ } from "@fortawesome/free-solid-svg-icons";
import { ScanBarcode, X } from "lucide-react";
import Pagination from "../components/Pagination";
import VisibleColumnsSelector from "@/components/VisibleColumnsSelector";
import ExportDropdown from "@/components/ExportDropdown";
import { StockSummaryRow, BranchType } from "@/data_types/types";
import * as apiClient from "@/api/stock";
import { getAllBranches } from "@/api/branch";
import { useAppContext } from "@/hooks/useAppContext";
import dayjs from "dayjs";

const columns = [
  "No",
  "Product",
  "Attributes",
  "SKU",
  "Barcode",
  "Branch",
  "Quantity",
  "Alert Qty",
  "Status",
  "Serials",
];

const sortFields: Record<string, string> = {
  Product: "productName",
  SKU: "sku",
  Barcode: "barcode",
  Branch: "branchName",
  Quantity: "quantity",
  "Alert Qty": "stockAlert",
  Status: "stockStatus",
};

const statusBadgeClass = (status?: string) => {
  switch (status) {
    case "IN_STOCK":
      return "badge bg-success";
    case "LOW_STOCK":
      return "badge bg-warning";
    case "OUT_OF_STOCK":
      return "badge bg-danger";
    default:
      return "badge bg-secondary";
  }
};

const statusLabel = (status?: string) => {
  switch (status) {
    case "IN_STOCK":
      return "In Stock";
    case "LOW_STOCK":
      return "Low Stock";
    case "OUT_OF_STOCK":
      return "Out of Stock";
    default:
      return "Unknown";
  }
};

const StockSummary: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState<StockSummaryRow[]>([]);
  const [branches, setBranches] = useState<BranchType[]>([]);
  const initialBranchParam = searchParams.get("branchId");
  const initialStatusParam = searchParams.get("stockStatus");

  const [selectedBranch, setSelectedBranch] = useState<number | "all">(
    initialBranchParam ? Number(initialBranchParam) : "all"
  );

  const [selectedStatus, setSelectedStatus] = useState<string>(
    initialStatusParam || "all"
  );
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [visibleCols, setVisibleCols] = useState(columns);
  const [summary, setSummary] = useState({
    totalItems: 0,
    inStock: 0,
    lowStock: 0,
    outOfStock: 0,
  });

  const [serialModal, setSerialModal] = useState<{ row: StockSummaryRow; statusFilter: string } | null>(null);
  const [serialItems, setSerialItems] = useState<any[]>([]);
  const [serialLoading, setSerialLoading] = useState(false);

  const search = searchParams.get("search") || "";
  const page = Number(searchParams.get("page") || 1);
  const pageSize = Number(searchParams.get("pageSize") || 10);
  const sortField = searchParams.get("sortField") || "productName";
  const sortOrder = searchParams.get("sortOrder") === "desc" ? "desc" : "asc";

  const { user } = useAppContext();

  const updateParams = (params: Record<string, any>) => {
    const p = new URLSearchParams(searchParams.toString());

    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "" || v === "all") {
        p.delete(k);
      } else {
        p.set(k, String(v));
      }
    });

    setSearchParams(p);
  };

  const fetchBranches = useCallback(async () => {
    try {
      const data = await getAllBranches();
      setBranches(data as BranchType[]);
    } catch (error) {
      console.error("Error fetching branch:", error);
    }
  }, []);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  useEffect(() => {
    if (!serialModal) return;
    const { row, statusFilter } = serialModal;
    setSerialLoading(true);
    apiClient.getSerialsByVariant(row.variantId, row.branchId!, statusFilter || undefined)
      .then((res) => setSerialItems(res.data))
      .catch(() => setSerialItems([]))
      .finally(() => setSerialLoading(false));
  }, [serialModal]);

  useEffect(() => {
    const branchId =
      user?.roleType === "ADMIN" && selectedBranch !== "all"
        ? selectedBranch
        : undefined;

    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await apiClient.getStockSummary(
          sortField,
          sortOrder,
          page,
          search,
          pageSize,
          branchId,
          selectedStatus !== "all" ? selectedStatus : undefined,
          false
        );

        setRows(res.data || []);
        setTotal(res.pagination?.total || 0);
        setSummary(
          res.summary || {
            totalItems: 0,
            inStock: 0,
            lowStock: 0,
            outOfStock: 0,
          }
        );
      } catch (error) {
        console.error("Error fetching stock summary:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [search, page, pageSize, sortField, sortOrder, selectedBranch, selectedStatus, user?.roleType]);

  const handleSort = (col: string) => {
    const field = sortFields[col];
    if (!field) return;

    updateParams({
      sortField: field,
      sortOrder: sortField === field && sortOrder === "asc" ? "desc" : "asc",
    });
  };

  const toggleCol = (col: string) => {
    setVisibleCols((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  };

  const exportData = useMemo(() => {
    return rows.map((r, i) => {
      const groupedAttrs: Record<string, Set<string>> = {};
      r.attributes.forEach((a) => {
        if (!groupedAttrs[a.attributeName]) groupedAttrs[a.attributeName] = new Set();
        groupedAttrs[a.attributeName].add(a.value);
      });

      return {
        No: (page - 1) * pageSize + i + 1,
        Product: `${r.productName}${r.productType === "New" || !r.productType ? "" : ` (${r.productType})`}`,
        Attributes: Object.entries(groupedAttrs)
          .map(([name, values]) => `${name}: ${Array.from(values).join(", ")}`)
          .join("; "),
        SKU: r.sku,
        Barcode: r.barcode,
        Branch: r.branchName,
        Quantity: r.quantity,
        "Alert Qty": r.stockAlert ?? 0,
        Status: statusLabel(r.stockStatus),
        Unit: r.unitName || "",
      };
    });
  }, [rows, page, pageSize]);

  return (
    <>
    <div className="pt-0">
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="panel">
            <div className="text-sm text-gray-500">Total Items</div>
            <div className="text-2xl font-bold">{summary.totalItems}</div>
          </div>
          <div className="panel">
            <div className="text-sm text-gray-500">In Stock</div>
            <div className="text-2xl font-bold text-green-600">{summary.inStock}</div>
          </div>
          <div className="panel">
            <div className="text-sm text-gray-500">Low Stock</div>
            <div className="text-2xl font-bold text-yellow-600">{summary.lowStock}</div>
          </div>
          <div className="panel">
            <div className="text-sm text-gray-500">Out of Stock</div>
            <div className="text-2xl font-bold text-red-600">{summary.outOfStock}</div>
          </div>
        </div>

        <div className="panel">
          <div className="relative">
            <div className="dataTable-wrapper dataTable-loading no-footer sortable searchable">
              <div className="dataTable-top flex gap-2 flex-wrap">
                {user?.roleType === "ADMIN" && (
                  <select
                    value={selectedBranch}
                    onChange={(e) => {
                      const val = e.target.value === "all" ? "all" : Number(e.target.value);
                      setSelectedBranch(val);
                      updateParams({ branchId: val, page: 1 });
                    }}
                    className="form-select w-48"
                  >
                    <option value="all">All Branches</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                )}

                <select
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value);
                    updateParams({ stockStatus: e.target.value, page: 1 });
                  }}
                  className="form-select w-48"
                >
                  <option value="all">All Status</option>
                  <option value="IN_STOCK">In Stock</option>
                  <option value="LOW_STOCK">Low Stock</option>
                  <option value="OUT_OF_STOCK">Out Of Stock</option>
                </select>

                <div className="dataTable-search flex-1 min-w-[220px]">
                  <input
                    className="dataTable-input w-full"
                    type="text"
                    placeholder="Search product, SKU, barcode..."
                    value={search}
                    onChange={(e) => updateParams({ search: e.target.value, page: 1 })}
                  />
                </div>

                <VisibleColumnsSelector
                  allColumns={columns}
                  visibleColumns={visibleCols}
                  onToggleColumn={toggleCol}
                />

                <ExportDropdown data={exportData} prefix="Stock_Summary" />
              </div>

              <div className="dataTable-container">
                {loading ? (
                  <p>Loading...</p>
                ) : (
                  <table className="dataTable-table min-w-full whitespace-nowrap">
                    <thead>
                      <tr>
                        {columns.map(
                          (col) =>
                            visibleCols.includes(col) && (
                              <th
                                key={col}
                                onClick={() => handleSort(col)}
                                className="px-3 py-2 text-left font-medium cursor-pointer select-none"
                              >
                                <div className="flex items-center gap-1">
                                  {col}
                                  {sortField === sortFields[col] && (
                                    <FontAwesomeIcon
                                      icon={sortOrder === "asc" ? faArrowDownAZ : faArrowUpZA}
                                    />
                                  )}
                                </div>
                              </th>
                            )
                        )}
                      </tr>
                    </thead>

                    <tbody>
                      {rows.length ? (
                        rows.map((r, i) => (
                          <tr key={`${r.variantId}-${r.branchId ?? r.branchName}`}>
                            {visibleCols.includes("No") && (
                              <td>{(page - 1) * pageSize + i + 1}</td>
                            )}

                            {visibleCols.includes("Product") && (
                              <td>
                                {r.productName}{" "}
                                {r.productType === "New" || !r.productType
                                  ? ""
                                  : `(${r.productType})`}
                              </td>
                            )}

                            {visibleCols.includes("Attributes") && (
                              <td className="flex flex-wrap gap-1">
                                {(() => {
                                  const groupedAttrs: Record<string, Set<string>> = {};
                                  r.attributes.forEach((attr) => {
                                    if (!groupedAttrs[attr.attributeName]) {
                                      groupedAttrs[attr.attributeName] = new Set();
                                    }
                                    groupedAttrs[attr.attributeName].add(attr.value);
                                  });

                                  return Object.entries(groupedAttrs).map(([name, values]) => (
                                    <span
                                      key={`${r.variantId}-${r.branchId ?? 0}-${name}`}
                                      className="badge bg-secondary mr-2"
                                      title={`${name}: ${Array.from(values).join(", ")}`}
                                    >
                                      {name}: {Array.from(values).join(", ")}
                                    </span>
                                  ));
                                })()}
                              </td>
                            )}

                            {visibleCols.includes("SKU") && <td>{r.sku}</td>}
                            {visibleCols.includes("Barcode") && <td>{r.barcode || "-"}</td>}
                            {visibleCols.includes("Branch") && <td>{r.branchName}</td>}

                            {visibleCols.includes("Quantity") && (
                              <td>
                                <span
                                  className={
                                    r.stockStatus === "OUT_OF_STOCK"
                                      ? "text-red-600 font-semibold"
                                      : r.stockStatus === "LOW_STOCK"
                                      ? "text-yellow-600 font-semibold"
                                      : ""
                                  }
                                >
                                  {r.quantity} {r.unitName || ""}
                                </span>
                              </td>
                            )}

                            {visibleCols.includes("Alert Qty") && (
                              <td>
                                {r.stockAlert ?? 0} {r.unitName || ""}
                              </td>
                            )}

                            {visibleCols.includes("Status") && (
                              <td>
                                <span className={statusBadgeClass(r.stockStatus)}>
                                  {statusLabel(r.stockStatus)}
                                </span>
                              </td>
                            )}
                            {visibleCols.includes("Serials") && (
                              <td>
                                {r.trackingType && r.trackingType !== "NONE" ? (
                                  <button
                                    type="button"
                                    title="View Serials"
                                    className="btn btn-sm btn-outline-primary flex items-center gap-1 px-2 py-1"
                                    onClick={() => setSerialModal({ row: r, statusFilter: "" })}
                                  >
                                    <ScanBarcode size={14} />
                                    <span className="text-xs">Serials</span>
                                  </button>
                                ) : (
                                  <span className="text-gray-400 text-xs">—</span>
                                )}
                              </td>
                            )}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={columns.length}>No stock found</td>
                        </tr>
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
    </div>

    {/* Serial Modal */}
    {serialModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white dark:bg-[#1b2e4b] rounded-lg shadow-xl w-full max-w-3xl mx-4 flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b dark:border-gray-700">
            <div>
              <h2 className="text-base font-semibold">{serialModal.row.productName} — Serials</h2>
              <p className="text-xs text-gray-500 mt-0.5">Branch: {serialModal.row.branchName}{" | "}SKU: {serialModal.row.sku}</p>
            </div>
            <button type="button" onClick={() => setSerialModal(null)} className="text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>

          {/* Status filter */}
          <div className="px-5 py-3 border-b dark:border-gray-700 flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-500 shrink-0">Filter:</span>
            {["", "IN_STOCK", "SOLD", "RESERVED", "TRANSFERRED", "DAMAGED", "LOST", "REMOVED"].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSerialModal((prev) => prev ? { ...prev, statusFilter: s } : null)}
                className={`px-2 py-0.5 rounded text-xs border transition-colors shrink-0 ${serialModal.statusFilter === s ? "bg-primary text-white border-primary" : "border-gray-300 text-gray-600 hover:border-primary hover:text-primary"}`}
              >
                {s || "All"}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="overflow-y-auto flex-1 px-5 py-3">
            {serialLoading ? (
              <p className="text-center text-sm text-gray-500 py-6">Loading...</p>
            ) : serialItems.length === 0 ? (
              <p className="text-center text-sm text-gray-500 py-6">No serials found</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b dark:border-gray-700">
                    <th className="pb-2 pr-4">Serial No</th>
                    <th className="pb-2 pr-4">Asset Code</th>
                    <th className="pb-2 pr-4">MAC Address</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2">Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {serialItems.map((item) => (
                    <tr key={item.id} className="border-b dark:border-gray-700 last:border-0">
                      <td className="py-2 pr-4 font-mono text-xs">{item.serialNumber || "—"}</td>
                      <td className="py-2 pr-4 font-mono text-xs">{item.assetCode || "—"}</td>
                      <td className="py-2 pr-4 font-mono text-xs">{item.macAddress || "—"}</td>
                      <td className="py-2 pr-4">
                        <span className={`badge text-xs ${item.status === "IN_STOCK" ? "bg-success" : item.status === "SOLD" ? "bg-danger" : item.status === "RESERVED" ? "bg-warning" : "bg-secondary"}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-2 text-xs text-gray-500">{dayjs(item.createdAt).format("DD/MMM/YYYY")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="px-5 py-3 border-t dark:border-gray-700 text-right text-xs text-gray-500">
            Total: {serialItems.length} item(s)
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default StockSummary;