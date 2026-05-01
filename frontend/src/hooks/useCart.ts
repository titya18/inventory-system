import { create } from "zustand";

export interface UnitOption {
  unitId: number;
  unitName: string;
  price: number;           // suggestedRetailPrice for this unit
  wholeSalePrice: number;  // suggestedWholesalePrice for this unit
  isBaseUnit: boolean;
  multiplier: number;      // how many base units = 1 of this unit
}

export interface POSProduct {
  id: string;
  variantId: number;
  productId: number;
  name: string;
  price: number;          // retail price
  wholeSalePrice: number; // wholesale price
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
  productType?: string; // "New" | "SecondHand"
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
  // Tax & discount
  taxType: "Include" | "Exclude";
  orderTax: number;       // tax percentage (e.g. 10 = 10%)
  discountType: "Fixed" | "%";
  discount: number;       // fixed amount or percentage
}

export interface HeldOrder {
  id: string;
  heldAt: Date;
  items: CartItem[];
  note?: string;
}

interface CartStore {
  items: CartItem[];
  heldOrders: HeldOrder[];
  activeOrderNote?: string;
  saleType: "RETAIL" | "WHOLESALE";
  setSaleType: (type: "RETAIL" | "WHOLESALE") => void; // name of the currently active recalled order
  addItem: (product: POSProduct) => void;
  addItemWithConfig: (config: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  holdCurrentOrder: (note?: string) => void;
  recallOrder: (id: string) => void;
  removeHeldOrder: (id: string) => void;
  updateHeldOrder: (id: string, patch: Partial<Pick<HeldOrder, "note">>) => void;
  reorderHeldOrders: (orders: HeldOrder[]) => void;
  subtotal: () => number;
  grandTotal: () => number;
}

const STORAGE_KEY = "pos-cart";
const DISPLAY_KEY = "pos-customer-display";

function loadFromStorage(): { items: CartItem[]; heldOrders: HeldOrder[]; activeOrderNote?: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        items: parsed.items ?? [],
        heldOrders: parsed.heldOrders ?? [],
        activeOrderNote: parsed.activeOrderNote,
      };
    }
  } catch {}
  return { items: [], heldOrders: [] };
}

function saveToStorage(items: CartItem[], heldOrders: HeldOrder[], activeOrderNote?: string) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ items, heldOrders, activeOrderNote }));
    // Mirror to customer display (same-origin storage event fires in other tabs/windows)
    const saleType = localStorage.getItem("pos-sale-type") ?? "RETAIL";
    localStorage.setItem(DISPLAY_KEY, JSON.stringify({ items, saleType }));
  } catch {}
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
  taxType: "Include",
  orderTax: 0,
  discountType: "Fixed",
  discount: 0,
});

function nextOrderName(heldOrders: HeldOrder[]): string {
  const used = new Set(heldOrders.map((o) => o.note));
  let n = 1;
  while (used.has(`Order ${n}`)) n++;
  return `Order ${n}`;
}

const saved = loadFromStorage();

