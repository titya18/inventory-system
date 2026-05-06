// src/components/MainCategory.tsx
import React, { useState, useEffect } from "react";
import * as apiClient from "@/api/stockRequest";
import { getStockRequestById } from "@/api/stockRequest";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import Pagination from "../components/Pagination"; // Import the Pagination component
import ShowDeleteConfirmation from "../components/ShowDeleteConfirmation";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUpZA, faArrowDownAZ, faClose, faSave } from '@fortawesome/free-solid-svg-icons';
import { NavLink } from "react-router-dom";
import { toast } from "react-toastify";
import { useAppContext } from "@/hooks/useAppContext";
import { format } from 'date-fns';
import { Pencil, Printer, Trash2, Plus, MessageCircleOff, NotebookText } from 'lucide-react';
import { StockRequestType } from "@/data_types/types";
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
    "Request Date",
    "Request By",
    "Branch",
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
    "Request Date": "requestDate",
    "Request By": "requestBy",
    "Branch": "branchId",
    "Status": "StatusType",
    "Approved At": "approvedAt",
    "Approved By": "approvedBy",
    "Created At": "createdAt",
    "Created By": "createdBy",
    "Updated At": "updatedAt",
    "Updated By": "updatedBy"
};

const StockRequest: React.FC = () => {
    const [requestData, setRequestData] = useState<StockRequestType[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const [searchParams, setSearchParams] = useSearchParams();
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
    const sortField = searchParams.get("sortField") || "createdAt";
    const rawSortOrder = searchParams.get("sortOrder");
    const sortOrder: "desc" | "asc" = rawSortOrder === "desc" ? "desc" : "asc";
    const [total, setTotal] = useState(0);
    const [visibleCols, setVisibleCols] = useState(columns);
    const [printingId, setPrintingId] = useState<number | null>(null);
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
    const { settings } = useCompanySettings();

    const fetchReqeust = async () => {
        setIsLoading(true);
        try {
            const { data, total } = await apiClient.getAllStockRequests(
                sortField,
                sortOrder,
                page,
                search,
                pageSize
            );
            setRequestData(data || []);
            setTotal(total || 0);
            setSelected([]);
        } catch (error) {
            console.error("Error fetching stock request:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchReqeust();
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

    const exportData = requestData.map((request, index) => ({
        "No": (page - 1) * pageSize + index + 1,
        "Rference": request.ref,
        "Request Date": request.requestDate,
        "Request By": `${request.requester?.lastName || ''} ${request.requester?.firstName || 'N/A'}`,
        "Branch": request.branch ? request.branch.name : "",
        "Status": request.StatusType,
        "Approved At": request.approvedAt ? dayjs.tz(request.approvedAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss") : 'N/A',
        "Approved By": `${request.approver?.lastName || ''} ${request.approver?.firstName || 'N/A'}`,
        "Created At": request.createdAt ? dayjs.tz(request.createdAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss") : '',
        "Created By": `${request.creator?.lastName || ''} ${request.creator?.firstName || ''}`,
        "Updated At": request.updatedAt ? dayjs.tz(request.updatedAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss") : '',
        "Updated By": `${request.updater?.lastName || ''} ${request.updater?.firstName || ''}`,
    }));

    const handlePrint = async (id: number) => {
        setPrintingId(id);
        try {
            const data = await getStockRequestById(id);
            const statusColors: Record<string, string> = { PENDING: "#f59e0b", APPROVED: "#10b981", CANCELLED: "#ef4444" };
            const statusColor = statusColors[data.StatusType] ?? "#6366f1";
            const formattedDate = data.requestDate
                ? format(new Date(data.requestDate as string), "dd-MMM-yyyy")
                : "—";
            const branchName = data.branch?.name ?? "—";
            const req = (data as any).requester;
            const requesterName = req ? `${req.firstName ?? ""} ${req.lastName ?? ""}`.trim() : "—";
            const linkedOrderRef = data.order?.ref ?? "";

            const itemRows = (data.requestDetails ?? []).map((detail: any, i: number) => {
                const unitName = detail.unit?.name ?? detail.productvariants?.baseUnit?.name ?? "pcs";
                const serials: string[] = [];
                if (detail.trackedPayload) {
                    try {
                        const p = JSON.parse(detail.trackedPayload);
                        (p.selectedItems ?? []).forEach((s: any) => { if (s.serialNumber) serials.push(s.serialNumber); });
                    } catch (_) {}
                }
                const serialHtml = serials.length > 0
                    ? serials.map((sn) => `<span style="background:#ede9fe;color:#5b21b6;border-radius:4px;padding:1px 6px;font-family:monospace;font-size:11px;margin:2px;display:inline-block">${sn}</span>`).join("")
                    : `<span style="color:#bbb;font-size:11px">—</span>`;
                return `<tr style="background:${i % 2 === 0 ? "#fff" : "#f9f9ff"};border-bottom:1px solid #e8e8f0">
                    <td style="padding:7px 10px;color:#888">${i + 1}</td>
                    <td style="padding:7px 10px"><div style="font-weight:600">${detail.products?.name ?? "—"}</div><div style="font-size:11px;color:#888">${detail.productvariants?.productType ?? ""}</div></td>
                    <td style="padding:7px 10px;font-family:monospace;font-size:11px;color:#555">${detail.productvariants?.barcode ?? "—"}</td>
                    <td style="padding:7px 10px;text-align:center">${unitName}</td>
                    <td style="padding:7px 10px;text-align:right;font-weight:600">${Number(detail.unitQty ?? 0)}</td>
                    <td style="padding:7px 10px;text-align:right">${Number(detail.baseQty ?? detail.quantity ?? 0)}</td>
                    <td style="padding:7px 10px">${serialHtml}</td>
                </tr>`;
            }).join("");

            const invoiceCard = linkedOrderRef
                ? `<div style="flex:1;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:10px 14px"><div style="font-weight:700;margin-bottom:4px;color:#10b981">Linked Invoice</div><div style="font-family:monospace;font-weight:700">${linkedOrderRef}</div></div>` : "";

            const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Stock Request ${data.ref}</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;padding:20px 30px;background:#fff}@media print{@page{size:A4;margin:10mm}body{padding:0}}</style>
</head><body>
<div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #6366f1;padding-bottom:12px;margin-bottom:16px">
  <div>
    ${settings.companyNameEn ? `<div style="font-weight:700;font-size:14px">${settings.companyNameEn}</div>` : ""}
    ${settings.addressEn ? `<div style="font-size:12px;color:#555">${settings.addressEn}</div>` : ""}
    ${settings.phone ? `<div style="font-size:12px;color:#555">Tel: ${settings.phone}</div>` : ""}
  </div>
  <div style="text-align:right">
    <div style="font-size:20px;font-weight:800;color:#6366f1;letter-spacing:1px;margin-bottom:6px">STOCK REQUEST</div>
    <table style="font-size:12px;margin-left:auto;border-collapse:collapse">
      <tr><td style="padding-right:8px;color:#888">Ref No.</td><td><strong>${data.ref}</strong></td></tr>
      <tr><td style="padding-right:8px;color:#888">Date</td><td>${formattedDate}</td></tr>
      <tr><td style="padding-right:8px;color:#888">Status</td><td><span style="background:${statusColor};color:#fff;border-radius:4px;padding:1px 8px;font-size:11px;font-weight:700">${data.StatusType}</span></td></tr>
    </table>
  </div>
</div>
<div style="display:flex;gap:16px;margin-bottom:16px;font-size:13px">
  <div style="flex:1;background:#f8f8ff;border:1px solid #e0e0ff;border-radius:6px;padding:10px 14px"><div style="font-weight:700;margin-bottom:4px;color:#6366f1">Request Branch</div><div>${branchName}</div></div>
  <div style="flex:1;background:#f8f8ff;border:1px solid #e0e0ff;border-radius:6px;padding:10px 14px"><div style="font-weight:700;margin-bottom:4px;color:#6366f1">Requested By</div><div>${requesterName}</div></div>
  ${invoiceCard}
</div>
<table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px">
  <thead><tr style="background:#6366f1;color:#fff">
    <th style="padding:7px 10px;text-align:left;width:36px">#</th>
    <th style="padding:7px 10px;text-align:left">Product</th>
    <th style="padding:7px 10px;text-align:left">Barcode</th>
    <th style="padding:7px 10px;text-align:center">Unit</th>
    <th style="padding:7px 10px;text-align:right">Qty</th>
    <th style="padding:7px 10px;text-align:right">Base Qty</th>
    <th style="padding:7px 10px;text-align:left">Serials</th>
  </tr></thead>
  <tbody>${itemRows || `<tr><td colspan="7" style="padding:16px;text-align:center;color:#aaa">No items</td></tr>`}</tbody>
</table>
${data.note ? `<div style="margin-bottom:20px;font-size:13px"><span style="font-weight:700;color:#555">Note: </span>${data.note}</div>` : ""}
<div style="display:flex;justify-content:space-between;margin-top:40px;font-size:13px">
  ${["Requested By", "Approved By", "Received By"].map((l) => `<div style="text-align:center;width:28%"><div style="border-top:1px solid #999;padding-top:6px;margin-top:36px;color:#555">${l}</div></div>`).join("")}
</div>
<div style="margin-top:24px;border-top:1px solid #e0e0e0;padding-top:8px;font-size:11px;color:#aaa;text-align:center">
  Printed on ${new Date().toLocaleString("en-US", { timeZone: "Asia/Phnom_Penh", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}${settings.companyNameEn ? ` · ${settings.companyNameEn}` : ""}
</div>
<script>window.onload=function(){window.print();window.close();}</script>
</body></html>`;

            const blob = new Blob([html], { type: "text/html" });
            const url = URL.createObjectURL(blob);
            const win = window.open(url, "_blank", "width=960,height=760");
            if (!win) { alert("Please allow popups to print."); return; }
            setTimeout(() => URL.revokeObjectURL(url), 60000);
        } catch {
            toast.error("Failed to load data for printing");
        } finally {
            setPrintingId(null);
        }
    };

    const handleDeleteRequest = async (id: number) => {
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
            await apiClient.deleteRequest(deleteInvoiceId, deleteMessage);

            toast.success("Request deleted successfully", {
                position: "top-right",
                autoClose: 4000,
            });

            setShowDeleteModal(false);
            setDeleteInvoiceId(null);

            fetchReqeust();
        } catch (err: any) {
            toast.error(err.message || "Error deleting stock request");
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
                                        {hasPermission('Stock-Request-Create') &&
                                            <NavLink to="/addrequeststock" className="btn btn-primary gap-2" >
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
                                    <ExportDropdown data={exportData} prefix="Stock_Request" />
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
                                                {requestData && requestData.length > 0 ? (
                                                    requestData.map((rows, index) => (
                                                        <tr key={index}>
                                                            {visibleCols.includes("No") && (
                                                                <td>{(page - 1) * pageSize + index + 1}</td>
                                                            )}
                                                            {visibleCols.includes("Rference") && (
                                                                <td>{rows.ref}</td>
                                                            )}
                                                            {visibleCols.includes("Request Date") && (
                                                                <td>{rows.requestDate ? format(new Date(rows.requestDate), 'dd-MMM-yyyy') : ''}</td>
                                                            )}
                                                            {visibleCols.includes("Request By") && (
                                                                <td>{rows.requester ? `${rows.requester.lastName} ${rows.requester.firstName}` : "N/A"}</td>
                                                            )}
                                                            {visibleCols.includes("Branch") && (
                                                                <td>{rows.branch ? rows.branch.name : ""}</td>
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
                                                                        <button
                                                                            type="button"
                                                                            title="Print"
                                                                            disabled={printingId === rows.id}
                                                                            onClick={() => rows.id && handlePrint(rows.id)}
                                                                            className="hover:text-primary disabled:opacity-40"
                                                                        >
                                                                            <Printer size={18} color={printingId === rows.id ? "#aaa" : "#6366f1"} />
                                                                        </button>
                                                                        {hasPermission('Stock-Request-Edit') &&
                                                                                <NavLink to={`/editrequeststock/${rows.id}`} className="hover:text-warning" title="Edit">
                                                                                    <Pencil color="green" />
                                                                                </NavLink>
                                                                        }
                                                                        {rows.StatusType === 'PENDING' &&
                                                                            hasPermission('Stock-Request-Delete') &&
                                                                                <button type="button" className="hover:text-danger" onClick={() => rows.id && handleDeleteRequest(rows.id)} title="Delete">
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
                                                        <td colSpan={3}>No Stock Request Found!</td>
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
                <div className="fixed inset-0 bg-[black]/60 z-[999] flex items-center justify-center p-4">
                    
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
            )}

            {showNoteModal && (
                <div className="fixed inset-0 bg-[black]/60 z-[999] flex items-center justify-center p-4">
                    
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
            )}
        </>
    );
};

export default StockRequest;
