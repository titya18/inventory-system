import React, { useEffect, useState } from "react";
import { getAvailableTrackedItems } from "@/api/invoice";
import { getReactivatableItems } from "@/api/stockAdjustment";
import { ProductTrackedItemType } from "@/data_types/types";

type TrackingType = "NONE" | "ASSET_ONLY" | "MAC_ONLY" | "ASSET_AND_MAC";

interface NewSerial {
    serialNumber: string;
    assetCode?: string | null;
    macAddress?: string | null;
}

export interface AdjustmentTrackedSaveData {
    adjustmentTrackedMode?: "NEW" | "REACTIVATE";
    newSerials?: NewSerial[];
    reactivateIds?: number[];
    reactivateItems?: ProductTrackedItemType[];
    selectedToRemoveIds?: number[];
    selectedToRemoveItems?: ProductTrackedItemType[];
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    adjustmentType: "POSITIVE" | "NEGATIVE";
    trackingType: TrackingType;
    variantId: number;
    branchId: number;
    expectedQty?: number;
    adjustmentTrackedMode?: "NEW" | "REACTIVATE";
    newSerials?: NewSerial[];
    reactivateIds?: number[];
    reactivateItems?: ProductTrackedItemType[];
    selectedToRemoveIds?: number[];
    selectedToRemoveItems?: ProductTrackedItemType[];
    onSave: (data: AdjustmentTrackedSaveData) => void;
}

const isPositive = (t: "POSITIVE" | "NEGATIVE") => t === "POSITIVE";

const COLORS = {
    positive: {
        headerBg: "linear-gradient(135deg, #4361ee 0%, #3a0ca3 100%)",
        iconBg: "rgba(255,255,255,0.18)",
        tabActiveBg: "#fff",
        tabActiveColor: "#4361ee",
        progressFill: "#4361ee",
        progressOver: "#ef4444",
        progressMatch: "#17c653",
        badgeBg: "#e8f0ff",
        badgeColor: "#4361ee",
        checkBg: "#4361ee",
        checkBorder: "#4361ee",
        itemCheckedBg: "#f0f4ff",
        itemCheckedBorder: "#b8caff",
        confirmBg: "linear-gradient(135deg, #4361ee 0%, #3a0ca3 100%)",
        confirmHoverBg: "#3a0ca3",
    },
    negative: {
        headerBg: "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)",
        iconBg: "rgba(255,255,255,0.18)",
        tabActiveBg: "#fff",
        tabActiveColor: "#ef4444",
        progressFill: "#ef4444",
        progressOver: "#ef4444",
        progressMatch: "#17c653",
        badgeBg: "#fee2e2",
        badgeColor: "#b91c1c",
        checkBg: "#ef4444",
        checkBorder: "#ef4444",
        itemCheckedBg: "#fff5f5",
        itemCheckedBorder: "#fca5a5",
        confirmBg: "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)",
        confirmHoverBg: "#b91c1c",
    },
};

const SpinnerIcon = ({ color }: { color: string }) => (
    <svg className="animate-spin w-7 h-7" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="3" strokeOpacity="0.2" />
        <path d="M12 2a10 10 0 0 1 10 10" stroke={color} strokeWidth="3" strokeLinecap="round" />
    </svg>
);

const CheckIcon = () => (
    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
);

