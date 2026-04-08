// src/components/MainCategory.tsx
import React, { useState, useEffect } from "react";
import * as apiClient from "@/api/invoice";
import Pagination from "../components/Pagination"; // Import the Pagination component
import ShowDeleteConfirmation from "../components/ShowDeleteConfirmation";
import ShowConfirmationDeclareVat from "../components/ShowConfirmationDeclareVat";
import { useQueryClient } from "@tanstack/react-query";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUpZA, faArrowDownAZ, faPrint, faClose, faSave } from '@fortawesome/free-solid-svg-icons';
import { NavLink } from "react-router-dom";
import { toast } from "react-toastify";
import { useAppContext } from "@/hooks/useAppContext";
import { format } from 'date-fns';
import { Pencil, Trash2, BanknoteArrowUp, PrinterCheck, Plus, NotebookText, MessageCircleOff, Undo2, Receipt, CheckCircle2 } from 'lucide-react';
import { InvoicePaymentType, InvoiceType } from "@/data_types/types";
import { useSearchParams } from "react-router-dom";
import VisibleColumnsSelector from "@/components/VisibleColumnsSelector";
import ExportDropdown from "@/components/ExportDropdown";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import ShowConfirmationMessage from "../components/ShowConfirmationMessage";
import ModalPayment from "./ModalPayment";

// Extend Day.js with plugins
dayjs.extend(utc);
dayjs.extend(timezone);

const columns = [
    "No",
    "Sale Date",
    "INV-No",
    "Sale Type",
    "Customer",
    "Branch",
    "Status",
    "Grand Total",
    "Paid",
    "Due",
    "Approved At",
    "Approved By",
    "Created At",
    "Created By",
    "Updated At",
    "Updated By",
    "Actions"
];

const DEFAULT_VISIBLE_COLUMNS = [
    "No",
    "Sale Date",
    "INV-No",
    "Sale Type",
    "Customer",
    "Branch",
    "Status",
    "Grand Total",
    "Paid",
    "Due",
    "Actions"
];

const sortFields: Record<string, string> = {
    "No": "id",
    "Sale Date": "orderDate",
    "INV-No": "ref",
    "Sale Type": "OrderSaleType",
    "Customer": "customerId",
    "Branch": "branchId",
    "Status": "status",
    "Grand Total": "totalAmount",
    "Paid": "paidAmount",
    "Due": "due",
    "Approved At": "approvedAt",
    "Approved By": "approvedBy",
    "Created At": "createdAt",
    "Created By": "createdBy",
    "Updated At": "updatedAt",
    "Updated By": "updatedBy"
};

