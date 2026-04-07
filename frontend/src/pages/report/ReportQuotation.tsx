import React, { useState, useEffect, useCallback } from "react";
import * as apiClient from "@/api/report";
import { getAllBranches } from "@/api/branch";
import Pagination from "../components/Pagination";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowUpZA,
  faArrowDownAZ,
  faClose,
  faFileInvoice,
  faDollarSign,
} from "@fortawesome/free-solid-svg-icons";
import { toast } from "react-toastify";
import { useAppContext } from "@/hooks/useAppContext";
import { format } from "date-fns";
import { PrinterCheck, NotebookText, RefreshCw } from "lucide-react";
import { QuotationType, BranchType } from "@/data_types/types";
import { NavLink, useNavigate, useSearchParams } from "react-router-dom";
import SummaryCard from "./SummaryInvoiceCard";
import VisibleColumnsSelector from "@/components/VisibleColumnsSelector";
import ExportDropdown from "@/components/ExportDropdown";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const columns = [
  "No",
  "Quotation Date",
  "Reference",
  "Quotation Type",
  "Customer",
  "Branch",
  "Status",
  "Grand Total",
  "Sent At",
  "Sent By",
  "INV At",
  "INV By",
  "Created At",
  "Created By",
  "Updated At",
  "Updated By",
  "Cancelled By",
  "Cancelled At",
  "Cancelled Reason",
  "Actions",
];

const DEFAULT_VISIBLE_COLUMNS = [
  "No",
  "Quotation Date",
  "Reference",
  "Quotation Type",
  "Customer",
  "Branch",
  "Status",
  "Grand Total",
  "Actions",
];

const sortFields: Record<string, string> = {
  No: "id",
  "Quotation Date": "quotationDate",
  Reference: "ref",
  "Quotation Type": "QuoteSaleType",
  Customer: "customerId",
  Branch: "branchId",
  Status: "status",
  "Grand Total": "grandTotal",
  "Sent At": "sentAt",
  "Sent By": "sentBy",
  "INV At": "invoicedAt",
  "INV By": "invoicedBy",
  "Created At": "createdAt",
  "Created By": "createdBy",
  "Updated At": "updatedAt",
  "Updated By": "updatedBy",
  "Cancelled By": "deletedBy",
  "Cancelled At": "deletedAt",
  "Cancelled Reason": "delReason",
};

const formatCurrency = (value?: number | null) =>
  Number(value || 0)
    .toFixed(2)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");

