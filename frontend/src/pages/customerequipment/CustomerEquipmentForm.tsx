import React, { useCallback, useEffect, useState } from "react";
import { NavLink, useNavigate, useParams, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faSave } from "@fortawesome/free-solid-svg-icons";
import { FilePenLine, Plus, Trash2, ChevronDown, ChevronUp, History, X, MonitorSmartphone } from "lucide-react";
import dayjs from "dayjs";
import { useAppContext } from "@/hooks/useAppContext";
import {
    getCustomerEquipmentById,
    createCustomerEquipment,
    updateCustomerEquipment,
    getAvailableAssetItems,
    getVariantUnits,
    searchOrders,
    getSerialHistory,
} from "@/api/customerEquipment";

type CEQItemPayload =
    | { type: "TRACKED";     productAssetItemId: number }
    | { type: "NON_TRACKED"; productVariantId: number; quantity: number; unitId?: number | null };
import { getAllBranches } from "@/api/branch";
import { getAllCustomers } from "@/api/customer";
import { searchProduct } from "@/api/searchProduct";
import { BranchType, CustomerType, AssignType } from "@/data_types/types";

type AssetItem = {
    id: number;
    serialNumber: string;
    assetCode?: string | null;
    macAddress?: string | null;
    status: string;
    orderItemLinks?: Array<{
        orderItem?: { order?: { id: number; ref: string; customer?: { name: string } | null } | null } | null;
    }>;
};

type ProductResult = {
    id: number;
    name?: string;
    sku?: string;
    barcode?: string;
    productType?: string;
    trackingType?: string | null;
    products?: { id: number; name: string } | null;
};

type UnitOption = { id: number; name: string };

type EquipmentLine = {
    key: string;
    // product search
    variantId: number | null;
    trackingType: string | null;   // null | "NONE" | "ASSET_ONLY" | etc.
    productLabel: string;
    searchTerm: string;
    searchResults: ProductResult[];
    showSuggestions: boolean;
    // tracked
    availableItems: AssetItem[];
    selectedIds: number[];
    selectedItems: AssetItem[];
    showSerialPanel: boolean;
    // non-tracked
    quantity: number;
    availableUnits: UnitOption[];
    selectedUnitId: number | null;
};

const ASSIGN_TYPES: { value: AssignType; label: string; color: string }[] = [
    { value: "SOLD",      label: "Sold",      color: "#6366f1" },
    { value: "RENTED",    label: "Rented",    color: "#f59e0b" },
    { value: "INSTALLED", label: "Installed", color: "#10b981" },
];

let lineKeyCounter = 0;
const newLine = (): EquipmentLine => ({
    key:             String(++lineKeyCounter),
    variantId:       null,
    trackingType:    null,
    productLabel:    "",
    searchTerm:      "",
    searchResults:   [],
    showSuggestions: false,
    availableItems:  [],
    selectedIds:     [],
    selectedItems:   [],
    showSerialPanel: false,
    quantity:        1,
    availableUnits:  [],
    selectedUnitId:  null,
});

const isTracked = (trackingType: string | null) =>
    !!trackingType && trackingType !== "NONE";

