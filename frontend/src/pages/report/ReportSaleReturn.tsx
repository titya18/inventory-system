import React, { useState, useEffect, useCallback } from "react";
import * as apiClient from "@/api/report";
import { getAllBranches } from "@/api/branch";
import Pagination from "../components/Pagination";
import { useAppContext } from "@/hooks/useAppContext";
import { useNavigate, NavLink, useSearchParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowUpZA,
  faArrowDownAZ,
  faDollarSign,
  faFileInvoice,
  faClose,
  faPercent,
  faMoneyBillTrendUp,
  faMoneyBillTransfer,
} from "@fortawesome/free-solid-svg-icons";
import { NotebookText, PrinterCheck, RefreshCw } from "lucide-react";
import { BranchType, SaleReturnType } from "@/data_types/types";
import VisibleColumnsSelector from "@/components/VisibleColumnsSelector";
import ExportDropdown from "@/components/ExportDropdown";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import SummaryCard from "./SummaryInvoiceCard";

dayjs.extend(utc);
dayjs.extend(timezone);

const columns = [
  "No",
  "Return No",
  "INV-No",
  "Customer",
  "Branch",
  "Sale Type",
  "Status",
  "Discount",
  "Tax Rate",
  "Grand Total",
  "Return Cost",
  "Gross Impact",
  "Return At",
  "Return By",
  "Note/Print",
];

const DEFAULT_VISIBLE_COLUMNS = [
  "No",
  "Return No",
  "INV-No",
  "Customer",
  "Branch",
  "Sale Type",
  "Status",
  "Discount",
  "Tax Rate",
  "Grand Total",
  "Return Cost",
  "Gross Impact",
  "Return At",
  "Return By",
  "Note/Print",
];

const sortFields: Record<string, string> = {
  No: "id",
  "Return No": "ref",
  "INV-No": "order",
  Customer: "customer",
  Branch: "branch",
  "Sale Type": "saleType",
  Status: "status",
  Discount: "discount",
  "Tax Rate": "taxRate",
  "Grand Total": "totalAmount",
  "Return Cost": "returnCost",
  "Gross Impact": "grossImpact",
  "Return At": "createdAt",
  "Return By": "createdBy",
};

