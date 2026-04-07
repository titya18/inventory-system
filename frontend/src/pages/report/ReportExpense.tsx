import React, { useCallback, useEffect, useState } from "react";
import * as apiClient from "@/api/report";
import { getAllBranches } from "@/api/branch";
import { NavLink, useNavigate, useSearchParams } from "react-router-dom";
import { useAppContext } from "../../hooks/useAppContext";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUpZA, faArrowDownAZ, faClose, faSave } from '@fortawesome/free-solid-svg-icons';
import Pagination from "../components/Pagination";
import { ExpenseType, BranchType } from "@/data_types/types";
import { toast } from "react-toastify";
import { useQueryClient } from "@tanstack/react-query";
import VisibleColumnsSelector from "@/components/VisibleColumnsSelector";
import ExportDropdown from "@/components/ExportDropdown";
import { MessageCircleOff, NotebookText, Pencil, RefreshCw, Trash2 } from "lucide-react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import ShowDeleteConfirmation from "../components/ShowDeleteConfirmation";
import { format } from 'date-fns';
import { set } from "date-fns";

// Extend Day.js with plugins
dayjs.extend(utc);
dayjs.extend(timezone);

type ViewNotePayload = {
    delReason: string | null;
    createdBy?: {
        id: number | undefined;
        name: string;
    };
    createdAt?: Date;
};

const columns = [
    "No",
    "Reference",
    "Expense Date",
    "Branch",
    "Expense Name",
    "Amount",
    "Description",
    "Created At",
    "Created By",
    "Updated At",
    "Updated By",
    "Cancelled At",
    "Cancelled By",
    "Cancelled Reason",
    "Note/Print"
];

const DEFAULT_VISIBLE_COLUMNS = [
    "No",
    "Reference",
    "Expense Date",
    "Branch",
    "Expense Name",
    "Amount",
    "Description",
    "Note/Print"
];

const sortFields: Record<string, string> = {
    "No": "id",
    "Reference": "ref",
    "Expense Date": "expenseDate",
    "Branch": "branchId",
    "Expense Name": "name",
    "Amount": "amount",
    "Description": "description",
    "Created At": "createdAt",
    "Created By": "createdBy",
    "Updated At": "updatedAt",
    "Updated By": "updatedBy",
    "Cancelled At": "deletedAt",
    "Cancelled By": "deletedBy",
    "Cancelled Reason": "delReason"
};

