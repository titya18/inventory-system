import { create } from "zustand";
import { Product } from "@/data/products";

interface CartItem {
  product: Product;
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  subtotal: () => number;
  shipping: number;
  taxRate: number;
  discountRate: number;
  tax: () => number;
  discount: () => number;
  grandTotal: () => number;
}

export const useCart = create<CartStore>((set, get) => ({
  items: [],
  shipping: 35,
  taxRate: 0.15,
  discountRate: 0.05,

  addItem: (product: Product) => {
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
    const discount = get().discount();
    const shipping = get().shipping;
    return subtotal + shipping + tax - discount;
  },
}));
