import { useCart } from "@/hooks/useCart";
import { Minus, Plus, Trash2, ShoppingBag, Pencil } from "lucide-react";
import { useState } from "react";
import { POSAddItemModal } from "./POSAddItemModal";
import { toast } from "react-toastify";

export const OrderDetails = () => {
  const { items, updateQuantity } = useCart();
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  const editingItem = items.find(i => i.product.id === editingProductId) ?? null;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-gray-300 gap-3">
        <ShoppingBag className="w-10 h-10" />
        <div className="text-center">
          <p className="text-sm text-gray-400 font-medium">No items yet</p>
          <p className="text-xs text-gray-300 mt-0.5">Tap a product to add it</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-1">
        {items.map((item) => (
          <div
            key={item.product.id}
            className="flex items-center gap-2 py-2.5 border-b border-gray-100 last:border-0"
          >
            {/* Name + unit price + discount/tax badges */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-800 truncate">{item.product.name}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                ${Number(item.unitPrice).toFixed(2)} / {item.unitName || item.product.unitName || "pcs"}
              </p>
              {((item.discount ?? 0) > 0 || (item.orderTax ?? 0) > 0) && (
                <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                  {(item.discount ?? 0) > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ backgroundColor: "#fffbeb", color: "#b45309" }}>
                      -{item.discountType === "%" ? `${item.discount}%` : `$${(item.discount ?? 0).toFixed(2)}`}
                    </span>
                  )}
                  {(item.orderTax ?? 0) > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ backgroundColor: "#eff6ff", color: "#2563eb" }}>
                      Tax {item.orderTax}% {item.taxType === "Exclude" ? "(+)" : "(incl.)"}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Qty stepper */}
            {(() => {
              const cartBaseQty = item.quantity * (item.multiplier ?? 1);
              const isAtMax = item.product.stock > 0 && cartBaseQty >= item.product.stock;
              return (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                    className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-primary hover:text-primary transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center text-xs font-bold text-gray-700">{item.quantity}</span>
                  <button
                    onClick={() => {
                      if (isAtMax) {
                        toast.warning(
                          `Max stock reached: only ${item.product.stock} ${item.product.baseUnitName || item.product.unitName || "pcs"} available`,
                          { position: "top-center", autoClose: 2000, toastId: `max-${item.product.id}` }
                        );
                      } else {
                        updateQuantity(item.product.id, item.quantity + 1);
                      }
                    }}
                    className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${
                      isAtMax
                        ? "border-amber-300 bg-amber-50 text-amber-500"
                        : "border-gray-200 text-gray-500 hover:border-primary hover:text-primary"
                    }`}
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              );
            })()}

            {/* Line total (after discount + tax) */}
            <span className="text-xs font-bold text-gray-700 w-14 text-right flex-shrink-0">
              {(() => {
                const base = item.unitPrice * item.quantity;
                const discountType = item.discountType ?? "Fixed";
                const discount = item.discount ?? 0;
                const orderTax = item.orderTax ?? 0;
                const disc = discountType === "%" ? base * (discount / 100) : discount;
                const afterDisc = Math.max(0, base - disc);
                const total = item.taxType === "Exclude" ? afterDisc * (1 + orderTax / 100) : afterDisc;
                return `$${total.toFixed(2)}`;
              })()}
            </span>

            {/* Edit (tax/discount) */}
            <button
              onClick={() => setEditingProductId(item.product.id)}
              className="w-6 h-6 flex items-center justify-center flex-shrink-0 rounded transition-colors"
              style={{ color: "#94a3b8" }}
              title="Edit tax & discount"
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#6366f1"; (e.currentTarget as HTMLElement).style.backgroundColor = "#eef2ff"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#94a3b8"; (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
            >
              <Pencil className="w-3 h-3" />
            </button>

            {/* Remove — always deletes the entire line */}
            <button
              onClick={() => updateQuantity(item.product.id, 0)}
              className="w-6 h-6 flex items-center justify-center flex-shrink-0 rounded transition-colors"
              style={{ color: "#ef4444" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#b91c1c"; (e.currentTarget as HTMLElement).style.backgroundColor = "#fef2f2"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#ef4444"; (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Edit modal — opens for any cart item via pencil icon */}
      {editingItem && (
        <POSAddItemModal
          product={editingItem.product}
          onClose={() => setEditingProductId(null)}
        />
      )}
    </>
  );
};