const EmptyBox = ({ color }: { color: string }) => (
    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={1.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
    </svg>
);

const StockAdjustmentTrackedModal: React.FC<Props> = ({
    isOpen,
    onClose,
    adjustmentType,
    trackingType,
    variantId,
    branchId,
    expectedQty,
    adjustmentTrackedMode: initMode,
    newSerials: initNewSerials,
    reactivateIds: initReactivateIds,
    reactivateItems: initReactivateItems,
    selectedToRemoveIds: initSelectedIds,
    selectedToRemoveItems: initSelectedToRemoveItems,
    onSave,
}) => {
    const [tab, setTab] = useState<"NEW" | "REACTIVATE">(initMode ?? "NEW");
    const [newSerials, setNewSerials] = useState<NewSerial[]>(
        initNewSerials?.length ? initNewSerials : [{ serialNumber: "" }]
    );
    const [reactivateItems, setReactivateItems] = useState<ProductTrackedItemType[]>(initReactivateItems ?? []);
    const [reactivateIds, setReactivateIds] = useState<number[]>(initReactivateIds ?? []);
    const [availableItems, setAvailableItems] = useState<ProductTrackedItemType[]>([]);
    const [selectedToRemoveIds, setSelectedToRemoveIds] = useState<number[]>(initSelectedIds ?? []);
    const [isLoading, setIsLoading] = useState(false);
    // True when we have stored history — show read-only, skip live fetch
    const hasStoredHistory  = (initReactivateItems?.length ?? 0) > 0;
    const hasRemovedHistory = (initSelectedToRemoveItems?.length ?? 0) > 0;

    const needsAsset = trackingType === "ASSET_ONLY" || trackingType === "ASSET_AND_MAC";
    const needsMac = trackingType === "MAC_ONLY" || trackingType === "ASSET_AND_MAC";
    const c = isPositive(adjustmentType) ? COLORS.positive : COLORS.negative;

    useEffect(() => {
        if (!isOpen) return;
        setTab(initMode ?? "NEW");
        setNewSerials(initNewSerials?.length ? initNewSerials : [{ serialNumber: "" }]);
        setReactivateIds(initReactivateIds ?? []);
        setReactivateItems(initReactivateItems ?? []);
        setSelectedToRemoveIds(initSelectedIds ?? []);
        if (initSelectedToRemoveItems?.length) setAvailableItems(initSelectedToRemoveItems);
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen || adjustmentType !== "POSITIVE" || !variantId || !branchId) return;
        // Skip live fetch when we already have stored history items
        if (hasStoredHistory) return;
        setIsLoading(true);
        getReactivatableItems(variantId, branchId)
            .then(setReactivateItems)
            .catch(console.error)
            .finally(() => setIsLoading(false));
    }, [isOpen, variantId, branchId, adjustmentType]);

    useEffect(() => {
        if (!isOpen || adjustmentType !== "NEGATIVE" || !variantId || !branchId) return;
        if (hasRemovedHistory) return;
        setIsLoading(true);
        getAvailableTrackedItems(variantId, branchId, null)
            .then(setAvailableItems)
            .catch(console.error)
            .finally(() => setIsLoading(false));
    }, [isOpen, variantId, branchId, adjustmentType]);

    const addSerialRow = () => setNewSerials((prev) => [...prev, { serialNumber: "" }]);
    const removeSerialRow = (i: number) => setNewSerials((prev) => prev.filter((_, idx) => idx !== i));
    const updateSerial = (i: number, field: keyof NewSerial, value: string) => {
        setNewSerials((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));
    };
    const toggleReactivate = (id: number) => {
        setReactivateIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
    };
    const toggleRemove = (id: number) => {
        setSelectedToRemoveIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
    };

    const handleSave = () => {
        if (adjustmentType === "POSITIVE") {
            if (tab === "NEW") {
                onSave({ adjustmentTrackedMode: "NEW", newSerials: newSerials.filter((s) => s.serialNumber.trim()) });
            } else {
                const items = reactivateItems.filter((x) => reactivateIds.includes(Number(x.id)));
                onSave({ adjustmentTrackedMode: "REACTIVATE", reactivateIds, reactivateItems: items });
            }
        } else {
            const items = availableItems.filter((x) => selectedToRemoveIds.includes(Number(x.id)));
            onSave({ selectedToRemoveIds, selectedToRemoveItems: items });
        }
        onClose();
    };

    const validNewCount = newSerials.filter((s) => s.serialNumber.trim()).length;
    const expectedCount = expectedQty != null ? Math.round(expectedQty) : null;
    const countMatch = expectedCount !== null && validNewCount === expectedCount;
    const countOver = expectedCount !== null && validNewCount > expectedCount;
    const progressPct = expectedCount ? Math.min((validNewCount / expectedCount) * 100, 100) : 0;
    const progressColor = countOver ? "#ef4444" : countMatch ? "#17c653" : c.progressFill;

    if (!isOpen) return null;

    /* ── shared input style ── */
    const inputCls = "w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:border-transparent placeholder-gray-400 transition";

    return (
        <div
            className="fixed inset-0 z-[999] flex items-center justify-center"
            style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)" }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-white dark:bg-[#1b2e4b] rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
                style={{ boxShadow: "0 25px 50px rgba(0,0,0,0.25)" }}>

                {/* ── Header ── */}
                <div className="relative px-6 py-5 flex items-center justify-between"
                    style={{ background: c.headerBg }}>
                    {/* decorative circle - positioned to not overlap text */}
                    <div className="absolute bottom-0 right-0 w-16 h-16 rounded-full opacity-10"
                        style={{ background: "#fff", transform: "translate(70%,70%)" }} />

                    <div className="flex items-center gap-3 relative z-10">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: c.iconBg }}>
                            {isPositive(adjustmentType) ? (
                                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                                </svg>
                            )}
                        </div>
                        <div>
                            <h5 className="text-white font-bold text-base leading-tight">
                                {isPositive(adjustmentType) ? "Add Tracked Serials" : "Select Serials to Remove"}
                            </h5>
                            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.7)" }}>
                                {isPositive(adjustmentType)
                                    ? "Register new or reactivate existing serials"
                                    : "Choose serials to mark as removed"}
                            </p>
                        </div>
                    </div>

                    <button type="button" onClick={onClose}
                        className="relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-white transition-all"
                        style={{ background: "rgba(255,255,255,0.15)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.3)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.15)")}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* ── Body ── */}
                <div className="p-6">

                    {/* Tabs */}
                    {isPositive(adjustmentType) && (
                        <div className="flex gap-1 p-1 rounded-xl mb-5"
                            style={{ background: "#f1f5f9" }}>
                            {(["NEW", "REACTIVATE"] as const).map((t) => {
                                const active = tab === t;
                                return (
                                    <button key={t} type="button" onClick={() => setTab(t)}
                                        className="flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all"
                                        style={{
                                            background: active ? "#fff" : "transparent",
                                            color: active ? c.tabActiveColor : "#64748b",
                                            boxShadow: active ? "0 1px 6px rgba(0,0,0,0.1)" : "none",
                                        }}
                                    >
                                        {t === "NEW" ? "New Serials" : "Reactivate Old"}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* ── POSITIVE / NEW tab ── */}
                    {isPositive(adjustmentType) && tab === "NEW" && (
                        <div>
                            {/* Progress bar */}
                            {expectedCount !== null && (
                                <div className="mb-4 p-3 rounded-xl border"
                                    style={{ background: "#f8fafc", borderColor: "#e2e8f0" }}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-semibold text-gray-500">Progress</span>
                                        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                                            style={{
                                                background: countMatch ? "#dcfce7" : countOver ? "#fee2e2" : "#e8f0ff",
                                                color: countMatch ? "#15803d" : countOver ? "#b91c1c" : c.tabActiveColor,
                                            }}>
                                            {validNewCount} / {expectedCount}
                                        </span>
                                    </div>
                                    <div className="w-full rounded-full" style={{ height: 6, background: "#e2e8f0" }}>
                                        <div className="rounded-full transition-all" style={{ height: 6, width: `${progressPct}%`, background: progressColor }} />
                                    </div>
                                </div>
                            )}

                            {/* Serial input rows */}
                            <div className="max-h-64 overflow-y-auto space-y-3 pr-0.5">
                                {newSerials.map((serial, i) => (
                                    <div key={i} className="rounded-xl border p-4"
                                        style={{ background: "#f8fafc", borderColor: "#e2e8f0" }}>
                                        <div className="flex items-start gap-3">
                                            {/* Index badge */}
                                            <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5 text-xs font-bold"
                                                style={{ background: c.badgeBg, color: c.tabActiveColor }}>
                                                {i + 1}
                                            </div>

                                            <div className="flex-1 space-y-2">
                                                <input
                                                    type="text"
                                                    className={inputCls}
                                                    style={{ borderColor: "#e2e8f0" }}
                                                    placeholder="Serial Number *"
                                                    value={serial.serialNumber}
                                                    onChange={(e) => updateSerial(i, "serialNumber", e.target.value)}
                                                    onFocus={(e) => { e.currentTarget.style.borderColor = c.progressFill; e.currentTarget.style.boxShadow = `0 0 0 3px ${c.badgeBg}`; }}
                                                    onBlur={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = "none"; }}
                                                />
                                                {(needsAsset || needsMac) && (
                                                    <div className={`grid gap-2 ${needsAsset && needsMac ? "grid-cols-2" : "grid-cols-1"}`}>
                                                        {needsAsset && (
                                                            <input
                                                                type="text"
                                                                className={inputCls}
                                                                style={{ borderColor: "#e2e8f0" }}
                                                                placeholder="Asset Code"
                                                                value={serial.assetCode ?? ""}
                                                                onChange={(e) => updateSerial(i, "assetCode", e.target.value)}
                                                                onFocus={(e) => { e.currentTarget.style.borderColor = c.progressFill; e.currentTarget.style.boxShadow = `0 0 0 3px ${c.badgeBg}`; }}
                                                                onBlur={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = "none"; }}
                                                            />
                                                        )}
                                                        {needsMac && (
                                                            <input
                                                                type="text"
                                                                className={inputCls}
                                                                style={{ borderColor: "#e2e8f0" }}
                                                                placeholder="MAC Address"
                                                                value={serial.macAddress ?? ""}
                                                                onChange={(e) => updateSerial(i, "macAddress", e.target.value)}
                                                                onFocus={(e) => { e.currentTarget.style.borderColor = c.progressFill; e.currentTarget.style.boxShadow = `0 0 0 3px ${c.badgeBg}`; }}
                                                                onBlur={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = "none"; }}
                                                            />
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {newSerials.length > 1 && (
                                                <button type="button" onClick={() => removeSerialRow(i)}
                                                    className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5 transition-all"
                                                    style={{ background: "#fee2e2", color: "#ef4444" }}
                                                    onMouseEnter={(e) => (e.currentTarget.style.background = "#fca5a5")}
                                                    onMouseLeave={(e) => (e.currentTarget.style.background = "#fee2e2")}
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Add Row button */}
                            <button type="button" onClick={addSerialRow}
                                className="mt-3 w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                                style={{ border: `2px dashed ${c.progressFill}`, color: c.tabActiveColor, background: "transparent" }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = c.badgeBg)}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                </svg>
                                Add Row
                            </button>
                        </div>
                    )}

                    {/* ── POSITIVE / REACTIVATE tab ── */}
                    {isPositive(adjustmentType) && tab === "REACTIVATE" && (
                        <div>
                            {/* Read-only history view (approved adjustment) */}
                            {hasStoredHistory ? (
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Reactivated Serials</p>
                                        <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                                            style={{ background: "#dcfce7", color: "#15803d" }}>
                                            {reactivateItems.length} reactivated
                                        </span>
                                    </div>
                                    <div className="max-h-60 overflow-y-auto space-y-2 pr-0.5">
                                        {reactivateItems.map((item) => (
                                            <div key={item.id}
                                                className="flex items-center gap-3 p-3 rounded-xl border"
                                                style={{ background: "#f0fdf4", borderColor: "#86efac" }}>
                                                <div className="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center"
                                                    style={{ background: "#22c55e" }}>
                                                    <CheckIcon />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-sm font-semibold text-gray-700">{item.serialNumber}</span>
                                                        <span className="text-xs px-1.5 py-0.5 rounded font-medium"
                                                            style={{ background: "#dcfce7", color: "#15803d" }}>
                                                            IN_STOCK (reactivated)
                                                        </span>
                                                    </div>
                                                    {(item.assetCode || item.macAddress) && (
                                                        <div className="flex gap-3 mt-0.5">
                                                            {item.assetCode && <span className="text-xs text-gray-400">Asset: <span className="text-gray-600">{item.assetCode}</span></span>}
                                                            {item.macAddress && <span className="text-xs text-gray-400">MAC: <span className="text-gray-600">{item.macAddress}</span></span>}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : isLoading ? (
                                <div className="flex flex-col items-center justify-center py-10 gap-3">
                                    <SpinnerIcon color="#f59e0b" />
                                    <p className="text-sm text-gray-400">Loading items…</p>
                                </div>
                            ) : reactivateItems.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
                                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-1"
                                        style={{ background: "#fef9c3" }}>
                                        <EmptyBox color="#f59e0b" />
                                    </div>
                                    <p className="text-sm font-semibold text-gray-600">No inactive serials found</p>
                                    <p className="text-xs text-gray-400">No damaged, lost, removed or returned<br />serials exist in this branch.</p>
                                </div>
                            ) : (
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Inactive Serials</p>
                                        <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                                            style={{ background: "#fef3c7", color: "#92400e" }}>
                                            {reactivateIds.length} selected
                                        </span>
                                    </div>
                                    <div className="max-h-60 overflow-y-auto space-y-2 pr-0.5">
                                        {reactivateItems.map((item) => {
                                            const checked = reactivateIds.includes(Number(item.id));
                                            return (
                                                <label key={item.id}
                                                    className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all"
                                                    style={{
                                                        background: checked ? "#fef9c3" : "#f8fafc",
                                                        borderColor: checked ? "#fcd34d" : "#e2e8f0",
                                                    }}>
                                                    <input type="checkbox" className="sr-only" checked={checked} onChange={() => toggleReactivate(Number(item.id))} />
                                                    <div className="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border-2 transition-all"
                                                        style={{ background: checked ? "#f59e0b" : "#fff", borderColor: checked ? "#f59e0b" : "#d1d5db" }}>
                                                        {checked && <CheckIcon />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="text-sm font-semibold text-gray-700">{item.serialNumber}</span>
                                                            <span className="text-xs px-1.5 py-0.5 rounded font-medium"
                                                                style={{ background: "#fef3c7", color: "#92400e" }}>
                                                                {item.status}
                                                            </span>
                                                        </div>
                                                        {(item.assetCode || item.macAddress) && (
                                                            <div className="flex gap-3 mt-0.5">
                                                                {item.assetCode && <span className="text-xs text-gray-400">Asset: <span className="text-gray-600">{item.assetCode}</span></span>}
                                                                {item.macAddress && <span className="text-xs text-gray-400">MAC: <span className="text-gray-600">{item.macAddress}</span></span>}
                                                            </div>
                                                        )}
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── NEGATIVE ── */}
                    {!isPositive(adjustmentType) && (
                        <div>
                            {hasRemovedHistory ? (
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Removed Serials</p>
                                        <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                                            style={{ background: "#fee2e2", color: "#b91c1c" }}>
                                            {availableItems.length} removed
                                        </span>
                                    </div>
                                    <div className="max-h-60 overflow-y-auto space-y-2 pr-0.5">
                                        {availableItems.map((item) => (
                                            <div key={item.id}
                                                className="flex items-center gap-3 p-3 rounded-xl border"
                                                style={{ background: "#fff5f5", borderColor: "#fca5a5" }}>
                                                <div className="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center"
                                                    style={{ background: "#ef4444" }}>
                                                    <CheckIcon />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-sm font-semibold text-gray-700">{item.serialNumber}</span>
                                                        <span className="text-xs px-1.5 py-0.5 rounded font-medium"
                                                            style={{ background: "#fee2e2", color: "#b91c1c" }}>
                                                            {item.status}
                                                        </span>
                                                    </div>
                                                    {(item.assetCode || item.macAddress) && (
                                                        <div className="flex gap-3 mt-0.5">
                                                            {item.assetCode && <span className="text-xs text-gray-400">Asset: <span className="text-gray-600">{item.assetCode}</span></span>}
                                                            {item.macAddress && <span className="text-xs text-gray-400">MAC: <span className="text-gray-600">{item.macAddress}</span></span>}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : isLoading ? (
                                <div className="flex flex-col items-center justify-center py-10 gap-3">
                                    <SpinnerIcon color="#ef4444" />
                                    <p className="text-sm text-gray-400">Loading items…</p>
                                </div>
                            ) : availableItems.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
                                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-1"
                                        style={{ background: "#fee2e2" }}>
                                        <EmptyBox color="#ef4444" />
                                    </div>
                                    <p className="text-sm font-semibold text-gray-600">No IN_STOCK serials found</p>
                                    <p className="text-xs text-gray-400">No available serials in this branch.</p>
                                </div>
                            ) : (
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Available Serials</p>
                                        <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                                            style={{ background: "#fee2e2", color: "#b91c1c" }}>
                                            {selectedToRemoveIds.length} selected
                                        </span>
                                    </div>
                                    <div className="max-h-60 overflow-y-auto space-y-2 pr-0.5">
                                        {availableItems.map((item) => {
                                            const checked = selectedToRemoveIds.includes(Number(item.id));
                                            return (
                                                <label key={item.id}
                                                    className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all"
                                                    style={{
                                                        background: checked ? "#fff5f5" : "#f8fafc",
                                                        borderColor: checked ? "#fca5a5" : "#e2e8f0",
                                                    }}>
                                                    <input type="checkbox" className="sr-only" checked={checked} onChange={() => toggleRemove(Number(item.id))} />
                                                    <div className="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border-2 transition-all"
                                                        style={{ background: checked ? "#ef4444" : "#fff", borderColor: checked ? "#ef4444" : "#d1d5db" }}>
                                                        {checked && <CheckIcon />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <span className="text-sm font-semibold text-gray-700 block">{item.serialNumber}</span>
                                                        {(item.assetCode || item.macAddress) && (
                                                            <div className="flex gap-3 mt-0.5">
                                                                {item.assetCode && <span className="text-xs text-gray-400">Asset: <span className="text-gray-600">{item.assetCode}</span></span>}
                                                                {item.macAddress && <span className="text-xs text-gray-400">MAC: <span className="text-gray-600">{item.macAddress}</span></span>}
                                                            </div>
                                                        )}
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Footer ── */}
                    <div className="flex gap-3 mt-6">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all"
                            style={{ borderColor: "#e2e8f0", color: "#64748b", background: "#fff" }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
                        >
                            Cancel
                        </button>
                        <button type="button" onClick={handleSave}
                            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
                            style={{ background: c.confirmBg, boxShadow: `0 4px 14px rgba(0,0,0,0.2)` }}
                            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
                            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                        >
                            Confirm
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StockAdjustmentTrackedModal;