const ReportQuotation: React.FC = () => {
  const [branches, setBranches] = useState<BranchType[]>([]);
  const [quotationData, setQuotationData] = useState<QuotationType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [visibleCols, setVisibleCols] = useState(DEFAULT_VISIBLE_COLUMNS);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [viewNote, setViewNote] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

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
  const sortField = searchParams.get("sortField") || "quotationDate";
  const sortOrder = searchParams.get("sortOrder") === "desc" ? "desc" : "asc";

  const [summary, setSummary] = useState<{
    totalQuotation: number;
    totalAmount: number;
  }>({
    totalQuotation: 0,
    totalAmount: 0,
  });

  const { user, hasPermission } = useAppContext();
  const navigate = useNavigate();

  const fetchBranches = useCallback(async () => {
    try {
      const data = await getAllBranches();
      setBranches(data as BranchType[]);
    } catch (error) {
      console.error("Error fetching branches:", error);
    }
  }, []);

  const fetchQuotations = useCallback(async () => {
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

      const { data, total: totalResult, summary } =
        await apiClient.getAllReportQuotations(params);

      setQuotationData(data || []);
      setTotal(totalResult || 0);
      setSummary({
        totalQuotation: Number(summary?.totalQuotation || 0),
        totalAmount: Number(summary?.totalAmount || 0),
      });
    } catch (error) {
      console.error("Error fetching quotations:", error);
      toast.error("Failed to fetch quotations.");
      setQuotationData([]);
      setTotal(0);
      setSummary({ totalQuotation: 0, totalAmount: 0 });
    } finally {
      setIsLoading(false);
    }
  }, [sortField, sortOrder, page, pageSize, search, startDate, endDate, saleType, status, branchId]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

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
    navigate("/reportQuotation");
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

  const exportData = quotationData.map((quote, index) => ({
    No: (page - 1) * pageSize + index + 1,
    "Quotation Date": quote.quotationDate
      ? format(new Date(quote.quotationDate), "dd-MMM-yyyy")
      : "",
    Reference: quote.ref,
    "Quotation Type": quote.QuoteSaleType,
    Customer: quote.customer?.name || "N/A",
    Branch: quote.branch?.name || "",
    Status: quote.status,
    "Grand Total": Number(quote.grandTotal || 0),
    "Sent At": quote.sentAt
      ? dayjs.tz(quote.sentAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss")
      : "",
    "Sent By": quote.sentAt
      ? `${quote.sender?.lastName || ""} ${quote.sender?.firstName || ""}`.trim()
      : "",
    "INV At": quote.invoicedAt
      ? dayjs.tz(quote.invoicedAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss")
      : "",
    "INV By": quote.invoicedAt
      ? `${quote.invoicer?.lastName || ""} ${quote.invoicer?.firstName || ""}`.trim()
      : "",
    "Created At": quote.createdAt
      ? dayjs.tz(quote.createdAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss")
      : "",
    "Created By": `${quote.creator?.lastName || ""} ${quote.creator?.firstName || ""}`.trim(),
    "Updated At": quote.updatedAt
      ? dayjs.tz(quote.updatedAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss")
      : "",
    "Updated By": `${quote.updater?.lastName || ""} ${quote.updater?.firstName || ""}`.trim(),
    "Cancelled At": quote.deletedAt
      ? dayjs.tz(quote.deletedAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss")
      : "",
    "Cancelled By": quote.deletedAt
      ? `${quote.deleter?.lastName || ""} ${quote.deleter?.firstName || ""}`.trim()
      : "",
    "Cancelled Reason": quote.delReason || "",
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
                  <label>Quotation Type</label>
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

                <div>
                  <label>Status</label>
                  <select
                    value={status}
                    onChange={(e) =>
                      updateParams({ status: e.target.value, page: 1 })
                    }
                    className="form-select"
                  >
                    <option value="">All</option>
                    <option value="PENDING">Pending</option>
                    <option value="SENT">Sent</option>
                    <option value="INVOICED">Invoiced</option>
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
                    <RefreshCw /> Clear All Filter
                  </button>
                </div>
              </div>

              <div className="mt-4 mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                <SummaryCard
                  title="Total Quotation"
                  value={summary.totalQuotation}
                  icon={faFileInvoice}
                  color="indigo"
                />
                <SummaryCard
                  title="Total Amount"
                  value={summary.totalAmount}
                  icon={faDollarSign}
                  color="green"
                  isCurrency
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

                  <ExportDropdown data={exportData} prefix="Report_Quotation" />
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
                        {quotationData.length > 0 ? (
                          quotationData.map((rows, index) => (
                            <tr key={rows.id || index}>
                              {visibleCols.includes("No") && (
                                <td>{(page - 1) * pageSize + index + 1}</td>
                              )}

                              {visibleCols.includes("Quotation Date") && (
                                <td>
                                  {rows.quotationDate
                                    ? format(new Date(rows.quotationDate), "dd-MMM-yyyy")
                                    : ""}
                                </td>
                              )}

                              {visibleCols.includes("Reference") && (
                                <td>{rows.ref}</td>
                              )}

                              {visibleCols.includes("Quotation Type") && (
                                <td>
                                  <span
                                    className="badge rounded-full px-3 py-1 font-medium cursor-default text-white"
                                    style={{
                                      backgroundColor:
                                        rows.QuoteSaleType === "WHOLESALE"
                                          ? "#F39EB6"
                                          : "#a855f7",
                                    }}
                                  >
                                    {rows.QuoteSaleType}
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
                                  {rows.status === "PENDING" ? (
                                    <span className="badge rounded-full bg-warning">
                                      {rows.status}
                                    </span>
                                  ) : rows.status === "SENT" ? (
                                    <span className="badge rounded-full bg-primary">
                                      {rows.status}
                                    </span>
                                  ) : rows.status === "CANCELLED" ? (
                                    <span
                                      className="badge rounded-full bg-danger"
                                      title={rows.delReason ?? "N/A"}
                                    >
                                      {rows.status}
                                    </span>
                                  ) : (
                                    <span className="badge rounded-full bg-success">
                                      {rows.status}
                                    </span>
                                  )}
                                </td>
                              )}

                              {visibleCols.includes("Grand Total") && (
                                <td style={{ color: "blue" }}>
                                  $ {formatCurrency(Number(rows.grandTotal || 0))}
                                </td>
                              )}

                              {visibleCols.includes("Sent At") && (
                                <td>
                                  {rows.sentAt
                                    ? dayjs
                                        .tz(rows.sentAt, "Asia/Phnom_Penh")
                                        .format("DD / MMM / YYYY HH:mm:ss")
                                    : "N/A"}
                                </td>
                              )}

                              {visibleCols.includes("Sent By") && (
                                <td>
                                  {rows.sentAt
                                    ? `${rows.sender?.lastName || ""} ${rows.sender?.firstName || ""}`
                                    : "N/A"}
                                </td>
                              )}

                              {visibleCols.includes("INV At") && (
                                <td>
                                  {rows.invoicedAt
                                    ? dayjs
                                        .tz(rows.invoicedAt, "Asia/Phnom_Penh")
                                        .format("DD / MMM / YYYY HH:mm:ss")
                                    : "N/A"}
                                </td>
                              )}

                              {visibleCols.includes("INV By") && (
                                <td>
                                  {rows.invoicedAt
                                    ? `${rows.invoicer?.lastName || ""} ${rows.invoicer?.firstName || ""}`
                                    : "N/A"}
                                </td>
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

                              {visibleCols.includes("Cancelled At") && (
                                <td>
                                  {rows.deletedAt
                                    ? dayjs
                                        .tz(rows.deletedAt, "Asia/Phnom_Penh")
                                        .format("DD / MMM / YYYY HH:mm:ss")
                                    : "N/A"}
                                </td>
                              )}

                              {visibleCols.includes("Cancelled By") && (
                                <td>
                                  {rows.deleter?.lastName || ""}{" "}
                                  {rows.deleter?.firstName || ""}
                                </td>
                              )}

                              {visibleCols.includes("Cancelled Reason") && (
                                <td>{rows.delReason || "N/A"}</td>
                              )}

                              {visibleCols.includes("Actions") && (
                                <td className="text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    {rows.note && (
                                      <button
                                        type="button"
                                        className="hover:text-danger"
                                        onClick={() => handleViewNote(rows.note ?? "")}
                                        title="View Note"
                                      >
                                        <NotebookText color="pink" />
                                      </button>
                                    )}

                                    {hasPermission("Quotation-Print") &&
                                      (rows.status === "SENT" ||
                                        rows.status === "INVOICED") && (
                                        <NavLink
                                          to={`/printquotation/${rows.id}`}
                                          className="hover:text-warning"
                                          title="Print Quotation"
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
                            <td colSpan={visibleCols.length} className="text-center py-4">
                              No Quotation Found!
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

export default ReportQuotation;