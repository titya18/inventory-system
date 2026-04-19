import React, { useEffect, useState } from "react";
import { getAvailableTrackedItems } from "@/api/invoice";
import { ProductTrackedItemType } from "@/data_types/types";

interface TrackedItemsPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    variantId: number;
    branchId: number;
    existingItemId?: number | null;
    mode: "AUTO" | "MANUAL";
    selectedIds: number[];
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
    onSave,
}) => {
    const [mode, setMode] = useState<"AUTO" | "MANUAL">(initialMode);
    const [selectedIds, setSelectedIds] = useState<number[]>(initialSelectedIds);
    const [availableItems, setAvailableItems] = useState<ProductTrackedItemType[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setMode(initialMode);
        setSelectedIds(initialSelectedIds);
    }, [isOpen, initialMode, initialSelectedIds]);

    useEffect(() => {
        if (!isOpen || !variantId || !branchId) return;
        setIsLoading(true);
        getAvailableTrackedItems(variantId, branchId, existingItemId ?? null)
            .then((rows) => setAvailableItems(rows))
            .catch(console.error)
            .finally(() => setIsLoading(false));
    }, [isOpen, variantId, branchId, existingItemId]);

    const toggle = (id: number) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    const handleSave = () => {
        const items = availableItems.filter((x) => selectedIds.includes(Number(x.id)));
        onSave(mode, selectedIds, items);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-white dark:bg-[#1b2e4b] rounded-lg shadow-xl w-full max-w-md mx-4 p-5">
                <div className="flex items-center justify-between mb-4">
                    <h5 className="text-base font-semibold">Serial / Asset Selection</h5>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-danger text-xl leading-none">✕</button>
                </div>

                {/* AUTO / MANUAL toggle */}
                <div className="mb-4 flex gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            className="form-radio"
                            checked={mode === "AUTO"}
                            onChange={() => { setMode("AUTO"); setSelectedIds([]); }}
                        />
                        <span className="text-sm">Auto (system assigns)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            className="form-radio"
                            checked={mode === "MANUAL"}
                            onChange={() => setMode("MANUAL")}
                        />
                        <span className="text-sm">Manual (choose exact)</span>
                    </label>
                </div>

                {/* Serial list */}
                {mode === "MANUAL" && (
                    <div className="mb-4 rounded-md border border-indigo-200 bg-indigo-50 px-3 py-3">
                        <p className="text-sm font-semibold mb-2">Available Serials in Branch</p>
                        {isLoading ? (
                            <p className="text-sm text-gray-500">Loading...</p>
                        ) : availableItems.length === 0 ? (
                            <p className="text-sm text-red-500">No serials available in this branch.</p>
                        ) : (
                            <div className="max-h-60 overflow-y-auto space-y-2">
                                {availableItems.map((item) => {
                                    const checked = selectedIds.includes(Number(item.id));
                                    return (
                                        <label
                                            key={item.id}
                                            className={`flex items-start gap-3 p-2 rounded border cursor-pointer ${
                                                checked ? "bg-indigo-100 border-indigo-400" : "bg-white border-gray-200"
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() => toggle(Number(item.id))}
                                                className="mt-1"
                                            />
                                            <div className="text-sm">
                                                <div><strong>Serial:</strong> {item.serialNumber}</div>
                                                {item.assetCode && <div><strong>Asset:</strong> {item.assetCode}</div>}
                                                {item.macAddress && <div><strong>MAC:</strong> {item.macAddress}</div>}
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                <div className="flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="btn btn-outline-danger">
                        Cancel
                    </button>
                    <button type="button" onClick={handleSave} className="btn btn-primary">
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TrackedItemsPickerModal;
