// src/components/MainCategory.tsx
import React, { useState, useEffect } from "react";
import * as apiClient from "@/api/quotation";
import Pagination from "../components/Pagination"; // Import the Pagination component
import ShowDeleteConfirmation from "../components/ShowDeleteConfirmation";
import { useQueryClient } from "@tanstack/react-query";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUpZA, faArrowDownAZ, faPrint, faClose, faSave } from '@fortawesome/free-solid-svg-icons';
import { NavLink } from "react-router-dom";
import { toast } from "react-toastify";
import { useAppContext } from "@/hooks/useAppContext";
import { format } from 'date-fns';
import { Pencil, Trash2, BanknoteArrowUp, PrinterCheck, Plus, NotebookText, MessageCircleOff } from 'lucide-react';
import { QuotationType } from "@/data_types/types";
import { useSearchParams } from "react-router-dom";
import VisibleColumnsSelector from "@/components/VisibleColumnsSelector";
import ExportDropdown from "@/components/ExportDropdown";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import ShowConfirmationMessage from "../components/ShowConfirmationMessage";

// Extend Day.js with plugins
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
    "Actions"
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
    "Sent At",
    "Sent By",
    "INV At",
    "INV By",
    "Actions"
];

const sortFields: Record<string, string> = {
    "No": "id",
    "Quotation Date": "quotationDate",
    "Reference": "ref",
    "Quotation Type": "QuoteSaleType",
    "Customer": "customerId",
    "Branch": "branchId",
    "Status": "status",
    "Grand Total": "grandTotal",
    "Sent At": "sentAt",
    "Sent By": "sentBy",
    "INV At": "invoicedAt",
    "INV By": "invoicedBy",
    "Created At": "createdAt",
    "Created By": "createdBy",
    "Updated At": "updatedAt",
    "Updated By": "updatedBy"
};

