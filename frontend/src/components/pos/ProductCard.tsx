import { POSProduct, useCart } from "@/hooks/useCart";
import { Plus, Minus, Package } from "lucide-react";
import { useState } from "react";

export const ProductCard = ({ product }: { product: POSProduct }) => {
  const { items, addItem, removeItem } = useCart();
  const cartItem = items.find((i) => i.product.id === product.id);
  const qty = cartItem?.quantity ?? 0;
  const isOutOfStock = product.stock <= 0;
  const [imgError, setImgError] = useState(false);

  return (
    <div
      onClick={() => { if (!isOutOfStock) addItem(product); }}
      className={`group relative bg-card rounded-xl border flex flex-col overflow-hidden transition-all duration-150 ${
        isOutOfStock
          ? "opacity-60 border-border cursor-not-allowed"
          : "border-border hover:border-primary hover:shadow-md cursor-pointer"
      }`}
    >
      {/* ── Fixed-size image area ── */}
      <div className="relative w-full bg-muted/20 flex items-center justify-center overflow-hidden"
           style={{ height: '130px' }}>
        {product.image && !imgError ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <Package className="w-10 h-10 text-muted-foreground/30" />
        )}

        {/* Cart qty badge */}
        {qty > 0 && (
          <div className="absolute top-1.5 left-1.5 bg-primary text-white text-xs font-bold min-w-[22px] h-[22px] rounded-full flex items-center justify-center px-1 shadow">
            {qty}
          </div>
        )}

        {/* Out of stock overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <span className="text-[10px] font-bold text-destructive bg-white border border-destructive/30 px-1.5 py-0.5 rounded">
              Out of Stock
            </span>
          </div>
        )}

        {/* +/- controls */}
        {!isOutOfStock && qty > 0 && (
          <div className="absolute top-1.5 right-1.5 flex flex-col gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); removeItem(product.id); }}
              className="w-6 h-6 rounded-full bg-destructive text-white flex items-center justify-center shadow hover:bg-destructive/80"
            >
              <Minus className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); addItem(product); }}
              className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shadow hover:bg-primary/80"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        )}

        {!isOutOfStock && qty === 0 && (
          <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); addItem(product); }}
              className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shadow hover:bg-primary/80"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* ── Product info ── */}
      <div className="p-2 flex flex-col gap-1 flex-1 min-h-0">
        <p className="text-xs font-semibold text-foreground leading-tight line-clamp-2 min-h-[2.4em]">
          {product.name}
        </p>
        <div className="flex items-center justify-between mt-auto gap-1">
          <span className="text-primary font-bold text-sm">${Number(product.price).toFixed(2)}</span>
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded whitespace-nowrap ${
            product.stock <= 0
              ? "bg-destructive/10 text-destructive"
              : product.stock <= 5
              ? "bg-warning/10 text-warning"
              : "bg-success/10 text-success"
          }`}>
            {product.stock} {product.unitName || "pcs"}
          </span>
        </div>
      </div>
    </div>
  );
};
