import React, { useState, useEffect, useCallback } from "react";
import * as apiClient from "@/api/report";
import { getAllBranches } from "@/api/branch";
import Pagination from "../components/Pagination";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useAppContext } from "@/hooks/useAppContext";
import { format } from "date-fns";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { BranchType, PaymentType } from "@/data_types/types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowUpZA,
  faArrowDownAZ,
  faFileInvoice,
  faDollarSign,
} from "@fortawesome/free-solid-svg-icons";
import { RefreshCw } from "lucide-react";
import SummaryCard from "./SummaryInvoiceCard";
import VisibleColumnsSelector from "@/components/VisibleColumnsSelector";
import ExportDropdown from "@/components/ExportDropdown";

dayjs.extend(utc);
dayjs.extend(timezone);

const columns = [
  "No",
  "Payment Date",
  "Purchase's ID",
  "Supplier",
  "Branch",
  "Payment Method",
  "Amount Paid",
  "Paid USD",
  "Paid KHR",
  "Exchange Rate",
  "Status",
  "Created At",
  "Created By",
  "Cancelled At",
  "Cancelled By",
  "Cancelled Reason",
];

const DEFAULT_VISIBLE_COLUMNS = [
  "No",
  "Payment Date",
  "Purchase's ID",
  "Supplier",
  "Branch",
  "Payment Method",
  "Amount Paid",
  "Paid USD",
  "Paid KHR",
  "Exchange Rate",
  "Status",
];

const sortFields: Record<string, string> = {
  No: "id",
  "Payment Date": "paymentDate",
  "Purchase's ID": "ref",
  Supplier: "supplierId",
  Branch: "branchId",
  "Payment Method": "paymentMethodId",
  "Amount Paid": "amount",
  "Paid USD": "receive_usd",
  "Paid KHR": "receive_khr",
  "Exchange Rate": "exchangerate",
  Status: "status",
  "Created At": "createdAt",
  "Created By": "createdBy",
  "Cancelled At": "deletedAt",
  "Cancelled By": "deletedBy",
  "Cancelled Reason": "delReason",
};

const formatCurrency = (value?: number | null) =>
  Number(value || 0)
    .toFixed(2)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");

const getStatusBadge = (status?: string) => {
  switch (status) {
    case "PAID":
      return "badge rounded-full bg-success";
    case "CANCELLED":
      return "badge rounded-full bg-danger";
    default:
      return "badge rounded-full bg-secondary";
  }
};

