import { create } from "zustand";

export interface POSProduct {
  id: string;           // productVariantId as string (cart key)
  variantId: number;
  productId: number;
  name: string;
  price: number;        // retailPrice for this unit
  stock: number;        // current stock in branch
  categoryId: number;
  categoryName: string;
  image?: string | null;
  barcode?: string;
  trackingType: string; // "NONE" | "ASSET_ONLY" | "MAC_ONLY" | "ASSET_AND_MAC"
  unitId: number | null;
  unitName: string;
}

interface CartItem {
  product: POSProduct;
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  taxRate: number;
  discountRate: number;
  shipping: number;
  addItem: (product: POSProduct) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  setTaxRate: (rate: number) => void;
  setDiscountRate: (rate: number) => void;
  setShipping: (amount: number) => void;
  subtotal: () => number;
  tax: () => number;
  discount: () => number;
  grandTotal: () => number;
}

export const useCart = create<CartStore>((set, get) => ({
  items: [],
  taxRate: 0,
  discountRate: 0,
  shipping: 0,

  addItem: (product: POSProduct) => {
    const items = get().items;
    const existingItem = items.find((item) => item.product.id === product.id);

    if (existingItem) {
      set({
        items: items.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ),
      });
    } else {
      set({ items: [...items, { product, quantity: 1 }] });
    }
  },

  removeItem: (productId: string) => {
    const items = get().items;
    const existingItem = items.find((item) => item.product.id === productId);

    if (existingItem && existingItem.quantity > 1) {
      set({
        items: items.map((item) =>
          item.product.id === productId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        ),
      });
    } else {
      set({ items: items.filter((item) => item.product.id !== productId) });
    }
  },

  updateQuantity: (productId: string, quantity: number) => {
    if (quantity <= 0) {
      set({ items: get().items.filter((item) => item.product.id !== productId) });
    } else {
      set({
        items: get().items.map((item) =>
          item.product.id === productId ? { ...item, quantity } : item
        ),
      });
    }
  },

  clearCart: () => set({ items: [] }),

  setTaxRate: (rate: number) => set({ taxRate: rate }),
  setDiscountRate: (rate: number) => set({ discountRate: rate }),
  setShipping: (amount: number) => set({ shipping: amount }),

  subtotal: () => {
    return get().items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );
  },

  tax: () => {
    return get().subtotal() * get().taxRate;
  },

  discount: () => {
    return get().subtotal() * get().discountRate;
  },

  grandTotal: () => {
    const subtotal = get().subtotal();
    const tax = get().tax();
    const disc = get().discount();
    const shipping = get().shipping;
    return subtotal + shipping + tax - disc;
  },
}));
