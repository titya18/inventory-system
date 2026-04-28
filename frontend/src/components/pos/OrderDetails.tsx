import { useCart } from "@/hooks/useCart";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";

export const OrderDetails = () => {
  const { items, updateQuantity, removeItem } = useCart();

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
    <div className="space-y-1">
      {items.map((item) => (
        <div
          key={item.product.id}
          className="flex items-center gap-2 py-2.5 border-b border-gray-100 last:border-0"
        >
          {/* Name + unit price */}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-800 truncate">{item.product.name}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              ${Number(item.product.price).toFixed(2)} / {item.product.unitName || "pcs"}
            </p>
          </div>

          {/* Qty stepper */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
              className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-primary hover:text-primary transition-colors"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="w-6 text-center text-xs font-bold text-gray-700">{item.quantity}</span>
            <button
              onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
              className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-primary hover:text-primary transition-colors"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          {/* Line total */}
          <span className="text-xs font-bold text-gray-700 w-14 text-right flex-shrink-0">
            ${(item.product.price * item.quantity).toFixed(2)}
          </span>

          {/* Remove */}
          <button
            onClick={() => removeItem(item.product.id)}
            className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