const ReportPaymentPurchase: React.FC = () => {
  const [branches, setBranches] = useState<BranchType[]>([]);
  const [invoiceData, setInvoiceData] = useState<PaymentType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [visibleCols, setVisibleCols] = useState(DEFAULT_VISIBLE_COLUMNS);
  const [total, setTotal] = useState(0);

  const { user } = useAppContext();
  const navigate = useNavigate();
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
  const sortField = searchParams.get("sortField") || "paymentDate";
  const sortOrder = searchParams.get("sortOrder") === "desc" ? "desc" : "asc";

  const [summary, setSummary] = useState<{
    totalPayments: number;
    totalPaid: number;
  }>({
    totalPayments: 0,
    totalPaid: 0,
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
        startDate,
        endDate,
        status: status || undefined,
        branchId,
      };

      const { data, total: totalResult, summary } =
        await apiClient.getAllPaymentReportPurchases(params);

      setInvoiceData(data || []);
      setTotal(totalResult || 0);
      setSummary({
        totalPayments: Number(summary?.totalPayments || 0),
        totalPaid: Number(summary?.totalPaid || 0),
      });
    } catch (error) {
      console.error("Error fetching payment purchase:", error);
      toast.error("Failed to fetch payment purchase.");
      setInvoiceData([]);
      setTotal(0);
      setSummary({ totalPayments: 0, totalPaid: 0 });
    } finally {
      setIsLoading(false);
    }
  }, [sortField, sortOrder, page, pageSize, search, startDate, endDate, status, branchId]);

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

  const handleClearAllFilter = () => navigate("/reportPurPayment");

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
    "Payment Date": inv.paymentDate
      ? format(new Date(inv.paymentDate), "dd-MMM-yyyy")
      : "",
    "Purchase's ID": inv.purchase?.ref || "",
    Supplier: inv.supplier?.name || "N/A",
    Branch: inv.branch?.name || "",
    "Payment Method": inv.PaymentMethods?.name || "",
    "Amount Paid": Number(inv.amount || 0),
    "Paid USD": Number(inv.receive_usd || 0),
    "Paid KHR": Number(inv.receive_khr || 0),
    "Exchange Rate": Number(inv.exchangerate || 0),
    Status: inv.status || "",
    "Created At": inv.createdAt
      ? dayjs.tz(inv.createdAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss")
      : "",
    "Created By": `${inv.creator?.lastName || ""} ${inv.creator?.firstName || ""}`.trim(),
    "Cancelled At": inv.deletedAt
      ? dayjs.tz(inv.deletedAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss")
      : "",
    "Cancelled By": inv.deletedAt
      ? `${inv.deleter?.lastName || ""} ${inv.deleter?.firstName || ""}`.trim()
      : "",
    "Cancelled Reason": inv.delReason || "",
  }));

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
                    onChange={(e) => updateParams({ startDate: e.target.value, page: 1 })}
                    className="form-input"
                  />
                </div>

                <div>
                  <label>End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate}
                    onChange={(e) => updateParams({ endDate: e.target.value, page: 1 })}
                    className="form-input"
                  />
                </div>

                <div>
                  <label>Status</label>
                  <select
                    value={status}
                    onChange={(e) => updateParams({ status: e.target.value, page: 1 })}
                    className="form-select"
                  >
                    <option value="">All</option>
                    <option value="PAID">Paid</option>
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
                  title="Total Payments"
                  value={summary.totalPayments}
                  icon={faFileInvoice}
                  color="indigo"
                />
                <SummaryCard
                  title="Total Paid"
                  value={summary.totalPaid}
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
                      onChange={(e) => updateParams({ search: e.target.value, page: 1 })}
                    />
                  </div>

                  <VisibleColumnsSelector
                    allColumns={columns}
                    visibleColumns={visibleCols}
                    onToggleColumn={toggleCol}
                  />

                  <ExportDropdown data={exportData} prefix="Report_Purchase_Payment" />
                </div>

                <div className="dataTable-container">
                  {isLoading ? (
                    <p>Loading...</p>
                  ) : (
                    <table className="whitespace-nowrap dataTable-table">
                      <thead>
                        <tr>
                          {columns.map(
                            (col) =>
                              visibleCols.includes(col) && (
                                <th
                                  key={col}
                                  onClick={() => handleSort(col)}
                                  className="px-4 py-2 cursor-pointer"
                                >
                                  <div className="flex items-center gap-1">
                                    {col}
                                    {sortField === sortFields[col] ? (
                                      sortOrder === "asc" ? (
                                        <FontAwesomeIcon icon={faArrowDownAZ} />
                                      ) : (
                                        <FontAwesomeIcon icon={faArrowUpZA} />
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
                          invoiceData.map((rows, index) => (
                            <tr key={rows.id || index}>
                              {visibleCols.includes("No") && (
                                <td>{(page - 1) * pageSize + index + 1}</td>
                              )}
                              {visibleCols.includes("Payment Date") && (
                                <td>
                                  {rows.paymentDate
                                    ? format(new Date(rows.paymentDate), "dd-MMM-yyyy")
                                    : ""}
                                </td>
                              )}
                              {visibleCols.includes("Purchase's ID") && (
                                <td>{rows.purchase?.ref || ""}</td>
                              )}
                              {visibleCols.includes("Supplier") && (
                                <td>{rows.supplier?.name || "N/A"}</td>
                              )}
                              {visibleCols.includes("Branch") && (
                                <td>{rows.branch?.name || ""}</td>
                              )}
                              {visibleCols.includes("Payment Method") && (
                                <td>{rows.PaymentMethods?.name || ""}</td>
                              )}
                              {visibleCols.includes("Amount Paid") && (
                                <td style={{ color: "green" }}>
                                  $ {formatCurrency(Number(rows.amount || 0))}
                                </td>
                              )}
                              {visibleCols.includes("Paid USD") && (
                                <td style={{ color: "green" }}>
                                  $ {formatCurrency(Number(rows.receive_usd || 0))}
                                </td>
                              )}
                              {visibleCols.includes("Paid KHR") && (
                                <td style={{ color: "green" }}>
                                  {Number(rows.receive_khr || 0)
                                    .toFixed(0)
                                    .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}{" "}
                                  ៛
                                </td>
                              )}
                              {visibleCols.includes("Exchange Rate") && (
                                <td>
                                  {Number(rows.exchangerate || 0)
                                    .toFixed(0)
                                    .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}{" "}
                                  ៛
                                </td>
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
                              {visibleCols.includes("Cancelled At") && (
                                <td>
                                  {rows.deletedAt
                                    ? dayjs
                                        .tz(rows.deletedAt, "Asia/Phnom_Penh")
                                        .format("DD / MMM / YYYY HH:mm:ss")
                                    : ""}
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
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={columns.length} className="text-center py-4">
                              No Payment Purchase Found!
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
    </>
  );
};

export default ReportPaymentPurchase;