const ReportExpense: React.FC = () => {
    const [branches, setBranches] = useState<BranchType[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [expenses, setExpenses] = useState<ExpenseType[]>([]);
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [viewNote, setViewNote] = useState<ViewNotePayload | null>(null);
    const [selected, setSelected] = useState<number[]>([]);
    const [visibleCols, setVisibleCols] = useState(DEFAULT_VISIBLE_COLUMNS);

    // FILTER STATES
    const [total, setTotal] = useState(0);
    const [searchParams, setSearchParams] = useSearchParams();
    const today = dayjs().format("YYYY-MM-DD");
    const startDate = searchParams.get("startDate") || today;
    const endDate = searchParams.get("endDate") || today;
    const adjustType = searchParams.get("adjustType") || "ALL";
    const status = searchParams.get("status") || "";
    const branchId = searchParams.get("branchId") ? parseInt(searchParams.get("branchId")!, 10) : undefined;
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
    const sortField = searchParams.get("sortField") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") === "desc" ? "desc" : "asc";

    const updateParams = (params: Record<string, unknown>) => {
        const newParams = new URLSearchParams(searchParams.toString());
        Object.entries(params).forEach(([key, value]) => {
            newParams.set(key, String(value));
        });
        setSearchParams(newParams);
    };

    const { user, hasPermission } = useAppContext();
    const navigate = useNavigate();

    // Fetch branches (once)
    const fetchBranches = useCallback(async () => {
        try {
            const data = await getAllBranches();
            setBranches(data as BranchType[]);
        } catch (error) {
            console.error("Error fetching branches:", error);
        }
    }, []);

    const fetchExpenses = useCallback(async () => {
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
                branchId
            };

            const { data, total: totalResult } = await apiClient.getAllReportExpenses(params);
            setExpenses(data || []);
            setTotal(totalResult || 0);
            setSelected([]);
        } catch (error) {
            console.error("Error fetching expense report:", error);
            toast.error("Failed to fetch expense report.");
        } finally {
            setIsLoading(false);
        }
    }, [sortField, sortOrder, page, pageSize, search, startDate, endDate, status, branchId]);

    useEffect(() => {
        fetchBranches();
        fetchExpenses();
    }, [fetchBranches, fetchExpenses]);

    // Filter handler
    const handleClearAllFilter = () => {
        navigate("/reportExpense");
    };

    const toggleCol = (col: string) => {
        setVisibleCols(prev =>
            prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
        );
    };

    const toggleSelectRow = (index: number) => {
        setSelected(prev =>
            prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
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

    const exportData = expenses.map((exp, index) => ({
        "No": (page - 1) * pageSize + index + 1,
        "Reference": exp.ref,
        "Expense Date": exp.expenseDate,
        "Branch": exp.branch ? exp.branch.name : "",
        "Expense Name": exp.name,
        "Amount": `$ ${exp.amount}`,
        "Description": exp.description,
        "Created At": exp.createdAt ? dayjs.tz(exp.createdAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss") : '',
        "Created By": `${exp.creator?.lastName || ''} ${exp.creator?.firstName || ''}`,
        "Updated At": exp.updatedAt ? dayjs.tz(exp.updatedAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss") : '',
        "Updated By": `${exp.updater?.lastName || ''} ${exp.updater?.firstName || ''}`,
        "Cancelled At": exp.deletedAt ? dayjs.tz(exp.deletedAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss") : '',
        "Cancelled By": exp.deletedAt ? `${exp.deleter?.lastName || ''} ${exp.deleter?.firstName || ''}` : '',
        "Cancelled Reason": exp.delReason || ''
    }));

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const queryClient = useQueryClient();

    const handleViewNote = (payload: ViewNotePayload) => {
        setViewNote(payload);
        setShowNoteModal(true);
    };

    return (
        <>
            <div className="pt-0">
                <div className="space-y-6">
                    <div className="panel">
                        <div className="relative">
                            {/* ---------------- FILTERS ---------------- */}
                            <div className="flex gap-2 mb-4 flex-wrap items-end">
                                <div>
                                    <label>Start Date</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => {
                                            const newStart = e.target.value;
                                            let newEnd = endDate;

                                            // Reset endDate if it's before new startDate
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
                                {(user?.roleType === "ADMIN") &&
                                    <div>
                                        <label>Branch</label>
                                        <select value={branchId} onChange={(e) => updateParams({ branchId: Number(e.target.value) || undefined, page: 1 })} className="form-select">
                                            <option value="">All Branches</option>
                                            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                        </select>
                                    </div>
                                }
                                <div>
                                    <button className="btn btn-primary" onClick={handleClearAllFilter}><RefreshCw /> Clear All Filter</button>
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
                                    <ExportDropdown data={exportData} prefix="Expense_Report" />
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
                                            {expenses && expenses.length > 0 ? (
                                                    expenses.map((rows, index) => (
                                                        <tr key={index}>
                                                            {visibleCols.includes("No") && (
                                                                <td>{(page - 1) * pageSize + index + 1}</td>
                                                            )}
                                                            {visibleCols.includes("Reference") && (
                                                                <td>{rows.ref}</td>
                                                            )}
                                                            {visibleCols.includes("Expense Date") && (
                                                                <td>{rows.expenseDate ? format(new Date(rows.expenseDate), 'dd-MMM-yyyy') : ''}</td>
                                                            )}
                                                            {visibleCols.includes("Branch") && (
                                                                <td>{rows.branch?.name || ''}</td>
                                                            )}
                                                            {visibleCols.includes("Expense Name") && (
                                                                <td>{rows.name}</td>
                                                            )}
                                                            {visibleCols.includes("Amount") && (
                                                                <td>$ {rows.amount}</td>
                                                            )}
                                                            {visibleCols.includes("Description") && (
                                                                <td>{rows.description}</td>
                                                            )}
                                                            {visibleCols.includes("Created At") && (
                                                                <td>{dayjs.tz(rows.createdAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss")}</td>
                                                            )}
                                                            {visibleCols.includes("Created By") && (
                                                                <td>{rows.creator?.lastName} {rows.creator?.firstName}</td>
                                                            )}
                                                            {visibleCols.includes("Updated At") && (
                                                                <td>{dayjs.tz(rows.updatedAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss")}</td>
                                                            )}
                                                            {visibleCols.includes("Updated By") && (
                                                                <td>{rows.updater?.lastName} {rows.updater?.firstName}</td>
                                                            )}
                                                            {visibleCols.includes("Cancelled At") && (
                                                                <td>{rows.deletedAt ? dayjs.tz(rows.deletedAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss") : ''}</td>
                                                            )}
                                                            {visibleCols.includes("Cancelled By") && (
                                                                <td>{rows.deletedAt ? `${rows.deleter?.lastName} ${rows.deleter?.firstName}` : ''}</td>
                                                            )}
                                                            {visibleCols.includes("Cancelled Reason") && (
                                                                <td>{rows.delReason || ''}</td>
                                                            )}
                                                            {visibleCols.includes("Actions") && (
                                                                <td className="text-center">
                                                                    <div className="flex gap-2">
                                                                        {rows.deletedAt !== null && (
                                                                            <button
                                                                                type="button"
                                                                                className="hover:text-danger"
                                                                                onClick={() =>
                                                                                    handleViewNote({
                                                                                        delReason: rows.delReason,
                                                                                        createdBy: {
                                                                                            id: rows.creator?.id,
                                                                                            name: `${rows.creator?.lastName} ${rows.creator?.firstName}`,
                                                                                        },
                                                                                        createdAt: rows.deletedAt,
                                                                                    })
                                                                                }
                                                                                title="View Note"
                                                                            >
                                                                                <NotebookText color="pink" />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            )}
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan={3}>No Expense Found!</td>
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
                                    <NotebookText color="pink" /> View delete message
                                </h5>
                                <button type="button" className="text-white-dark hover:text-dark" onClick={() => setShowNoteModal(false)}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                </button>
                            </div>
                            <div className="p-5">
                                <div className="mb-6">
                                    {/* Message */}
                                    <div className="rounded-md bg-gray-100 dark:bg-[#1e293b] p-4">
                                        <p className="text-sm text-gray-800 dark:text-gray-100 leading-relaxed whitespace-pre-line">
                                            {viewNote?.delReason || "No delete reason provided."}
                                        </p>
                                    </div>

                                    {/* Meta info */}
                                    <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 space-y-1">

                                        {viewNote?.createdBy && (
                                            <div>
                                                Deleted by{" "}
                                                <span className="font-medium text-gray-700 dark:text-gray-300">
                                                    {viewNote.createdBy.name}
                                                </span>
                                            </div>
                                        )}

                                        {viewNote?.createdAt && (
                                            <div>
                                                {dayjs(viewNote.createdAt).format("DD MMM YYYY • HH:mm")}
                                            </div>
                                        )}

                                    </div>
                                </div>

                                
                                <div className="flex justify-end items-center mt-8">
                                    <button type="button" className="btn btn-outline-danger" onClick={() => setShowNoteModal(false)}>
                                        <FontAwesomeIcon icon={faClose} className='mr-1' />
                                        Discard
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

export default ReportExpense;