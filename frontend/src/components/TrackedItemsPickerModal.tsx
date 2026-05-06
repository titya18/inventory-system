import React, { useEffect, useState } from "react";
import { getAvailableTrackedItems } from "@/api/invoice";
import { getAvailableAssetItems } from "@/api/customerEquipment";
import { ProductTrackedItemType } from "@/data_types/types";

interface TrackedItemsPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    variantId: number;
    branchId: number;
    existingItemId?: number | null;
    mode: "AUTO" | "MANUAL";
    selectedIds: number[];
    orderId?: number | null; // when set: show invoice serials + IN_STOCK serials
    onSave: (mode: "AUTO" | "MANUAL", ids: number[], items: ProductTrackedItemType[]) => void;
}

const TrackedItemsPickerModal: React.FC<TrackedItemsPickerModalProps> = ({
    isOpen,
    onClose,
    variantId,
    branchId,
    existingItemId,
    mode: initialMode,
    selectedIds: initialSelectedIds,
    orderId,
    onSave,
}) => {
    const [mode, setMode] = useState<"AUTO" | "MANUAL">(initialMode);
    const [selectedIds, setSelectedIds] = useState<number[]>(initialSelectedIds);
    const [availableItems, setAvailableItems] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setMode(initialMode);
        setSelectedIds(initialSelectedIds);
    }, [isOpen, initialMode, initialSelectedIds]);

    useEffect(() => {
        if (!isOpen || !variantId || !branchId) return;
        setIsLoading(true);

        if (orderId) {
            // Invoice linked: fetch all serials so we can show SOLD (invoice) ones too
            getAvailableAssetItems(variantId, branchId, existingItemId ?? undefined)
                .then((rows: any[]) => {
                    // Keep: IN_STOCK serials + SOLD serials from THIS invoice only
                    const filtered = rows.filter((r) => {
                        if (r.status === "IN_STOCK") return true;
                        if (r.status === "SOLD") {
                            const soldOrderId = r.orderItemLinks?.[0]?.orderItem?.order?.id;
                            return soldOrderId === orderId;
                        }
                        return false;
                    });
                    setAvailableItems(filtered);
                    // Auto-select invoice serials if nothing is selected yet
                    if (initialSelectedIds.length === 0) {
                        const invoiceIds = filtered
                            .filter((r) => r.status === "SOLD")
                            .map((r) => Number(r.id));
                        setSelectedIds(invoiceIds);
                    }
                })
                .catch(console.error)
                .finally(() => setIsLoading(false));
        } else {
            // Pass previously-selected IDs so the backend also returns them even if no longer IN_STOCK
            getAvailableTrackedItems(variantId, branchId, existingItemId ?? null, initialSelectedIds)
                .then((rows) => setAvailableItems(rows))
                .catch(console.error)
                .finally(() => setIsLoading(false));
        }
    }, [isOpen, variantId, branchId, existingItemId, orderId]);

    const toggle = (id: number, blocked: boolean) => {
        if (blocked) return;
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    const handleSave = () => {
        const items = availableItems.filter((x) => selectedIds.includes(Number(x.id)));
        onSave(mode, selectedIds, items as ProductTrackedItemType[]);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 p-4"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div
                className="bg-white dark:bg-[#1b2e4b] rounded-lg shadow-xl w-full max-w-md flex flex-col"
                style={{ maxHeight: '88vh' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-[#1b2e4b] flex-shrink-0">
                    <div>
                        <h5 className="text-base font-semibold">Serial / Asset Selection</h5>
                        {orderId && (
                            <p className="text-xs text-green-600 mt-0.5">✓ Invoice linked — invoice serials shown</p>
                        )}
                    </div>
                    <button type="button" onClick={onClose}
                        className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-600 transition-colors">
                        ✕
                    </button>
                </div>

                {/* Scrollable body */}
                <div className="overflow-y-auto flex-grow px-5 py-4">
                    {/* AUTO / MANUAL toggle */}
                    <div className="mb-4 flex gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" className="form-radio" checked={mode === "AUTO"}
                                onChange={() => { setMode("AUTO"); setSelectedIds([]); }} />
                            <span className="text-sm">Auto (system assigns)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" className="form-radio" checked={mode === "MANUAL"}
                                onChange={() => setMode("MANUAL")} />
                            <span className="text-sm">Manual (choose exact)</span>
                        </label>
                    </div>

                    {/* Serial list */}
                    {mode === "MANUAL" && (
                        <div className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-3">
                            <p className="text-sm font-semibold mb-2">
                                {orderId ? "Serials (invoice + available)" : "Available Serials in Branch"}
                                {selectedIds.length > 0 && (
                                    <span className="ml-2 text-indigo-600">({selectedIds.length} selected)</span>
                                )}
                            </p>
                            {isLoading ? (
                                <p className="text-sm text-gray-500">Loading...</p>
                            ) : availableItems.length === 0 ? (
                                <p className="text-sm text-red-500">No serials available in this branch.</p>
                            ) : (
                                <>
                                {/* Warning: previously selected serials that are no longer available */}
                                {availableItems.some(
                                    (i) => initialSelectedIds.includes(Number(i.id)) && i.status !== "IN_STOCK" && !(orderId && i.status === "SOLD")
                                ) && (() => {
                                    const count = availableItems.filter(
                                        (i) => initialSelectedIds.includes(Number(i.id)) && i.status !== "IN_STOCK" && !(orderId && i.status === "SOLD")
                                    ).length;
                                    return (
                                        <div className="mb-2 rounded bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                                            ⚠ <strong>{count}</strong> previously selected serial{count > 1 ? "s are" : " is"} no longer available — please deselect and choose new ones.
                                        </div>
                                    );
                                })()}
                                <div className="space-y-2">
                                    {availableItems.map((item) => {
                                        const checked = selectedIds.includes(Number(item.id));
                                        const isInvoiceSerial = orderId && item.status === "SOLD";
                                        const unavailable = !orderId && item.status !== "IN_STOCK";
                                        return (
                                            <label
                                                key={item.id}
                                                className={`flex items-start gap-3 p-2 rounded border ${unavailable ? "cursor-not-allowed opacity-70" : "cursor-pointer"} ${
                                                    checked
                                                        ? isInvoiceSerial
                                                            ? "bg-green-50 border-green-400"
                                                            : unavailable
                                                                ? "bg-red-50 border-red-300"
                                                                : "bg-indigo-100 border-indigo-400"
                                                        : unavailable
                                                            ? "bg-red-50 border-red-200"
                                                            : "bg-white border-gray-200 hover:bg-gray-50"
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    disabled={unavailable && !checked}
                                                    onChange={() => toggle(Number(item.id), unavailable && !checked)}
                                                    className="mt-1"
                                                />
                                                <div className="text-sm flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span><strong>Serial:</strong> {item.serialNumber}</span>
                                                        {isInvoiceSerial && (
                                                            <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-green-100 text-green-700">✓ From invoice</span>
                                                        )}
                                                        {!isInvoiceSerial && item.status === "IN_STOCK" && (
                                                            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">IN_STOCK</span>
                                                        )}
                                                        {unavailable && (
                                                            <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-red-100 text-red-600">⚠ {item.status} — no longer available</span>
                                                        )}
                                                    </div>
                                                    {item.assetCode && <div><strong>Asset:</strong> {item.assetCode}</div>}
                                                    {item.macAddress && <div><strong>MAC:</strong> {item.macAddress}</div>}
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-200 dark:border-[#1b2e4b] flex-shrink-0">
                    <button type="button" onClick={onClose} className="btn btn-outline-danger">Cancel</button>
                    <button type="button" onClick={handleSave} className="btn btn-primary">Confirm</button>
                </div>
            </div>
        </div>
    );
};

export default TrackedItemsPickerModal;
