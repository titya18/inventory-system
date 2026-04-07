import React, { useState, useEffect, useCallback } from "react";
import * as apiClient from "@/api/report";
import { getAllBranches } from "@/api/branch";
import Pagination from "../components/Pagination";
import { NavLink, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useAppContext } from "@/hooks/useAppContext";
import { format } from "date-fns";
import VisibleColumnsSelector from "@/components/VisibleColumnsSelector";
import ExportDropdown from "@/components/ExportDropdown";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { BranchType, InvoiceType } from "@/data_types/types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowUpZA,
  faArrowDownAZ,
  faClose,
  faFileInvoice,
  faDollarSign,
  faCircleCheck,
  faClockRotateLeft,
  faChartLine,
} from "@fortawesome/free-solid-svg-icons";
import { NotebookText, PrinterCheck, RefreshCw } from "lucide-react";
import SummaryCard from "./SummaryInvoiceCard";

dayjs.extend(utc);
dayjs.extend(timezone);

const columns = [
  "No",
  "Invoice Date",
  "Reference",
  "Invoice Type",
  "Customer",
  "Branch",
  "Status",
  "Grand Total",
  "Paid",
  "Due",
  "Lost Profit",
  "Canceled At",
  "Canceled By",
  "Reason",
  "Created At",
  "Created By",
  "Updated At",
  "Updated By",
  "Note/Print",
];

const DEFAULT_VISIBLE_COLUMNS = [
  "No",
  "Invoice Date",
  "Reference",
  "Invoice Type",
  "Customer",
  "Branch",
  "Status",
  "Grand Total",
  "Paid",
  "Due",
  "Lost Profit",
  "Canceled At",
  "Canceled By",
  "Reason",
  "Note/Print",
];

const sortFields: Record<string, string> = {
  No: "id",
  "Invoice Date": "orderDate",
  Reference: "ref",
  "Invoice Type": "OrderSaleType",
  Customer: "customerId",
  Branch: "branchId",
  Status: "status",
  "Grand Total": "totalAmount",
  Paid: "paidAmount",
  Due: "due",
  "Lost Profit": "lostProfit",
  "Canceled At": "deletedAt",
  "Canceled By": "deletedBy",
  Reason: "delReason",
  "Created At": "createdAt",
  "Created By": "createdBy",
  "Updated At": "updatedAt",
  "Updated By": "updatedBy",
};

const formatCurrency = (value?: number | null) =>
  Number(value || 0)
    .toFixed(2)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");

const getStatusBadge = (status?: string) => {
  switch (status) {
    case "PENDING":
      return "badge rounded-full bg-warning";
    case "APPROVED":
      return "badge rounded-full bg-primary";
    case "COMPLETED":
      return "badge rounded-full bg-success";
    case "CANCELLED":
      return "badge rounded-full bg-danger";
    default:
      return "badge rounded-full bg-secondary";
  }
};

