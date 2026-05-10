import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getCustomerByid } from "@/api/customer";
import { getAllReportInvoices } from "@/api/report";
import { getInvoiceByid } from "@/api/invoice";
import { getAllCustomerEquipments } from "@/api/customerEquipment";
import { toast } from "react-toastify";
import Pagination from "../components/Pagination";
import { ArrowLeft, Eye, X } from "lucide-react";
import { CustomerType, InvoiceType } from "@/data_types/types";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const tz = "Asia/Phnom_Penh";

type Tab = "overview" | "purchases" | "equipment";

const CustomerView: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const customerId = Number(id);

    const [activeTab, setActiveTab] = useState<Tab>("overview");
    const [customer, setCustomer] = useState<CustomerType | null>(null);
    const [customerLoading, setCustomerLoading] = useState(true);

    const [invoices, setInvoices]       = useState<InvoiceType[]>([]);
    const [invoiceTotal, setInvoiceTotal] = useState(0);
    const [invPage, setInvPage]         = useState(1);
    const [invPageSize]                 = useState(10);
    const [invStart, setInvStart]       = useState("");
    const [invEnd, setInvEnd]           = useState("");
    const [invStatus, setInvStatus]     = useState("");
    const [invLoading, setInvLoading]   = useState(false);

    const [equipments, setEquipments]     = useState<any[]>([]);
    const [eqTotal, setEqTotal]           = useState(0);
    const [eqPage, setEqPage]             = useState(1);
    const [eqPageSize]                    = useState(10);
    const [eqLoading, setEqLoading]       = useState(false);

    const [selectedInvoice, setSelectedInvoice] = useState<InvoiceType | null>(null);
    const [invDetailLoading, setInvDetailLoading] = useState(false);

    const openInvoiceDetail = async (id: number) => {
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

    useEffect(() => {
        if (!customerId) return;
        setCustomerLoading(true);
        getCustomerByid(customerId)
            .then(setCustomer)
            .catch((e) => toast.error(e.message || "Failed to load customer"))
            .finally(() => setCustomerLoading(false));
    }, [customerId]);

    const fetchInvoices = useCallback(async () => {
        if (!customerId) return;
        setInvLoading(true);
        try {
            const res = await getAllReportInvoices({
                page: invPage,
                pageSize: invPageSize,
                customerId,
                startDate: invStart  || undefined,
                endDate:   invEnd    || undefined,
                status:    invStatus || undefined,
            });
            setInvoices(res.data || []);
            setInvoiceTotal(res.total || 0);
        } catch (e: any) {
            toast.error(e.message || "Failed to load invoices");
        } finally {
            setInvLoading(false);
        }
    }, [customerId, invPage, invPageSize, invStart, invEnd, invStatus]);

    const fetchEquipments = useCallback(async () => {
        if (!customerId) return;
        setEqLoading(true);
        try {
            const res = await getAllCustomerEquipments(eqPage, eqPageSize, "", "", 0, "", customerId);
            setEquipments(res.data || []);
            setEqTotal(res.total || 0);
        } catch (e: any) {
            toast.error(e.message || "Failed to load equipment");
        } finally {
            setEqLoading(false);
        }
    }, [customerId, eqPage, eqPageSize]);

    useEffect(() => {
        if (activeTab === "purchases") fetchInvoices();
    }, [activeTab, fetchInvoices]);

    useEffect(() => {
        if (activeTab === "equipment") fetchEquipments();
    }, [activeTab, fetchEquipments]);

    const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const statusBadge = (status: string) => {
        const map: Record<string, string> = {
            APPROVED:  "bg-success",
            COMPLETED: "bg-success",
            PENDING:   "bg-warning",
            CANCELLED: "bg-danger",
        };
        return map[status] || "bg-secondary";
    };

    const tabs: { key: Tab; label: string }[] = [
        { key: "overview",  label: "Overview" },
        { key: "purchases", label: "Purchase History" },
        { key: "equipment", label: "Equipment" },
    ];

    return (
        <>
        <div className="pt-0">
            <div className="space-y-6">
                <div className="panel">
                    <div className="flex items-center gap-3 mb-4">
                        <button
                            type="button"
                            className="btn btn-outline-secondary flex items-center gap-1"
                            onClick={() => navigate("/customer")}
                        >
                            <ArrowLeft size={14} /> Back
                        </button>
                        <h5 className="text-lg font-semibold dark:text-white-light">
                            {customerLoading ? "Loading..." : customer?.name || "Customer Profile"}
                        </h5>
                    </div>

                    <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
                        {tabs.map((tab) => (
                            <button
                                key={tab.key}
                                type="button"
                                className={`px-4 py-2 text-sm font-medium transition-colors ${
                                    activeTab === tab.key
                                        ? "border-b-2 border-primary text-primary"
                                        : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                }`}
                                onClick={() => setActiveTab(tab.key)}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {activeTab === "overview" && (
                        <div>
                            {customerLoading ? (
                                <p className="text-center py-6">Loading...</p>
                            ) : customer ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    {/* Contact card */}
                                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                                        <div className="bg-gray-50 dark:bg-[#121c2c] px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                                            <h6 className="text-sm font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wide">
                                                Contact Information
                                            </h6>
                                        </div>
                                        <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                            {[
                                                { label: "Name",    value: customer.name },
                                                { label: "Phone",   value: customer.phone },
                                                { label: "Email",   value: customer.email },
                                                { label: "Address", value: customer.address },
                                            ].map(({ label, value }) => (
                                                <div key={label} className="flex items-center px-4 py-3">
                                                    <span className="w-24 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide flex-shrink-0">
                                                        {label}
                                                    </span>
                                                    <span className="text-sm text-gray-800 dark:text-gray-200 font-medium">
                                                        {value || <span className="text-gray-300 dark:text-gray-600 italic">—</span>}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Audit card */}
                                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                                        <div className="bg-gray-50 dark:bg-[#121c2c] px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                                            <h6 className="text-sm font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wide">
                                                Audit Information
                                            </h6>
                                        </div>
                                        <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                            {[
                                                {
                                                    label: "Created At",
                                                    value: customer.createdAt ? dayjs.tz(customer.createdAt, tz).format("DD MMM YYYY, HH:mm") : null,
                                                },
                                                {
                                                    label: "Created By",
                                                    value: customer.creator ? `${customer.creator.lastName || ""} ${customer.creator.firstName || ""}`.trim() || null : null,
                                                },
                                                {
                                                    label: "Updated At",
                                                    value: customer.updatedAt ? dayjs.tz(customer.updatedAt, tz).format("DD MMM YYYY, HH:mm") : null,
                                                },
                                                {
                                                    label: "Updated By",
                                                    value: customer.updater ? `${customer.updater.lastName || ""} ${customer.updater.firstName || ""}`.trim() || null : null,
                                                },
                                            ].map(({ label, value }) => (
                                                <div key={label} className="flex items-center px-4 py-3">
                                                    <span className="w-28 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide flex-shrink-0">
                                                        {label}
                                                    </span>
                                                    <span className="text-sm text-gray-800 dark:text-gray-200">
                                                        {value || <span className="text-gray-300 dark:text-gray-600 italic">—</span>}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-center py-6 text-gray-500">Customer not found</p>
                            )}
                        </div>
                    )}

                    {activeTab === "purchases" && (
                        <div>
                            <div className="flex flex-wrap gap-3 items-end mb-4">
                                <div>
                                    <label className="block text-xs mb-1">Start Date</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={invStart}
                                        onChange={(e) => { setInvStart(e.target.value); setInvPage(1); }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs mb-1">End Date</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={invEnd}
                                        min={invStart || undefined}
                                        onChange={(e) => { setInvEnd(e.target.value); setInvPage(1); }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs mb-1">Status</label>
                                    <select className="form-select" value={invStatus} onChange={(e) => { setInvStatus(e.target.value); setInvPage(1); }}>
                                        <option value="">All Status</option>
                                        <option value="PENDING">Pending</option>
                                        <option value="APPROVED">Approved</option>
                                        <option value="COMPLETED">Completed</option>
                                    </select>
                                </div>
                            </div>

                            <div className="dataTable-container overflow-x-auto">
                                <table className="dataTable-table w-full whitespace-nowrap">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Date</th>
                                            <th>Invoice Ref</th>
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
                                        {invLoading ? (
                                            <tr><td colSpan={10} className="text-center py-6">Loading...</td></tr>
                                        ) : invoices.length === 0 ? (
                                            <tr><td colSpan={10} className="text-center py-6">No invoices found</td></tr>
                                        ) : invoices.map((inv: any, idx) => {
                                            const due = Number(inv.totalAmount || 0) - Number(inv.paidAmount || 0);
                                            return (
                                                <tr key={inv.id}>
                                                    <td>{(invPage - 1) * invPageSize + idx + 1}</td>
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
                                page={invPage}
                                pageSize={invPageSize}
                                total={invoiceTotal}
                                onPageChange={(p) => setInvPage(p)}
                                onPageSizeChange={() => {}}
                            />
                        </div>
                    )}

                    {activeTab === "equipment" && (
                        <div>
                            <div className="dataTable-container overflow-x-auto">
                                <table className="dataTable-table w-full whitespace-nowrap">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Ref</th>
                                            <th>Assign Type</th>
                                            <th>Status</th>
                                            <th>Assigned At</th>
                                            <th>Returned At</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {eqLoading ? (
                                            <tr><td colSpan={7} className="text-center py-6">Loading...</td></tr>
                                        ) : equipments.length === 0 ? (
                                            <tr><td colSpan={7} className="text-center py-6">No equipment records found</td></tr>
                                        ) : equipments.map((eq: any, idx) => (
                                            <tr key={eq.id}>
                                                <td>{(eqPage - 1) * eqPageSize + idx + 1}</td>
                                                <td className="font-mono text-sm">{eq.ref}</td>
                                                <td>
                                                    <span className={`badge rounded-full text-xs px-2 py-0.5 ${
                                                        eq.assignType === "SOLD" ? "bg-indigo-100 text-indigo-700"
                                                        : eq.assignType === "RENTED" ? "bg-amber-100 text-amber-700"
                                                        : "bg-emerald-100 text-emerald-700"
                                                    }`}>
                                                        {eq.assignType}
                                                    </span>
                                                </td>
                                                <td>
                                                    {eq.returnedAt ? (
                                                        <span className="badge badge-outline-success rounded-full">Returned</span>
                                                    ) : (
                                                        <span className="badge badge-outline-warning rounded-full">Active</span>
                                                    )}
                                                </td>
                                                <td>{eq.assignedAt ? dayjs(eq.assignedAt).format("DD/MM/YYYY") : "-"}</td>
                                                <td>{eq.returnedAt ? dayjs(eq.returnedAt).format("DD/MM/YYYY") : "-"}</td>
                                                <td>
                                                    <Link
                                                        to={`/customerequipment/${eq.id}`}
                                                        className="hover:text-primary"
                                                        title="View detail"
                                                    >
                                                        <span className="text-xs text-indigo-600 hover:underline">View</span>
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <Pagination
                                page={eqPage}
                                pageSize={eqPageSize}
                                total={eqTotal}
                                onPageChange={(p) => setEqPage(p)}
                                onPageSizeChange={() => {}}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Invoice Detail Modal — portalled to body to escape parent stacking context */}
        {(invDetailLoading || selectedInvoice) && createPortal(
            <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-4">
                <div className="bg-white dark:bg-[#0e1726] rounded-lg w-full max-w-4xl flex flex-col" style={{ maxHeight: "85vh" }}>
                    <div className="flex items-center justify-between px-5 py-3 bg-[#fbfbfb] dark:bg-[#121c2c] flex-shrink-0 rounded-t-lg">
                        <h5 className="font-bold text-lg">
                            {selectedInvoice ? `Invoice — ${selectedInvoice.ref}` : "Loading..."}
                        </h5>
                        <button type="button" onClick={() => setSelectedInvoice(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-600">
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
                                                    <td className="border px-3 py-2 font-medium">
                                                        {item.ItemType === "SERVICE"
                                                            ? item.services?.name || "-"
                                                            : item.products?.name || "-"}
                                                    </td>
                                                    <td className="border px-3 py-2 text-gray-500">
                                                        {item.ItemType === "PRODUCT" ? (item.productvariants?.productType || "-") : "-"}
                                                    </td>
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
                        <button type="button" onClick={() => setSelectedInvoice(null)} className="btn btn-outline-danger">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        , document.body)}
        </>
    );
};

export default CustomerView;