const Quotation: React.FC = () => {
    const [quotationData, setQuotationData] = useState<QuotationType[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingConvert, setIsLoadingConvert] = useState(false);

    const [searchParams, setSearchParams] = useSearchParams();
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
    const sortField = searchParams.get("sortField") || "createdAt";
    const rawSortOrder = searchParams.get("sortOrder");
    const sortOrder: "desc" | "asc" = rawSortOrder === "desc" ? "desc" : "asc";
    const [total, setTotal] = useState(0);
    const [selected, setSelected] = useState<number[]>([]);
    const [visibleCols, setVisibleCols] = useState(DEFAULT_VISIBLE_COLUMNS);
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

    const fetchQuotation = async () => {
        setIsLoading(true);
        try {
            const { data, total } = await apiClient.getAllQuotations(
                sortField,
                sortOrder,
                page,
                search,
                pageSize
            );
            setQuotationData(data || []);
            setTotal(total || 0);
            setSelected([]);
        } catch (error) {
            console.error("Error fetching quotation:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchQuotation();
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

    const exportData = quotationData.map((quote, index) => ({
        "No": (page - 1) * pageSize + index + 1,
        "Quotation Date": quote.quotationDate,
        "Reference": quote.ref,
        "Quotation Type": quote.QuoteSaleType,
        "Customer": quote.customers ? quote.customers.name : "N/A",
        "Branch": quote.branch ? quote.branch.name : "",
        "Status": quote.status,
        "Grand Total": quote.grandTotal,
        "Sent At": quote.sentAt ? dayjs.tz(quote.sentAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss") : '',
        "Sent By": `${quote.sender?.lastName || ''} ${quote.sender?.firstName || ''}`,
        "INV At": quote.invoicedAt ? dayjs.tz(quote.invoicedAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss") : '',
        "INV By": `${quote.invoicer?.lastName || ''} ${quote.invoicer?.firstName || ''}`,
        "Created At": quote.createdAt ? dayjs.tz(quote.createdAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss") : '',
        "Created By": `${quote.creator?.lastName || ''} ${quote.creator?.firstName || ''}`,
        "Updated At": quote.updatedAt ? dayjs.tz(quote.updatedAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss") : '',
        "Updated By": `${quote.updater?.lastName || ''} ${quote.updater?.firstName || ''}`,
    }));

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const queryClient = useQueryClient();

    const handleDeleteQuotation = async (id: number) => {
        const confirmed = await ShowDeleteConfirmation();
        if (!confirmed) {
            return;
        }

        setDeleteInvoiceId(id);
        setDeleteMessage("");
        setShowDeleteModal(true);

        // try {
        //     await queryClient.invalidateQueries({ queryKey: ["validateToken"] });
        //     await apiClient.deleteQuotation(id);
        //     toast.success("Quotation deleted successfully", {
        //         position: "top-right",
        //         autoClose: 4000
        //     })

        //     fetchQuotation();
        // } catch (err: any) {
        //     console.error("Error deleting quotation:", err);
        //     toast.error(err.message || "Error deleting quotation", {
        //         position: 'top-right',
        //         autoClose: 4000
        //     });
        // }
    };

    const submitDeleteInvoice = async () => {
        if (!deleteInvoiceId) return;

        if (!deleteMessage.trim()) {
            toast.error("Please enter delete reason");
            return;
        }

        try {
            await apiClient.deleteQuotation(deleteInvoiceId, deleteMessage);

            toast.success("Quotation deleted successfully", {
                position: "top-right",
                autoClose: 4000,
            });

            setShowDeleteModal(false);
            setDeleteInvoiceId(null);

            fetchQuotation();
        } catch (err: any) {
            toast.error(err.message || "Error deleting quotation");
        }
    };

    const ConvertQuotationToInvoice = async (id: number) => {
        setIsLoadingConvert(true);
        try {
            const ok = await ShowConfirmationMessage("convert");

            if (!ok) {
                return;
            }

            await apiClient.convertQuotationToOrder(id);
            toast.success("Quotation converted to invoice successfully", {
                position: "top-right",
                autoClose: 4000
            })

            fetchQuotation();
        } catch (err: any) {
            console.error("Error converting quotation to invoice:", err);
            toast.error(err.message || "Error converting quotation to invoice", {
                position: 'top-right',
                autoClose: 4000
            });
        } finally {
            setIsLoadingConvert(false);
        }
    }

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
                                        {hasPermission('Quotation-Create') &&
                                            <NavLink to="/addquotation" className="btn btn-primary gap-2" >
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
                                    <ExportDropdown data={exportData} prefix="Quotation" />
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
                                                {quotationData && quotationData.length > 0 ? (
                                                    quotationData.map((rows, index) => (
                                                        <tr key={index}>
                                                            {visibleCols.includes("No") && (
                                                                <td>{(page - 1) * pageSize + index + 1}</td>
                                                            )}
                                                            {visibleCols.includes("Quotation Date") && (
                                                                <td>{rows.quotationDate ? format(new Date(rows.quotationDate), 'dd-MMM-yyyy') : ''}</td>
                                                            )}
                                                            {visibleCols.includes("Reference") && (
                                                                <td>{rows.ref}</td>
                                                            )}
                                                            {visibleCols.includes("Quotation Type") && (
                                                                <td>
                                                                    <span
                                                                        className={`badge rounded-full px-3 py-1 font-medium cursor-default text-white`}
                                                                        style={{ backgroundColor: rows.QuoteSaleType === "WHOLESALE" ? "#F39EB6" : "#a855f7" }}
                                                                    >
                                                                        {rows.QuoteSaleType}
                                                                    </span>
                                                                </td>
                                                            )}
                                                            {visibleCols.includes("Customer") && (
                                                                <td>{rows.customer?.name || "N/A"}</td>
                                                            )}
                                                            {visibleCols.includes("Branch") && (
                                                                <td>{rows.branch ? rows.branch.name : ""}</td>
                                                            )}
                                                            {visibleCols.includes("Status") && (
                                                                <td>
                                                                    {rows.status === 'PENDING' ? (
                                                                        <span className="badge rounded-full bg-warning">
                                                                            {rows.status}
                                                                        </span>
                                                                    ) : rows.status === 'SENT' ? (
                                                                        hasPermission('Convert-QTT-to-INV') ? (
                                                                            <span
                                                                                className="badge rounded-full bg-primary cursor-pointer"
                                                                                aria-disabled={isLoadingConvert}
                                                                                onClick={() => ConvertQuotationToInvoice(Number(rows.id))}
                                                                                title="Convert quotation to invoice"
                                                                            >
                                                                                {isLoadingConvert ? `${rows.status}...` : rows.status}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="badge rounded-full bg-primary">
                                                                                {rows.status}
                                                                            </span>
                                                                        )
                                                                    ) : rows.status === 'CANCELLED' ? (
                                                                        <span className="badge rounded-full bg-danger" title={rows.delReason || ''}>
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
                                                                <td style={{color: "blue"}}>$ { Number(rows.grandTotal).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',') }</td>
                                                            )}
                                                            {visibleCols.includes("Sent At") && (
                                                                <td>{rows.sentAt ? dayjs.tz(rows.sentAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss") : "N/A"}</td>
                                                            )}
                                                            {visibleCols.includes("Sent By") && (
                                                                <td>{rows.sentAt ? `${rows.sender?.lastName} ${rows.sender?.firstName}` : "N/A"}</td>
                                                            )}
                                                            {visibleCols.includes("INV At") && (
                                                                <td>{rows.invoicedAt ? dayjs.tz(rows.invoicedAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss") : "N/A"}</td>
                                                            )}
                                                            {visibleCols.includes("INV By") && (
                                                                <td>{rows.invoicedAt ? `${rows.invoicer?.lastName} ${rows.invoicer?.firstName}` : "N/A"}</td>
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
                                                                        {rows.note !== "" &&
                                                                            <button type="button" className="hover:text-danger" onClick={() => handleViewNote(rows.note || "")} title="View Note">
                                                                                <NotebookText color="pink" />
                                                                            </button>
                                                                        }
                                                                        {hasPermission('Quotation-Print') && (rows.status === 'SENT' || rows.status === 'INVOICED') && (
                                                                            <NavLink to={`/printquotation/${rows.id}`} className="hover:text-warning" title="Print Quotation">
                                                                                <PrinterCheck color="purple" />
                                                                            </NavLink>
                                                                        )}
                                                                        {['PENDING', 'SENT'].includes(rows.status ?? '') &&
                                                                            hasPermission('Quotation-Edit') &&
                                                                                <NavLink to={`/editquotation/${rows.id}`} className="hover:text-warning" title="Edit">
                                                                                    <Pencil color="green" />
                                                                                </NavLink>
                                                                        }
                                                                        {['PENDING', 'SENT'].includes(rows.status ?? '') &&
                                                                            hasPermission('Quotation-Delete') &&
                                                                                <button type="button" className="hover:text-danger" onClick={() => rows.id && handleDeleteQuotation(rows.id)} title="Delete">
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
                                                        <td colSpan={3}>No Quotation Found!</td>
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
                                    <MessageCircleOff /> Delete Quotation
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
                                            placeholder="Enter reason for deleting this quotation"
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

export default Quotation;
