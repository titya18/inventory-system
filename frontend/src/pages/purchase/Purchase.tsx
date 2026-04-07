// src/components/MainCategory.tsx
import React, { useState, useEffect } from "react";
import * as apiClient from "@/api/purchase";
import Pagination from "../components/Pagination"; // Import the Pagination component
import ShowDeleteConfirmation from "../components/ShowDeleteConfirmation";
import { useQueryClient } from "@tanstack/react-query";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUpZA, faArrowDownAZ, faPrint, faClose, faSave } from '@fortawesome/free-solid-svg-icons';
import { NavLink } from "react-router-dom";
import { toast } from "react-toastify";
import { useAppContext } from "@/hooks/useAppContext";
import ModalPayment from "./ModalPayment";
import { format } from 'date-fns';
import { Pencil, Trash2, BanknoteArrowUp, PrinterCheck, Plus, MessageCircleOff, NotebookText, BookImage } from 'lucide-react';
import { PurchaseType, PaymentType } from "@/data_types/types";
import { useSearchParams } from "react-router-dom";
import VisibleColumnsSelector from "@/components/VisibleColumnsSelector";
import ExportDropdown from "@/components/ExportDropdown";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

import { normalizePreviewItems } from "@/utils/normalizePreviewItems";
import { FilePreviewModal } from "@/components/FilePreviewModal";

type PreviewItem = {
  url: string;
  type: "image" | "pdf";
};

// Extend Day.js with plugins
dayjs.extend(utc);
dayjs.extend(timezone);

const columns = [
    "No",
    "Purchase Date",
    "Purchase No",
    "Supplier",
    "Branch",
    "Status",
    "Grand Total",
    "Paid",
    "Due",
    "Received At",
    "Received By",
    "Cancelled At",
    "Cancelled By",
    "Cancelled Reason",
    "Created At",
    "Created By",
    "Updated At",
    "Updated By",
    "Actions"
];

const DEFAULT_VISIBLE_COLUMNS = [
    "No",
    "Purchase Date",
    "Purchase No",
    "Supplier",
    "Branch",
    "Status",
    "Grand Total",
    "Paid",
    "Due",
    "Actions"
];

const sortFields: Record<string, string> = {
    "No": "id",
    "Purchase Date": "purchaseDate",
    "Purchase No": "ref",
    "Supplier": "supplierId",
    "Branch": "branchId",
    "Status": "status",
    "Grand Total": "grandTotal",
    "Paid": "paidAmount",
    "Due": "due",
    "Received At": "receivedAt",
    "Received By": "receivedBy",
    "Cancelled At": "deletedAt",
    "Cancelled By": "deletedBy",
    "Cancelled Reason": "delReason",
    "Created At": "createdAt",
    "Created By": "createdBy",
    "Updated At": "updatedAt",
    "Updated By": "updatedBy"
};

