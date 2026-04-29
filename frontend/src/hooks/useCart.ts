import { create } from "zustand";

export interface UnitOption {
  unitId: number;
  unitName: string;
  price: number;        // suggestedRetailPrice for this unit
  isBaseUnit: boolean;
  multiplier: number;   // how many base units = 1 of this unit
}

export interface POSProduct {
  id: string;
  variantId: number;
  productId: number;
  name: string;
  price: number;
  stock: number;
  categoryId: number;
  categoryName: string;
  image?: string | null;
  barcode?: string;
  trackingType: string;
  unitId: number | null;
  unitName: string;
  baseUnitName: string;   // unit that stock quantity is tracked in
  branchId: number;
  unitOptions: UnitOption[];
}

export interface CartItem {
  product: POSProduct;
  quantity: number;
  // Unit (may differ from product default for conversion products)
  unitId: number | null;
  unitName: string;
  unitPrice: number;
  multiplier: number;   // base units per selected unit
  // Serial tracking
  serialSelectionMode: "AUTO" | "MANUAL";
  selectedTrackedItemIds: number[];
  selectedTrackedItems: any[];
}

interface CartStore {
  items: CartItem[];
  addItem: (product: POSProduct) => void;
  addItemWithConfig: (config: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  subtotal: () => number;
  grandTotal: () => number;
}

const defaultCartItem = (product: POSProduct): CartItem => ({
  product,
  quantity: 1,
  unitId: product.unitId,
  unitName: product.unitName,
  unitPrice: product.price,
  multiplier: 1,
  serialSelectionMode: "AUTO",
  selectedTrackedItemIds: [],
  selectedTrackedItems: [],
});

export const useCart = create<CartStore>((set, get) => ({
  items: [],

  addItem: (product: POSProduct) => {
    const items = get().items;
    const existing = items.find((i) => i.product.id === product.id);
    const currentQty = existing?.quantity ?? 0;
    if (product.stock > 0 && currentQty >= product.stock) return;

    if (existing) {
      set({
        items: items.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        ),
      });
    } else {
      set({ items: [...items, defaultCartItem(product)] });
    }
  },

  addItemWithConfig: (config) => {
    const items = get().items;
    const existing = items.find((i) => i.product.id === config.product.id);
    const newItem: CartItem = { ...config, quantity: config.quantity ?? 1 };

    if (existing) {
      set({ items: items.map((i) => (i.product.id === config.product.id ? newItem : i)) });
    } else {
      set({ items: [...items, newItem] });
    }
  },

  removeItem: (productId: string) => {
    const items = get().items;
    const existing = items.find((i) => i.product.id === productId);
    if (existing && existing.quantity > 1) {
      set({
        items: items.map((i) =>
          i.product.id === productId ? { ...i, quantity: i.quantity - 1 } : i
        ),
      });
    } else {
      set({ items: items.filter((i) => i.product.id !== productId) });
    }
  },

  updateQuantity: (productId: string, quantity: number) => {
    if (quantity <= 0) {
      set({ items: get().items.filter((i) => i.product.id !== productId) });
    } else {
      set({
        items: get().items.map((i) => {
          if (i.product.id !== productId) return i;
          const maxQty = i.product.stock > 0 ? i.product.stock : quantity;
          return { ...i, quantity: Math.min(quantity, maxQty) };
        }),
      });
    }
  },

  clearCart: () => set({ items: [] }),

  subtotal: () =>
    get().items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),

  grandTotal: () => get().subtotal(),
}));
