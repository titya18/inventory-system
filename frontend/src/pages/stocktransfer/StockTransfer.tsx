// src/components/MainCategory.tsx
import React, { useState, useEffect } from "react";
import * as apiClient from "@/api/stockTransfer";
import Pagination from "../components/Pagination"; // Import the Pagination component
import ShowDeleteConfirmation from "../components/ShowDeleteConfirmation";
import { useQueryClient } from "@tanstack/react-query";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUpZA, faArrowDownAZ, faPrint, faClose, faSave } from '@fortawesome/free-solid-svg-icons';
import { NavLink } from "react-router-dom";
import { toast } from "react-toastify";
import { useAppContext } from "@/hooks/useAppContext";
import { format } from 'date-fns';
import { Pencil, Trash2, BanknoteArrowUp, PrinterCheck, Plus, MessageCircleOff, NotebookText } from 'lucide-react';
import { StockTransferType } from "@/data_types/types";
import { useSearchParams } from "react-router-dom";
import VisibleColumnsSelector from "@/components/VisibleColumnsSelector";
import ExportDropdown from "@/components/ExportDropdown";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

// Extend Day.js with plugins
dayjs.extend(utc);
dayjs.extend(timezone);

const columns = [
    "No",
    "Rference",
    "Transfer Date",
    "Branch",
    "To Branch",
    "Status",
    "Approved At",
    "Approved By",
    "Created At",
    "Created By",
    "Updated At",
    "Updated By",
    "Actions"
];

const sortFields: Record<string, string> = {
    "No": "id",
    "Rference": "ref",
    "Adjustment Date": "adjustDate",
    "Branch": "branchId",
    "To Branch": "toBranchId",
    "Status": "StatusType",
    "Approved At": "approvedAt",
    "Approved By": "approvedBy",
    "Created At": "createdAt",
    "Created By": "createdBy",
    "Updated At": "updatedAt",
    "Updated By": "updatedBy"
};

