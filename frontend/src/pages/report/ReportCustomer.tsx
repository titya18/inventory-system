import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { getCustomerPurchaseReport } from "@/api/report";
import { getAllReportInvoices } from "@/api/report";
import { getInvoiceByid } from "@/api/invoice";
import { getAllBranches } from "@/api/branch";
import { useNavigate, useSearchParams } from "react-router-dom";
import Pagination from "../components/Pagination";
import { toast } from "react-toastify";
import { useAppContext } from "@/hooks/useAppContext";
import { BranchType, InvoiceType } from "@/data_types/types";
import ExportDropdown from "@/components/ExportDropdown";
import { RefreshCw, Eye, X } from "lucide-react";
import dayjs from "dayjs";

const ReportCustomer: React.FC = () => {
    const { user } = useAppContext();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const startDate = searchParams.get("startDate") || "";
    const endDate   = searchParams.get("endDate")   || "";
    const branchId  = searchParams.get("branchId") ? Number(searchParams.get("branchId")) : undefined;
    const search    = searchParams.get("search")    || "";
    const page      = parseInt(searchParams.get("page")     || "1",  10);
    const pageSize  = parseInt(searchParams.get("pageSize") || "10", 10);

    const [data, setData]         = useState<any[]>([]);
    const [total, setTotal]       = useState(0);
    const [summary, setSummary]   = useState({ totalCustomers: 0, totalInvoices: 0, totalRevenue: 0, totalPaid: 0 });
    const [branches, setBranches] = useState<BranchType[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const [detailModal, setDetailModal] = useState<{ customerId: number; customerName: string } | null>(null);
    const [detailData, setDetailData]   = useState<InvoiceType[]>([]);
    const [detailTotal, setDetailTotal] = useState(0);
    const [detailPage, setDetailPage]   = useState(1);
    const [detailPageSize]              = useState(10);
    const [detailStart, setDetailStart] = useState("");
    const [detailEnd, setDetailEnd]     = useState("");
    const [detailStatus, setDetailStatus] = useState("");
    const [detailLoading, setDetailLoading] = useState(false);

    const [selectedInvoice, setSelectedInvoice] = useState<InvoiceType | null>(null);
    const [invDetailLoading, setInvDetailLoading] = useState(false);
    // snapshot of the customer modal to restore when closing invoice detail
    const [savedDetailModal, setSavedDetailModal] = useState<{ customerId: number; customerName: string } | null>(null);

    const openInvoiceDetail = async (id: number) => {
        // close parent modal and remember it
        setSavedDetailModal(detailModal);
        setDetailModal(null);
        setInvDetailLoading(true);
        setSelectedInvoice(null);
        try {
            const data = await getInvoiceByid(id);
            setSelectedInvoice(data);
        } catch {
            toast.error("Failed to load invoice details");
        } finally {
            setInvDetailLoading(false);
        }
    };

    const closeInvoiceDetail = () => {
        setSelectedInvoice(null);
        setInvDetailLoading(false);
        // restore customer invoices modal
        if (savedDetailModal) setDetailModal(savedDetailModal);
        setSavedDetailModal(null);
    };

    const updateParams = (params: Record<string, unknown>) => {
        const newParams = new URLSearchParams(searchParams.toString());
        Object.entries(params).forEach(([k, v]) => {
            if (v === undefined || v === null || v === "") newParams.delete(k);
            else newParams.set(k, String(v));
        });
        setSearchParams(newParams);
    };

    const fetchBranches = useCallback(async () => {
        try {
            const res = await getAllBranches();
            setBranches(res as BranchType[]);
        } catch { /* ignore */ }
    }, []);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await getCustomerPurchaseReport({
                page, pageSize,
                searchTerm: search    || undefined,
                startDate:  startDate || undefined,
                endDate:    endDate   || undefined,
                branchId,
            });
            setData(res.data || []);
            setTotal(res.total || 0);
            setSummary(res.summary || { totalCustomers: 0, totalInvoices: 0, totalRevenue: 0, totalPaid: 0 });
        } catch (e: any) {
            toast.error(e.message || "Failed to load report");
        } finally {
            setIsLoading(false);
        }
    }, [page, pageSize, search, startDate, endDate, branchId]);

    useEffect(() => { fetchBranches(); }, [fetchBranches]);
    useEffect(() => { fetchData(); }, [fetchData]);

    const fetchDetailInvoices = useCallback(async (customerId: number) => {
        setDetailLoading(true);
        try {
            const res = await getAllReportInvoices({
                page: detailPage,
                pageSize: detailPageSize,
                customerId,
                startDate: detailStart || undefined,
                endDate:   detailEnd   || undefined,
                status:    detailStatus || undefined,
            });
            setDetailData(res.data || []);
            setDetailTotal(res.total || 0);
        } catch (e: any) {
            toast.error(e.message || "Failed to load invoices");
        } finally {
            setDetailLoading(false);
        }
    }, [detailPage, detailPageSize, detailStart, detailEnd, detailStatus]);

    useEffect(() => {
        if (detailModal) {
            fetchDetailInvoices(detailModal.customerId);
        }
    }, [detailModal, fetchDetailInvoices]);

    const openDetail = (row: any) => {
        setDetailPage(1);
        setDetailStart("");
        setDetailEnd("");
        setDetailStatus("");
        setDetailData([]);
        setDetailTotal(0);
        setDetailModal({ customerId: row.customerId, customerName: row.customerName });
    };

    const closeDetail = () => {
        setDetailModal(null);
        setDetailData([]);
        setDetailTotal(0);
    };

    const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const exportData = data.map((row, idx) => ({
        "No":                (page - 1) * pageSize + idx + 1,
        "Customer":          row.customerName,
        "Phone":             row.phone,
        "Total Orders":      row.totalOrders,
        "Total Revenue ($)": fmt(row.totalRevenue),
        "Total Paid ($)":    fmt(row.totalPaid),
        "Due ($)":           fmt(row.totalDue),
        "Last Purchase":     row.lastPurchaseDate ? dayjs(row.lastPurchaseDate).format("DD/MM/YYYY") : "",
    }));

    const statusBadge = (status: string) => {
        const map: Record<string, string> = {
            APPROVED:  "bg-success",
            COMPLETED: "bg-success",
            PENDING:   "bg-warning",
            CANCELLED: "bg-danger",
        };
        return map[status] || "bg-secondary";
    };

    return (
        <div className="pt-0">
            <div className="space-y-6">
                <div className="panel">
                    <h5 className="text-lg font-semibold dark:text-white-light mb-4">Customer Purchase Report</h5>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                        {[
                            { label: "Total Customers", value: summary.totalCustomers, color: "bg-indigo-50 text-indigo-700", isNum: false },
                            { label: "Total Invoices",  value: summary.totalInvoices,  color: "bg-blue-50 text-blue-700",   isNum: false },
                            { label: "Total Revenue",   value: `$${fmt(summary.totalRevenue)}`, color: "bg-green-50 text-green-700",  isNum: true },
                            { label: "Total Paid",      value: `$${fmt(summary.totalPaid)}`,    color: "bg-emerald-50 text-emerald-700", isNum: true },
                        ].map((card) => (
                            <div key={card.label} className={`rounded-lg p-3 text-center ${card.color}`}>
                                <p className="text-xs font-medium">{card.label}</p>
                                <p className="text-2xl font-bold">{card.value}</p>
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-wrap gap-3 items-end mb-4">
                        <div>
                            <label className="block text-xs mb-1">Start Date</label>
                            <input
                                type="date"
                                className="form-input"
                                value={startDate}
                                onChange={(e) => {
                                    const newStart = e.target.value;
                                    const newEnd = endDate && endDate < newStart ? newStart : endDate;
                                    updateParams({ startDate: newStart, endDate: newEnd, page: 1 });
                                }}
                            />
                        </div>
                        <div>
                            <label className="block text-xs mb-1">End Date</label>
                            <input
                                type="date"
                                className="form-input"
                                value={endDate}
                                min={startDate || undefined}
                                onChange={(e) => updateParams({ endDate: e.target.value, page: 1 })}
                            />
                        </div>
                        {user?.roleType === "ADMIN" && (
                            <div>
                                <label className="block text-xs mb-1">Branch</label>
                                <select
                                    className="form-select"
                                    value={branchId ?? ""}
                                    onChange={(e) => updateParams({ branchId: e.target.value ? Number(e.target.value) : undefined, page: 1 })}
                                >
                                    <option value="">All Branches</option>
                                    {branches.map((b) => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div>
                            <label className="block text-xs mb-1">Search</label>
                            <input
                                type="text"
                                className="form-input w-48"
                                placeholder="Customer name, phone..."
                                value={search}
                                onChange={(e) => updateParams({ search: e.target.value, page: 1 })}
                            />
                        </div>
                        <button className="btn btn-outline-primary flex items-center gap-1" onClick={() => navigate("/reportCustomerPurchase")}>
                            <RefreshCw size={14} /> Clear
                        </button>
                        <ExportDropdown data={exportData} prefix="Customer_Purchase_Report" />
                    </div>

                    <div className="dataTable-container overflow-x-auto">
                        <table className="dataTable-table w-full whitespace-nowrap">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Customer</th>
                                    <th>Phone</th>
                                    <th>Total Orders</th>
                                    <th>Total Revenue</th>
                                    <th>Total Paid</th>
                                    <th>Due</th>
                                    <th>Last Purchase</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr><td colSpan={9} className="text-center py-6">Loading...</td></tr>
                                ) : data.length === 0 ? (
                                    <tr><td colSpan={9} className="text-center py-6">No records found</td></tr>
                                ) : data.map((row, idx) => (
                                    <tr key={row.customerId}>
                                        <td>{(page - 1) * pageSize + idx + 1}</td>
                                        <td className="font-medium">{row.customerName}</td>
                                        <td>{row.phone || "-"}</td>
                                        <td className="text-center">{row.totalOrders}</td>
                                        <td className="text-right font-mono">${fmt(row.totalRevenue)}</td>
                                        <td className="text-right font-mono">${fmt(row.totalPaid)}</td>
                                        <td className="text-right font-mono">
                                            <span className={row.totalDue > 0 ? "text-red-600 font-semibold" : ""}>
                                                ${fmt(row.totalDue)}
                                            </span>
                                        </td>
                                        <td>{row.lastPurchaseDate ? dayjs(row.lastPurchaseDate).format("DD/MM/YYYY") : "-"}</td>
                                        <td>
                                            <button
                                                type="button"
                                                className="hover:text-primary"
                                                title="View invoices"
                                                onClick={() => openDetail(row)}
                                            >
                                                <Eye size={16} color="#6366f1" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <Pagination
                        page={page}
                        pageSize={pageSize}
                        total={total}
                        onPageChange={(p) => updateParams({ page: p })}
                        onPageSizeChange={(s) => updateParams({ pageSize: s, page: 1 })}
                    />
                </div>
            </div>

            {detailModal && createPortal(
                <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#1c2e4a] rounded-lg shadow-xl w-full max-w-5xl flex flex-col" style={{ maxHeight: "85vh" }}>
                        <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                            <h5 className="font-semibold text-lg">
                                Invoices — {detailModal.customerName}
                            </h5>
                            <button
                                type="button"
                                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-red-100 flex items-center justify-center"
                                onClick={closeDetail}
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="flex-shrink-0 flex flex-wrap gap-3 items-end p-4 border-b border-gray-200 dark:border-gray-700">
                            <div>
                                <label className="block text-xs mb-1">Start Date</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={detailStart}
                                    onChange={(e) => { setDetailStart(e.target.value); setDetailPage(1); }}
                                />
                            </div>
                            <div>
                                <label className="block text-xs mb-1">End Date</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={detailEnd}
                                    min={detailStart || undefined}
                                    onChange={(e) => { setDetailEnd(e.target.value); setDetailPage(1); }}
                                />
                            </div>
                            <div>
                                <label className="block text-xs mb-1">Status</label>
                                <select className="form-select" value={detailStatus} onChange={(e) => { setDetailStatus(e.target.value); setDetailPage(1); }}>
                                    <option value="">All Status</option>
                                    <option value="PENDING">Pending</option>
                                    <option value="APPROVED">Approved</option>
                                    <option value="COMPLETED">Completed</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex-grow overflow-y-auto p-4">
                            <div className="dataTable-container overflow-x-auto">
                                <table className="dataTable-table w-full whitespace-nowrap">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Date</th>
                                            <th>Ref</th>
                                            <th>Type</th>
                                            <th>Branch</th>
                                            <th>Status</th>
                                            <th>Total</th>
                                            <th>Paid</th>
                                            <th>Due</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {detailLoading ? (
                                            <tr><td colSpan={10} className="text-center py-6">Loading...</td></tr>
                                        ) : detailData.length === 0 ? (
                                            <tr><td colSpan={10} className="text-center py-6">No invoices found</td></tr>
                                        ) : detailData.map((inv: any, idx) => {
                                            const due = Number(inv.totalAmount || 0) - Number(inv.paidAmount || 0);
                                            return (
                                                <tr key={inv.id}>
                                                    <td>{(detailPage - 1) * detailPageSize + idx + 1}</td>
                                                    <td>{inv.orderDate ? dayjs(inv.orderDate).format("DD/MM/YYYY") : "-"}</td>
                                                    <td className="font-mono text-sm">{inv.ref}</td>
                                                    <td>
                                                        <span className={`badge rounded-full text-xs px-2 py-0.5 ${inv.OrderSaleType === "WHOLESALE" ? "bg-amber-100 text-amber-700" : "bg-indigo-100 text-indigo-700"}`}>
                                                            {inv.OrderSaleType || "-"}
                                                        </span>
                                                    </td>
                                                    <td>{inv.branch?.name || "-"}</td>
                                                    <td>
                                                        <span className={`badge rounded-full text-white text-xs px-2 py-0.5 ${statusBadge(inv.status)}`}>
                                                            {inv.status}
                                                        </span>
                                                    </td>
                                                    <td className="text-right font-mono">${fmt(Number(inv.totalAmount || 0))}</td>
                                                    <td className="text-right font-mono">${fmt(Number(inv.paidAmount || 0))}</td>
                                                    <td className="text-right font-mono">
                                                        <span className={due > 0 ? "text-red-600 font-semibold" : ""}>
                                                            ${fmt(due)}
                                                        </span>
                                                    </td>
                                                    <td className="text-center">
                                                        <button type="button" onClick={() => openInvoiceDetail(inv.id)} title="View items" className="hover:text-primary">
                                                            <Eye size={16} color="#6366f1" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <Pagination
                                page={detailPage}
                                pageSize={detailPageSize}
                                total={detailTotal}
                                onPageChange={(p) => setDetailPage(p)}
                                onPageSizeChange={() => {}}
                            />
                        </div>
                    </div>
                </div>
            , document.body)}

            {/* Invoice Items Sub-modal — portalled to body to escape parent stacking context */}
            {(invDetailLoading || selectedInvoice) && createPortal(
                <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#0e1726] rounded-lg w-full max-w-4xl flex flex-col" style={{ maxHeight: "85vh" }}>
                        <div className="flex items-center justify-between px-5 py-3 bg-[#fbfbfb] dark:bg-[#121c2c] flex-shrink-0 rounded-t-lg">
                            <h5 className="font-bold text-lg">
                                {selectedInvoice ? `Invoice — ${selectedInvoice.ref}` : "Loading..."}
                            </h5>
                            <button type="button" onClick={closeInvoiceDetail} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-600">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="overflow-y-auto flex-grow p-5">
                            {invDetailLoading ? (
                                <p className="text-center py-10">Loading...</p>
                            ) : selectedInvoice ? (
                                <>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 text-sm">
                                        <div><span className="text-gray-500 text-xs">Date</span><p className="font-medium">{selectedInvoice.orderDate ? dayjs(selectedInvoice.orderDate).format("DD/MMM/YYYY") : "-"}</p></div>
                                        <div><span className="text-gray-500 text-xs">Type</span><p className="font-medium">{selectedInvoice.OrderSaleType || "-"}</p></div>
                                        <div><span className="text-gray-500 text-xs">Status</span><p><span className={`badge rounded-full text-white text-xs px-2 py-0.5 ${statusBadge(selectedInvoice.status)}`}>{selectedInvoice.status}</span></p></div>
                                        <div><span className="text-gray-500 text-xs">Branch</span><p className="font-medium">{selectedInvoice.branch?.name || "-"}</p></div>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="table-auto w-full border-collapse border border-gray-200 text-sm">
                                            <thead>
                                                <tr className="bg-gray-100">
                                                    <th className="border px-3 py-2 text-left">#</th>
                                                    <th className="border px-3 py-2 text-left">Product / Service</th>
                                                    <th className="border px-3 py-2 text-left">Variant</th>
                                                    <th className="border px-3 py-2 text-right">Qty</th>
                                                    <th className="border px-3 py-2 text-right">Unit</th>
                                                    <th className="border px-3 py-2 text-right">Price</th>
                                                    <th className="border px-3 py-2 text-right">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(selectedInvoice.items || []).length === 0 ? (
                                                    <tr><td colSpan={7} className="border px-3 py-4 text-center text-gray-400">No items</td></tr>
                                                ) : (selectedInvoice.items || []).map((item: any, idx: number) => (
                                                    <tr key={item.id} className="hover:bg-gray-50">
                                                        <td className="border px-3 py-2">{idx + 1}</td>
                                                        <td className="border px-3 py-2 font-medium">{item.ItemType === "SERVICE" ? item.services?.name || "-" : item.products?.name || "-"}</td>
                                                        <td className="border px-3 py-2 text-gray-500">{item.ItemType === "PRODUCT" ? (item.productvariants?.productType || "-") : "-"}</td>
                                                        <td className="border px-3 py-2 text-right">{item.unitQty ?? item.quantity ?? 0}</td>
                                                        <td className="border px-3 py-2 text-right text-gray-500">{item.unitName || "-"}</td>
                                                        <td className="border px-3 py-2 text-right">${fmt(Number(item.price || 0))}</td>
                                                        <td className="border px-3 py-2 text-right font-medium">${fmt(Number(item.total || 0))}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot>
                                                <tr className="bg-gray-50 font-semibold">
                                                    <td colSpan={6} className="border px-3 py-2 text-right">Grand Total</td>
                                                    <td className="border px-3 py-2 text-right">${fmt(Number(selectedInvoice.totalAmount || 0))}</td>
                                                </tr>
                                                <tr className="bg-gray-50">
                                                    <td colSpan={6} className="border px-3 py-2 text-right text-gray-500">Paid</td>
                                                    <td className="border px-3 py-2 text-right text-green-600">${fmt(Number(selectedInvoice.paidAmount || 0))}</td>
                                                </tr>
                                                <tr className="bg-gray-50">
                                                    <td colSpan={6} className="border px-3 py-2 text-right text-gray-500">Due</td>
                                                    <td className={`border px-3 py-2 text-right font-semibold ${Number(selectedInvoice.totalAmount || 0) - Number(selectedInvoice.paidAmount || 0) > 0 ? "text-red-600" : ""}`}>
                                                        ${fmt(Number(selectedInvoice.totalAmount || 0) - Number(selectedInvoice.paidAmount || 0))}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </>
                            ) : null}
                        </div>
                        <div className="flex justify-end px-5 py-3 flex-shrink-0 border-t border-gray-200">
                            <button type="button" onClick={closeInvoiceDetail} className="btn btn-outline-danger">Close</button>
                        </div>
                    </div>
                </div>
            , document.body)}
        </div>
    );
};

export default ReportCustomer;
