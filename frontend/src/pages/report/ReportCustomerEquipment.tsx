import React, { useState, useEffect, useCallback } from "react";
import { getCustomerEquipmentReport } from "@/api/report";
import { getAllBranches } from "@/api/branch";
import { useNavigate, useSearchParams } from "react-router-dom";
import Pagination from "../components/Pagination";
import { toast } from "react-toastify";
import { useAppContext } from "@/hooks/useAppContext";
import { BranchType } from "@/data_types/types";
import ExportDropdown from "@/components/ExportDropdown";
import { RefreshCw, NotebookText } from "lucide-react";
import dayjs from "dayjs";

const ASSIGN_TYPE_LABELS: Record<string, string> = {
    SOLD: "Sold",
    RENTED: "Rented",
    INSTALLED: "Installed",
};

const ASSIGN_TYPE_COLORS: Record<string, string> = {
    SOLD: "#6366f1",
    RENTED: "#f59e0b",
    INSTALLED: "#10b981",
};

const ReportCustomerEquipment: React.FC = () => {
    const { user } = useAppContext();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const startDate = searchParams.get("startDate") || "";
    const endDate   = searchParams.get("endDate")   || "";
    const status     = searchParams.get("status")     || "";
    const assignType = searchParams.get("assignType") || "";
    const branchId   = searchParams.get("branchId") ? Number(searchParams.get("branchId")) : undefined;
    const search     = searchParams.get("search")     || "";
    const page       = parseInt(searchParams.get("page")     || "1",  10);
    const pageSize   = parseInt(searchParams.get("pageSize") || "10", 10);

    const [data, setData]         = useState<any[]>([]);
    const [total, setTotal]       = useState(0);
    const [summary, setSummary]   = useState<{ total: number; active: number; returned: number; byType: Record<string, number> }>({ total: 0, active: 0, returned: 0, byType: { SOLD: 0, RENTED: 0, INSTALLED: 0 } });
    const [branches, setBranches] = useState<BranchType[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const [noteModal, setNoteModal] = useState<string | null>(null);

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
            const res = await getCustomerEquipmentReport({
                page, pageSize,
                searchTerm: search || undefined,
                startDate:  startDate || undefined,
                endDate:    endDate   || undefined,
                status:     status    || undefined,
                assignType: assignType|| undefined,
                branchId,
            });
            setData(res.data || []);
            setTotal(res.total || 0);
            setSummary(res.summary || { total: 0, active: 0, returned: 0, byType: { SOLD: 0, RENTED: 0, INSTALLED: 0 } });
        } catch (e: any) {
            toast.error(e.message || "Failed to load report");
        } finally {
            setIsLoading(false);
        }
    }, [page, pageSize, search, startDate, endDate, status, assignType, branchId]);

    useEffect(() => { fetchBranches(); }, [fetchBranches]);
    useEffect(() => { fetchData(); },    [fetchData]);

    // Build export data
    const exportData = data.map((row, idx) => {
        const items = row.items || [];
        const serials = items
            .filter((i: any) => i.productAssetItem)
            .map((i: any) => i.productAssetItem.serialNumber)
            .join(", ");
        const nonTracked = items
            .filter((i: any) => !i.productAssetItem && i.productVariant)
            .map((i: any) => `${i.productVariant.products?.name} x${i.quantity} ${i.unit?.name || ""}`.trim())
            .join(", ");
        return {
            "No":            (page - 1) * pageSize + idx + 1,
            "Ref":           row.ref,
            "Customer":      row.customer?.name || "",
            "Phone":         row.customer?.phone || "",
            "Branch":        row.branch?.name || "",
            "Type":          ASSIGN_TYPE_LABELS[row.assignType] || row.assignType,
            "Assigned Date": row.assignedAt ? dayjs(row.assignedAt).format("DD/MM/YYYY") : "",
            "Return Date":   row.returnedAt ? dayjs(row.returnedAt).format("DD/MM/YYYY") : "",
            "Status":        row.returnedAt ? "Returned" : "Active",
            "Serials":       serials,
            "Non-Tracked Items": nonTracked,
            "Order Ref":     row.order?.ref || "",
            "Note":          row.note || "",
        };
    });

    return (
        <div className="pt-0">
            <div className="space-y-6">
                <div className="panel">
                    <h5 className="text-lg font-semibold dark:text-white-light mb-4">Customer Equipment Report</h5>

                    {/* Summary cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
                        {[
                            { label: "Total",     value: summary.total,            color: "bg-gray-100 text-gray-700" },
                            { label: "Active",    value: summary.active,           color: "bg-yellow-50 text-yellow-700" },
                            { label: "Returned",  value: summary.returned,         color: "bg-green-50 text-green-700" },
                            { label: "Sold",      value: summary.byType.SOLD,      color: "bg-indigo-50 text-indigo-700" },
                            { label: "Rented",    value: summary.byType.RENTED,    color: "bg-amber-50 text-amber-700" },
                            { label: "Installed", value: summary.byType.INSTALLED, color: "bg-emerald-50 text-emerald-700" },
                        ].map((card) => (
                            <div key={card.label} className={`rounded-lg p-3 text-center ${card.color}`}>
                                <p className="text-xs font-medium">{card.label}</p>
                                <p className="text-2xl font-bold">{card.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Filters */}
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
                        <div>
                            <label className="block text-xs mb-1">Status</label>
                            <select className="form-select" value={status} onChange={(e) => updateParams({ status: e.target.value, page: 1 })}>
                                <option value="">All Status</option>
                                <option value="ACTIVE">Active</option>
                                <option value="RETURNED">Returned</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs mb-1">Assign Type</label>
                            <select className="form-select" value={assignType} onChange={(e) => updateParams({ assignType: e.target.value, page: 1 })}>
                                <option value="">All Types</option>
                                <option value="SOLD">Sold</option>
                                <option value="RENTED">Rented</option>
                                <option value="INSTALLED">Installed</option>
                            </select>
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
                                placeholder="Customer, serial, ref..."
                                value={search}
                                onChange={(e) => updateParams({ search: e.target.value, page: 1 })}
                            />
                        </div>
                        <button className="btn btn-outline-primary flex items-center gap-1" onClick={() => navigate("/reportCustomerEquipment")}>
                            <RefreshCw size={14} /> Clear
                        </button>
                        <ExportDropdown data={exportData} prefix="Customer_Equipment_Report" />
                    </div>

                    {/* Table */}
                    <div className="dataTable-container overflow-x-auto">
                        <table className="dataTable-table w-full whitespace-nowrap">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Ref</th>
                                    <th>Customer</th>
                                    <th>Branch</th>
                                    <th>Type</th>
                                    <th>Equipment / Serials</th>
                                    <th>Assigned Date</th>
                                    <th>Return Date</th>
                                    <th>Status</th>
                                    <th>Order</th>
                                    <th>Note</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr><td colSpan={11} className="text-center py-6">Loading...</td></tr>
                                ) : data.length === 0 ? (
                                    <tr><td colSpan={11} className="text-center py-6">No records found</td></tr>
                                ) : data.map((row, idx) => {
                                    const isReturned = !!row.returnedAt;
                                    const items = row.items || [];

                                    type GroupEntry = { label: string; serials: string[]; qty: number | null; unitName?: string };
                                    const productMap: Record<string, GroupEntry> = {};
                                    items.forEach((item: any) => {
                                        if (item.productAssetItem) {
                                            const pv = item.productAssetItem.productVariant;
                                            const key = `t_${pv?.id ?? "?"}`;
                                            if (!productMap[key]) productMap[key] = { label: pv ? `${pv.products?.name} (${pv.productType})` : "Unknown", serials: [], qty: null };
                                            productMap[key].serials.push(item.productAssetItem.serialNumber || "—");
                                        } else if (item.productVariant) {
                                            const pv = item.productVariant;
                                            const key = `n_${pv.id}`;
                                            if (!productMap[key]) productMap[key] = { label: `${pv.products?.name} (${pv.productType})`, serials: [], qty: 0, unitName: item.unit?.name };
                                            productMap[key].qty = (productMap[key].qty ?? 0) + (item.quantity ?? 0);
                                        }
                                    });

                                    return (
                                        <tr key={row.id}>
                                            <td>{(page - 1) * pageSize + idx + 1}</td>
                                            <td className="font-mono text-sm">{row.ref}</td>
                                            <td>
                                                <p className="font-medium">{row.customer?.name}</p>
                                                <p className="text-xs text-gray-500">{row.customer?.phone}</p>
                                            </td>
                                            <td>{row.branch?.name}</td>
                                            <td>
                                                <span
                                                    className="badge rounded-full text-white text-xs px-2 py-1"
                                                    style={{ backgroundColor: ASSIGN_TYPE_COLORS[row.assignType] || "#888" }}
                                                >
                                                    {ASSIGN_TYPE_LABELS[row.assignType] || row.assignType}
                                                </span>
                                            </td>
                                            <td style={{ minWidth: 180 }}>
                                                {Object.entries(productMap).map(([key, entry]) => (
                                                    <div key={key} className="mb-1">
                                                        <p className="text-xs font-medium text-gray-600">{entry.label}</p>
                                                        {entry.serials.length > 0 ? (
                                                            <div className="flex flex-wrap gap-1 mt-0.5">
                                                                {entry.serials.map((sn) => (
                                                                    <span key={sn} className="font-mono text-xs bg-blue-50 text-blue-700 border border-blue-100 rounded px-1.5 py-0.5">
                                                                        {sn}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-gray-500">Qty: {entry.qty} {entry.unitName || ""}</span>
                                                        )}
                                                    </div>
                                                ))}
                                            </td>
                                            <td>{row.assignedAt ? dayjs(row.assignedAt).format("DD/MM/YYYY") : "-"}</td>
                                            <td>{row.returnedAt ? dayjs(row.returnedAt).format("DD/MM/YYYY") : "-"}</td>
                                            <td>
                                                {isReturned ? (
                                                    <span className="badge badge-outline-success rounded-full">Returned</span>
                                                ) : (
                                                    <span className="badge badge-outline-warning rounded-full">Active</span>
                                                )}
                                            </td>
                                            <td className="font-mono text-xs">{row.order?.ref || "-"}</td>
                                            <td>
                                                {row.note ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => setNoteModal(row.note)}
                                                        title="View note"
                                                    >
                                                        <NotebookText size={16} color="pink" />
                                                    </button>
                                                ) : "-"}
                                            </td>
                                        </tr>
                                    );
                                })}
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

            {/* Note modal */}
            {noteModal !== null && (
                <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center">
                    <div className="bg-white dark:bg-[#1c2e4a] rounded-lg p-6 w-full max-w-sm shadow-xl">
                        <h5 className="font-semibold text-lg mb-3 flex items-center gap-2">
                            <NotebookText size={18} color="pink" /> Note
                        </h5>
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap mb-4">{noteModal}</p>
                        <div className="flex justify-end">
                            <button className="btn btn-outline-danger" onClick={() => setNoteModal(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReportCustomerEquipment;
