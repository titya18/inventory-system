import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowUpZA, faArrowDownAZ } from "@fortawesome/free-solid-svg-icons";

import Pagination from "../components/Pagination";
import VisibleColumnsSelector from "@/components/VisibleColumnsSelector";
import ExportDropdown from "@/components/ExportDropdown";

import { ProfitReportRow, BranchType } from "@/data_types/types";
import * as apiClient from "@/api/report";
import { getAllBranches } from "@/api/branch";
import { useAppContext } from "@/hooks/useAppContext";

const columns = [
  "No",
  "Date",
  "Invoice Ref",
  "Customer",
  "Branch",
  "Sales",
  "COGS",
  "Profit",
  "Margin %",
];

const sortFields: Record<string, string> = {
  Date: "orderDate",
  "Invoice Ref": "ref",
  Customer: "customerName",
  Branch: "branchName",
  Sales: "totalSales",
  COGS: "totalCogs",
  Profit: "grossProfit",
  "Margin %": "marginPercent",
};

const formatCurrency = (value: number) => {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatPercent = (value: number) => {
  return `${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
};

const ProfitReport: React.FC = () => {
  const [rows, setRows] = useState<ProfitReportRow[]>([]);
  const [branches, setBranches] = useState<BranchType[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<number | "all">("all");
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [visibleCols, setVisibleCols] = useState(columns);
  const [summary, setSummary] = useState({
    totalSales: 0,
    totalCogs: 0,
    totalProfit: 0,
    avgMarginPercent: 0,
  });

  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get("search") || "";
  const page = Number(searchParams.get("page") || 1);
  const pageSize = Number(searchParams.get("pageSize") || 10);
  const startDate = searchParams.get("startDate") || "";
  const endDate = searchParams.get("endDate") || "";
  const sortField = searchParams.get("sortField") || "orderDate";
  const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

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
    } catch (err) {
      console.error("Branch load error:", err);
    }
  }, []);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  useEffect(() => {
    const initialBranchParam = searchParams.get("branchId");
    if (initialBranchParam && selectedBranch === "all") {
      setSelectedBranch(Number(initialBranchParam));
    }
  }, [searchParams, selectedBranch]);

  useEffect(() => {
    const branchId =
      user?.roleType === "ADMIN" && selectedBranch !== "all"
        ? selectedBranch
        : undefined;

    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await apiClient.getProfitReport(
          sortField,
          sortOrder,
          page,
          search,
          pageSize,
          branchId,
          startDate || undefined,
          endDate || undefined
        );

        setRows(res.data || []);
        setTotal(res.pagination?.total || 0);
        setSummary(
          res.summary || {
            totalSales: 0,
            totalCogs: 0,
            totalProfit: 0,
            avgMarginPercent: 0,
          }
        );
      } catch (err) {
        console.error("Profit report error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [
    search,
    page,
    pageSize,
    selectedBranch,
    startDate,
    endDate,
    sortField,
    sortOrder,
    user?.roleType,
  ]);

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
      Date: r.orderDate,
      "Invoice Ref": r.ref,
      Customer: r.customerName || "Walk-in Customer",
      Branch: r.branchName,
      Sales: r.totalSales,
      COGS: r.totalCogs,
      Profit: r.grossProfit,
      "Margin %": r.marginPercent,
    }));
  }, [rows, page, pageSize]);

  return (
    <div className="pt-0">
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="panel">
            <div className="text-sm text-gray-500">Total Sales</div>
            <div className="text-2xl font-bold">
              ${formatCurrency(summary.totalSales)}
            </div>
          </div>

          <div className="panel">
            <div className="text-sm text-gray-500">Total COGS</div>
            <div className="text-2xl font-bold text-orange-600">
              ${formatCurrency(summary.totalCogs)}
            </div>
          </div>

          <div className="panel">
            <div className="text-sm text-gray-500">Total Profit</div>
            <div
              className={`text-2xl font-bold ${
                summary.totalProfit >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              ${formatCurrency(summary.totalProfit)}
            </div>
          </div>

          <div className="panel">
            <div className="text-sm text-gray-500">Average Margin</div>
            <div
              className={`text-2xl font-bold ${
                summary.avgMarginPercent >= 0 ? "text-primary" : "text-red-600"
              }`}
            >
              {formatPercent(summary.avgMarginPercent)}
            </div>
          </div>
        </div>

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
          {/* <div className="dataTable-top flex gap-2 flex-wrap">
            {user?.roleType === "ADMIN" && (
              <select
                value={selectedBranch}
                onChange={(e) => {
                  const val =
                    e.target.value === "all" ? "all" : Number(e.target.value);
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

            <input
              type="date"
              value={startDate}
              onChange={(e) =>
                updateParams({ startDate: e.target.value, page: 1 })
              }
              className="form-input"
            />

            <input
              type="date"
              value={endDate}
              onChange={(e) =>
                updateParams({ endDate: e.target.value, page: 1 })
              }
              className="form-input"
            />

            <div className="dataTable-search flex-1 min-w-[220px]">
              <input
                className="dataTable-input w-full"
                type="text"
                placeholder="Search invoice, customer, branch..."
                value={search}
                onChange={(e) =>
                  updateParams({ search: e.target.value, page: 1 })
                }
              />
            </div>

            <VisibleColumnsSelector
              allColumns={columns}
              visibleColumns={visibleCols}
              onToggleColumn={toggleCol}
            />

            <ExportDropdown data={exportData} prefix="Profit_Report" />
          </div> */}

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
                      <tr key={r.orderId}>
                        {visibleCols.includes("No") && (
                          <td>{(page - 1) * pageSize + i + 1}</td>
                        )}

                        {visibleCols.includes("Date") && (
                          <td>{new Date(r.orderDate).toLocaleDateString()}</td>
                        )}

                        {visibleCols.includes("Invoice Ref") && <td>{r.ref}</td>}

                        {visibleCols.includes("Customer") && (
                          <td>{r.customerName || "Walk-in Customer"}</td>
                        )}

                        {visibleCols.includes("Branch") && (
                          <td>{r.branchName}</td>
                        )}

                        {visibleCols.includes("Sales") && (
                          <td>${formatCurrency(r.totalSales)}</td>
                        )}

                        {visibleCols.includes("COGS") && (
                          <td>${formatCurrency(r.totalCogs)}</td>
                        )}

                        {visibleCols.includes("Profit") && (
                          <td
                            className={`font-semibold ${
                              r.grossProfit >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            ${formatCurrency(r.grossProfit)}
                          </td>
                        )}

                        {visibleCols.includes("Margin %") && (
                          <td
                            className={`font-semibold ${
                              r.marginPercent >= 0
                                ? "text-primary"
                                : "text-red-600"
                            }`}
                          >
                            {formatPercent(r.marginPercent)}
                          </td>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={columns.length}>No profit data found</td>
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

export default ProfitReport;