import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowUpZA, faArrowDownAZ } from "@fortawesome/free-solid-svg-icons";

import Pagination from "../components/Pagination";
import VisibleColumnsSelector from "@/components/VisibleColumnsSelector";
import ExportDropdown from "@/components/ExportDropdown";

import { StockMovementRow, BranchType } from "@/data_types/types";
import * as apiClient from "@/api/stock";
import { getAllBranches } from "@/api/branch";
import { useAppContext } from "@/hooks/useAppContext";

const columns = [
  "No",
  "Date",
  "Product",
  "SKU",
  "Branch",
  "Type",
  "In Qty",
  "Out Qty",
  "Unit Cost",
  "Reference",
];

const sortFields: Record<string, string> = {
  Date: "createdAt",
  Product: "productName",
  SKU: "sku",
  Branch: "branchName",
  Type: "movementType",
  "In Qty": "inQty",
  "Out Qty": "outQty",
};

const StockMovementReport: React.FC = () => {
  const [rows, setRows] = useState<StockMovementRow[]>([]);
  const [branches, setBranches] = useState<BranchType[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<number | "all">("all");

  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [visibleCols, setVisibleCols] = useState(columns);

  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get("search") || "";
  const page = Number(searchParams.get("page") || 1);
  const pageSize = Number(searchParams.get("pageSize") || 10);
  const startDate = searchParams.get("startDate") || "";
  const endDate = searchParams.get("endDate") || "";

  const sortField = searchParams.get("sortField") || "createdAt";
  const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

  const { user } = useAppContext();

  const updateParams = (params: Record<string, any>) => {
    const p = new URLSearchParams(searchParams.toString());

    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "") p.delete(k);
      else p.set(k, String(v));
    });

    setSearchParams(p);
  };

  const fetchBranches = useCallback(async () => {
    try {
      const data = await getAllBranches();
      setBranches(data as BranchType[]);
    } catch (err) {
      console.error("Branch load error:", err);
    }
  }, []);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  useEffect(() => {
    const branchId =
      user?.roleType === "ADMIN" && selectedBranch !== "all"
        ? selectedBranch
        : undefined;

    const fetchData = async () => {
      setLoading(true);

      try {
        const res = await apiClient.getStockMovements(
          page,
          search,
          pageSize,
          branchId,
          startDate || undefined,
          endDate || undefined
        );

        setRows(res.data || []);
        setTotal(res.pagination?.total || 0);
      } catch (err) {
        console.error("Stock movement error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [search, page, pageSize, selectedBranch, startDate, endDate, user?.roleType]);

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
    return rows.map((r, i) => ({
      No: (page - 1) * pageSize + i + 1,
      Date: r.createdAt,
      Product: r.productName,
      SKU: r.sku,
      Branch: r.branchName,
      Type: r.movementType,
      "In Qty": r.inQty,
      "Out Qty": r.outQty,
      "Unit Cost": r.unitCost || "",
      Reference: r.reference || "",
    }));
  }, [rows, page, pageSize]);

  return (
    <div className="pt-0">
      <div className="space-y-6">
        <div className="panel">
          <div className="dataTable-top dataTable-search flex items-center gap-2 flex-nowrap">

            {user?.roleType === "ADMIN" && (
                <select
                value={selectedBranch}
                onChange={(e) => {
                    const val = e.target.value === "all" ? "all" : Number(e.target.value);
                    setSelectedBranch(val);
                    updateParams({ branchId: val, page: 1 });
                }}
                className="form-select w-44"
                >
                <option value="all">All Branches</option>
                {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                    {b.name}
                    </option>
                ))}
                </select>
            )}

            <input
                type="date"
                value={startDate}
                onChange={(e) => updateParams({ startDate: e.target.value, page: 1 })}
                className="form-input w-40"
            />

            <input
                type="date"
                value={endDate}
                onChange={(e) => updateParams({ endDate: e.target.value, page: 1 })}
                className="form-input w-40"
            />

            <input
                className="dataTable-input w-full"
                type="text"
                placeholder="Search product or SKU..."
                value={search}
                onChange={(e) => updateParams({ search: e.target.value, page: 1 })}
            />

            <div className="ml-auto flex items-center gap-2">
                <VisibleColumnsSelector
                allColumns={columns}
                visibleColumns={visibleCols}
                onToggleColumn={toggleCol}
                />

                <ExportDropdown data={exportData} prefix="StockMovement" />
            </div>

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
                            className="cursor-pointer px-3 py-2"
                          >
                            <div className="flex items-center gap-1">
                              {col}

                              {sortField === sortFields[col] && (
                                <FontAwesomeIcon
                                  icon={
                                    sortOrder === "asc"
                                      ? faArrowDownAZ
                                      : faArrowUpZA
                                  }
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
                      <tr key={r.id}>
                        {visibleCols.includes("No") && (
                          <td>{(page - 1) * pageSize + i + 1}</td>
                        )}

                        {visibleCols.includes("Date") && (
                          <td>{new Date(r.createdAt).toLocaleString()}</td>
                        )}

                        {visibleCols.includes("Product") && (
                          <td>{r.productName}</td>
                        )}

                        {visibleCols.includes("SKU") && <td>{r.sku}</td>}

                        {visibleCols.includes("Branch") && (
                          <td>{r.branchName}</td>
                        )}

                        {visibleCols.includes("Type") && (
                          <td>
                            <span className="badge bg-info">
                              {r.movementType}
                            </span>
                          </td>
                        )}

                        {visibleCols.includes("In Qty") && (
                          <td>
                            {r.inQty > 0 && (
                              <span className="text-green-600 font-semibold">
                                +{r.inQty}
                              </span>
                            )}
                          </td>
                        )}

                        {visibleCols.includes("Out Qty") && (
                          <td>
                            {r.outQty > 0 && (
                              <span className="text-red-600 font-semibold">
                                -{r.outQty}
                              </span>
                            )}
                          </td>
                        )}

                        {visibleCols.includes("Unit Cost") && (
                          <td>{r.unitCost || ""}</td>
                        )}

                        {visibleCols.includes("Reference") && (
                          <td>{r.reference || ""}</td>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={columns.length}>
                        No stock movement found
                      </td>
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
            onPageSizeChange={(s) =>
              updateParams({ pageSize: s, page: 1 })
            }
          />
        </div>
      </div>
    </div>
  );
};

export default StockMovementReport;