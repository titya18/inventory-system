import React, { useEffect, useState } from "react";
import { NavLink, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Plus, Pencil, Trash2, RotateCcw, Eye, Search, MonitorSmartphone, SlidersHorizontal, X } from "lucide-react";
import dayjs from "dayjs";
import { useAppContext } from "@/hooks/useAppContext";
import { getAllCustomerEquipments, deleteCustomerEquipment, returnCustomerEquipment } from "@/api/customerEquipment";
import { CustomerEquipmentType } from "@/data_types/types";
import Pagination from "../components/Pagination";

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

const CustomerEquipment: React.FC = () => {
    const { user, hasPermission } = useAppContext();
    const [searchParams, setSearchParams] = useSearchParams();

    const search           = searchParams.get("search") || "";
    const page             = parseInt(searchParams.get("page") || "1", 10);
    const pageSize         = parseInt(searchParams.get("pageSize") || "10", 10);
    const statusFilter     = searchParams.get("status") || "";
    const assignTypeFilter = searchParams.get("assignType") || "";

    const [data, setData]           = useState<CustomerEquipmentType[]>([]);
    const [total, setTotal]         = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [returnModal, setReturnModal] = useState<{ id: number; ref: string } | null>(null);
    const [returnDate, setReturnDate]   = useState(dayjs().format("YYYY-MM-DD"));
    const [returnNote, setReturnNote]   = useState("");

    const updateParams = (params: Record<string, unknown>) => {
        const newParams = new URLSearchParams(searchParams.toString());
        Object.entries(params).forEach(([k, v]) => newParams.set(k, String(v)));
        setSearchParams(newParams);
    };

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const branchId = user?.roleType === "USER" ? (user.branchId ?? 0) : 0;
            const res = await getAllCustomerEquipments(page, pageSize, search, statusFilter, branchId, assignTypeFilter);
            setData(res.data || []);
            setTotal(res.total || 0);
        } catch {
            toast.error("Failed to load records");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [search, page, pageSize, statusFilter, assignTypeFilter]);

    const handleDelete = async (row: CustomerEquipmentType) => {
        if (!row.id) return;

        // Returned records are historical audit trails — block deletion entirely
        if (row.returnedAt) {
            toast.error(
                "Returned records cannot be deleted. They serve as permanent assignment history.",
                { autoClose: 5000 }
            );
            return;
        }

        // Active record — warn clearly before proceeding
        const confirmed = window.confirm(
            `Delete ${row.ref}?\n\n` +
            `WARNING: This will permanently erase the assignment history for this record. ` +
            `Stock and serials will be restored, but you will lose all record that this customer ` +
            `ever had this equipment.\n\n` +
            `Consider using "Mark as Returned" instead to preserve history.`
        );
        if (!confirmed) return;

        try {
            await deleteCustomerEquipment(row.id);
            toast.success("Deleted successfully");
            fetchData();
        } catch (e: any) {
            toast.error(e.message || "Delete failed");
        }
    };

    const handleReturn = async () => {
        if (!returnModal) return;
        try {
            await returnCustomerEquipment(returnModal.id, returnDate, returnNote || undefined);
            toast.success(`${returnModal.ref} marked as returned`);
            setReturnModal(null);
            setReturnNote("");
            fetchData();
        } catch (e: any) {
            toast.error(e.message || "Failed to mark as returned");
        }
    };

    const activeCount   = data.filter(r => !r.returnedAt).length;
    const returnedCount = data.filter(r =>  r.returnedAt).length;

    return (
        <div className="panel">

            {/* ── Header ── */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <MonitorSmartphone size={20} />
                    </div>
                    <div>
                        <h5 className="text-lg font-semibold dark:text-white-light">Customer Equipment</h5>
                        <p className="text-xs text-gray-500">{total} record{total !== 1 ? "s" : ""} found</p>
                    </div>
                </div>
                {hasPermission("Customer-Equipment-Create") && (
                    <NavLink to="/customerequipment/create" className="btn btn-primary gap-2">
                        <Plus size={16} />
                        Assign Equipment
                    </NavLink>
                )}
            </div>

            {/* ── Summary cards ── */}
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
                {[
                    { label: "Total",     value: total,         bg: "bg-gray-100 dark:bg-gray-800",    text: "text-gray-700 dark:text-gray-200" },
                    { label: "Active",    value: activeCount,   bg: "bg-amber-50  dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-300" },
                    { label: "Returned",  value: returnedCount, bg: "bg-green-50  dark:bg-green-900/30", text: "text-green-700 dark:text-green-300" },
                    { label: "Sold",      value: data.filter(r => r.assignType === "SOLD").length,      bg: "bg-indigo-50 dark:bg-indigo-900/30",  text: "text-indigo-700 dark:text-indigo-300" },
                    { label: "Rented",    value: data.filter(r => r.assignType === "RENTED").length,    bg: "bg-orange-50 dark:bg-orange-900/30",  text: "text-orange-700 dark:text-orange-300" },
                ].map((card) => (
                    <div key={card.label} className={`rounded-xl p-3 text-center ${card.bg}`}>
                        <p className={`text-xs font-medium ${card.text}`}>{card.label}</p>
                        <p className={`text-2xl font-bold ${card.text}`}>{card.value}</p>
                    </div>
                ))}
            </div>

            {/* ── Filters ── */}
            <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-[#e0e6ed] dark:border-[#1b2e4b] bg-[#f8f9fa] dark:bg-[#0e1726] px-4 py-2.5">
                {/* Label */}
                <div className="flex items-center gap-1.5 text-gray-400 shrink-0 mr-1">
                    <SlidersHorizontal size={14} />
                    <span className="text-xs font-semibold uppercase tracking-wide">Filter</span>
                </div>

                {/* Divider */}
                <div className="h-5 w-px bg-gray-200 dark:bg-gray-600 mr-1 shrink-0" />

                {/* Search */}
                <div className="flex items-stretch overflow-hidden rounded-lg border border-[#e0e6ed] dark:border-[#253a5e] bg-white dark:bg-[#1b2e4b]">
                    <div className="flex items-center justify-center px-2.5 bg-gray-50 dark:bg-[#253a5e] border-r border-[#e0e6ed] dark:border-[#253a5e]">
                        <Search size={14} className="text-primary" />
                    </div>
                    <input
                        type="text"
                        className="w-48 px-3 py-1.5 text-sm bg-transparent outline-none placeholder-gray-400 dark:text-white-dark"
                        placeholder="Search customer, serial..."
                        value={search}
                        onChange={(e) => updateParams({ search: e.target.value, page: 1 })}
                    />
                </div>

                {/* Status */}
                <div style={{ width: 140 }}>
                    <select
                        className="form-select !text-sm"
                        value={statusFilter}
                        onChange={(e) => updateParams({ status: e.target.value, page: 1 })}
                    >
                        <option value="">All Status</option>
                        <option value="ACTIVE">Active</option>
                        <option value="RETURNED">Returned</option>
                    </select>
                </div>

                {/* Assign type */}
                <div style={{ width: 140 }}>
                    <select
                        className="form-select !text-sm"
                        value={assignTypeFilter}
                        onChange={(e) => updateParams({ assignType: e.target.value, page: 1 })}
                    >
                        <option value="">All Types</option>
                        <option value="SOLD">Sold</option>
                        <option value="RENTED">Rented</option>
                        <option value="INSTALLED">Installed</option>
                    </select>
                </div>

                {/* Clear */}
                {(search || statusFilter || assignTypeFilter) && (
                    <button
                        type="button"
                        className="ml-1 flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-500 hover:bg-red-100 transition-colors"
                        onClick={() => updateParams({ search: "", status: "", assignType: "", page: 1 })}
                    >
                        <X size={11} />
                        Clear
                    </button>
                )}
            </div>

            {/* ── Table ── */}
            <div className="dataTable-container overflow-x-auto">
                <table className="dataTable-table w-full">
                    <thead>
                        <tr>
                            <th className="w-10">#</th>
                            <th>Ref</th>
                            <th>Customer</th>
                            <th>Equipment / Serials</th>
                            <th>Branch</th>
                            <th>Type</th>
                            <th>Assigned</th>
                            <th>Returned</th>
                            <th>Status</th>
                            <th className="text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan={10} className="py-12 text-center">
                                    <div className="flex flex-col items-center gap-2 text-gray-400">
                                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                        <span className="text-sm">Loading...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : data.length === 0 ? (
                            <tr>
                                <td colSpan={10} className="py-12 text-center">
                                    <div className="flex flex-col items-center gap-2 text-gray-400">
                                        <MonitorSmartphone size={32} className="opacity-30" />
                                        <span className="text-sm">No records found</span>
                                    </div>
                                </td>
                            </tr>
                        ) : data.map((row, idx) => {
                            const isReturned = !!row.returnedAt;
                            const items = row.items || [];

                            type GroupEntry = { label: string; serials: string[]; qty: number | null; unitName?: string };
                            const productMap: Record<string, GroupEntry> = {};
                            items.forEach((item) => {
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
                                <tr key={row.id} className={isReturned ? "opacity-60" : ""}>
                                    <td className="text-gray-400 text-sm">{(page - 1) * pageSize + idx + 1}</td>

                                    <td>
                                        <NavLink
                                            to={`/customerequipment/${row.id}`}
                                            className="font-mono text-sm font-semibold text-primary hover:underline"
                                        >
                                            {row.ref}
                                        </NavLink>
                                    </td>

                                    <td>
                                        <p className="font-medium text-sm">{row.customer?.name}</p>
                                        <p className="text-xs text-gray-400">{row.customer?.phone}</p>
                                    </td>

                                    <td style={{ minWidth: 210 }}>
                                        {Object.entries(productMap).map(([key, entry]) => (
                                            <div key={key} className="mb-1.5">
                                                <p className="text-xs font-medium text-gray-500 mb-0.5">{entry.label}</p>
                                                {entry.serials.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {entry.serials.map((sn) => (
                                                            <span
                                                                key={sn}
                                                                className="font-mono text-xs bg-primary/10 text-primary border border-primary/20 rounded px-1.5 py-0.5"
                                                            >
                                                                {sn}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-500">
                                                        Qty: <strong>{entry.qty}</strong> {entry.unitName || ""}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                        <p className="text-xs text-gray-300 mt-1">{items.length} item{items.length !== 1 ? "s" : ""}</p>
                                    </td>

                                    <td className="text-sm whitespace-nowrap">{row.branch?.name}</td>

                                    <td className="whitespace-nowrap">
                                        <span
                                            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                                            style={{ backgroundColor: ASSIGN_TYPE_COLORS[row.assignType] || "#888" }}
                                        >
                                            {ASSIGN_TYPE_LABELS[row.assignType] || row.assignType}
                                        </span>
                                    </td>

                                    <td className="text-sm whitespace-nowrap text-gray-600">
                                        {row.assignedAt ? dayjs(row.assignedAt).format("DD/MM/YYYY") : "—"}
                                    </td>

                                    <td className="text-sm whitespace-nowrap text-gray-600">
                                        {row.returnedAt ? dayjs(row.returnedAt).format("DD/MM/YYYY") : "—"}
                                    </td>

                                    <td className="whitespace-nowrap">
                                        {isReturned ? (
                                            <span className="inline-flex items-center gap-1 rounded-full border border-green-400 px-2.5 py-0.5 text-xs font-medium text-green-600">
                                                Returned
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-400 px-2.5 py-0.5 text-xs font-medium text-amber-600">
                                                Active
                                            </span>
                                        )}
                                    </td>

                                    <td>
                                        <div className="flex items-center justify-center gap-3">
                                            <NavLink
                                                to={`/customerequipment/${row.id}`}
                                                title="View Details"
                                                className="hover:text-primary"
                                            >
                                                <Eye color="#4361ee" size={18} />
                                            </NavLink>

                                            {!isReturned && hasPermission("Customer-Equipment-Edit") && (
                                                <NavLink
                                                    to={`/customerequipment/${row.id}/edit`}
                                                    title="Edit"
                                                    className="hover:text-warning"
                                                >
                                                    <Pencil color="green" size={18} />
                                                </NavLink>
                                            )}

                                            {!isReturned && hasPermission("Customer-Equipment-Return") && (
                                                <button
                                                    type="button"
                                                    title="Mark as Returned"
                                                    className="hover:text-warning"
                                                    onClick={() => {
                                                        setReturnDate(dayjs().format("YYYY-MM-DD"));
                                                        setReturnNote("");
                                                        setReturnModal({ id: row.id!, ref: row.ref! });
                                                    }}
                                                >
                                                    <RotateCcw color="orange" size={18} />
                                                </button>
                                            )}

                                            {!isReturned && hasPermission("Customer-Equipment-Delete") && (
                                                <button
                                                    type="button"
                                                    title="Delete"
                                                    className="hover:text-danger"
                                                    onClick={() => handleDelete(row)}
                                                >
                                                    <Trash2 color="red" size={18} />
                                                </button>
                                            )}
                                        </div>
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

            {/* ── Return Modal ── */}
            {returnModal && (
                <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#1c2e4a] rounded-xl w-full max-w-sm shadow-2xl">
                        {/* Modal header */}
                        <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-700 px-6 py-4">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                                <RotateCcw size={18} />
                            </div>
                            <div>
                                <h5 className="font-semibold text-base">Mark as Returned</h5>
                                <p className="text-xs text-gray-400">
                                    <span className="font-mono font-bold text-gray-600">{returnModal.ref}</span>
                                </p>
                            </div>
                        </div>

                        {/* Modal body */}
                        <div className="px-6 py-5 space-y-4">
                            <p className="text-sm text-gray-500">
                                All serials in this record will be set back to <strong>In Stock</strong> and stock will be restored.
                            </p>
                            <div>
                                <label className="block mb-1.5 text-sm font-medium">Return Date</label>
                                <input
                                    type="date"
                                    className="form-input w-full"
                                    value={returnDate}
                                    onChange={(e) => setReturnDate(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block mb-1.5 text-sm font-medium">
                                    Note <span className="text-gray-400 font-normal">(optional)</span>
                                </label>
                                <textarea
                                    className="form-input w-full"
                                    rows={2}
                                    placeholder="Reason for return, condition, etc."
                                    value={returnNote}
                                    onChange={(e) => setReturnNote(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Modal footer */}
                        <div className="flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700 px-6 py-4">
                            <button className="btn btn-outline-danger" onClick={() => setReturnModal(null)}>
                                Cancel
                            </button>
                            <button className="btn btn-primary" onClick={handleReturn}>
                                Confirm Return
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerEquipment;