const formatCurrency = (value: number | string | undefined | null) => {
  return Number(value || 0)
    .toFixed(2)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const getStatusClass = (status?: string) => {
  switch (status) {
    case "APPROVED":
      return "bg-success-light text-success";
    case "PENDING":
      return "bg-warning-light text-warning";
    case "REJECTED":
      return "bg-danger-light text-danger";
    case "CANCELLED":
      return "bg-danger-light text-danger";
    default:
      return "bg-secondary-light text-secondary";
  }
};

const ReportSaleReturn: React.FC = () => {
  const [branches, setBranches] = useState<BranchType[]>([]);
  const [saleReturnData, setSaleReturnData] = useState<SaleReturnType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [visibleCols, setVisibleCols] = useState(DEFAULT_VISIBLE_COLUMNS);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [viewNote, setViewNote] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const { user, hasPermission } = useAppContext();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const today = dayjs().format("YYYY-MM-DD");

  const startDate = searchParams.get("startDate") || today;
  const endDate = searchParams.get("endDate") || today;
  const saleType = searchParams.get("saleType") || "ALL";
  const status = searchParams.get("status") || "";
  const branchId = searchParams.get("branchId")
    ? parseInt(searchParams.get("branchId")!, 10)
    : undefined;
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
  const sortField = searchParams.get("sortField") || "createdAt";
  const sortOrder = searchParams.get("sortOrder") === "desc" ? "desc" : "asc";

  const [summary, setSummary] = useState({
    totalNumberSaleReturn: 0,
    totalAmount: 0,
    totalDiscount: 0,
    totalTax: 0,
    totalShipping: 0,
    totalReturnCost: 0,
    grossImpact: 0,
  });

  const fetchBranches = useCallback(async () => {
    try {
      const data = await getAllBranches();
      setBranches(data as BranchType[]);
    } catch (error) {
      console.error("Error fetching branches:", error);
    }
  }, []);

  const fetchSaleReturn = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {
        sortField,
        sortOrder: sortOrder as "desc" | "asc",
        page,
        pageSize,
        searchTerm: search || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        saleType:
          saleType !== "ALL"
            ? (saleType as "RETAIL" | "WHOLESALE")
            : undefined,
        status: status || undefined,
        branchId,
      };

      const response = await apiClient.getAllReportSaleReturns(params);

      setSaleReturnData(response?.data || []);
      setTotal(response?.total || 0);
      setSummary(
        response?.summary || {
          totalNumberSaleReturn: 0,
          totalAmount: 0,
          totalDiscount: 0,
          totalTax: 0,
          totalShipping: 0,
          totalReturnCost: 0,
          grossImpact: 0,
        }
      );
    } catch (error) {
      console.error("Error fetching sale returns:", error);
      setSaleReturnData([]);
      setTotal(0);
      setSummary({
        totalNumberSaleReturn: 0,
        totalAmount: 0,
        totalDiscount: 0,
        totalTax: 0,
        totalShipping: 0,
        totalReturnCost: 0,
        grossImpact: 0,
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    sortField,
    sortOrder,
    page,
    pageSize,
    search,
    startDate,
    endDate,
    saleType,
    status,
    branchId,
  ]);

  useEffect(() => {
    fetchSaleReturn();
  }, [fetchSaleReturn]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  const updateParams = (params: Record<string, unknown>) => {
    const newParams = new URLSearchParams(searchParams.toString());

    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") {
        newParams.delete(key);
      } else {
        newParams.set(key, String(value));
      }
    });

    setSearchParams(newParams);
  };

  const handleClearAllFilter = () => {
    navigate("/reportSaleReturn");
  };

  const toggleCol = (col: string) => {
    setVisibleCols((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  };

  const handleSort = (col: string) => {
    const field = sortFields[col];
    if (!field) return;

    if (sortField === field) {
      updateParams({
        sortOrder: sortOrder === "asc" ? "desc" : "asc",
      });
    } else {
      updateParams({
        sortField: field,
        sortOrder: "asc",
      });
    }
  };

  const exportData = saleReturnData.map((inv, index) => ({
    No: (page - 1) * pageSize + index + 1,
    "Return No": inv.ref,
    "INV-No": inv.order?.ref || "",
    Customer: inv.customer?.name || "N/A",
    Branch: inv.branch?.name || "",
    "Sale Type": inv.order?.OrderSaleType || "",
    Status: inv.status || "",
    Discount: Number(inv.discount || 0),
    "Tax Rate": Number(inv.taxRate || 0),
    "Grand Total": Number(inv.totalAmount || 0),
    "Return Cost": Number((inv as any).returnCost || 0),
    "Gross Impact": Number((inv as any).grossImpact || 0),
    "Return At": inv.createdAt
      ? dayjs
          .tz(inv.createdAt, "Asia/Phnom_Penh")
          .format("DD / MMM / YYYY HH:mm:ss")
      : "",
    "Return By": `${inv.creator?.lastName || ""} ${
      inv.creator?.firstName || ""
    }`.trim(),
  }));

  const handleViewNote = (note: string) => {
    setViewNote(note);
    setShowNoteModal(true);
  };

  return (
    <>
      <div className="pt-0">
        <div className="space-y-6">
          <div className="panel">
            <div className="relative">
              <div className="flex gap-2 mb-4 flex-wrap items-end">
                <div>
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      let newEnd = endDate;

                      if (newEnd && newEnd < newStart) {
                        newEnd = newStart;
                      }

                      updateParams({
                        startDate: newStart,
                        endDate: newEnd,
                        page: 1,
                      });
                    }}
                    className="form-input"
                  />
                </div>

                <div>
                  <label>End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate || undefined}
                    onChange={(e) =>
                      updateParams({
                        endDate: e.target.value,
                        page: 1,
                      })
                    }
                    className="form-input"
                  />
                </div>

                <div>
                  <label>Sale Type</label>
                  <select
                    value={saleType}
                    onChange={(e) =>
                      updateParams({
                        saleType: e.target.value || undefined,
                        page: 1,
                      })
                    }
                    className="form-select"
                  >
                    <option value="ALL">All Sale Types</option>
                    <option value="RETAIL">Retail</option>
                    <option value="WHOLESALE">Wholesale</option>
                  </select>
                </div>

                <div>
                  <label>Status</label>
                  <select
                    value={status}
                    onChange={(e) =>
                      updateParams({
                        status: e.target.value || undefined,
                        page: 1,
                      })
                    }
                    className="form-select"
                  >
                    <option value="">All Status</option>
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>

                {user?.roleType === "ADMIN" && (
                  <div>
                    <label>Branch</label>
                    <select
                      value={branchId ?? ""}
                      onChange={(e) =>
                        updateParams({
                          branchId: e.target.value
                            ? Number(e.target.value)
                            : undefined,
                          page: 1,
                        })
                      }
                      className="form-select"
                    >
                      <option value="">All Branches</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <button
                    className="btn btn-primary"
                    onClick={handleClearAllFilter}
                  >
                    <RefreshCw size={16} className="mr-1" />
                    Clear All Filter
                  </button>
                </div>
              </div>

              <div className="mt-4 mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <SummaryCard
                  title="Total Sale Returns"
                  value={summary.totalNumberSaleReturn}
                  icon={faFileInvoice}
                  color="indigo"
                  onClick={() => updateParams({ page: 1 })}
                />

                <SummaryCard
                  title="Returned Amount"
                  value={summary.totalAmount}
                  icon={faDollarSign}
                  color="blue"
                  isCurrency
                  onClick={() => updateParams({ page: 1 })}
                />

                <SummaryCard
                  title="Discount"
                  value={summary.totalDiscount}
                  icon={faPercent}
                  color="warning"
                  isCurrency
                  onClick={() => updateParams({ page: 1 })}
                />

                <SummaryCard
                  title="Tax"
                  value={summary.totalTax}
                  icon={faDollarSign}
                  color="success"
                  isCurrency
                  onClick={() => updateParams({ page: 1 })}
                />

                <SummaryCard
                  title="Return Cost"
                  value={summary.totalReturnCost}
                  icon={faMoneyBillTransfer}
                  color="danger"
                  isCurrency
                  onClick={() => updateParams({ page: 1 })}
                />

                <SummaryCard
                  title="Gross Impact"
                  value={summary.grossImpact}
                  icon={faMoneyBillTrendUp}
                  color="secondary"
                  isCurrency
                  onClick={() => updateParams({ page: 1 })}
                />
              </div>

              <div className="dataTable-wrapper dataTable-loading no-footer sortable searchable">
                <div className="dataTable-top">
                  <div className="dataTable-search">
                    <input
                      className="dataTable-input"
                      type="text"
                      placeholder="Search..."
                      value={search}
                      onChange={(e) =>
                        updateParams({
                          search: e.target.value,
                          page: 1,
                        })
                      }
                    />
                  </div>

                  <VisibleColumnsSelector
                    allColumns={columns}
                    visibleColumns={visibleCols}
                    onToggleColumn={toggleCol}
                  />

                  <ExportDropdown data={exportData} prefix="Sale-Returns" />
                </div>

                <div className="dataTable-container">
                  {isLoading ? (
                    <p>Loading...</p>
                  ) : (
                    <table
                      id="myTable1"
                      className="whitespace-nowrap dataTable-table"
                    >
                      <thead>
                        <tr>
                          {columns.map(
                            (col) =>
                              visibleCols.includes(col) && (
                                <th
                                  key={col}
                                  className="px-4 py-2 font-medium cursor-pointer select-none whitespace-normal break-words max-w-xs"
                                  onClick={() => handleSort(col)}
                                >
                                  <div className="flex items-center gap-1">
                                    {col}
                                    {sortFields[col] ? (
                                      sortField === sortFields[col] ? (
                                        sortOrder === "asc" ? (
                                          <FontAwesomeIcon
                                            icon={faArrowDownAZ}
                                          />
                                        ) : (
                                          <FontAwesomeIcon icon={faArrowUpZA} />
                                        )
                                      ) : (
                                        <FontAwesomeIcon
                                          icon={faArrowDownAZ}
                                        />
                                      )
                                    ) : null}
                                  </div>
                                </th>
                              )
                          )}
                        </tr>
                      </thead>

                      <tbody>
                        {saleReturnData.length > 0 ? (
                          saleReturnData.map((rows, index) => (
                            <tr key={rows.id || index}>
                              {visibleCols.includes("No") && (
                                <td>{(page - 1) * pageSize + index + 1}</td>
                              )}

                              {visibleCols.includes("Return No") && (
                                <td>{rows.ref}</td>
                              )}

                              {visibleCols.includes("INV-No") && (
                                <td>{rows.order?.ref || ""}</td>
                              )}

                              {visibleCols.includes("Customer") && (
                                <td>{rows.customer?.name || "N/A"}</td>
                              )}

                              {visibleCols.includes("Branch") && (
                                <td>{rows.branch?.name || ""}</td>
                              )}

                              {visibleCols.includes("Sale Type") && (
                                <td>{rows.order?.OrderSaleType || ""}</td>
                              )}

                              {visibleCols.includes("Status") && (
                                <td>
                                  <span
                                    className={`badge ${getStatusClass(
                                      rows.status
                                    )}`}
                                  >
                                    {rows.status || ""}
                                  </span>
                                </td>
                              )}

                              {visibleCols.includes("Discount") && (
                                <td>
                                  ${" "}
                                  {formatCurrency(rows.discount)}
                                </td>
                              )}

                              {visibleCols.includes("Tax Rate") && (
                                <td>
                                  {Number(rows.taxRate || 0)
                                    .toFixed(0)
                                    .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                                  %
                                </td>
                              )}

                              {visibleCols.includes("Grand Total") && (
                                <td className="text-info font-semibold">
                                  ${" "}
                                  {formatCurrency(rows.totalAmount)}
                                </td>
                              )}

                              {visibleCols.includes("Return Cost") && (
                                <td className="text-danger font-semibold">
                                  ${" "}
                                  {formatCurrency((rows as any).returnCost)}
                                </td>
                              )}

                              {visibleCols.includes("Gross Impact") && (
                                <td
                                  className={`font-semibold ${
                                    Number((rows as any).grossImpact || 0) >= 0
                                      ? "text-success"
                                      : "text-danger"
                                  }`}
                                >
                                  ${" "}
                                  {formatCurrency((rows as any).grossImpact)}
                                </td>
                              )}

                              {visibleCols.includes("Return At") && (
                                <td>
                                  {rows.createdAt
                                    ? dayjs
                                        .tz(rows.createdAt, "Asia/Phnom_Penh")
                                        .format("DD / MMM / YYYY HH:mm:ss")
                                    : ""}
                                </td>
                              )}

                              {visibleCols.includes("Return By") && (
                                <td>
                                  {rows.creator?.lastName || ""}{" "}
                                  {rows.creator?.firstName || ""}
                                </td>
                              )}

                              {visibleCols.includes("Note/Print") && (
                                <td className="text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    {rows.note && (
                                      <button
                                        type="button"
                                        className="hover:text-danger"
                                        onClick={() =>
                                          handleViewNote(rows.note as string)
                                        }
                                        title="View Note"
                                      >
                                        <NotebookText color="pink" />
                                      </button>
                                    )}

                                    {hasPermission("Sale-Return-Print") && (
                                      <NavLink
                                        to={`/printsell-return/${rows.id}`}
                                        className="hover:text-warning"
                                        title="Print Sale Return"
                                      >
                                        <PrinterCheck color="purple" />
                                      </NavLink>
                                    )}
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan={visibleCols.length}
                              className="text-center py-4"
                            >
                              No Sale Return Found!
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
                  onPageChange={(newPage) => updateParams({ page: newPage })}
                  onPageSizeChange={(newSize) =>
                    updateParams({ pageSize: newSize, page: 1 })
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {showNoteModal && (
        <div className="fixed inset-0 bg-[black]/60 z-[999] overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="panel border-0 p-0 rounded-lg overflow-hidden w-full max-w-lg my-8">
              <div className="flex bg-[#fbfbfb] dark:bg-[#121c2c] items-center justify-between px-5 py-3">
                <h5 className="flex font-bold text-lg items-center gap-2">
                  <NotebookText color="pink" /> View note
                </h5>
                <button
                  type="button"
                  className="text-white-dark hover:text-dark"
                  onClick={() => setShowNoteModal(false)}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24px"
                    height="24px"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-6 w-6"
                  >
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>

              <div className="p-5">
                <div className="mb-5 whitespace-pre-wrap break-words">
                  {viewNote || "No note available"}
                </div>

                <div className="flex justify-end items-center mt-8">
                  <button
                    type="button"
                    className="btn btn-outline-danger"
                    onClick={() => setShowNoteModal(false)}
                  >
                    <FontAwesomeIcon icon={faClose} className="mr-1" />
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ReportSaleReturn;