const CustomerEquipmentForm: React.FC = () => {
    const { id }      = useParams<{ id: string }>();
    const location    = useLocation();
    const navigate    = useNavigate();
    const { user }    = useAppContext();

    // Route semantics:
    //   /customerequipment/create      → CREATE
    //   /customerequipment/:id         → VIEW (read-only)
    //   /customerequipment/:id/edit    → EDIT
    const isEdit = location.pathname.endsWith("/edit");
    const isView = !!id && !isEdit;

    const [isLoading, setIsLoading] = useState(false);
    const [branches, setBranches]   = useState<BranchType[]>([]);
    const [customers, setCustomers] = useState<CustomerType[]>([]);

    // Header fields
    const [customerId, setCustomerId] = useState<number | "">("");
    const [branchId, setBranchId]     = useState<number | "">(user?.branchId ?? "");
    const [assignType, setAssignType] = useState<AssignType>("INSTALLED");
    const [assignedAt, setAssignedAt] = useState(dayjs().format("YYYY-MM-DD"));
    const [orderId, setOrderId]         = useState<number | "">("");
    const [orderRef, setOrderRef]       = useState("");
    const [orderSearch, setOrderSearch] = useState("");
    const [orderResults, setOrderResults] = useState<{ id: number; ref: string; customer?: { name: string } | null }[]>([]);
    const [showOrderSuggestions, setShowOrderSuggestions] = useState(false);
    const [note, setNote]               = useState("");

    // Equipment lines (create mode only)
    const [lines, setLines] = useState<EquipmentLine[]>([newLine()]);

    // Serial history modal
    const [serialHistory, setSerialHistory] = useState<{ serialNumber: string; records: any[] } | null>(null);
    const [historyLoading, setHistoryLoading] = useState(false);

    const openSerialHistory = async (item: AssetItem) => {
        setHistoryLoading(true);
        setSerialHistory({ serialNumber: item.serialNumber, records: [] });
        try {
            const records = await getSerialHistory(item.id);
            setSerialHistory({ serialNumber: item.serialNumber, records });
        } catch {
            toast.error("Failed to load serial history");
            setSerialHistory(null);
        } finally {
            setHistoryLoading(false);
        }
    };

    // View / edit mode data
    const [viewData, setViewData] = useState<any>(null);

    const fetchInitial = useCallback(async () => {
        try {
            const [branchData, customerData] = await Promise.all([
                getAllBranches(),
                getAllCustomers(),
            ]);
            setBranches(branchData as BranchType[]);
            setCustomers(customerData as CustomerType[]);
        } catch {
            toast.error("Failed to load form data");
        }
    }, []);

    const fetchRecord = useCallback(async () => {
        if (!id) return;
        setIsLoading(true);
        try {
            const record = await getCustomerEquipmentById(parseInt(id, 10));
            setViewData(record);

            if (isEdit) {
                // Pre-fill header fields
                setCustomerId(record.customerId ?? "");
                setBranchId(record.branchId ?? "");
                setAssignType(record.assignType ?? "INSTALLED");
                setAssignedAt(dayjs(record.assignedAt).format("YYYY-MM-DD"));
                setNote(record.note ?? "");
                if (record.order) {
                    setOrderId(record.order.id);
                    setOrderRef(record.order.ref);
                    setOrderSearch(record.order.ref);
                }

                // Pre-fill equipment lines from existing items
                // Group tracked items by variant so multiple serials share one line
                const trackedMap: Record<number, { variant: any; items: AssetItem[] }> = {};
                const nonTrackedLines: EquipmentLine[] = [];

                for (const item of record.items || []) {
                    if (item.productAssetItem) {
                        const pv = item.productAssetItem.productVariant;
                        if (!pv) continue;
                        if (!trackedMap[pv.id]) trackedMap[pv.id] = { variant: pv, items: [] };
                        trackedMap[pv.id].items.push(item.productAssetItem as AssetItem);
                    } else if (item.productVariant) {
                        const pv = item.productVariant;
                        const label = `${pv.products?.name} (${pv.productType}) — ${pv.barcode}`;
                        // Fetch units for this non-tracked variant
                        let units: UnitOption[] = [];
                        try { units = await getVariantUnits(pv.id); } catch { /* ok */ }
                        nonTrackedLines.push({
                            ...newLine(),
                            variantId:      pv.id,
                            trackingType:   "NONE",
                            productLabel:   label,
                            searchTerm:     label,
                            quantity:       item.quantity ?? 1,
                            availableUnits: units,
                            selectedUnitId: item.unitId ?? (units[0]?.id ?? null),
                        });
                    }
                }

                // Build tracked lines (one per variant), fetch available serials
                const trackedLines: EquipmentLine[] = await Promise.all(
                    Object.values(trackedMap).map(async ({ variant, items: existingItems }) => {
                        const label = `${variant.products?.name} (${variant.productType}) — ${variant.barcode}`;
                        let available: AssetItem[] = [];
                        try { available = await getAvailableAssetItems(variant.id, record.branchId); } catch { /* ok */ }
                        // Include any existing items not in available list (edge case)
                        const availIds = new Set(available.map((a: AssetItem) => a.id));
                        for (const ei of existingItems) {
                            if (!availIds.has(ei.id)) available.push(ei);
                        }
                        return {
                            ...newLine(),
                            variantId:       variant.id,
                            trackingType:    variant.trackingType ?? "ASSET_ONLY",
                            productLabel:    label,
                            searchTerm:      label,
                            availableItems:  available,
                            selectedIds:     existingItems.map((i: AssetItem) => i.id),
                            selectedItems:   existingItems,
                            showSerialPanel: false,
                        };
                    })
                );

                const allLines = [...trackedLines, ...nonTrackedLines];
                setLines(allLines.length > 0 ? allLines : [newLine()]);
            }
        } catch {
            toast.error("Failed to load record");
        } finally {
            setIsLoading(false);
        }
    }, [id, isEdit]);

    useEffect(() => { fetchInitial(); fetchRecord(); }, [fetchInitial, fetchRecord]);

    // ── Line helpers ─────────────────────────────────────────────────────────

    const updateLine = (key: string, patch: Partial<EquipmentLine>) =>
        setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));

    const handleProductSearch = async (key: string, term: string) => {
        updateLine(key, { searchTerm: term, productLabel: term });
        if (!term.trim() || !branchId) {
            updateLine(key, { searchResults: [], showSuggestions: false });
            return;
        }
        try {
            // Show ALL products (tracked + non-tracked)
            const results = await searchProduct(term, Number(branchId));
            updateLine(key, { searchResults: results as ProductResult[], showSuggestions: true });
        } catch {
            updateLine(key, { searchResults: [] });
        }
    };

    const selectVariant = async (key: string, variant: ProductResult) => {
        const label = `${variant.products?.name || variant.name} (${variant.productType}) — ${variant.barcode}`;
        const tracked = isTracked(variant.trackingType ?? null);

        updateLine(key, {
            variantId:       variant.id,
            trackingType:    variant.trackingType ?? null,
            productLabel:    label,
            searchTerm:      label,
            showSuggestions: false,
            searchResults:   [],
            selectedIds:     [],
            selectedItems:   [],
            availableItems:  [],
            showSerialPanel: false,
            quantity:        1,
            availableUnits:  [],
            selectedUnitId:  null,
        });

        if (tracked && branchId) {
            try {
                const items = await getAvailableAssetItems(variant.id, Number(branchId));
                updateLine(key, { availableItems: items, showSerialPanel: true });
            } catch {
                updateLine(key, { availableItems: [] });
            }
        } else if (!tracked) {
            // Fetch available units for non-tracked product
            try {
                const units = await getVariantUnits(variant.id);
                updateLine(key, {
                    availableUnits: units,
                    selectedUnitId: units.length > 0 ? units[0].id : null,
                });
            } catch {
                updateLine(key, { availableUnits: [], selectedUnitId: null });
            }
        }
    };

    const toggleSerial = (key: string, item: AssetItem) => {
        setLines((prev) => {
            // Blocked at UI level; guard here too
            const usedOnOtherLine = prev.some((l) => l.key !== key && l.selectedIds.includes(item.id));
            if (usedOnOtherLine) return prev;
            return prev.map((l) => {
                if (l.key !== key) return l;
                const already = l.selectedIds.includes(item.id);
                return {
                    ...l,
                    selectedIds:   already ? l.selectedIds.filter((i) => i !== item.id) : [...l.selectedIds, item.id],
                    selectedItems: already ? l.selectedItems.filter((i) => i.id !== item.id) : [...l.selectedItems, item],
                };
            });
        });
    };

    // Returns true if a serial is selected on any line OTHER than the given key
    const isSerialUsedElsewhere = (key: string, itemId: number) =>
        lines.some((l) => l.key !== key && l.selectedIds.includes(itemId));

    const removeLine = (key: string) =>
        setLines((prev) => prev.length === 1 ? prev : prev.filter((l) => l.key !== key));

    const handleBranchChange = (val: number | "") => {
        setBranchId(val);
        setLines([newLine()]);
        // Clear order selection when branch changes
        setOrderId(""); setOrderRef(""); setOrderSearch(""); setOrderResults([]);
    };

    const handleOrderSearch = async (term: string) => {
        setOrderSearch(term);
        setOrderRef("");
        setOrderId("");
        if (!term.trim() || !branchId) { setOrderResults([]); setShowOrderSuggestions(false); return; }
        try {
            const results = await searchOrders(Number(branchId), term);
            setOrderResults(results);
            setShowOrderSuggestions(true);
        } catch {
            setOrderResults([]);
        }
    };

    const selectOrder = (order: { id: number; ref: string; customer?: { name: string } | null }) => {
        setOrderId(order.id);
        setOrderRef(order.ref);
        setOrderSearch(order.ref);
        setShowOrderSuggestions(false);
    };

    const clearOrder = () => {
        setOrderId(""); setOrderRef(""); setOrderSearch(""); setOrderResults([]);
    };

    // ── Build & validate payload ──────────────────────────────────────────────

    const buildPayload = (): CEQItemPayload[] | null => {
        const payload: CEQItemPayload[] = [];
        const seenAssetIds = new Set<number>();

        for (const line of lines) {
            if (!line.variantId) continue;
            if (isTracked(line.trackingType)) {
                if (line.selectedIds.length === 0) {
                    toast.error(`Please select at least one serial for "${line.productLabel}"`);
                    return null;
                }
                for (const aid of line.selectedIds) {
                    if (seenAssetIds.has(aid)) {
                        // Find the serial number for the error message
                        const serial = line.selectedItems.find((i) => i.id === aid)?.serialNumber ?? String(aid);
                        toast.error(`Serial "${serial}" is selected more than once. Each serial can only be assigned once.`);
                        return null;
                    }
                    seenAssetIds.add(aid);
                    payload.push({ type: "TRACKED", productAssetItemId: aid });
                }
            } else {
                if (line.quantity < 1) {
                    toast.error(`Quantity must be at least 1 for "${line.productLabel}"`);
                    return null;
                }
                payload.push({ type: "NON_TRACKED", productVariantId: line.variantId, quantity: line.quantity, unitId: line.selectedUnitId });
            }
        }

        if (payload.length === 0) {
            toast.error("Please add at least one product");
            return null;
        }
        return payload;
    };

    // ── Submit ────────────────────────────────────────────────────────────────

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!customerId) { toast.error("Please select a customer"); return; }

        setIsLoading(true);
        try {
            if (isEdit && id) {
                const payload = buildPayload();
                if (!payload) { setIsLoading(false); return; }

                await updateCustomerEquipment(parseInt(id, 10), {
                    customerId: Number(customerId),
                    assignType,
                    assignedAt,
                    orderId:    orderId ? Number(orderId) : null,
                    note:       note || undefined,
                    items:      payload,
                });
                toast.success("Updated successfully", { position: "top-right", autoClose: 2000 });
                navigate(`/customerequipment/${id}`);
            } else {
                // CREATE: require branch + items
                if (!branchId) { toast.error("Please select a branch"); setIsLoading(false); return; }

                const payload = buildPayload();
                if (!payload) { setIsLoading(false); return; }

                await createCustomerEquipment({
                    customerId: Number(customerId),
                    branchId:   Number(branchId),
                    assignType,
                    assignedAt,
                    items:      payload,
                    orderId:    orderId ? Number(orderId) : null,
                    note:       note || undefined,
                });
                toast.success("Equipment assigned successfully", { position: "top-right", autoClose: 2000 });
                navigate("/customerequipment");
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to save", { position: "top-right", autoClose: 3000 });
        } finally {
            setIsLoading(false);
        }
    };

    // ── VIEW MODE ─────────────────────────────────────────────────────────────
    if (isView) {
        if (isLoading || !viewData) {
            return (
                <div className="panel">
                    <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
                        <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        <span className="text-sm">Loading...</span>
                    </div>
                </div>
            );
        }
        const d = viewData;
        const returned = !!d.returnedAt;

        // Group by product for display
        const grouped: Record<string, { label: string; tracked: boolean; rows: any[] }> = {};
        (d.items || []).forEach((item: any) => {
            const pv = item.productAssetItem?.productVariant || item.productVariant;
            const key = String(pv?.id ?? "unknown");
            if (!grouped[key]) {
                grouped[key] = {
                    label:   pv ? `${pv.products?.name} (${pv.productType}) — ${pv.barcode}` : "Unknown",
                    tracked: !!item.productAssetItem,
                    rows:    [],
                };
            }
            grouped[key].rows.push(item);
        });

        return (
            <div className="panel">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <MonitorSmartphone size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h5 className="text-lg font-semibold dark:text-white-light">Equipment Assignment</h5>
                                <span className="font-mono text-sm text-gray-400">— {d.ref}</span>
                                <span
                                    className="badge rounded-full text-white text-xs px-2.5 py-0.5"
                                    style={{ backgroundColor: returned ? "#22c55e" : "#f59e0b" }}
                                >
                                    {returned ? "Returned" : "Active"}
                                </span>
                            </div>
                            <p className="text-xs text-gray-500">
                                Created by {d.creator?.lastName} {d.creator?.firstName} · {dayjs(d.createdAt).format("DD/MM/YYYY HH:mm")}
                            </p>
                        </div>
                    </div>
                    <NavLink to="/customerequipment" className="btn btn-outline-warning btn-sm">
                        <FontAwesomeIcon icon={faArrowLeft} className="mr-1" />
                        Go Back
                    </NavLink>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
                    <div className="space-y-3">
                        <div><label className="text-xs text-gray-400 uppercase">Customer</label>
                            <p className="font-medium">{d.customer?.name}</p>
                            <p className="text-sm text-gray-500">{d.customer?.phone}</p>
                        </div>
                        <div><label className="text-xs text-gray-400 uppercase">Branch</label>
                            <p>{d.branch?.name}</p>
                        </div>
                        <div><label className="text-xs text-gray-400 uppercase">Assignment Type</label>
                            <p>{ASSIGN_TYPES.find((a) => a.value === d.assignType)?.label || d.assignType}</p>
                        </div>
                        <div><label className="text-xs text-gray-400 uppercase">Invoice / Order</label>
                            <p>{d.order?.ref || "—"}</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div><label className="text-xs text-gray-400 uppercase">Assigned Date</label>
                            <p>{dayjs(d.assignedAt).format("DD / MMM / YYYY")}</p>
                        </div>
                        {d.returnedAt && (
                            <div><label className="text-xs text-gray-400 uppercase">Returned Date</label>
                                <p className="text-green-600">{dayjs(d.returnedAt).format("DD / MMM / YYYY")}</p>
                            </div>
                        )}
                        <div><label className="text-xs text-gray-400 uppercase">Total Items</label>
                            <p className="font-bold text-blue-600">{(d.items || []).length} line(s)</p>
                        </div>
                    </div>
                </div>

                <div className="mb-6">
                    <label className="text-xs text-gray-400 uppercase mb-2 block">Equipment Details</label>
                    {Object.values(grouped).map((group, gi) => (
                        <div key={gi} className="mb-3 border rounded-lg overflow-hidden">
                            <div className="bg-gray-50 dark:bg-[#1c2e4a] px-4 py-2 text-sm font-medium flex items-center gap-2">
                                {group.label}
                                {group.tracked
                                    ? <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">Tracked (Serial)</span>
                                    : <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Non-tracked</span>
                                }
                            </div>
                            <div className="divide-y">
                                {group.rows.map((item: any, ii: number) => (
                                    <div key={ii} className="flex items-center gap-4 px-4 py-2 text-sm">
                                        {item.productAssetItem ? (
                                            <>
                                                <span className="font-mono font-bold text-blue-600 w-44">
                                                    {item.productAssetItem.serialNumber}
                                                </span>
                                                {item.productAssetItem.assetCode && (
                                                    <span className="text-gray-400">Asset: {item.productAssetItem.assetCode}</span>
                                                )}
                                                <span className="text-xs text-gray-400 ml-auto">[{item.productAssetItem.status}]</span>
                                            </>
                                        ) : (
                                            <span className="text-gray-600">
                                                Qty: <strong>{item.quantity}</strong>
                                                {item.unit?.name && <span className="text-gray-400 ml-1">{item.unit.name}</span>}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {d.note && (
                    <div className="mb-5">
                        <label className="text-xs text-gray-400 uppercase">Note</label>
                        <p className="mt-1 p-3 bg-gray-50 dark:bg-[#1c2e4a] rounded">{d.note}</p>
                    </div>
                )}

            </div>
        );
    }

    // ── EDIT MODE ─────────────────────────────────────────────────────────────
    if (isEdit) {
        if (isLoading || !viewData) {
            return (
                <div className="panel">
                    <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
                        <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        <span className="text-sm">Loading...</span>
                    </div>
                </div>
            );
        }
        const d = viewData;

        return (
            <div className="panel">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10 text-warning">
                            <FilePenLine size={20} />
                        </div>
                        <div>
                            <h5 className="text-lg font-semibold dark:text-white-light">Edit Equipment Assignment</h5>
                            <p className="text-xs text-gray-500 font-mono">{d.ref}</p>
                        </div>
                    </div>
                    <NavLink to={`/customerequipment/${id}`} className="btn btn-outline-warning btn-sm">
                        <FontAwesomeIcon icon={faArrowLeft} className="mr-1" />
                        Cancel
                    </NavLink>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                        {/* Customer */}
                        <div>
                            <label>Customer <span className="text-danger">*</span></label>
                            <select className="form-select" value={customerId} onChange={(e) => setCustomerId(Number(e.target.value))}>
                                <option value="">Select customer...</option>
                                {customers.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>
                                ))}
                            </select>
                        </div>

                        {/* Branch (read-only — items are branch-specific) */}
                        <div>
                            <label>Branch</label>
                            <p className="form-input bg-gray-50 dark:bg-[#1c2e4a] text-gray-500 cursor-not-allowed">{d.branch?.name}</p>
                        </div>

                        {/* Assignment Type */}
                        <div>
                            <label>Assignment Type <span className="text-danger">*</span></label>
                            <div className="flex gap-4 mt-2">
                                {ASSIGN_TYPES.map((a) => (
                                    <label key={a.value} className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" className="form-radio" checked={assignType === a.value} onChange={() => setAssignType(a.value)} />
                                        <span style={{ color: a.color }} className="font-medium">{a.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Assigned Date */}
                        <div>
                            <label>Assigned Date <span className="text-danger">*</span></label>
                            <input type="date" className="form-input" value={assignedAt} onChange={(e) => setAssignedAt(e.target.value)} />
                        </div>
                    </div>

                    {/* ── Equipment Lines (same builder as create) ─────────── */}
                    <div className="mb-5">
                        <label className="font-medium mb-3 block">
                            Equipment <span className="text-danger">*</span>
                            <span className="text-xs text-gray-400 font-normal ml-2">
                                (tracked → select serials · non-tracked → enter quantity)
                            </span>
                        </label>
                        <div className="space-y-3">
                            {lines.map((line, idx) => (
                                <div key={line.key} className="border rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="text-xs font-bold text-gray-400 w-6 shrink-0">#{idx + 1}</span>
                                        <div className="relative flex-1">
                                            <input
                                                type="text"
                                                className="form-input w-full"
                                                placeholder="Search any product (name / barcode / SKU)..."
                                                value={line.searchTerm}
                                                onChange={(e) => handleProductSearch(line.key, e.target.value)}
                                                onFocus={() => line.searchResults.length > 0 && updateLine(line.key, { showSuggestions: true })}
                                                onBlur={() => setTimeout(() => updateLine(line.key, { showSuggestions: false }), 150)}
                                            />
                                            {line.showSuggestions && line.searchResults.length > 0 && (
                                                <ul className="absolute mt-1 bg-white dark:bg-[#1b2e4b] border border-gray-200 dark:border-gray-600 w-full max-h-56 overflow-y-auto rounded-lg shadow-2xl top-full left-0" style={{ zIndex: 9999 }}>
                                                    {line.searchResults.map((p) => (
                                                        <li key={p.id} className="px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-0 flex items-center gap-3" onClick={() => selectVariant(line.key, p)}>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <span className="font-medium text-sm text-gray-800 dark:text-gray-100">{p.products?.name || p.name}</span>
                                                                    <span className="text-xs text-gray-400">({p.productType})</span>
                                                                </div>
                                                                <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">{p.barcode}</span>
                                                            </div>
                                                            {isTracked(p.trackingType ?? null)
                                                                ? <span className="shrink-0 text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-medium">Serial</span>
                                                                : <span className="shrink-0 text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">Qty</span>
                                                            }
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                        {lines.length > 1 && (
                                            <button type="button" onClick={() => removeLine(line.key)} className="text-red-400 hover:text-red-600 shrink-0"><Trash2 size={16} /></button>
                                        )}
                                    </div>

                                    {/* Serial panel (tracked) */}
                                    {line.variantId && isTracked(line.trackingType) && (
                                        <div className="ml-8">
                                            <button type="button" className="flex items-center gap-1 text-sm font-medium text-blue-600 mb-2" onClick={() => updateLine(line.key, { showSerialPanel: !line.showSerialPanel })}>
                                                {line.showSerialPanel ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                {line.selectedIds.length === 0 ? "Select serial numbers" : `${line.selectedIds.length} serial(s) selected`}
                                            </button>
                                            {line.selectedItems.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mb-2">
                                                    {line.selectedItems.map((item) => (
                                                        <span key={item.id} className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-mono rounded-full px-3 py-1">
                                                            {item.serialNumber}
                                                            {item.assetCode && <span className="text-blue-400">· {item.assetCode}</span>}
                                                            <button type="button" className="ml-1 hover:text-red-500" onClick={() => toggleSerial(line.key, item)}>×</button>
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            {line.showSerialPanel && (
                                                <div className="border rounded max-h-48 overflow-y-auto bg-white dark:bg-[#1c2e4a]">
                                                    {line.availableItems.length === 0
                                                        ? <p className="text-sm text-orange-500 p-3">No serial numbers available in this branch.</p>
                                                        : line.availableItems.map((item) => {
                                                            const checked    = line.selectedIds.includes(item.id);
                                                            const usedElse   = isSerialUsedElsewhere(line.key, item.id);
                                                            const isSold     = item.status === "SOLD";
                                                            const isReserved = item.status === "RESERVED";
                                                            const isBlocked  = usedElse || isSold || isReserved || (item.status !== "IN_STOCK" && !checked);
                                                            const soldOrder  = isSold ? item.orderItemLinks?.[0]?.orderItem?.order : null;
                                                            return (
                                                                <div key={item.id} className={`flex items-center gap-3 px-4 py-2 border-b text-sm ${isBlocked ? "opacity-50" : "hover:bg-blue-50"} ${checked ? "bg-blue-50" : ""}`}>
                                                                    <label className={`flex items-center gap-3 flex-1 min-w-0 ${isBlocked ? "cursor-not-allowed" : "cursor-pointer"}`}>
                                                                        <input type="checkbox" className="form-checkbox shrink-0" checked={checked} disabled={isBlocked} onChange={() => toggleSerial(line.key, item)} />
                                                                        <span className="font-mono font-medium text-blue-700">{item.serialNumber}</span>
                                                                        {item.assetCode && <span className="text-gray-400">Asset: {item.assetCode}</span>}
                                                                        <span className="ml-auto text-xs text-right">
                                                                            {usedElse
                                                                                ? <span className="text-gray-400">[used on line above]</span>
                                                                                : isSold
                                                                                    ? <span className="text-red-500 font-medium">
                                                                                        Sold via {soldOrder ? <strong>{soldOrder.ref}</strong> : "invoice"}
                                                                                        {soldOrder?.customer && <span className="text-red-400"> ({soldOrder.customer.name})</span>}
                                                                                        {" — link the Order above"}
                                                                                      </span>
                                                                                    : isReserved
                                                                                        ? <span className="text-orange-500 font-medium">Already assigned to another customer</span>
                                                                                        : <span className="text-gray-400">[{item.status}]</span>
                                                                            }
                                                                        </span>
                                                                    </label>
                                                                    <button type="button" title="View assignment history" className="shrink-0 text-gray-400 hover:text-indigo-600 ml-1" onClick={() => openSerialHistory(item)}>
                                                                        <History size={14} />
                                                                    </button>
                                                                </div>
                                                            );
                                                        })
                                                    }
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Quantity + Unit (non-tracked) */}
                                    {line.variantId && !isTracked(line.trackingType) && (
                                        <div className="ml-8 flex items-center gap-3 flex-wrap">
                                            <label className="text-sm font-medium text-gray-600">Quantity:</label>
                                            <input type="number" min={1} className="form-input w-28 text-center" value={line.quantity} onChange={(e) => updateLine(line.key, { quantity: Math.max(1, Number(e.target.value)) })} />
                                            {line.availableUnits.length > 0 ? (
                                                <div style={{ width: 110 }}>
                                                    <select className="form-select" value={line.selectedUnitId ?? ""} onChange={(e) => updateLine(line.key, { selectedUnitId: Number(e.target.value) || null })}>
                                                        {line.availableUnits.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                                                    </select>
                                                </div>
                                            ) : <span className="text-xs text-gray-400">unit</span>}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={() => setLines((prev) => [...prev, newLine()])} className="mt-3 btn btn-outline-primary btn-sm gap-2">
                            <Plus size={14} /> Add Another Product
                        </button>
                    </div>

                    {/* Invoice / Order */}
                    <div className="mb-5 relative" style={{ maxWidth: 400 }}>
                        <label>Invoice / Order <span className="text-xs text-gray-400 font-normal ml-2">(optional)</span></label>
                        <div className="relative mt-1">
                            <input
                                type="text"
                                className="form-input w-full pr-8"
                                placeholder="Search by invoice ref (e.g. ZM2026-00001)..."
                                value={orderSearch}
                                onChange={(e) => handleOrderSearch(e.target.value)}
                                onFocus={() => orderResults.length > 0 && !orderId && setShowOrderSuggestions(true)}
                                onBlur={() => setTimeout(() => setShowOrderSuggestions(false), 150)}
                            />
                            {orderId && <button type="button" onClick={clearOrder} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 text-lg leading-none">×</button>}
                        </div>
                        {orderId && <p className="text-xs text-green-600 mt-1">✓ Linked to invoice <span className="font-mono font-bold">{orderRef}</span></p>}
                        {showOrderSuggestions && orderResults.length > 0 && !orderId && (
                            <ul className="absolute mt-1 bg-white dark:bg-[#1b2e4b] border border-gray-200 dark:border-gray-600 w-full max-h-52 overflow-y-auto rounded-lg shadow-2xl" style={{ zIndex: 9999 }}>
                                {orderResults.map((o) => (
                                    <li key={o.id} className="px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-0 flex items-center gap-3" onClick={() => selectOrder(o)}>
                                        <span className="font-mono font-semibold text-blue-600 dark:text-blue-400 text-sm">{o.ref}</span>
                                        {o.customer?.name && <span className="text-gray-400 text-xs">{o.customer.name}</span>}
                                    </li>
                                ))}
                            </ul>
                        )}
                        {showOrderSuggestions && orderResults.length === 0 && orderSearch.trim() && !orderId && (
                            <p className="text-xs text-orange-500 mt-1">No invoices found matching "{orderSearch}"</p>
                        )}
                    </div>

                    {/* Note */}
                    <div className="mb-5">
                        <label>Note</label>
                        <textarea className="form-input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
                    </div>

                    <div className="flex justify-end gap-3">
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={isLoading || (!!orderSearch.trim() && !orderId)}
                        >
                            <FontAwesomeIcon icon={faSave} className="mr-1" />
                            {isLoading ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </form>

                {/* ── Serial History Modal ─────────────────────────────────── */}
                {serialHistory && (
                    <div className="fixed inset-0 bg-black/60 z-[1000] flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-[#1c2e4a] rounded-lg shadow-xl w-full max-w-lg">
                            <div className="flex items-center justify-between px-5 py-4 border-b">
                                <div className="flex items-center gap-2">
                                    <History size={16} className="text-indigo-500" />
                                    <h5 className="font-semibold">Assignment History</h5>
                                    <span className="font-mono text-sm bg-blue-50 text-blue-700 border border-blue-100 rounded px-2 py-0.5 ml-1">
                                        {serialHistory.serialNumber}
                                    </span>
                                </div>
                                <button type="button" onClick={() => setSerialHistory(null)} className="text-gray-400 hover:text-gray-600">
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="px-5 py-4 max-h-96 overflow-y-auto">
                                {historyLoading ? (
                                    <p className="text-center text-gray-400 py-6">Loading...</p>
                                ) : serialHistory.records.length === 0 ? (
                                    <p className="text-center text-gray-400 py-6">No assignment history found for this serial.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {serialHistory.records.map((rec: any, i: number) => (
                                            <div key={i} className="border rounded-lg p-3 text-sm">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="font-mono font-semibold text-indigo-600">{rec.ref}</span>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${rec.returnedAt ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                                                        {rec.returnedAt ? "Returned" : "Active"}
                                                    </span>
                                                </div>
                                                <p className="font-medium text-gray-800">{rec.customer?.name}</p>
                                                {rec.customer?.phone && <p className="text-gray-500 text-xs">{rec.customer.phone}</p>}
                                                <div className="flex gap-4 mt-2 text-xs text-gray-500">
                                                    <span>Branch: {rec.branch?.name}</span>
                                                    <span>Assigned: {rec.assignedAt ? dayjs(rec.assignedAt).format("DD/MM/YYYY") : "—"}</span>
                                                    {rec.returnedAt && <span>Returned: {dayjs(rec.returnedAt).format("DD/MM/YYYY")}</span>}
                                                </div>
                                                {rec.order && (
                                                    <p className="text-xs text-gray-400 mt-1">Invoice: <span className="font-mono">{rec.order.ref}</span></p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ── CREATE MODE ───────────────────────────────────────────────────────────
    return (
        <div className="panel">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <MonitorSmartphone size={20} />
                    </div>
                    <div>
                        <h5 className="text-lg font-semibold dark:text-white-light">Assign Equipment to Customer</h5>
                        <p className="text-xs text-gray-500">Fill in the details below to record an equipment assignment</p>
                    </div>
                </div>
                <NavLink to="/customerequipment" className="btn btn-outline-warning btn-sm">
                    <FontAwesomeIcon icon={faArrowLeft} className="mr-1" />
                    Go Back
                </NavLink>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                    {/* Customer */}
                    <div>
                        <label>Customer <span className="text-danger">*</span></label>
                        <select className="form-select" value={customerId} onChange={(e) => setCustomerId(Number(e.target.value))}>
                            <option value="">Select customer...</option>
                            {customers.map((c) => (
                                <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>
                            ))}
                        </select>
                    </div>

                    {/* Branch */}
                    <div>
                        <label>Branch <span className="text-danger">*</span></label>
                        <select
                            className="form-select"
                            value={branchId}
                            disabled={user?.roleType === "USER"}
                            onChange={(e) => handleBranchChange(Number(e.target.value))}
                        >
                            <option value="">Select branch...</option>
                            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    </div>

                    {/* Assignment Type */}
                    <div>
                        <label>Assignment Type <span className="text-danger">*</span></label>
                        <div className="flex gap-4 mt-2">
                            {ASSIGN_TYPES.map((a) => (
                                <label key={a.value} className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" className="form-radio" checked={assignType === a.value} onChange={() => setAssignType(a.value)} />
                                    <span style={{ color: a.color }} className="font-medium">{a.label}</span>
                                </label>
                            ))}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Sold = customer owns it · Rented = temporary use · Installed = equipment at site</p>
                    </div>

                    {/* Assigned Date */}
                    <div>
                        <label>Assigned Date <span className="text-danger">*</span></label>
                        <input type="date" className="form-input" value={assignedAt} onChange={(e) => setAssignedAt(e.target.value)} />
                    </div>
                </div>

                {/* ── Equipment Lines ───────────────────────────────────────── */}
                <div className="mb-5">
                    <label className="font-medium mb-3 block">
                        Equipment <span className="text-danger">*</span>
                        <span className="text-xs text-gray-400 font-normal ml-2">
                            (tracked products → select serial numbers · non-tracked → enter quantity)
                        </span>
                    </label>

                    <div className="space-y-3">
                        {lines.map((line, idx) => (
                            <div key={line.key} className="border rounded-lg p-4">
                                {/* Product search row */}
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-xs font-bold text-gray-400 w-6 shrink-0">#{idx + 1}</span>
                                    <div className="relative flex-1">
                                        <input
                                            type="text"
                                            className="form-input w-full"
                                            placeholder={branchId ? "Search any product (name / barcode / SKU)..." : "Select a branch first"}
                                            value={line.searchTerm}
                                            disabled={!branchId}
                                            onChange={(e) => handleProductSearch(line.key, e.target.value)}
                                            onFocus={() => line.searchResults.length > 0 && updateLine(line.key, { showSuggestions: true })}
                                            onBlur={() => setTimeout(() => updateLine(line.key, { showSuggestions: false }), 150)}
                                        />
                                        {line.showSuggestions && line.searchResults.length > 0 && (
                                            <ul className="absolute mt-1 bg-white dark:bg-[#1b2e4b] border border-gray-200 dark:border-gray-600 w-full max-h-56 overflow-y-auto rounded-lg shadow-2xl top-full left-0" style={{ zIndex: 9999 }}>
                                                {line.searchResults.map((p) => (
                                                    <li
                                                        key={p.id}
                                                        className="px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-0 flex items-center gap-3"
                                                        onClick={() => selectVariant(line.key, p)}
                                                    >
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="font-medium text-sm text-gray-800 dark:text-gray-100">
                                                                    {p.products?.name || p.name}
                                                                </span>
                                                                <span className="text-xs text-gray-400">
                                                                    ({p.productType})
                                                                </span>
                                                            </div>
                                                            <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                                                                {p.barcode}
                                                            </span>
                                                        </div>
                                                        {isTracked(p.trackingType ?? null) ? (
                                                            <span className="shrink-0 text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-medium">Serial</span>
                                                        ) : (
                                                            <span className="shrink-0 text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">Qty</span>
                                                        )}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                    {lines.length > 1 && (
                                        <button type="button" onClick={() => removeLine(line.key)} className="text-red-400 hover:text-red-600 shrink-0">
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>

                                {/* Serial panel (tracked) */}
                                {line.variantId && isTracked(line.trackingType) && (
                                    <div className="ml-8">
                                        <button
                                            type="button"
                                            className="flex items-center gap-1 text-sm font-medium text-blue-600 mb-2"
                                            onClick={() => updateLine(line.key, { showSerialPanel: !line.showSerialPanel })}
                                        >
                                            {line.showSerialPanel ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                            {line.selectedIds.length === 0
                                                ? "Select serial numbers"
                                                : `${line.selectedIds.length} serial(s) selected`}
                                        </button>

                                        {/* Selected chips */}
                                        {line.selectedItems.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mb-2">
                                                {line.selectedItems.map((item) => (
                                                    <span
                                                        key={item.id}
                                                        className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-mono rounded-full px-3 py-1"
                                                    >
                                                        {item.serialNumber}
                                                        {item.assetCode && <span className="text-blue-400">· {item.assetCode}</span>}
                                                        <button type="button" className="ml-1 hover:text-red-500" onClick={() => toggleSerial(line.key, item)}>×</button>
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {/* Checkbox list */}
                                        {line.showSerialPanel && (
                                            <div className="border rounded max-h-48 overflow-y-auto bg-white dark:bg-[#1c2e4a]">
                                                {line.availableItems.length === 0 ? (
                                                    <p className="text-sm text-orange-500 p-3">No serial numbers available in this branch.</p>
                                                ) : (
                                                    line.availableItems.map((item) => {
                                                        const checked    = line.selectedIds.includes(item.id);
                                                        const usedElse   = isSerialUsedElsewhere(line.key, item.id);
                                                        const isSold     = item.status === "SOLD";
                                                        const isReserved = item.status === "RESERVED";
                                                        const isBlocked  = usedElse || isSold || isReserved || (item.status !== "IN_STOCK" && !checked);
                                                        const soldOrder  = isSold ? item.orderItemLinks?.[0]?.orderItem?.order : null;
                                                        return (
                                                            <div key={item.id} className={`flex items-center gap-3 px-4 py-2 border-b text-sm ${isBlocked ? "opacity-50" : "hover:bg-blue-50"} ${checked ? "bg-blue-50" : ""}`}>
                                                                <label className={`flex items-center gap-3 flex-1 min-w-0 ${isBlocked ? "cursor-not-allowed" : "cursor-pointer"}`}>
                                                                    <input type="checkbox" className="form-checkbox shrink-0" checked={checked} disabled={isBlocked} onChange={() => toggleSerial(line.key, item)} />
                                                                    <span className="font-mono font-medium text-blue-700">{item.serialNumber}</span>
                                                                    {item.assetCode && <span className="text-gray-400">Asset: {item.assetCode}</span>}
                                                                    <span className="ml-auto text-xs text-right">
                                                                        {usedElse
                                                                            ? <span className="text-gray-400">[used on line above]</span>
                                                                            : isSold
                                                                                ? <span className="text-red-500 font-medium">
                                                                                    Sold via {soldOrder ? <strong>{soldOrder.ref}</strong> : "invoice"}
                                                                                    {soldOrder?.customer && <span className="text-red-400"> ({soldOrder.customer.name})</span>}
                                                                                    {" — link the Order above"}
                                                                                  </span>
                                                                                : isReserved
                                                                                    ? <span className="text-orange-500 font-medium">Already assigned to another customer</span>
                                                                                    : <span className="text-gray-400">[{item.status}]</span>
                                                                        }
                                                                    </span>
                                                                </label>
                                                                <button type="button" title="View assignment history" className="shrink-0 text-gray-400 hover:text-indigo-600 ml-1" onClick={() => openSerialHistory(item)}>
                                                                    <History size={14} />
                                                                </button>
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Quantity + Unit input (non-tracked) */}
                                {line.variantId && !isTracked(line.trackingType) && (
                                    <div className="ml-8 flex items-center gap-3 flex-wrap">
                                        <label className="text-sm font-medium text-gray-600">Quantity:</label>
                                        <input
                                            type="number"
                                            min={1}
                                            className="form-input w-28 text-center"
                                            value={line.quantity}
                                            onChange={(e) => updateLine(line.key, { quantity: Math.max(1, Number(e.target.value)) })}
                                        />
                                        {line.availableUnits.length > 0 ? (
                                            <select
                                                className="form-input w-32"
                                                value={line.selectedUnitId ?? ""}
                                                onChange={(e) => updateLine(line.key, { selectedUnitId: Number(e.target.value) || null })}
                                            >
                                                {line.availableUnits.map((u) => (
                                                    <option key={u.id} value={u.id}>{u.name}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <span className="text-xs text-gray-400">unit</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={() => setLines((prev) => [...prev, newLine()])}
                        disabled={!branchId}
                        className="mt-3 btn btn-outline-primary btn-sm gap-2"
                    >
                        <Plus size={14} />
                        Add Another Product
                    </button>
                </div>

                {/* Invoice / Order search */}
                <div className="mb-5 relative" style={{ maxWidth: 400 }}>
                    <label>
                        Invoice / Order
                        <span className="text-xs text-gray-400 font-normal ml-2">(optional — only for this branch)</span>
                    </label>
                    <div className="relative mt-1">
                        <input
                            type="text"
                            className="form-input w-full pr-8"
                            placeholder={branchId ? "Search by invoice ref (e.g. ZM2026-00001)..." : "Select a branch first"}
                            value={orderSearch}
                            disabled={!branchId}
                            onChange={(e) => handleOrderSearch(e.target.value)}
                            onFocus={() => orderResults.length > 0 && !orderId && setShowOrderSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowOrderSuggestions(false), 150)}
                        />
                        {orderId && (
                            <button
                                type="button"
                                onClick={clearOrder}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 text-lg leading-none"
                            >×</button>
                        )}
                    </div>

                    {/* Selected badge */}
                    {orderId && (
                        <p className="text-xs text-green-600 mt-1">
                            ✓ Linked to invoice <span className="font-mono font-bold">{orderRef}</span>
                        </p>
                    )}

                    {/* Suggestions dropdown */}
                    {showOrderSuggestions && orderResults.length > 0 && !orderId && (
                        <ul className="absolute mt-1 bg-white dark:bg-[#1b2e4b] border border-gray-200 dark:border-gray-600 w-full max-h-52 overflow-y-auto rounded-lg shadow-2xl" style={{ zIndex: 9999 }}>
                            {orderResults.map((o) => (
                                <li
                                    key={o.id}
                                    className="px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-0 flex items-center gap-3"
                                    onClick={() => selectOrder(o)}
                                >
                                    <span className="font-mono font-semibold text-blue-600 dark:text-blue-400 text-sm">{o.ref}</span>
                                    {o.customer?.name && (
                                        <span className="text-gray-400 dark:text-gray-500 text-xs">{o.customer.name}</span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}

                    {showOrderSuggestions && orderResults.length === 0 && orderSearch.trim() && !orderId && (
                        <p className="text-xs text-orange-500 mt-1">No invoices found for this branch matching "{orderSearch}"</p>
                    )}
                </div>

                {/* Note */}
                <div className="mb-5">
                    <label>Note</label>
                    <textarea className="form-input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
                </div>

                <div className="flex justify-end gap-3">
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={isLoading || (!!orderSearch.trim() && !orderId)}
                    >
                        <FontAwesomeIcon icon={faSave} className="mr-1" />
                        {isLoading ? "Saving..." : "Assign Equipment"}
                    </button>
                </div>
            </form>

            {/* ── Serial History Modal ─────────────────────────────────────── */}
            {serialHistory && (
                <div className="fixed inset-0 bg-black/60 z-[1000] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#1c2e4a] rounded-lg shadow-xl w-full max-w-lg">
                        <div className="flex items-center justify-between px-5 py-4 border-b">
                            <div className="flex items-center gap-2">
                                <History size={16} className="text-indigo-500" />
                                <h5 className="font-semibold">Assignment History</h5>
                                <span className="font-mono text-sm bg-blue-50 text-blue-700 border border-blue-100 rounded px-2 py-0.5 ml-1">
                                    {serialHistory.serialNumber}
                                </span>
                            </div>
                            <button type="button" onClick={() => setSerialHistory(null)} className="text-gray-400 hover:text-gray-600">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="px-5 py-4 max-h-96 overflow-y-auto">
                            {historyLoading ? (
                                <p className="text-center text-gray-400 py-6">Loading...</p>
                            ) : serialHistory.records.length === 0 ? (
                                <p className="text-center text-gray-400 py-6">No assignment history found for this serial.</p>
                            ) : (
                                <div className="space-y-3">
                                    {serialHistory.records.map((rec: any, i: number) => (
                                        <div key={i} className="border rounded-lg p-3 text-sm">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-mono font-semibold text-indigo-600">{rec.ref}</span>
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${rec.returnedAt ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                                                    {rec.returnedAt ? "Returned" : "Active"}
                                                </span>
                                            </div>
                                            <p className="font-medium text-gray-800">{rec.customer?.name}</p>
                                            {rec.customer?.phone && <p className="text-gray-500 text-xs">{rec.customer.phone}</p>}
                                            <div className="flex gap-4 mt-2 text-xs text-gray-500">
                                                <span>Branch: {rec.branch?.name}</span>
                                                <span>Assigned: {rec.assignedAt ? dayjs(rec.assignedAt).format("DD/MM/YYYY") : "—"}</span>
                                                {rec.returnedAt && <span>Returned: {dayjs(rec.returnedAt).format("DD/MM/YYYY")}</span>}
                                            </div>
                                            {rec.order && (
                                                <p className="text-xs text-gray-400 mt-1">Invoice: <span className="font-mono">{rec.order.ref}</span></p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerEquipmentForm;
