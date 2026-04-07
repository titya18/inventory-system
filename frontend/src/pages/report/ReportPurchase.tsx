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
  faCircleCheck,
  faClockRotateLeft,
} from "@fortawesome/free-solid-svg-icons";
import { toast } from "react-toastify";
import { useAppContext } from "@/hooks/useAppContext";
import { format } from "date-fns";
import { PrinterCheck, NotebookText, RefreshCw } from "lucide-react";
import { PurchaseType, BranchType } from "@/data_types/types";
import { NavLink, useNavigate, useSearchParams } from "react-router-dom";
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
  "Purchase Date",
  "Reference",
  "Supplier",
  "Branch",
  "Status",
  "Grand Total",
//   "Paid",
//   "Due",
  "Received At",
  "Received By",
  "Cancelled At",
  "Cancelled By",
  "Cancelled Reason",
  "Created At",
  "Created By",
  "Updated At",
  "Updated By",
  "Note/Print",
];

const DEFAULT_VISIBLE_COLUMNS = [
  "No",
  "Purchase Date",
  "Reference",
  "Supplier",
  "Branch",
  "Status",
  "Grand Total",
//   "Paid",
//   "Due",
  "Note/Print",
];

const sortFields: Record<string, string> = {
  No: "id",
  "Purchase Date": "purchaseDate",
  Reference: "ref",
  Supplier: "supplierId",
  Branch: "branchId",
  Status: "status",
  "Grand Total": "grandTotal",
//   Paid: "paidAmount",
//   Due: "due",
  "Received At": "receivedAt",
  "Received By": "receivedBy",
  "Cancelled At": "deletedAt",
  "Cancelled By": "deletedBy",
  "Cancelled Reason": "delReason",
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
    case "REQUESTED":
      return "badge rounded-full bg-secondary";
    case "APPROVED":
      return "badge rounded-full bg-info";
    case "RECEIVED":
      return "badge rounded-full bg-primary";
    case "COMPLETED":
      return "badge rounded-full bg-success";
    case "CANCELLED":
      return "badge rounded-full bg-danger";
    default:
      return "badge rounded-full bg-secondary";
  }
};

