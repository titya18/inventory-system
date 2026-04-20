import React, { useState, useEffect, useCallback } from "react";
import * as apiClient from "@/api/report";
import { getStockAdjustmentById } from "@/api/stockAdjustment";
import { getAllBranches } from "@/api/branch";
import Pagination from "../components/Pagination";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowUpZA, faArrowDownAZ, faClose } from "@fortawesome/free-solid-svg-icons";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useAppContext } from "@/hooks/useAppContext";
import { format } from "date-fns";
import { NotebookText, RefreshCw, Eye } from "lucide-react";
import { StockAdjustmentType, BranchType } from "@/data_types/types";
import VisibleColumnsSelector from "@/components/VisibleColumnsSelector";
import ExportDropdown from "@/components/ExportDropdown";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const columns = [
    "No",
    "Reference",
    "Adjustment Date",
    "Branch",
    "Adjustment Type",
    "Reason",
    "Status",
    "Total QTY",
    "Approved At",
    "Approved By",
    "Cancelled At",
    "Cancelled By",
    "Cancelled Reason",
    "Created At",
    "Created By",
    "Updated At",
    "Updated By",
    "Actions",
];

const DEFAULT_VISIBLE_COLUMNS = [
    "No",
    "Reference",
    "Adjustment Date",
    "Branch",
    "Adjustment Type",
    "Reason",
    "Status",
    "Total QTY",
    "Actions",
];

const reasonBadge: Record<string, string> = {
    REMOVED: "badge bg-secondary",
    DAMAGED: "badge bg-warning",
    LOST: "badge bg-danger",
};

const sortFields: Record<string, string> = {
    "No": "id",
    "Reference": "ref",
    "Adjustment Date": "adjustDate",
    "Branch": "branchId",
    "Adjustment Type": "AdjustMentType",
    "Status": "StatusType",
    "Total QTY": "totalQuantity",
    "Approved At": "approvedAt",
    "Approved By": "approvedBy",
    "Cancelled At": "deletedAt",
    "Cancelled By": "deletedBy",
    "Cancelled Reason": "delReason",
    "Created At": "createdAt",
    "Created By": "createdBy",
    "Updated At": "updatedAt",
    "Updated By": "updatedBy",
};

const fullName = (user?: { firstName?: string | null; lastName?: string | null } | null) => {
    if (!user) return "N/A";
    const name = `${user.lastName || ""} ${user.firstName || ""}`.trim();
    return name || "N/A";
};