const StockTransfer: React.FC = () => {
    const [transferData, setTransferData] = useState<StockTransferType[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const [searchParams, setSearchParams] = useSearchParams();
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
    const sortField = searchParams.get("sortField") || "createdAt";
    const rawSortOrder = searchParams.get("sortOrder");
    const sortOrder: "desc" | "asc" = rawSortOrder === "desc" ? "desc" : "asc";
    const [total, setTotal] = useState(0);
    const [selected, setSelected] = useState<number[]>([]);
    const [visibleCols, setVisibleCols] = useState(columns);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteInvoiceId, setDeleteInvoiceId] = useState<number | null>(null);
    const [deleteMessage, setDeleteMessage] = useState("");
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [viewNote, setViewNote] = useState<string | null>(null);

    const updateParams = (params: Record<string, unknown>) => {
        const newParams = new URLSearchParams(searchParams.toString());
        Object.entries(params).forEach(([key, value]) => {
            newParams.set(key, String(value));
        });
        setSearchParams(newParams);
    };

    const { hasPermission } = useAppContext();

    const fetchTransfer = async () => {
        setIsLoading(true);
        try {
            const { data, total } = await apiClient.getAllStockTransfers(
                sortField,
                sortOrder,
                page,
                search,
                pageSize
            );
            setTransferData(data || []);
            setTotal(total || 0);
            setSelected([]);
        } catch (error) {
            console.error("Error fetching stock transfer:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTransfer();
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

    const exportData = transferData.map((transfer, index) => ({
        "No": (page - 1) * pageSize + index + 1,
        "Rference": transfer.ref,
        "Transfer Date": transfer.transferDate,
        "Branch": transfer.branch ? transfer.branch.name : "",
        "To Branch": transfer.toBranch ? transfer.toBranch.name : "",
        "Status": transfer.StatusType,
        "Approved At": transfer.approvedAt ? dayjs.tz(transfer.approvedAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss") : 'N/A',
        "Approved By": `${transfer.approver?.lastName || ''} ${transfer.approver?.firstName || 'N/A'}`,
        "Created At": transfer.createdAt ? dayjs.tz(transfer.createdAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss") : '',
        "Created By": `${transfer.creator?.lastName || ''} ${transfer.creator?.firstName || ''}`,
        "Updated At": transfer.updatedAt ? dayjs.tz(transfer.updatedAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss") : '',
        "Updated By": `${transfer.updater?.lastName || ''} ${transfer.updater?.firstName || ''}`,
    }));

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const queryClient = useQueryClient();

    const handleDeleteTransfer = async (id: number) => {
        const confirmed = await ShowDeleteConfirmation();
        if (!confirmed) return;

        setDeleteInvoiceId(id);
        setDeleteMessage("");
        setShowDeleteModal(true);
    };

    const submitDeleteInvoice = async () => {
        if (!deleteInvoiceId) return;

        if (!deleteMessage.trim()) {
            toast.error("Please enter delete reason");
            return;
        }

        try {
            await apiClient.deleteTransfer(deleteInvoiceId, deleteMessage);

            toast.success("Transfer deleted successfully", {
                position: "top-right",
                autoClose: 4000,
            });

            setShowDeleteModal(false);
            setDeleteInvoiceId(null);

            fetchTransfer();
        } catch (err: any) {
            toast.error(err.message || "Error deleting stock transfer");
        }
    };

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
                            <div className="px-0">
                                <div className="md:absolute md:top-0 ltr:md:left-0 rtl:md:right-0">
                                    <div className="mb-5 flex items-center gap-2">
                                        {hasPermission('Stock-Transfer-Create') &&
                                            <NavLink to="/addmovestock" className="btn btn-primary gap-2" >
                                                <Plus />
                                                Add New
                                            </NavLink>
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
                                    <ExportDropdown data={exportData} prefix="Stock_Transfer" />
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
                                                {transferData && transferData.length > 0 ? (
                                                    transferData.map((rows, index) => (
                                                        <tr key={index}>
                                                            {visibleCols.includes("No") && (
                                                                <td>{(page - 1) * pageSize + index + 1}</td>
                                                            )}
                                                            {visibleCols.includes("Rference") && (
                                                                <td>{rows.ref}</td>
                                                            )}
                                                            {visibleCols.includes("Transfer Date") && (
                                                                <td>{rows.transferDate ? format(new Date(rows.transferDate), 'dd-MMM-yyyy') : ''}</td>
                                                            )}
                                                            {visibleCols.includes("Branch") && (
                                                                <td>{rows.branch ? rows.branch.name : ""}</td>
                                                            )}
                                                            {visibleCols.includes("To Branch") && (
                                                                <td>{rows.toBranch ? rows.toBranch?.name : ""}</td>
                                                            )}
                                                            {visibleCols.includes("Status") && (
                                                                <td>
                                                                    <span className={`badge rounded-full ${rows.StatusType === 'PENDING' ? 'bg-warning' : rows.StatusType === 'APPROVED' ? 'bg-success' : 'bg-danger'}`} title={rows.delReason}>
                                                                        {rows.StatusType}
                                                                    </span>
                                                                </td>
                                                            )}
                                                            {visibleCols.includes("Approved At") && (
                                                                <td>{rows.approvedAt ? dayjs.tz(rows.approvedAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss") : "N/A"}</td>
                                                            )}
                                                            {visibleCols.includes("Approved By") && (
                                                                <td>{rows.approvedAt ? `${rows.approver?.lastName} ${rows.approver?.firstName}` : "N/A"}</td>
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
                                                                    <div className="flex items-center justify-center gap-2">
                                                                        {rows.note !== null &&
                                                                            <button type="button" className="hover:text-danger" onClick={() => handleViewNote(rows.note)} title="View Note">
                                                                                <NotebookText color="pink" />
                                                                            </button>
                                                                        }
                                                                        {hasPermission('Stock-Transfer-Edit') &&
                                                                                <NavLink to={`/editmovestock/${rows.id}`} className="hover:text-warning" title="Edit">
                                                                                    <Pencil color="green" />
                                                                                </NavLink>
                                                                        }
                                                                        {rows.StatusType === 'PENDING' &&
                                                                            hasPermission('Stock-Transfer-Delete') &&
                                                                                <button type="button" className="hover:text-danger" onClick={() => rows.id && handleDeleteTransfer(rows.id)} title="Delete">
                                                                                    <Trash2 color="red" />
                                                                                </button>
                                                                            
                                                                        }
                                                                    </div>
                                                                </td>
                                                            )}
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan={3}>No Stock Transfer Found!</td>
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

            {showDeleteModal && (
                <div className="fixed inset-0 bg-[black]/60 z-[999] overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4">
                        <div className="panel border-0 p-0 rounded-lg overflow-hidden w-full max-w-lg my-8">
                            <div className="flex bg-[#fbfbfb] dark:bg-[#121c2c] items-center justify-between px-5 py-3">
                                <h5 className="flex font-bold text-lg">
                                    <MessageCircleOff /> Delete Stock Adjustment
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
                                    <button type="submit" onClick={submitDeleteInvoice} className="btn btn-primary ltr:ml-4 rtl:mr-4">
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
                                    <NotebookText color="pink" /> View note
                                </h5>
                                <button type="button" className="text-white-dark hover:text-dark" onClick={() => setShowNoteModal(false)}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                </button>
                            </div>
                            <div className="p-5">
                                <div className="mb-5">
                                    {viewNote || "No note available"}
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

export default StockTransfer;