const ReportPurchase: React.FC = () => {
  const [branches, setBranches] = useState<BranchType[]>([]);
  const [purchaseData, setPurchaseData] = useState<PurchaseType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [visibleCols, setVisibleCols] = useState(DEFAULT_VISIBLE_COLUMNS);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [viewNote, setViewNote] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const [searchParams, setSearchParams] = useSearchParams();
  const today = dayjs().format("YYYY-MM-DD");
  const startDate = searchParams.get("startDate") || today;
  const endDate = searchParams.get("endDate") || today;
  const status = searchParams.get("status") || "";
  const branchId = searchParams.get("branchId")
    ? parseInt(searchParams.get("branchId")!, 10)
    : undefined;
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
  const sortField = searchParams.get("sortField") || "purchaseDate";
  const sortOrder = searchParams.get("sortOrder") === "desc" ? "desc" : "asc";

  const [summary, setSummary] = useState<{
    totalPurchase: number;
    grandTotalAmount: number;
    totalPaidAmount: number;
    totalRemainAmount: number;
  }>({
    totalPurchase: 0,
    grandTotalAmount: 0,
    totalPaidAmount: 0,
    totalRemainAmount: 0,
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

  const fetchPurchases = useCallback(async () => {
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
        status: status || undefined,
        branchId,
      };

      const { data, total: totalResult, summary } =
        await apiClient.getAllReportPurchases(params);

      setPurchaseData(data || []);
      setTotal(totalResult || 0);
      setSummary({
        totalPurchase: Number(summary?.totalPurchase || 0),
        grandTotalAmount: Number(summary?.grandTotalAmount || 0),
        totalPaidAmount: Number(summary?.totalPaidAmount || 0),
        totalRemainAmount: Number(summary?.totalRemainAmount || 0),
      });
    } catch (error) {
      console.error("Error fetching purchases:", error);
      toast.error("Failed to fetch purchases.");
      setPurchaseData([]);
      setTotal(0);
      setSummary({
        totalPurchase: 0,
        grandTotalAmount: 0,
        totalPaidAmount: 0,
        totalRemainAmount: 0,
      });
    } finally {
      setIsLoading(false);
    }
  }, [sortField, sortOrder, page, pageSize, search, startDate, endDate, status, branchId]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

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
    navigate("/reportPurchase");
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

  const exportData = purchaseData.map((purchase, index) => ({
    No: (page - 1) * pageSize + index + 1,
    "Purchase Date": purchase.purchaseDate
      ? format(new Date(purchase.purchaseDate), "dd-MMM-yyyy")
      : "",
    Reference: purchase.ref,
    Supplier: purchase.supplier?.name || "",
    Branch: purchase.branch?.name || "",
    Status: purchase.status,
    "Grand Total": Number(purchase.grandTotal || 0),
    Paid: Number(purchase.paidAmount || 0),
    Due: Number(
      (purchase as any).dueAmount ??
        Number(purchase.grandTotal || 0) - Number(purchase.paidAmount || 0)
    ),
    "Received At": purchase.receivedAt
      ? dayjs.tz(purchase.receivedAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss")
      : "",
    "Received By": `${purchase.receiver?.lastName || ""} ${purchase.receiver?.firstName || ""}`.trim(),
    "Cancelled At": purchase.deletedAt
      ? dayjs.tz(purchase.deletedAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss")
      : "",
    "Cancelled By": `${purchase.deleter?.lastName || ""} ${purchase.deleter?.firstName || ""}`.trim(),
    "Cancelled Reason": purchase.delReason || "",
    "Created At": purchase.createdAt
      ? dayjs.tz(purchase.createdAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss")
      : "",
    "Created By": `${purchase.creator?.lastName || ""} ${purchase.creator?.firstName || ""}`.trim(),
    "Updated At": purchase.updatedAt
      ? dayjs.tz(purchase.updatedAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss")
      : "",
    "Updated By": `${purchase.updater?.lastName || ""} ${purchase.updater?.firstName || ""}`.trim(),
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
                    <option value="REQUESTED">Requested</option>
                    <option value="APPROVED">Approved</option>
                    <option value="RECEIVED">Received</option>
                    <option value="CANCELLED">Cancelled</option>
                    <option value="COMPLETED">Completed</option>
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
                  title="Total Purchase"
                  value={summary.totalPurchase}
                  icon={faFileInvoice}
                  color="indigo"
                  onClick={() => updateParams({ page: 1 })}
                />

                <SummaryCard
                  title="Total Amount"
                  value={summary.grandTotalAmount}
                  icon={faDollarSign}
                  color="blue"
                  isCurrency
                  onClick={() => updateParams({ status: undefined, page: 1 })}
                />

                {/* <SummaryCard
                  title="Total Paid Amount"
                  value={summary.totalPaidAmount}
                  icon={faCircleCheck}
                  color="green"
                  isCurrency
                  onClick={() => updateParams({ status: undefined, page: 1 })}
                />

                <SummaryCard
                  title="Total Remaining"
                  value={summary.totalRemainAmount}
                  icon={faClockRotateLeft}
                  color="red"
                  isCurrency
                  onClick={() => updateParams({ status: "PENDING", page: 1 })}
                /> */}
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

                  <ExportDropdown data={exportData} prefix="Report_Purchase" />
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
                                    {sortField === sortFields[col] ? (
                                      sortOrder === "asc" ? (
                                        <FontAwesomeIcon icon={faArrowDownAZ} />
                                      ) : (
                                        <FontAwesomeIcon icon={faArrowUpZA} />
                                      )
                                    ) : (
                                      <FontAwesomeIcon icon={faArrowDownAZ} />
                                    )}
                                  </div>
                                </th>
                              )
                          )}
                        </tr>
                      </thead>

                      <tbody>
                        {purchaseData.length > 0 ? (
                          purchaseData.map((rows, index) => {
                            const dueAmount = Number(
                              (rows as any).dueAmount ??
                                Number(rows.grandTotal || 0) -
                                  Number(rows.paidAmount || 0)
                            );

                            return (
                              <tr key={rows.id || index}>
                                {visibleCols.includes("No") && (
                                  <td>{(page - 1) * pageSize + index + 1}</td>
                                )}

                                {visibleCols.includes("Purchase Date") && (
                                  <td>
                                    {rows.purchaseDate
                                      ? format(new Date(rows.purchaseDate), "dd-MMM-yyyy")
                                      : ""}
                                  </td>
                                )}

                                {visibleCols.includes("Reference") && (
                                  <td>{rows.ref}</td>
                                )}

                                {visibleCols.includes("Supplier") && (
                                  <td>{rows.supplier?.name || ""}</td>
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
                                    $ {formatCurrency(Number(rows.grandTotal || 0))}
                                  </td>
                                )}

                                {/* {visibleCols.includes("Paid") && (
                                  <td style={{ color: dueAmount > 0 ? "red" : "green" }}>
                                    $ {formatCurrency(Number(rows.paidAmount || 0))}
                                  </td>
                                )}

                                {visibleCols.includes("Due") && (
                                  <td style={{ color: dueAmount > 0 ? "red" : "black" }}>
                                    $ {formatCurrency(dueAmount)}
                                  </td>
                                )} */}

                                {visibleCols.includes("Received At") && (
                                  <td>
                                    {rows.receivedAt
                                      ? dayjs
                                          .tz(rows.receivedAt, "Asia/Phnom_Penh")
                                          .format("DD / MMM / YYYY HH:mm:ss")
                                      : "N/A"}
                                  </td>
                                )}

                                {visibleCols.includes("Received By") && (
                                  <td>
                                    {rows.receiver?.lastName || ""}{" "}
                                    {rows.receiver?.firstName || ""}
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
                                      : "N/A"}
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

                                      {hasPermission("Purchase-Print") && (
                                        <NavLink
                                          to={`/printpurchase/${rows.id}`}
                                          className="hover:text-warning"
                                          title="Print Purchase"
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
                              No Purchase Found!
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

export default ReportPurchase;