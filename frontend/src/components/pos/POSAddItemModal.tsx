import { useEffect, useState } from "react";
import { POSProduct, UnitOption, useCart } from "@/hooks/useCart";
import { getAvailableTrackedItems } from "@/api/invoice";
import { ProductTrackedItemType } from "@/data_types/types";
import { X, Package, Minus, Plus } from "lucide-react";
import { toast } from "react-toastify";

interface Props {
  product: POSProduct;
  onClose: () => void;
}

const isTracked = (t: string) => t && t !== "NONE";
const hasMultipleUnits = (p: POSProduct) => p.unitOptions.length > 1;

export const POSAddItemModal = ({ product, onClose }: Props) => {
  const { items, addItemWithConfig } = useCart();
  const cartItem = items.find((i) => i.product.id === product.id);

  // Unit selection
  const defaultUnit: UnitOption = product.unitOptions.find(u => u.unitId === product.unitId)
    ?? product.unitOptions[0]
    ?? { unitId: product.unitId ?? 0, unitName: product.unitName, price: product.price, isBaseUnit: true, multiplier: 1 };

  const [selectedUnit, setSelectedUnit] = useState<UnitOption>(
    cartItem ? (product.unitOptions.find(u => u.unitId === cartItem.unitId) ?? defaultUnit) : defaultUnit
  );
  const [quantity, setQuantity] = useState(cartItem?.quantity ?? 1);

  // Serial selection
  const [serialMode, setSerialMode] = useState<"AUTO" | "MANUAL">(cartItem?.serialSelectionMode ?? "AUTO");
  const [availableSerials, setAvailableSerials] = useState<ProductTrackedItemType[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>(cartItem?.selectedTrackedItemIds ?? []);
  const [loadingSerials, setLoadingSerials] = useState(false);

  // Max qty in selected unit: stock (base units) ÷ multiplier (base units per selected unit)
  const maxQty = selectedUnit.multiplier > 0
    ? Math.floor(product.stock / selectedUnit.multiplier)
    : product.stock;
  const needsSerial = isTracked(product.trackingType);
  const needsUnit = hasMultipleUnits(product);

  // Load serials for manual mode
  useEffect(() => {
    if (!needsSerial || !product.branchId) return;
    setLoadingSerials(true);
    getAvailableTrackedItems(product.variantId, product.branchId, null)
      .then(setAvailableSerials)
      .catch(() => {})
      .finally(() => setLoadingSerials(false));
  }, [product.variantId, product.branchId, needsSerial]);

  const toggleSerial = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(prev => prev.filter(x => x !== id));
    } else {
      if (selectedIds.length >= quantity) {
        toast.warning(`You can only select ${quantity} serial(s) for this quantity`, { autoClose: 2000 });
        return;
      }
      setSelectedIds(prev => [...prev, id]);
    }
  };

  const canConfirm = () => {
    if (needsSerial && serialMode === "MANUAL" && selectedIds.length !== quantity) return false;
    return quantity > 0 && quantity <= maxQty;
  };

  const handleConfirm = () => {
    if (!canConfirm()) return;
    const selectedItems = availableSerials.filter(s => selectedIds.includes(Number(s.id)));
    addItemWithConfig({
      product,
      quantity,
      unitId: selectedUnit.unitId,
      unitName: selectedUnit.unitName,
      unitPrice: selectedUnit.price,
      multiplier: selectedUnit.multiplier,
      serialSelectionMode: needsSerial ? serialMode : "AUTO",
      selectedTrackedItemIds: needsSerial && serialMode === "MANUAL" ? selectedIds : [],
      selectedTrackedItems: needsSerial && serialMode === "MANUAL" ? selectedItems : [],
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm flex flex-col" style={{ maxHeight: '90vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-800 text-sm leading-tight truncate">{product.name}</h3>
            <p className="text-xs text-gray-400 mt-0.5">${Number(product.price).toFixed(2)} · Stock: {product.stock} {product.baseUnitName || product.unitName}</p>
          </div>
          <button onClick={onClose} className="ml-3 w-7 h-7 rounded-full bg-gray-100 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-colors flex-shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 min-h-0 px-5 py-4 space-y-5">

          {/* Unit selector */}
          {needsUnit && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Select Unit</p>
              <div className="grid grid-cols-2 gap-2">
                {product.unitOptions.map(opt => (
                  <button
                    key={opt.unitId}
                    onClick={() => {
                      setSelectedUnit(opt);
                      const newMax = opt.multiplier > 0 ? Math.floor(product.stock / opt.multiplier) : product.stock;
                      setQuantity(q => Math.min(q, Math.max(1, newMax)));
                    }}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all text-left ${
                      selectedUnit.unitId === opt.unitId
                        ? "border-primary bg-primary text-white"
                        : "border-gray-200 text-gray-600 hover:border-primary/40"
                    }`}
                  >
                    <div>{opt.unitName}</div>
                    <div className={`text-[11px] mt-0.5 ${selectedUnit.unitId === opt.unitId ? "text-white/80" : "text-gray-400"}`}>
                      ${opt.price.toFixed(2)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Quantity</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-600 hover:border-primary hover:text-primary transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="number"
                min={1}
                max={maxQty}
                value={quantity}
                onChange={e => {
                  const v = Math.max(1, Math.min(maxQty, Number(e.target.value) || 1));
                  setQuantity(v);
                  if (selectedIds.length > v) setSelectedIds(prev => prev.slice(0, v));
                }}
                className="w-16 h-9 text-center border border-gray-200 rounded-xl text-sm font-bold text-gray-800 focus:outline-none focus:border-primary"
              />
              <button
                onClick={() => setQuantity(q => Math.min(maxQty, q + 1))}
                disabled={quantity >= maxQty}
                className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-600 hover:border-primary hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
              </button>
              <span className="text-xs text-gray-400">max {maxQty}</span>
            </div>
          </div>

          {/* Serial picker */}
          {needsSerial && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Serial Numbers</p>
              <div className="flex gap-2 mb-3">
                {(["AUTO", "MANUAL"] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => { setSerialMode(m); if (m === "AUTO") setSelectedIds([]); }}
                    className={`flex-1 py-2 rounded-lg border text-xs font-semibold transition-all ${
                      serialMode === m ? "border-primary bg-primary text-white" : "border-gray-200 text-gray-500 hover:border-primary/40"
                    }`}
                  >
                    {m === "AUTO" ? "Auto Assign" : "Pick Manually"}
                  </button>
                ))}
              </div>

              {serialMode === "MANUAL" && (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3">
                  <p className="text-xs text-indigo-500 font-medium mb-2">
                    Select {quantity} serial{quantity > 1 ? "s" : ""}
                    {selectedIds.length > 0 && <span className="ml-1 font-bold">({selectedIds.length}/{quantity} selected)</span>}
                  </p>
                  {loadingSerials ? (
                    <p className="text-xs text-gray-400 text-center py-3">Loading serials...</p>
                  ) : availableSerials.length === 0 ? (
                    <div className="flex flex-col items-center py-4 gap-1 text-gray-300">
                      <Package className="w-8 h-8" />
                      <p className="text-xs text-gray-400">No serials available</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {availableSerials.map(s => {
                        const checked = selectedIds.includes(Number(s.id));
                        return (
                          <label key={s.id} className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                            checked ? "bg-indigo-100 border-indigo-300" : "bg-white border-gray-200 hover:border-indigo-200"
                          }`}>
                            <input type="checkbox" checked={checked} onChange={() => toggleSerial(Number(s.id))} className="mt-0.5" />
                            <div className="text-xs">
                              <div className="font-semibold text-gray-700">{s.serialNumber}</div>
                              {s.assetCode && <div className="text-gray-400">Asset: {s.assetCode}</div>}
                              {s.macAddress && <div className="text-gray-400">MAC: {s.macAddress}</div>}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-5 py-4 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm()}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: canConfirm() ? 'linear-gradient(to right,#6366f1,#4f46e5)' : undefined, backgroundColor: canConfirm() ? undefined : '#e5e7eb' }}
          >
            {cartItem ? "Update" : "Add to Cart"} · ${(selectedUnit.price * quantity).toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  );
};
