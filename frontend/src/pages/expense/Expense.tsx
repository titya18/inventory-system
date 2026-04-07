import React, { useEffect, useState } from "react";
import * as apiClient from "../../api/expense";
import { useAppContext } from "../../hooks/useAppContext";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUpZA, faArrowDownAZ, faClose, faSave } from '@fortawesome/free-solid-svg-icons';
import Pagination from "../components/Pagination";
import Modal from "./Modal";
import { ExpenseType, BranchType } from "@/data_types/types";
import { toast } from "react-toastify";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import VisibleColumnsSelector from "@/components/VisibleColumnsSelector";
import ExportDropdown from "@/components/ExportDropdown";
import { MessageCircleOff, NotebookText, Pencil, Trash2 } from "lucide-react";
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
    "Actions"
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
    "Updated By": "updatedBy"
};

const Expense: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [expenses, setExpenses] = useState<ExpenseType[]>([]);
    const [selectExpense, setSelectExpense] = useState<ExpenseType | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteInvoiceId, setDeleteInvoiceId] = useState<number | null>(null);
    const [deleteMessage, setDeleteMessage] = useState("");
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [viewNote, setViewNote] = useState<ViewNotePayload | null>(null);

    const [searchParams, setSearchParams] = useSearchParams();
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
    const sortField = searchParams.get("sortField") || "name";
    const rawSortOrder = searchParams.get("sortOrder");
    const sortOrder: "asc" | "desc" = rawSortOrder === "desc" ? "desc" : "asc";
    const [total, setTotal] = useState(0);
    const [selected, setSelected] = useState<number[]>([]);
    const [visibleCols, setVisibleCols] = useState(columns);

    const updateParams = (params: Record<string, unknown>) => {
        const newParams = new URLSearchParams(searchParams.toString());
        Object.entries(params).forEach(([key, value]) => {
            newParams.set(key, String(value));
        });
        setSearchParams(newParams);
    };

    const { user, hasPermission } = useAppContext();

    const fetchExpenses = async () => {
        setIsLoading(true);
        try {
            const { data, total } = await apiClient.getAllExpensesWithPagination(
                sortField,
                sortOrder,
                page,
                search,
                pageSize
            );
            setExpenses(data || []);
            setTotal(total || 0);
            setSelected([]);
        } catch (error) {
            console.error("Error fetch expenses:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchExpenses();
    }, [search, page, sortField, sortOrder, pageSize]);

    const toggleCol = (col: string) => {
        setVisibleCols((prev) =>
            prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
        );
    };

    const toggleSelectRow = (index: number) => {
        setSelected((prev) =>
            prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
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
    }));

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const queryClient = useQueryClient();

    const handleAddorEditExpense = async (payload: {
        data: ExpenseType;
    }): Promise<void> => {
        try {
            await queryClient.invalidateQueries({ queryKey: ["validateToken"] });
            const { data } = payload;

            const expenseData: ExpenseType = {
                ...data,
                branchId: data.branchId ?? user?.branchId,
                id: data.id || 0
            };

            await apiClient.upsertExpense(expenseData);
            toast.success(data.id ? "Expense updated successfully" : "Expense created successfully", {
                position: "top-right",
                autoClose: 3000,
            });
            fetchExpenses();
            setIsModalOpen(false);
        } catch (error: any) {
            // Check if error.message is set by your API function
            if (error.message) {
                toast.error(error.message, {
                    position: "top-right",
                    autoClose: 5000
                });
            } else {
                toast.error("Error adding/editting expense", {
                    position: "top-right",
                    autoClose: 5000
                });
            }
        }
    }

    const handleEditClick = (expenseData: ExpenseType) => {
        setSelectExpense(expenseData);
        setIsModalOpen(true);
    };

    const handleDeleteExpense = async (id: number) => {
        const confirmed = await ShowDeleteConfirmation();
        if (!confirmed) return;

        setDeleteInvoiceId(id);
        setDeleteMessage("");
        setShowDeleteModal(true);
    };

    const submitDeleteExpense = async () => {
        if (!deleteInvoiceId) return;

        if (!deleteMessage.trim()) {
            toast.error("Please enter delete reason");
            return;
        }

        try {
            await apiClient.deleteExpense(deleteInvoiceId, deleteMessage);

            toast.success("Expense deleted successfully", {
                position: "top-right",
                autoClose: 4000,
            });

            setShowDeleteModal(false);
            setDeleteInvoiceId(null);

            fetchExpenses();
        } catch (err: any) {
            toast.error(err.message || "Error deleting expense");
        }
    };

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
                            <div className="px-0">
                                <div className="md:absolute md:top-0 ltr:md:left-0 rtl:md:right-0">
                                    <div className="mb-5 flex items-center gap-2">
                                        {hasPermission('Expense-Create') &&
                                            <button className="btn btn-primary gap-2" onClick={() => { setIsModalOpen(true); setSelectExpense(null) }}>
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
                                                    className="h-5 w-5"
                                                >
                                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                                </svg>
                                                Add New
                                            </button>
                                        }
                                    </div>
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
                                    <ExportDropdown data={exportData} prefix="Expense" />
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
                                                                        {rows.deletedAt === null && (
                                                                            <>
                                                                                {hasPermission('Expense-Edit') &&
                                                                                    <button type="button" className="hover:text-warning" onClick={() => handleEditClick(rows)} title="Edit">
                                                                                        <Pencil color="green" />
                                                                                    </button>
                                                                                }
                                                                                {hasPermission('Expense-Delete') &&
                                                                                    <button type="button" className="hover:text-danger" onClick={() => rows.id && handleDeleteExpense(rows.id)} title="Delete">
                                                                                        <Trash2 color="red" />
                                                                                    </button>
                                                                                }
                                                                            </>
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

            <Modal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleAddorEditExpense}
                expense={selectExpense}
            />

            {showDeleteModal && (
                <div className="fixed inset-0 bg-[black]/60 z-[999] overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4">
                        <div className="panel border-0 p-0 rounded-lg overflow-hidden w-full max-w-lg my-8">
                            <div className="flex bg-[#fbfbfb] dark:bg-[#121c2c] items-center justify-between px-5 py-3">
                                <h5 className="flex font-bold text-lg">
                                    <MessageCircleOff /> Delete Expense
                                </h5>
                                <button type="button" className="text-white-dark hover:text-dark" onClick={() => setShowDeleteModal(false)}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                </button>
                            </div>
                            <div className="p-5">
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-1 mb-5">
                                    <div>
                                        <textarea
                                            className="form-textarea w-full"
                                            rows={4}
                                            placeholder="Enter reason for deleting this purchase"
                                            value={deleteMessage}
                                            onChange={(e) => setDeleteMessage(e.target.value)}
                                        />
                                    </div>
                                </div>
                                
                                <div className="flex justify-end items-center mt-8">
                                    <button type="button" className="btn btn-outline-danger" onClick={() => setShowDeleteModal(false)}>
                                        <FontAwesomeIcon icon={faClose} className='mr-1' />
                                        Discard
                                    </button>
                                    <button type="submit" onClick={submitDeleteExpense} className="btn btn-primary ltr:ml-4 rtl:mr-4">
                                        <FontAwesomeIcon icon={faSave} className='mr-1' />
                                        {isLoading ? 'Saving...' : 'Save'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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

export default Expense;