export const useCart = create<CartStore>((set, get) => ({
  items: saved.items,
  heldOrders: saved.heldOrders,
  activeOrderNote: saved.activeOrderNote,
  saleType: (localStorage.getItem("pos-sale-type") as "RETAIL" | "WHOLESALE") ?? "RETAIL",

  setSaleType: (type) => {
    localStorage.setItem("pos-sale-type", type);
    set({ saleType: type });
  },

  addItem: (product: POSProduct) => {
    const items = get().items;
    const existing = items.find((i) => i.product.id === product.id);
    const currentQty = existing?.quantity ?? 0;
    if (product.stock > 0 && currentQty >= product.stock) return;

    let next: CartItem[];
    if (existing) {
      next = items.map((i) =>
        i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
      );
    } else {
      next = [...items, defaultCartItem(product)];
    }
    set({ items: next });
    saveToStorage(next, get().heldOrders, get().activeOrderNote);
  },

  addItemWithConfig: (config) => {
    const items = get().items;
    const existing = items.find((i) => i.product.id === config.product.id);
    const newItem: CartItem = { ...config, quantity: config.quantity ?? 1 };
    const next = existing
      ? items.map((i) => (i.product.id === config.product.id ? newItem : i))
      : [...items, newItem];
    set({ items: next });
    saveToStorage(next, get().heldOrders, get().activeOrderNote);
  },

  removeItem: (productId: string) => {
    const items = get().items;
    const existing = items.find((i) => i.product.id === productId);
    let next: CartItem[];
    if (existing && existing.quantity > 1) {
      next = items.map((i) =>
        i.product.id === productId ? { ...i, quantity: i.quantity - 1 } : i
      );
    } else {
      next = items.filter((i) => i.product.id !== productId);
    }
    set({ items: next });
    saveToStorage(next, get().heldOrders, get().activeOrderNote);
  },

  updateQuantity: (productId: string, quantity: number) => {
    let next: CartItem[];
    if (quantity <= 0) {
      next = get().items.filter((i) => i.product.id !== productId);
    } else {
      next = get().items.map((i) => {
        if (i.product.id !== productId) return i;
        const maxQty = i.product.stock > 0 ? i.product.stock : quantity;
        return { ...i, quantity: Math.min(quantity, maxQty) };
      });
    }
    set({ items: next });
    saveToStorage(next, get().heldOrders, get().activeOrderNote);
  },

  clearCart: () => {
    set({ items: [], activeOrderNote: undefined });
    saveToStorage([], get().heldOrders, undefined);
  },

  holdCurrentOrder: (note) => {
    const { items, heldOrders, activeOrderNote } = get();
    if (items.length === 0) return;
    const held: HeldOrder = {
      id: Date.now().toString(),
      heldAt: new Date(),
      items: [...items],
      note: note ?? activeOrderNote ?? nextOrderName(heldOrders),
    };
    const nextHeld = [held, ...heldOrders];
    set({ heldOrders: nextHeld, items: [], activeOrderNote: undefined });
    saveToStorage([], nextHeld, undefined);
  },

  recallOrder: (id) => {
    const { items, heldOrders, activeOrderNote } = get();
    const order = heldOrders.find((o) => o.id === id);
    if (!order) return;

    // Remove recalled order from hold list
    let nextHeld = heldOrders.filter((o) => o.id !== id);

    // Only auto-hold back if the current cart is itself a recalled order (activeOrderNote is set).
    // New items added fresh should NOT be auto-held — the user chose to replace them.
    if (items.length > 0 && activeOrderNote !== undefined) {
      const heldBack: HeldOrder = {
        id: Date.now().toString(),
        heldAt: new Date(),
        items: [...items],
        note: activeOrderNote,
      };
      nextHeld = [...nextHeld, heldBack];
    }

    set({ items: [...order.items], heldOrders: nextHeld, activeOrderNote: order.note });
    saveToStorage([...order.items], nextHeld, order.note);
  },

  removeHeldOrder: (id) => {
    const nextHeld = get().heldOrders.filter((o) => o.id !== id);
    set({ heldOrders: nextHeld });
    saveToStorage(get().items, nextHeld, get().activeOrderNote);
  },

  updateHeldOrder: (id, patch) => {
    const nextHeld = get().heldOrders.map((o) => o.id === id ? { ...o, ...patch } : o);
    set({ heldOrders: nextHeld });
    saveToStorage(get().items, nextHeld, get().activeOrderNote);
  },

  reorderHeldOrders: (orders) => {
    set({ heldOrders: orders });
    saveToStorage(get().items, orders, get().activeOrderNote);
  },

  subtotal: () =>
    get().items.reduce((sum, i) => {
      const base = i.unitPrice * i.quantity;
      const discountType = i.discountType ?? "Fixed";
      const discount = i.discount ?? 0;
      const orderTax = i.orderTax ?? 0;
      const disc = discountType === "%" ? base * (discount / 100) : discount;
      const afterDiscount = Math.max(0, base - disc);
      const total = i.taxType === "Exclude" ? afterDiscount * (1 + orderTax / 100) : afterDiscount;
      return sum + total;
    }, 0),

  grandTotal: () => get().subtotal(),
}));
