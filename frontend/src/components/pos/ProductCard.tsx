import { POSProduct, useCart } from "@/hooks/useCart";
import { Plus, Minus, Package, Settings2 } from "lucide-react";
import { useState } from "react";
import { toast } from "react-toastify";
import { POSAddItemModal } from "./POSAddItemModal";

export const ProductCard = ({ product }: { product: POSProduct }) => {
  const { items, addItemWithConfig, removeItem, updateQuantity, saleType } = useCart();
  const displayPrice = saleType === "WHOLESALE" ? product.wholeSalePrice : product.price;
  const cartItem = items.find((i) => i.product.id === product.id);
  const qty = cartItem?.quantity ?? 0;
  const isOutOfStock = product.stock <= 0;
  // Compare cart qty (in selected unit) × multiplier vs stock (in base units)
  const cartBaseQty = qty * (cartItem?.multiplier ?? 1);
  const isAtMaxStock = product.stock > 0 && cartBaseQty >= product.stock;
  const [imgError, setImgError] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const needsModal = product.trackingType !== "NONE" || product.unitOptions.length > 1;
  const hasImage = product.image && !imgError;

  const handleAdd = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (isOutOfStock) return;
    if (isAtMaxStock) {
      toast.warning(`Only ${product.stock} ${product.baseUnitName || product.unitName || "pcs"} available in stock`, {
        position: "top-center", autoClose: 2000, toastId: `max-stock-${product.id}`,
      });
      return;
    }
    if (needsModal) {
      setShowModal(true);
    } else {
      addItemWithConfig({
        product,
        unitId: product.unitId,
        unitName: product.unitName,
        unitPrice: displayPrice,
        multiplier: 1,
        serialSelectionMode: "AUTO",
        selectedTrackedItemIds: [],
        selectedTrackedItems: [],
        taxType: "Include",
        orderTax: 0,
        discountType: "Fixed",
        discount: 0,
      });
    }
  };

  const handleCardClick = () => {
    if (isOutOfStock) return;
    if (isAtMaxStock) { handleAdd(); return; }
    handleAdd();
  };

  return (
    <>
      <div
        onClick={handleCardClick}
        className={`group relative bg-white rounded-xl border flex flex-col overflow-hidden transition-all duration-150 select-none ${
          isOutOfStock
            ? "opacity-55 border-gray-200 cursor-not-allowed"
            : isAtMaxStock
            ? "border-amber-300 shadow-md shadow-amber-100 cursor-not-allowed"
            : qty > 0
            ? "border-primary shadow-lg shadow-primary/10 cursor-pointer ring-1 ring-primary/20"
            : "border-gray-200 hover:border-primary/50 hover:shadow-md cursor-pointer"
        }`}
      >
        {/* ── Image ── */}
        <div className="relative w-full bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0" style={{ height: '140px' }}>
          {hasImage ? (
            <img src={product.image!} alt={product.name} className="w-full h-full object-cover" onError={() => setImgError(true)} />
          ) : (
            !isOutOfStock && <Package className="w-10 h-10 text-gray-200" />
          )}

          {isOutOfStock && (
            <div className="absolute inset-0 bg-gray-50/95 flex flex-col items-center justify-center gap-1.5">
              <Package className="w-8 h-8 text-gray-300" />
              <span className="text-[11px] font-bold text-gray-400 bg-white border border-gray-200 px-2.5 py-1 rounded-full shadow-sm">Out of Stock</span>
            </div>
          )}

          {isAtMaxStock && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2">
              <span className="text-[10px] font-bold whitespace-nowrap px-2 py-0.5 rounded-full shadow-sm" style={{ backgroundColor: '#fffbeb', color: '#b45309', border: '1px solid #fcd34d' }}>
                Max stock
              </span>
            </div>
          )}

          {/* Qty badge */}
          {qty > 0 && (
            <div
              className="absolute top-2 left-2 text-white text-xs font-bold min-w-[22px] h-[22px] rounded-full flex items-center justify-center px-1.5 shadow-md"
              style={{ backgroundColor: isAtMaxStock ? '#f59e0b' : '#4361ee' }}
            >
              {qty}
            </div>
          )}

          {/* Configure icon — shown for tracked/multi-unit when in cart */}
          {needsModal && qty > 0 && !isOutOfStock && (
            <button
              onClick={e => { e.stopPropagation(); setShowModal(true); }}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/90 flex items-center justify-center shadow-md hover:bg-indigo-50 transition-colors"
              title="Edit selection"
            >
              <Settings2 className="w-3.5 h-3.5 text-indigo-500" />
            </button>
          )}

          {/* +/- controls (non-modal products only) */}
          {!needsModal && !isOutOfStock && qty > 0 && (
            <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-full px-1.5 py-1 shadow-md border border-gray-100">
              <button onClick={e => { e.stopPropagation(); removeItem(product.id); }} className="w-5 h-5 rounded-full bg-gray-100 hover:bg-red-100 hover:text-red-500 flex items-center justify-center transition-colors">
                <Minus className="w-3 h-3" />
              </button>
              <span className="text-xs font-bold text-gray-700 min-w-[16px] text-center">{qty}</span>
              <button
                onClick={e => { e.stopPropagation(); if (!isAtMaxStock) updateQuantity(product.id, qty + 1); else handleAdd(); }}
                disabled={isAtMaxStock}
                className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${isAtMaxStock ? "bg-amber-100 text-amber-400 cursor-not-allowed" : "bg-primary text-white hover:bg-primary/80"}`}
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Add on hover (not in cart, non-modal) */}
          {!needsModal && !isOutOfStock && qty === 0 && !isAtMaxStock && (
            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={handleAdd} className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center shadow-lg hover:bg-primary/80 transition-colors">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Add icon for modal products not in cart */}
          {needsModal && !isOutOfStock && qty === 0 && (
            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={handleAdd} className="w-7 h-7 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-lg hover:bg-indigo-600 transition-colors">
                <Settings2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* ── Info ── */}
        <div className="px-3 py-2.5 flex flex-col gap-2 flex-1">
          <div>
            <p className="text-xs font-semibold text-gray-800 leading-snug line-clamp-2">{product.name}</p>
            {product.productType === "SecondHand" ? (
              <span className="inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "#fef3c7", color: "#b45309" }}>
                2nd Hand
              </span>
            ) : product.productType === "New" ? (
              <span className="inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "#eff6ff", color: "#2563eb" }}>
                New
              </span>
            ) : null}
          </div>
          <div className="flex items-center justify-between gap-1 mt-auto">
            <span className="text-primary font-bold text-sm">${Number(cartItem?.unitPrice ?? displayPrice).toFixed(2)}</span>
            <span
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full max-w-[80px] truncate ${
                product.stock <= 0 ? "bg-red-50 text-red-400"
                : isAtMaxStock ? "bg-amber-50 text-amber-500"
                : product.stock <= 5 ? "bg-amber-50 text-amber-500"
                : "bg-green-50 text-green-600"
              }`}
              title={`${product.stock} ${product.baseUnitName || product.unitName || "pcs"}`}
            >
              {product.stock} {product.baseUnitName || product.unitName || "pcs"}
            </span>
          </div>
          {/* Show serial mode badge if tracked and in cart */}
          {needsModal && qty > 0 && product.trackingType !== "NONE" && (
            <div className="text-[10px] text-indigo-500 font-medium">
              {cartItem?.serialSelectionMode === "MANUAL"
                ? `${cartItem.selectedTrackedItemIds.length} serial(s) selected`
                : "Auto serial assign"}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <POSAddItemModal product={product} onClose={() => setShowModal(false)} />
      )}
    </>
  );
};