const ReportCancelInvoice: React.FC = () => {
  const [branches, setBranches] = useState<BranchType[]>([]);
  const [invoiceData, setInvoiceData] = useState<InvoiceType[]>([]);
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
  const branchId = searchParams.get("branchId")
    ? parseInt(searchParams.get("branchId")!, 10)
    : undefined;
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
  const sortField = searchParams.get("sortField") || "deletedAt";
  const sortOrder = searchParams.get("sortOrder") === "desc" ? "desc" : "asc";

  const [summary, setSummary] = useState<{
    totalInvoice: number;
    totalAmount: number;
    totalReceivedAmount: number;
    totalRemainAmount: number;
    totalLostProfit: number;
  }>({
    totalInvoice: 0,
    totalAmount: 0,
    totalReceivedAmount: 0,
    totalRemainAmount: 0,
    totalLostProfit: 0,
  });

  const fetchBranches = useCallback(async () => {
    try {
      const data = await getAllBranches();
      setBranches(data as BranchType[]);
    } catch (error) {
      console.error("Error fetching branches:", error);
    }
  }, []);

  const fetchInvoices = useCallback(async () => {
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
        branchId,
      };

      const { data, total: totalResult, summary } =
        await apiClient.getAllCancelReportInvoices(params);

      setInvoiceData(data || []);
      setTotal(totalResult || 0);

      setSummary(
        summary || {
          totalInvoice: 0,
          totalAmount: 0,
          totalReceivedAmount: 0,
          totalRemainAmount: 0,
          totalLostProfit: 0,
        }
      );
    } catch (error) {
      console.error("Error fetching cancel invoices:", error);
      toast.error("Failed to fetch cancel invoices");
      setInvoiceData([]);
      setTotal(0);
      setSummary({
        totalInvoice: 0,
        totalAmount: 0,
        totalReceivedAmount: 0,
        totalRemainAmount: 0,
        totalLostProfit: 0,
      });
    } finally {
      setIsLoading(false);
    }
  }, [sortField, sortOrder, page, pageSize, search, startDate, endDate, saleType, branchId]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

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
    navigate("/reportCancelInvoice");
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
      updateParams({ sortOrder: sortOrder === "asc" ? "desc" : "asc" });
    } else {
      updateParams({ sortField: field, sortOrder: "asc" });
    }
  };

  const exportData = invoiceData.map((inv, index) => ({
    No: (page - 1) * pageSize + index + 1,
    "Invoice Date": inv.orderDate ? format(new Date(inv.orderDate), "dd-MMM-yyyy") : "",
    Reference: inv.ref,
    "Invoice Type": inv.OrderSaleType,
    Customer: inv.customer?.name || "N/A",
    Branch: inv.branch?.name || "",
    Status: inv.status,
    "Grand Total": Number(inv.totalAmount || 0),
    Paid: Number(inv.paidAmount || 0),
    Due: Number((inv as any).dueAmount ?? (inv.totalAmount || 0) - (inv.paidAmount || 0)),
    "Lost Profit": Number((inv as any).lostProfit || 0),
    "Canceled At": inv.deletedAt
      ? dayjs.tz(inv.deletedAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss")
      : "N/A",
    "Canceled By": `${inv.deleter?.lastName || ""} ${inv.deleter?.firstName || ""}`.trim(),
    Reason: inv.delReason || "",
    "Created At": inv.createdAt
      ? dayjs.tz(inv.createdAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss")
      : "",
    "Created By": `${inv.creator?.lastName || ""} ${inv.creator?.firstName || ""}`.trim(),
    "Updated At": inv.updatedAt
      ? dayjs.tz(inv.updatedAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss")
      : "",
    "Updated By": `${inv.updater?.lastName || ""} ${inv.updater?.firstName || ""}`.trim(),
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

                      if (endDate && newEnd < newStart) {
                        newEnd = newStart;
                      }

                      updateParams({ startDate: newStart, endDate: newEnd, page: 1 });
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
                      updateParams({ endDate: e.target.value, page: 1 })
                    }
                    className="form-input"
                  />
                </div>

                <div>
                  <label>Sale Type</label>
                  <select
                    value={saleType}
                    onChange={(e) =>
                      updateParams({ saleType: e.target.value, page: 1 })
                    }
                    className="form-select"
                  >
                    <option value="ALL">All</option>
                    <option value="RETAIL">Retail</option>
                    <option value="WHOLESALE">Wholesale</option>
                  </select>
                </div>

                {user?.roleType === "ADMIN" && (
                  <div>
                    <label>Branch</label>
                    <select
                      value={branchId ?? ""}
                      onChange={(e) =>
                        updateParams({
                          branchId: Number(e.target.value) || undefined,
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
                  <button className="btn btn-primary" onClick={handleClearAllFilter}>
                    <RefreshCw />
                    Clear All Filter
                  </button>
                </div>
              </div>

              <div className="mt-4 mb-4 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-4">
                <SummaryCard
                  title="Canceled Invoices"
                  value={summary.totalInvoice}
                  icon={faFileInvoice}
                  color="indigo"
                  onClick={() => updateParams({ page: 1 })}
                />

                <SummaryCard
                  title="Total Amount"
                  value={summary.totalAmount}
                  icon={faDollarSign}
                  color="blue"
                  isCurrency
                  onClick={() => updateParams({ page: 1 })}
                />

                {/* <SummaryCard
                  title="Total Received"
                  value={summary.totalReceivedAmount}
                  icon={faCircleCheck}
                  color="green"
                  isCurrency
                  onClick={() => updateParams({ page: 1 })}
                />

                <SummaryCard
                  title="Total Remaining"
                  value={summary.totalRemainAmount}
                  icon={faClockRotateLeft}
                  color="red"
                  isCurrency
                  onClick={() => updateParams({ page: 1 })}
                /> */}

                <SummaryCard
                  title="Total Lost Profit"
                  value={summary.totalLostProfit}
                  icon={faChartLine}
                  color={summary.totalLostProfit >= 0 ? "red" : "green"}
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
                        updateParams({ search: e.target.value, page: 1 })
                      }
                    />
                  </div>

                  <VisibleColumnsSelector
                    allColumns={columns}
                    visibleColumns={visibleCols}
                    onToggleColumn={toggleCol}
                  />

                  <ExportDropdown data={exportData} prefix="CancelInvoice" />
                </div>

                <div className="dataTable-container">
                  {isLoading ? (
                    <p>Loading...</p>
                  ) : (
                    <table id="myTable1" className="whitespace-nowrap dataTable-table">
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
                                          <FontAwesomeIcon icon={faArrowDownAZ} />
                                        ) : (
                                          <FontAwesomeIcon icon={faArrowUpZA} />
                                        )
                                      ) : (
                                        <FontAwesomeIcon icon={faArrowDownAZ} />
                                      )
                                    ) : null}
                                  </div>
                                </th>
                              )
                          )}
                        </tr>
                      </thead>

                      <tbody>
                        {invoiceData.length > 0 ? (
                          invoiceData.map((rows, index) => {
                            const dueAmount = Number(
                              (rows as any).dueAmount ??
                                (rows.totalAmount || 0) - (rows.paidAmount || 0)
                            );
                            const lostProfit = Number((rows as any).lostProfit || 0);

                            return (
                              <tr key={rows.id || index}>
                                {visibleCols.includes("No") && (
                                  <td>{(page - 1) * pageSize + index + 1}</td>
                                )}

                                {visibleCols.includes("Invoice Date") && (
                                  <td>
                                    {rows.orderDate
                                      ? format(new Date(rows.orderDate), "dd-MMM-yyyy")
                                      : ""}
                                  </td>
                                )}

                                {visibleCols.includes("Reference") && (
                                  <td>{rows.ref}</td>
                                )}

                                {visibleCols.includes("Invoice Type") && (
                                  <td>
                                    <span
                                      className="badge rounded-full px-3 py-1 font-medium cursor-default text-white"
                                      style={{
                                        backgroundColor:
                                          rows.OrderSaleType === "WHOLESALE"
                                            ? "#F39EB6"
                                            : "#a855f7",
                                      }}
                                    >
                                      {rows.OrderSaleType}
                                    </span>
                                  </td>
                                )}

                                {visibleCols.includes("Customer") && (
                                  <td>{rows.customer?.name || "N/A"}</td>
                                )}

                                {visibleCols.includes("Branch") && (
                                  <td>{rows.branch?.name || ""}</td>
                                )}

                                {visibleCols.includes("Status") && (
                                  <td>
                                    <span
                                      className={getStatusBadge(rows.status)}
                                      title={rows.delReason || ""}
                                    >
                                      {rows.status}
                                    </span>
                                  </td>
                                )}

                                {visibleCols.includes("Grand Total") && (
                                  <td style={{ color: "blue" }}>
                                    $ {formatCurrency(Number(rows.totalAmount || 0))}
                                  </td>
                                )}

                                {visibleCols.includes("Paid") && (
                                  <td style={{ color: dueAmount > 0 ? "red" : "green" }}>
                                    $ {formatCurrency(Number(rows.paidAmount || 0))}
                                  </td>
                                )}

                                {visibleCols.includes("Due") && (
                                  <td style={{ color: dueAmount > 0 ? "red" : "black" }}>
                                    $ {formatCurrency(dueAmount)}
                                  </td>
                                )}

                                {visibleCols.includes("Lost Profit") && (
                                  <td className="text-danger font-semibold">
                                    $ {formatCurrency(lostProfit)}
                                  </td>
                                )}

                                {visibleCols.includes("Canceled At") && (
                                  <td>
                                    {rows.deletedAt
                                      ? dayjs
                                          .tz(rows.deletedAt, "Asia/Phnom_Penh")
                                          .format("DD / MMM / YYYY HH:mm:ss")
                                      : "N/A"}
                                  </td>
                                )}

                                {visibleCols.includes("Canceled By") && (
                                  <td>
                                    {rows.deletedAt
                                      ? `${rows.deleter?.lastName || ""} ${rows.deleter?.firstName || ""}`
                                      : "N/A"}
                                  </td>
                                )}

                                {visibleCols.includes("Reason") && (
                                  <td>{rows.delReason || ""}</td>
                                )}

                                {visibleCols.includes("Created At") && (
                                  <td>
                                    {rows.createdAt
                                      ? dayjs
                                          .tz(rows.createdAt, "Asia/Phnom_Penh")
                                          .format("DD / MMM / YYYY HH:mm:ss")
                                      : ""}
                                  </td>
                                )}

                                {visibleCols.includes("Created By") && (
                                  <td>
                                    {rows.creator?.lastName || ""}{" "}
                                    {rows.creator?.firstName || ""}
                                  </td>
                                )}

                                {visibleCols.includes("Updated At") && (
                                  <td>
                                    {rows.updatedAt
                                      ? dayjs
                                          .tz(rows.updatedAt, "Asia/Phnom_Penh")
                                          .format("DD / MMM / YYYY HH:mm:ss")
                                      : ""}
                                  </td>
                                )}

                                {visibleCols.includes("Updated By") && (
                                  <td>
                                    {rows.updater?.lastName || ""}{" "}
                                    {rows.updater?.firstName || ""}
                                  </td>
                                )}

                                {visibleCols.includes("Note/Print") && (
                                  <td className="text-center">
                                    <div className="flex items-center justify-center gap-2">
                                      {rows.note && (
                                        <button
                                          type="button"
                                          className="hover:text-danger"
                                          onClick={() => handleViewNote(rows.note as string)}
                                          title="View Note"
                                        >
                                          <NotebookText color="pink" />
                                        </button>
                                      )}

                                      {hasPermission("Invoice-Print") && (
                                        <NavLink
                                          to={`/printinvoice/${rows.id}`}
                                          className="hover:text-warning"
                                          title="Print Invoice"
                                        >
                                          <PrinterCheck color="purple" />
                                        </NavLink>
                                      )}
                                    </div>
                                  </td>
                                )}
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={visibleCols.length} className="text-center py-4">
                              No Cancel Invoice Found!
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
                <h5 className="flex font-bold text-lg">
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

export default ReportCancelInvoice;