const formatDateTime = (value?: string | Date | null) => {
    if (!value) return "N/A";
    return dayjs.tz(value, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss");
};

const ReportAdjustment: React.FC = () => {
    const [branches, setBranches] = useState<BranchType[]>([]);
    const [adjustmentData, setAdjustmentData] = useState<StockAdjustmentType[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [visibleCols, setVisibleCols] = useState(DEFAULT_VISIBLE_COLUMNS);

    const [showNoteModal, setShowNoteModal] = useState(false);
    const [viewNote, setViewNote] = useState<string | null>(null);

    const [showDetailModal, setShowDetailModal] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [selectedAdjustment, setSelectedAdjustment] = useState<any>(null);

    const [total, setTotal] = useState(0);
    const [searchParams, setSearchParams] = useSearchParams();

    const today = dayjs().format("YYYY-MM-DD");
    const startDate = searchParams.get("startDate") || today;
    const endDate = searchParams.get("endDate") || today;
    const adjustType = searchParams.get("adjustType") || "ALL";
    const status = searchParams.get("status") || "";
    const reason = searchParams.get("reason") || "";
    const branchId = searchParams.get("branchId")
        ? parseInt(searchParams.get("branchId")!, 10)
        : undefined;
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
    const sortField = searchParams.get("sortField") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") === "desc" ? "desc" : "asc";

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

    const { user } = useAppContext();
    const navigate = useNavigate();

    const fetchBranches = useCallback(async () => {
        try {
            const data = await getAllBranches();
            setBranches(data as BranchType[]);
        } catch (error) {
            console.error("Error fetching branches:", error);
        }
    }, []);

    const fetchAdjustments = useCallback(async () => {
        setIsLoading(true);
        try {
            const normalizedAdjustType: "POSITIVE" | "NEGATIVE" | undefined =
                adjustType === "POSITIVE" || adjustType === "NEGATIVE"
                    ? adjustType
                    : undefined;

            const params = {
                sortField,
                sortOrder: sortOrder as "desc" | "asc",
                page,
                pageSize,
                searchTerm: search || undefined,
                startDate: startDate || undefined,
                endDate: endDate || undefined,
                adjustType: normalizedAdjustType,
                status: status || undefined,
                reason: reason || undefined,
                branchId,
            };

            const { data, total: totalResult } = await apiClient.getAllReportAdjustments(params);
            setAdjustmentData(data || []);
            setTotal(totalResult || 0);
        } catch (error) {
            console.error("Error fetching adjustments report:", error);
            toast.error("Failed to fetch adjustments report.");
        } finally {
            setIsLoading(false);
        }
    }, [sortField, sortOrder, page, pageSize, search, startDate, endDate, adjustType, status, reason, branchId]);

    useEffect(() => {
        fetchBranches();
        fetchAdjustments();
    }, [fetchBranches, fetchAdjustments]);

    const handleClearAllFilter = () => {
        navigate("/reportAdjustment");
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

    const exportData = adjustmentData.map((row, index) => ({
        "No": (page - 1) * pageSize + index + 1,
        "Reference": row.ref,
        "Adjustment Date": row.adjustDate ? format(new Date(row.adjustDate), "dd-MMM-yyyy") : "",
        "Branch": row.branch?.name || "",
        "Adjustment Type": row.AdjustMentType,
        "Status": row.StatusType,
        "Total QTY": row.totalQuantity ?? 0,
        "Approved At": formatDateTime(row.approvedAt),
        "Approved By": fullName(row.approver),
        "Cancelled At": formatDateTime(row.deletedAt),
        "Cancelled By": fullName(row.deleter),
        "Cancelled Reason": row.delReason || "",
        "Reason": row.AdjustMentType === "NEGATIVE" ? (row.reasons ?? []).join(", ") : "",
        "Created At": formatDateTime(row.createdAt),
        "Created By": fullName(row.creator),
        "Updated At": formatDateTime(row.updatedAt),
        "Updated By": fullName(row.updater),
        "Note": row.note || "",
    }));

    const handleViewNote = (note: string) => {
        setViewNote(note);
        setShowNoteModal(true);
    };

    const handleViewDetail = async (id: number) => {
        try {
            setDetailLoading(true);
            setShowDetailModal(true);
            const detail = await getStockAdjustmentById(id);
            setSelectedAdjustment(detail);
        } catch (error: any) {
            toast.error(error.message || "Failed to fetch stock adjustment detail");
            setShowDetailModal(false);
        } finally {
            setDetailLoading(false);
        }
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
                                        onChange={(e) => updateParams({ endDate: e.target.value, page: 1 })}
                                        className="form-input"
                                    />
                                </div>

                                <div>
                                    <label>Adjustment Type</label>
                                    <select
                                        value={adjustType}
                                        onChange={(e) => updateParams({ adjustType: e.target.value, page: 1 })}
                                        className="form-select"
                                    >
                                        <option value="ALL">All</option>
                                        <option value="POSITIVE">Positive</option>
                                        <option value="NEGATIVE">Negative</option>
                                    </select>
                                </div>

                                <div>
                                    <label>Status</label>
                                    <select
                                        value={status}
                                        onChange={(e) => updateParams({ status: e.target.value, page: 1 })}
                                        className="form-select"
                                    >
                                        <option value="">All</option>
                                        <option value="PENDING">Pending</option>
                                        <option value="APPROVED">Approved</option>
                                        <option value="CANCELLED">Cancelled</option>
                                    </select>
                                </div>

                                <div>
                                    <label>Reason</label>
                                    <select
                                        value={reason}
                                        onChange={(e) => updateParams({ reason: e.target.value, page: 1 })}
                                        className="form-select"
                                    >
                                        <option value="">All</option>
                                        <option value="REMOVED">Removed</option>
                                        <option value="DAMAGED">Damaged</option>
                                        <option value="LOST">Lost</option>
                                    </select>
                                </div>

                                {user?.roleType === "ADMIN" && (
                                    <div>
                                        <label>Branch</label>
                                        <select
                                            value={branchId ?? ""}
                                            onChange={(e) =>
                                                updateParams({
                                                    branchId: e.target.value ? Number(e.target.value) : undefined,
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

                                    <ExportDropdown data={exportData} prefix="Stock_Adjustment_report" />
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
                                                {adjustmentData && adjustmentData.length > 0 ? (
                                                    adjustmentData.map((row, index) => (
                                                        <tr key={index}>
                                                            {visibleCols.includes("No") && (
                                                                <td>{(page - 1) * pageSize + index + 1}</td>
                                                            )}

                                                            {visibleCols.includes("Reference") && (
                                                                <td>{row.ref}</td>
                                                            )}

                                                            {visibleCols.includes("Adjustment Date") && (
                                                                <td>{row.adjustDate ? format(new Date(row.adjustDate), "dd-MMM-yyyy") : "N/A"}</td>
                                                            )}

                                                            {visibleCols.includes("Branch") && (
                                                                <td>{row.branch?.name || "N/A"}</td>
                                                            )}

                                                            {visibleCols.includes("Adjustment Type") && (
                                                                <td>
                                                                    <span className={`badge rounded-full ${row.AdjustMentType === "POSITIVE" ? "bg-primary" : "bg-danger"}`}>
                                                                        {row.AdjustMentType}
                                                                    </span>
                                                                </td>
                                                            )}

                                                            {visibleCols.includes("Reason") && (
                                                                <td>
                                                                    {row.AdjustMentType === "NEGATIVE" && Array.isArray(row.reasons) && row.reasons.length > 0
                                                                        ? row.reasons.map((r) => (
                                                                            <span key={r} className={`${reasonBadge[r] ?? "badge bg-secondary"} text-xs mr-1`}>
                                                                                {r}
                                                                            </span>
                                                                        ))
                                                                        : <span className="text-gray-400 text-xs">—</span>
                                                                    }
                                                                </td>
                                                            )}

                                                            {visibleCols.includes("Status") && (
                                                                <td>
                                                                    <span
                                                                        className={`badge rounded-full ${
                                                                            row.StatusType === "PENDING"
                                                                                ? "bg-warning"
                                                                                : row.StatusType === "APPROVED"
                                                                                ? "bg-success"
                                                                                : "bg-danger"
                                                                        }`}
                                                                        title={row.delReason || ""}
                                                                    >
                                                                        {row.StatusType}
                                                                    </span>
                                                                </td>
                                                            )}

                                                            {visibleCols.includes("Total QTY") && (
                                                                <td>{row.totalQuantity ?? 0}</td>
                                                            )}

                                                            {visibleCols.includes("Approved At") && (
                                                                <td>{formatDateTime(row.approvedAt)}</td>
                                                            )}

                                                            {visibleCols.includes("Approved By") && (
                                                                <td>{fullName(row.approver)}</td>
                                                            )}

                                                            {visibleCols.includes("Cancelled At") && (
                                                                <td>{formatDateTime(row.deletedAt)}</td>
                                                            )}

                                                            {visibleCols.includes("Cancelled By") && (
                                                                <td>{fullName(row.deleter)}</td>
                                                            )}

                                                            {visibleCols.includes("Cancelled Reason") && (
                                                                <td>{row.delReason || "N/A"}</td>
                                                            )}

                                                            {visibleCols.includes("Created At") && (
                                                                <td>{formatDateTime(row.createdAt)}</td>
                                                            )}

                                                            {visibleCols.includes("Created By") && (
                                                                <td>{fullName(row.creator)}</td>
                                                            )}

                                                            {visibleCols.includes("Updated At") && (
                                                                <td>{formatDateTime(row.updatedAt)}</td>
                                                            )}

                                                            {visibleCols.includes("Updated By") && (
                                                                <td>{fullName(row.updater)}</td>
                                                            )}

                                                            {visibleCols.includes("Actions") && (
                                                                <td className="text-center">
                                                                    <div className="flex items-center justify-center gap-2">
                                                                        <button
                                                                            type="button"
                                                                            className="hover:text-primary"
                                                                            onClick={() => handleViewDetail(row.id!)}
                                                                            title="View Details"
                                                                        >
                                                                            <Eye size={18} />
                                                                        </button>

                                                                        {row.note ? (
                                                                            <button
                                                                                type="button"
                                                                                className="hover:text-danger"
                                                                                onClick={() => handleViewNote(row.note || "")}
                                                                                title="View Note"
                                                                            >
                                                                                <NotebookText color="pink" size={18} />
                                                                            </button>
                                                                        ) : null}
                                                                    </div>
                                                                </td>
                                                            )}
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan={visibleCols.length || 1} className="text-center py-4">
                                                            No Stock Adjustment Report Found!
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
                                    onPageSizeChange={(newSize) => updateParams({ pageSize: newSize, page: 1 })}
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
                                    <NotebookText color="pink" /> View Note
                                </h5>
                                <button
                                    type="button"
                                    className="text-white-dark hover:text-dark"
                                    onClick={() => setShowNoteModal(false)}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                </button>
                            </div>

                            <div className="p-5">
                                <div className="mb-5">{viewNote || "No note available"}</div>

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

            {showDetailModal && (
                <div className="fixed inset-0 bg-[black]/60 z-[999] overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4">
                        <div className="panel border-0 p-0 rounded-lg overflow-hidden w-full max-w-5xl my-8">
                            <div className="flex bg-[#fbfbfb] dark:bg-[#121c2c] items-center justify-between px-5 py-3">
                                <h5 className="flex font-bold text-lg">
                                    <Eye size={18} className="mr-2" /> Stock Adjustment Details
                                </h5>
                                <button
                                    type="button"
                                    className="text-white-dark hover:text-dark"
                                    onClick={() => {
                                        setShowDetailModal(false);
                                        setSelectedAdjustment(null);
                                    }}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                </button>
                            </div>

                            <div className="p-5">
                                {detailLoading ? (
                                    <p>Loading details...</p>
                                ) : selectedAdjustment ? (
                                    <>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                                            <div>
                                                <strong>Reference:</strong> {selectedAdjustment.ref}
                                            </div>
                                            <div>
                                                <strong>Adjustment Date:</strong>{" "}
                                                {selectedAdjustment.adjustDate
                                                    ? format(new Date(selectedAdjustment.adjustDate), "dd-MMM-yyyy")
                                                    : "N/A"}
                                            </div>
                                            <div>
                                                <strong>Status:</strong> {selectedAdjustment.StatusType}
                                            </div>
                                            <div>
                                                <strong>Branch:</strong> {selectedAdjustment.branch?.name || "N/A"}
                                            </div>
                                            <div>
                                                <strong>Adjustment Type:</strong> {selectedAdjustment.AdjustMentType}
                                            </div>
                                            <div>
                                                <strong>Total Lines:</strong> {selectedAdjustment.adjustmentDetails?.length || 0}
                                            </div>
                                        </div>

                                        <div className="mb-4">
                                            <strong>Note:</strong> {selectedAdjustment.note || "N/A"}
                                        </div>

                                        <div className="overflow-x-auto">
                                            <table className="table-auto w-full border-collapse border border-gray-200">
                                                <thead>
                                                    <tr className="bg-gray-100">
                                                        <th className="border px-3 py-2 text-left">#</th>
                                                        <th className="border px-3 py-2 text-left">Product</th>
                                                        <th className="border px-3 py-2 text-left">Variant</th>
                                                        <th className="border px-3 py-2 text-left">Barcode</th>
                                                        <th className="border px-3 py-2 text-left">Unit</th>
                                                        <th className="border px-3 py-2 text-right">Unit Qty</th>
                                                        <th className="border px-3 py-2 text-right">Base Qty</th>
                                                        <th className="border px-3 py-2 text-right">Cost</th>
                                                        <th className="border px-3 py-2 text-right">Cost/Base Unit</th>
                                                        {selectedAdjustment.AdjustMentType === "NEGATIVE" && (
                                                            <th className="border px-3 py-2 text-left">Reason</th>
                                                        )}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {selectedAdjustment.adjustmentDetails?.length > 0 ? (
                                                        selectedAdjustment.adjustmentDetails.map((detail: any, idx: number) => (
                                                            <tr key={detail.id}>
                                                                <td className="border px-3 py-2">{idx + 1}</td>
                                                                <td className="border px-3 py-2">
                                                                    {detail.products?.name || "N/A"}
                                                                </td>
                                                                <td className="border px-3 py-2">
                                                                    {detail.productvariants?.productType || detail.productvariants?.name || "N/A"}
                                                                </td>
                                                                <td className="border px-3 py-2">
                                                                    {detail.productvariants?.barcode || "N/A"}
                                                                </td>
                                                                <td className="border px-3 py-2">
                                                                    {detail.unit?.name || "N/A"}
                                                                </td>
                                                                <td className="border px-3 py-2 text-right">
                                                                    {detail.unitQty ?? 0}
                                                                </td>
                                                                <td className="border px-3 py-2 text-right">
                                                                    {detail.baseQty ?? 0}
                                                                </td>
                                                                <td className="border px-3 py-2 text-right">
                                                                    {selectedAdjustment.AdjustMentType === "POSITIVE"
                                                                        ? detail.cost ?? 0
                                                                        : "—"}
                                                                </td>
                                                                <td className="border px-3 py-2 text-right">
                                                                    {selectedAdjustment.AdjustMentType === "POSITIVE"
                                                                        ? detail.costPerBaseUnit ?? 0
                                                                        : "—"}
                                                                </td>
                                                                {selectedAdjustment.AdjustMentType === "NEGATIVE" && (
                                                                    <td className="border px-3 py-2">
                                                                        {detail.reason
                                                                            ? <span className={`${reasonBadge[detail.reason] ?? "badge bg-secondary"} text-xs`}>{detail.reason}</span>
                                                                            : "—"}
                                                                    </td>
                                                                )}
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan={selectedAdjustment.AdjustMentType === "NEGATIVE" ? 10 : 9} className="border px-3 py-2 text-center">
                                                                No detail lines found
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </>
                                ) : (
                                    <p>No detail data found.</p>
                                )}

                                <div className="flex justify-end items-center mt-8">
                                    <button
                                        type="button"
                                        className="btn btn-outline-danger"
                                        onClick={() => {
                                            setShowDetailModal(false);
                                            setSelectedAdjustment(null);
                                        }}
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

export default ReportAdjustment;