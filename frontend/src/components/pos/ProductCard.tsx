import { POSProduct, useCart } from "@/hooks/useCart";
import { Plus, Minus, Package } from "lucide-react";
import { useState } from "react";

export const ProductCard = ({ product }: { product: POSProduct }) => {
  const { items, addItem, removeItem } = useCart();
  const cartItem = items.find((i) => i.product.id === product.id);
  const qty = cartItem?.quantity ?? 0;
  const isOutOfStock = product.stock <= 0;
  const [imgError, setImgError] = useState(false);

  const hasImage = product.image && !imgError;

  return (
    <div
      onClick={() => { if (!isOutOfStock) addItem(product); }}
      className={`group relative bg-white rounded-xl border flex flex-col overflow-hidden transition-all duration-150 select-none ${
        isOutOfStock
          ? "opacity-55 border-gray-200 cursor-not-allowed"
          : qty > 0
          ? "border-primary shadow-lg shadow-primary/10 cursor-pointer ring-1 ring-primary/20"
          : "border-gray-200 hover:border-primary/50 hover:shadow-md cursor-pointer"
      }`}
    >
      {/* ── Image ── */}
      <div
        className="relative w-full bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0"
        style={{ height: '140px' }}
      >
        {hasImage ? (
          <img
            src={product.image!}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          !isOutOfStock && <Package className="w-10 h-10 text-gray-200" />
        )}

        {/* Out of stock overlay — covers everything cleanly */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-gray-50/95 flex flex-col items-center justify-center gap-1.5">
            <Package className="w-8 h-8 text-gray-300" />
            <span className="text-[11px] font-bold text-gray-400 bg-white border border-gray-200 px-2.5 py-1 rounded-full shadow-sm">
              Out of Stock
            </span>
          </div>
        )}

        {/* Cart qty badge */}
        {qty > 0 && (
          <div className="absolute top-2 left-2 bg-primary text-white text-xs font-bold min-w-[22px] h-[22px] rounded-full flex items-center justify-center px-1.5 shadow-md">
            {qty}
          </div>
        )}

        {/* +/- controls shown when in cart */}
        {!isOutOfStock && qty > 0 && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-full px-1.5 py-1 shadow-md border border-gray-100">
            <button
              onClick={(e) => { e.stopPropagation(); removeItem(product.id); }}
              className="w-5 h-5 rounded-full bg-gray-100 hover:bg-red-100 hover:text-red-500 flex items-center justify-center transition-colors"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="text-xs font-bold text-gray-700 min-w-[16px] text-center">{qty}</span>
            <button
              onClick={(e) => { e.stopPropagation(); addItem(product); }}
              className="w-5 h-5 rounded-full bg-primary text-white hover:bg-primary/80 flex items-center justify-center transition-colors"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Add button on hover (when not in cart) */}
        {!isOutOfStock && qty === 0 && (
          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); addItem(product); }}
              className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center shadow-lg hover:bg-primary/80 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* ── Info ── */}
      <div className="px-3 py-2.5 flex flex-col gap-2 flex-1">
        <p className="text-xs font-semibold text-gray-800 leading-snug line-clamp-2 min-h-[2.5em]">
          {product.name}
        </p>
        <div className="flex items-center justify-between gap-1 mt-auto">
          <span className="text-primary font-bold text-sm">${Number(product.price).toFixed(2)}</span>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full max-w-[80px] truncate ${
            product.stock <= 0
              ? "bg-red-50 text-red-400"
              : product.stock <= 5
              ? "bg-amber-50 text-amber-500"
              : "bg-green-50 text-green-600"
          }`} title={`${product.stock} ${product.unitName || "pcs"}`}>
            {product.stock} {product.unitName || "pcs"}
          </span>
        </div>
      </div>
    </div>
  );
};