const Invoice: React.FC = () => {
    const [invoiceData, setInvoiceData] = useState<InvoiceType[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingApprove, setIsLoadingApprove] = useState(false);
    const [isModalPaymentOpen, setIsModalPaymentOpen] = useState(false);
    const [amountInvoice, setAmountInvoice] = useState<InvoicePaymentType | null>(null);

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

    const fetchInvoice = async () => {
        setIsLoading(true);
        try {
            const { data, total } = await apiClient.getAllInvoices(
                sortField,
                sortOrder,
                page,
                search,
                pageSize
            );
            setInvoiceData(data || []);
            setTotal(total || 0);
            setSelected([]);
        } catch (error) {
            console.error("Error fetching sales:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoice();
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

    const exportData = invoiceData.map((inv, index) => ({
        "No": (page - 1) * pageSize + index + 1,
        "Sale Date": inv.orderDate,
        "INV-No": inv.ref,
        "Sale Type": inv.OrderSaleType,
        "Customer": inv.customers ? inv.customers.name : "N/A",
        "Branch": inv.branch ? inv.branch.name : "",
        "Status": inv.status,
        "Grand Total": inv.totalAmount,
        "Paid": inv.paidAmount,
        "Due": Number(inv.totalAmount - (inv.paidAmount ?? 0)).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','),
        "Approved At": inv.approvedAt ? dayjs.tz(inv.approvedAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss") : 'N/A',
        "Approved By": `${inv.approver?.lastName || ''} ${inv.approver?.firstName || 'N/A'}`,
        "Created At": inv.createdAt ? dayjs.tz(inv.createdAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss") : '',
        "Created By": `${inv.creator?.lastName || ''} ${inv.creator?.firstName || ''}`,
        "Updated At": inv.updatedAt ? dayjs.tz(inv.updatedAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss") : '',
        "Updated By": `${inv.updater?.lastName || ''} ${inv.updater?.firstName || ''}`,
    }));

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const queryClient = useQueryClient();

    const handleDeleteInvoice = async (id: number) => {
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
            await apiClient.deleteInvoice(deleteInvoiceId, deleteMessage);

            toast.success("Invoice deleted successfully", {
                position: "top-right",
                autoClose: 4000,
            });

            setShowDeleteModal(false);
            setDeleteInvoiceId(null);

            fetchInvoice();
        } catch (err: any) {
            toast.error(err.message || "Error deleting invoice");
        }
    };

    const handleDeclareVAT = async (id: number) => {
        const confirmed = await ShowConfirmationDeclareVat();
        if (!confirmed) return;

        try {
            await apiClient.DeclarationVat(id);
            toast.success("Sale has declared VAT successfully", {
                position: "top-right",
                autoClose: 4000
            })

            fetchInvoice();
        } catch (err: any) {
            console.error("Error declaring VAT:", err);
            toast.error(err.message || "Error declaring VAT", {
                position: 'top-right',
                autoClose: 6000
            });
        }
    };

    const ApprovedInvoice = async (id: number) => {
        setIsLoadingApprove(true);
        try {
            const ok = await ShowConfirmationMessage("approve");

            if (!ok) {
                return;
            }

            await apiClient.ApprovedInvoice(id);
            toast.success("Sale has approved successfully", {
                position: "top-right",
                autoClose: 4000
            })

            fetchInvoice();
        } catch (err: any) {
            console.error("Error approving sale:", err);
            toast.error(err.message || "Error approving sale", {
                position: 'top-right',
                autoClose: 6000
            });
        } finally {
            setIsLoadingApprove(false);
        }
    }

    const addPaymentInvoice = (paymentData: InvoicePaymentType) => {
            setAmountInvoice(paymentData);
            setIsModalPaymentOpen(true);
    };

    const handleOnSubmitPayment = async (
        branchId: number | null, 
        orderId: number | null, 
        paidAmount: number | null, 
        paymentMethodId: number | null, 
        totalPaid: number, 
        receive_usd: number | null,
        receive_khr: number | null,
        exchangerate: number | null,
        due_balance: number
    ) => {
        try {
            await queryClient.invalidateQueries({ queryKey: ["validateToken"] });
            const paymentData: InvoicePaymentType = {
                branchId: branchId,
                orderId: orderId,
                paymentMethodId: paymentMethodId,
                paidAmount: paidAmount,
                totalPaid: totalPaid,
                receive_usd: receive_usd,
                receive_khr: receive_khr,
                exchangerate: exchangerate,
                due_balance: due_balance,
                createdAt: null,
                paymentMethods: null,
            }
            await apiClient.insertInvoicePayment(paymentData);
            toast.success("Purchase payment insert successfully", {
                position: "top-right",
                autoClose: 2000
            });
            fetchInvoice();
        } catch (error: any) {
            toast.error(error.message || "Error adding payment", {
                position: "top-right",
                autoClose: 2000
            });
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
                                        {hasPermission('Sale-Create') &&
                                            <NavLink to="/addsale" className="btn btn-primary gap-2" >
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
                                    <ExportDropdown data={exportData} prefix="Sales" />
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
                                                {invoiceData && invoiceData.length > 0 ? (
                                                    invoiceData.map((rows, index) => (
                                                        <tr key={index}>
                                                            {visibleCols.includes("No") && (
                                                                <td>{(page - 1) * pageSize + index + 1}</td>
                                                            )}
                                                            {visibleCols.includes("Sale Date") && (
                                                                <td>{rows.orderDate ? format(new Date(rows.orderDate), 'dd-MMM-yyyy') : ''}</td>
                                                            )}
                                                            {visibleCols.includes("INV-No") && (
                                                                <td className="text-center">
                                                                    {rows.ref}
                                                                    {
                                                                        rows.returnstatus === 1 ? 
                                                                        <span title="Return">
                                                                            <Undo2 size={15} color="red" />
                                                                        </span>
                                                                        : null
                                                                    }
                                                                </td>
                                                            )}
                                                            {visibleCols.includes("Sale Type") && (
                                                                <td>
                                                                    <span
                                                                        className={`badge rounded-full px-3 py-1 font-medium cursor-default text-white`}
                                                                        style={{ backgroundColor: rows.OrderSaleType === "WHOLESALE" ? "#F39EB6" : "#a855f7" }}
                                                                    >
                                                                        {rows.OrderSaleType}
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
                                                                        hasPermission('Sale-Approve') ? (
                                                                            <span
                                                                                className="badge rounded-full bg-warning cursor-pointer"
                                                                                aria-disabled={isLoadingApprove}
                                                                                onClick={() => ApprovedInvoice(Number(rows.id))}
                                                                                title="Click to approve to invoice"
                                                                            >
                                                                                {isLoadingApprove ? `${rows.status}...` : rows.status}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="badge rounded-full bg-warning">
                                                                                {rows.status}
                                                                            </span>
                                                                        )
                                                                    ) : rows.status === 'APPROVED' ? (
                                                                        <span className="badge rounded-full bg-primary">
                                                                            {rows.status}
                                                                        </span>
                                                                    ) : rows.status === 'COMPLETED' ? (
                                                                        <span className="badge rounded-full bg-success">
                                                                            {rows.status}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="badge rounded-full bg-danger" title={rows.delReason}> 
                                                                            {rows.status}
                                                                        </span>
                                                                    )}
                                                                </td>
                                                            )}
                                                            {visibleCols.includes("Grand Total") && (
                                                                <td style={{color: "blue"}}>$ { Number(rows.totalAmount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',') }</td>
                                                            )}
                                                            {visibleCols.includes("Paid") && (
                                                                <td style={{color: (rows.totalAmount - (rows.paidAmount ?? 0)) > 0 ? "red" : "green"}}>$ { Number(rows.paidAmount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',') }</td>
                                                            )}
                                                            {visibleCols.includes("Due") && (
                                                                <td style={{color: (rows.totalAmount - (rows.paidAmount ?? 0)) > 0 ? "red" : "black"}}>$ { Number(rows.totalAmount - (rows.paidAmount ?? 0)).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',') }</td>
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
                                                                        {hasPermission('Sale-Print') && (
                                                                            <NavLink to={`/printsale/${rows.id}`} className="hover:text-warning" title="Print Sale">
                                                                                <PrinterCheck color="purple" />
                                                                            </NavLink>
                                                                        )}
                                                                        {(rows.status === 'APPROVED' || rows.status === 'COMPLETED') && (
                                                                            <>
                                                                                {/* {hasPermission('Declare-VAT') && (
                                                                                    <button
                                                                                        disabled={rows.vat_status ? true : false}
                                                                                        className={`
                                                                                            inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold
                                                                                            transition-all duration-200
                                                                                            ${rows.vat_status
                                                                                            ? "bg-green-50 text-green-700 border border-green-200 cursor-not-allowed dark:bg-green-900/20 dark:text-green-300"
                                                                                            : "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 hover:border-blue-300 dark:bg-blue-900/20 dark:text-blue-300"
                                                                                            }
                                                                                        `}
                                                                                        onClick={() => handleDeclareVAT(Number(rows.id))}
                                                                                        title={rows.vat_status ? "Declared" : "Declare VAT"}
                                                                                    >
                                                                                        {rows.vat_status ? <span style={{ color: 'pink' }}><CheckCircle2 size={14} /></span> : <Receipt size={14} />}
                                                                                        {rows.vat_status ? <span style={{ marginLeft: '2px', color: 'pink' }}>Declared</span> : 'Declare VAT'}
                                                                                    </button>  
                                                                                )} */}

                                                                                {hasPermission('Sale-Payment') && (
                                                                                    <button
                                                                                        type="button"
                                                                                        className="hover:text-primary"
                                                                                        onClick={() =>
                                                                                            addPaymentInvoice({
                                                                                                branchId: rows.branchId,
                                                                                                orderId: Number(rows.id),
                                                                                                paymentMethodId: 0,
                                                                                                paidAmount: rows.paidAmount,
                                                                                                totalPaid: rows.totalAmount,
                                                                                                createdAt: null,
                                                                                                paymentMethods: null,
                                                                                            })
                                                                                        }
                                                                                        title="Payment Sale"
                                                                                    >
                                                                                        <BanknoteArrowUp color="blue" />
                                                                                    </button>
                                                                                )}

                                                                                {hasPermission('Sale-Return') && (
                                                                                    <NavLink
                                                                                        to={`/sale-return/${rows.id}`}
                                                                                        className="hover:text-warning"
                                                                                        title="Sale Return"
                                                                                    >
                                                                                        <Undo2 color="pink" />
                                                                                    </NavLink>
                                                                                )}
                                                                            </>
                                                                        )}
                                                                        {hasPermission('Sale-Edit') &&
                                                                            <NavLink to={`/editsale/${rows.id}`} className="hover:text-warning" title="Edit">
                                                                                <Pencil color="green" />
                                                                            </NavLink>
                                                                        }
                                                                        {rows.status === 'PENDING' &&
                                                                            hasPermission('Sale-Delete') &&
                                                                                <button type="button" className="hover:text-danger" onClick={() => rows.id && handleDeleteInvoice(rows.id)} title="Delete">
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
                                                        <td colSpan={3}>No Sale Found!</td>
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

            <ModalPayment 
                isOpen={isModalPaymentOpen}
                onClose={() => setIsModalPaymentOpen(false)}
                onSubmit={handleOnSubmitPayment}
                amountInvoice={amountInvoice}
            />

            {showDeleteModal && (
                <div className="fixed inset-0 bg-[black]/60 z-[999] overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4">
                        <div className="panel border-0 p-0 rounded-lg overflow-hidden w-full max-w-lg my-8">
                            <div className="flex bg-[#fbfbfb] dark:bg-[#121c2c] items-center justify-between px-5 py-3">
                                <h5 className="flex font-bold text-lg">
                                    <MessageCircleOff /> Delete Invoice
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
                                            placeholder="Enter reason for deleting this invoice"
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

export default Invoice;