const Purchase: React.FC = () => {
    const [purchaseData, setPurchaseData] = useState<PurchaseType[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isModalPaymentOpen, setIsModalPaymentOpen] = useState(false);
    const [amountPurchase, setAmountPurchase] = useState<PaymentType | null>(null);

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
    const [file, setFile] = useState<File | null>(null);
    const [open, setOpen] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewImages, setPreviewImages] = useState<string[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);

    const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);

    const updateParams = (params: Record<string, unknown>) => {
        const newParams = new URLSearchParams(searchParams.toString());
        Object.entries(params).forEach(([key, value]) => {
            newParams.set(key, String(value));
        });
        setSearchParams(newParams);
    };

    const { hasPermission } = useAppContext();

    const fetchPurchase = async () => {
        setIsLoading(true);
        try {
            const { data, total } = await apiClient.getAllPurchases(
                sortField,
                sortOrder,
                page,
                search,
                pageSize
            );
            setPurchaseData(data || []);
            setTotal(total || 0);
            setSelected([]);
        } catch (error) {
            console.error("Error fetching purchase:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPurchase();
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

    const exportData = purchaseData.map((purchase, index) => ({
        "No": (page - 1) * pageSize + index + 1,
        "Purchase Date": purchase.purchaseDate,
        "Purchase No": purchase.ref,
        "Supplier": purchase.suppliers ? purchase.suppliers.name : "",
        "Branch": purchase.branch ? purchase.branch.name : "",
        "Status": purchase.status,
        "Grand Total": purchase.grandTotal,
        "Paid": purchase.paidAmount,
        "Due": Number(purchase.grandTotal - (purchase.paidAmount ?? 0)).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','),
        "Received At": purchase.receivedAt ? dayjs.tz(purchase.receivedAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss") : '',
        "Received By": `${purchase.receiver?.lastName || ''} ${purchase.receiver?.firstName || ''}`,
        "Cancelled At": purchase.deletedAt ? dayjs.tz(purchase.deletedAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss") : '',
        "Cancelled By": `${purchase.deleter?.lastName || ''} ${purchase.deleter?.firstName || ''}`,
        "Cancelled Reason": purchase.delReason,
        "Created At": purchase.createdAt ? dayjs.tz(purchase.createdAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss") : '',
        "Created By": `${purchase.creator?.lastName || ''} ${purchase.creator?.firstName || ''}`,
        "Updated At": purchase.updatedAt ? dayjs.tz(purchase.updatedAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss") : '',
        "Updated By": `${purchase.updater?.lastName || ''} ${purchase.updater?.firstName || ''}`,
    }));

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const queryClient = useQueryClient();

    const handleDeletePurchase = async (id: number) => {
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
            await apiClient.deletePurchase(deleteInvoiceId, deleteMessage);

            toast.success("Purchase deleted successfully", {
                position: "top-right",
                autoClose: 4000,
            });

            setShowDeleteModal(false);
            setDeleteInvoiceId(null);

            fetchPurchase();
        } catch (err: any) {
            toast.error(err.message || "Error deleting purchasing");
        }
    };

    const addPaymentPurchase = (paymentData: PaymentType) => {
        setAmountPurchase(paymentData);
        setIsModalPaymentOpen(true);
    };

    const handleOnSubmitPayment = async (
        branchId: number | null, 
        purchaseId: number | null, 
        paymentMethodId: number | null,
        paidAmount: number | null, 
        amount: number, 
        receive_usd: number | null,
        receive_khr: number | null,
        exchangerate: number | null,
        due_balance: number
    ) => {
        try {
            await queryClient.invalidateQueries({ queryKey: ["validateToken"] });
            const paymentData: PaymentType = {
                branchId: branchId,
                purchaseId: purchaseId,
                paymentMethodId: paymentMethodId,
                paidAmount: paidAmount,
                amount: amount,
                receive_usd: receive_usd,
                receive_khr: receive_khr,
                exchangerate: exchangerate,
                due_balance: due_balance,
                createdAt: null,
                PaymentMethods: null,
            }
 
            await apiClient.insertPurchasePayment(paymentData);
            toast.success("Purchase payment insert successfully", {
                position: "top-right",
                autoClose: 2000
            });
            fetchPurchase();
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

    useEffect(() => {
        return () => {
            previewImages.forEach(img => {
            if (img.startsWith("blob:")) URL.revokeObjectURL(img);
            });
        };
    }, [previewImages]);


    const normalizePreviewItems = (files: string | File | File[] | null): PreviewItem[] => {
        if (!files) return [];

        const array = Array.isArray(files) ? files : [files];
        return array.map(f => {
            if (typeof f === "string") {
                const ext = f.split('.').pop()?.toLowerCase();
                return { url: `${import.meta.env.VITE_API_URL}/${f}`, type: ext === "pdf" ? "pdf" : "image" };
            } else if (f instanceof File) {
                const ext = f.name.split('.').pop()?.toLowerCase();
                return { url: URL.createObjectURL(f), type: ext === "pdf" ? "pdf" : "image" };
            } else {
                return { url: "", type: "image" };
            }
        });
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
                                        {hasPermission('Purchase-Create') &&
                                            <NavLink to="/addpurchase" className="btn btn-primary gap-2" >
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
                                    <ExportDropdown data={exportData} prefix="Purchase" />
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
                                                {purchaseData && purchaseData.length > 0 ? (
                                                    purchaseData.map((rows, index) => (
                                                        <tr key={index}>
                                                            {visibleCols.includes("No") && (
                                                                <td>{(page - 1) * pageSize + index + 1}</td>
                                                            )}
                                                            {visibleCols.includes("Purchase Date") && (
                                                                <td>{rows.purchaseDate ? format(new Date(rows.purchaseDate), 'dd-MMM-yyyy') : ''}</td>
                                                            )}
                                                            {visibleCols.includes("Purchase No") && (
                                                                <td>{rows.ref}</td>
                                                            )}
                                                            {visibleCols.includes("Supplier") && (
                                                                <td>{rows.supplier ? rows.supplier.name : ""}</td>
                                                            )}
                                                            {visibleCols.includes("Branch") && (
                                                                <td>{rows.branch ? rows.branch.name : ""}</td>
                                                            )}
                                                            {visibleCols.includes("Status") && (
                                                            <td>
                                                                <span className={`badge rounded-full ${rows.status === 'PENDING' ? 'bg-warning' : rows.status === 'RECEIVED' ? 'bg-primary' : rows.status === 'COMPLETED' ? 'bg-success' : rows.status === 'REQUESTED' ? 'bg-secondary' : rows.status === 'APPROVED' ? 'bg-info' : 'bg-danger'}`} title={rows.delReason}>
                                                                    {rows.status}
                                                                </span>
                                                            </td>
                                                            )}
                                                            {visibleCols.includes("Grand Total") && (
                                                                <td style={{color: "blue"}}>$ { Number(rows.grandTotal).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',') }</td>
                                                            )}
                                                            {visibleCols.includes("Paid") && (
                                                                <td style={{color: (rows.grandTotal - (rows.paidAmount ?? 0)) > 0 ? "red" : "green"}}>$ { Number(rows.paidAmount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',') }</td>
                                                            )}
                                                            {visibleCols.includes("Due") && (
                                                                <td style={{color: (rows.grandTotal - (rows.paidAmount ?? 0)) > 0 ? "red" : "black"}}>$ { Number(rows.grandTotal - (rows.paidAmount ?? 0)).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',') }</td>
                                                            )}
                                                            {visibleCols.includes("Received At") && (
                                                                <td>{rows.receivedAt ? dayjs.tz(rows.receivedAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss") : "N/A"}</td>
                                                            )}
                                                            {visibleCols.includes("Received By") && (
                                                                <td>{rows.receiver?.lastName} {rows.receiver?.firstName}</td>
                                                            )}
                                                            {visibleCols.includes("Cancelled At") && (
                                                                <td>{rows.deletedAt ? dayjs.tz(rows.deletedAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss") : "N/A"}</td>
                                                            )}
                                                            {visibleCols.includes("Cancelled By") && (
                                                                <td>{rows.deleter?.lastName} {rows.deleter?.firstName}</td>
                                                            )}
                                                            {visibleCols.includes("Cancelled Reason") && (
                                                                <td>{rows.delReason}</td>
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
                                                                        {rows.image && ((Array.isArray(rows.image) && rows.image.length > 0) || (typeof rows.image === 'string' && rows.image.length > 0) || (rows.image instanceof File)) &&
                                                                        <button
                                                                            type="button"
                                                                            className="px-2 py-1 text-primary"
                                                                            onClick={() => {
                                                                                const items = normalizePreviewItems(rows.image);
                                                                                if (items.length === 0) {
                                                                                    toast.info("No image to preview");
                                                                                    return;
                                                                                }
                                                                                setPreviewItems(items);
                                                                                setActiveIndex(0);
                                                                                setPreviewOpen(true);
                                                                            }}
                                                                        >
                                                                            < BookImage />
                                                                        </button>
                                                                        }
                                                                        {rows.note !== "" &&
                                                                            <button type="button" className="hover:text-danger" onClick={() => handleViewNote(rows.note)} title="View Note">
                                                                                <NotebookText color="pink" />
                                                                            </button>
                                                                        }
                                                                        {hasPermission('Purchase-Print') &&
                                                                            <NavLink to={`/printpurchase/${rows.id}`} className="hover:text-warning" title="Print Purchase">
                                                                                <PrinterCheck color="purple" />
                                                                            </NavLink>
                                                                        }
                                                                        {(rows.status === 'RECEIVED' || rows.status === 'COMPLETED') &&
                                                                            hasPermission('Purchase-Payment') &&
                                                                                <button type="button" 
                                                                                    className="hover:text-primary" 
                                                                                    onClick={() => addPaymentPurchase({ 
                                                                                        branchId: rows.branchId, 
                                                                                        purchaseId: Number(rows.id), 
                                                                                        paymentMethodId: 0, 
                                                                                        paidAmount: rows.paidAmount,
                                                                                        amount: rows.grandTotal,
                                                                                        createdAt: null,
                                                                                        PaymentMethods: null, 
                                                                                    })} 
                                                                                    title="Payment Purchase"
                                                                                >
                                                                                    <BanknoteArrowUp color="blue" />
                                                                                </button>
                                                                        }
                                                                        {hasPermission('Purchase-Edit') &&
                                                                                <NavLink to={`/editpurchase/${rows.id}`} className="hover:text-warning" title="Edit">
                                                                                    <Pencil color="green" />
                                                                                </NavLink>
                                                                        }
                                                                        {(rows.status === 'PENDING' || rows.status === 'REQUESTED') &&
                                                                            hasPermission('Purchase-Delete') &&
                                                                                <button type="button" className="hover:text-danger" onClick={() => rows.id && handleDeletePurchase(rows.id)} title="Delete">
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
                                                        <td colSpan={3}>No Purchase Found!</td>
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
                amountPurchase={amountPurchase}
            />

            {showDeleteModal && (
                <div className="fixed inset-0 bg-[black]/60 z-[999] overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4">
                        <div className="panel border-0 p-0 rounded-lg overflow-hidden w-full max-w-lg my-8">
                            <div className="flex bg-[#fbfbfb] dark:bg-[#121c2c] items-center justify-between px-5 py-3">
                                <h5 className="flex font-bold text-lg">
                                    <MessageCircleOff /> Delete Purchase
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

            <FilePreviewModal
                isOpen={previewOpen}
                items={previewItems}
                activeIndex={activeIndex}
                setActiveIndex={setActiveIndex}
                onClose={() => setPreviewOpen(false)}
                onDelete={(idx) => {
                    const newItems = [...previewItems];
                    const [removed] = newItems.splice(idx, 1);
                    setPreviewItems(newItems);
                    if (removed.url.startsWith("blob:")) URL.revokeObjectURL(removed.url);
                    if (activeIndex >= newItems.length) setActiveIndex(newItems.length - 1);
                }}
            />
        </>
    );
};

export default Purchase;
