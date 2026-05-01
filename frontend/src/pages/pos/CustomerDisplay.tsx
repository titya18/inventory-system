import { useEffect, useState } from "react";
import { ShoppingBag, CheckCircle2 } from "lucide-react";

const CART_KEY = "pos-cart";
const DISPLAY_KEY = "pos-customer-display";

interface CartItem {
  product: { id: string; name: string; image?: string | null; unitName: string };
  quantity: number;
  unitName: string;
  unitPrice: number;
  multiplier: number;
  discount?: number;
  discountType?: string;
  orderTax?: number;
  taxType?: string;
}

interface DisplayState {
  items: CartItem[];
  saleType: string;
  paid?: boolean;        // set true when payment confirmed
  grandTotal?: number;
  exchangeRate?: number;
}

const lineTotal = (item: CartItem) => {
  const base = item.unitPrice * item.quantity;
  const discountType = item.discountType ?? "Fixed";
  const discount = item.discount ?? 0;
  const taxRate = item.orderTax ?? 0;
  const disc = discountType === "%" ? base * (discount / 100) : discount;
  const after = Math.max(0, base - disc);
  return item.taxType === "Exclude" ? after * (1 + taxRate / 100) : after;
};

const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtKHR = (n: number) => Math.round(n).toLocaleString();

export default function CustomerDisplay() {
  const [state, setState] = useState<DisplayState>({ items: [], saleType: "RETAIL" });

  const load = () => {
    try {
      const raw = localStorage.getItem(DISPLAY_KEY) ?? localStorage.getItem(CART_KEY);
      if (!raw) { setState({ items: [], saleType: "RETAIL" }); return; }
      const parsed = JSON.parse(raw);
      setState({
        items: parsed.items ?? [],
        saleType: parsed.saleType ?? "RETAIL",
        paid: parsed.paid ?? false,
        grandTotal: parsed.grandTotal,
        exchangeRate: parsed.exchangeRate,
      });
    } catch {}
  };

  useEffect(() => {
    load();
    const handler = (e: StorageEvent) => {
      if (e.key === DISPLAY_KEY || e.key === CART_KEY) load();
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const subtotal = state.items.reduce((s, i) => s + lineTotal(i), 0);
  const total = state.grandTotal ?? subtotal;
  const rate = state.exchangeRate ?? 4100;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "#0f172a", color: "#f1f5f9", fontFamily: "system-ui, sans-serif" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-8 py-4 flex-shrink-0"
        style={{ backgroundColor: "#1e293b", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#6366f1,#22c55e)" }}
          >
            <ShoppingBag className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-extrabold text-lg" style={{ color: "#f1f5f9" }}>QuickPOS</p>
            <p className="text-xs" style={{ color: "#64748b" }}>Customer Display</p>
          </div>
        </div>
        <div
          className="px-4 py-1.5 rounded-full text-xs font-bold"
          style={{
            backgroundColor: state.saleType === "WHOLESALE" ? "#d97706" : "#6366f1",
            color: "#fff",
          }}
        >
          {state.saleType === "WHOLESALE" ? "Wholesale" : "Retail"}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: item list */}
        <div className="flex-1 flex flex-col overflow-hidden px-8 py-6">
          {state.paid ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-6">
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "rgba(34,197,94,0.15)" }}
              >
                <CheckCircle2 className="w-14 h-14" style={{ color: "#22c55e" }} />
              </div>
              <div className="text-center">
                <p className="text-4xl font-extrabold" style={{ color: "#22c55e" }}>Thank You!</p>
                <p className="text-lg mt-2" style={{ color: "#64748b" }}>Payment received. Have a great day!</p>
              </div>
            </div>
          ) : state.items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <ShoppingBag className="w-20 h-20" style={{ color: "#1e293b" }} />
              <p className="text-xl font-semibold" style={{ color: "#334155" }}>Waiting for items...</p>
            </div>
          ) : (
            <>
              <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "#475569" }}>
                Your Order
              </p>
              <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {/* Table header */}
                <div className="grid grid-cols-12 text-xs font-bold uppercase tracking-wide pb-2" style={{ color: "#475569", borderBottom: "1px solid #1e293b" }}>
                  <span className="col-span-6">Item</span>
                  <span className="col-span-2 text-center">Qty</span>
                  <span className="col-span-2 text-right">Unit Price</span>
                  <span className="col-span-2 text-right">Total</span>
                </div>

                {state.items.map((item, idx) => (
                  <div
                    key={item.product.id}
                    className="grid grid-cols-12 items-center py-3 rounded-xl px-3"
                    style={{ backgroundColor: idx % 2 === 0 ? "rgba(255,255,255,0.03)" : "transparent" }}
                  >
                    <div className="col-span-6 flex items-center gap-3 min-w-0">
                      {item.product.image ? (
                        <img src={item.product.image} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: "#1e293b" }}>
                          <ShoppingBag className="w-4 h-4" style={{ color: "#334155" }} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate" style={{ color: "#f1f5f9" }}>{item.product.name}</p>
                        {((item.discount ?? 0) > 0 || (item.orderTax ?? 0) > 0) && (
                          <div className="flex gap-1 mt-0.5 flex-wrap">
                            {(item.discount ?? 0) > 0 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ backgroundColor: "#431407", color: "#fb923c" }}>
                                -{item.discountType === "%" ? `${item.discount}%` : `$${(item.discount ?? 0).toFixed(2)}`}
                              </span>
                            )}
                            {(item.orderTax ?? 0) > 0 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ backgroundColor: "#1e3a5f", color: "#60a5fa" }}>
                                Tax {item.orderTax}%
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="col-span-2 text-center">
                      <span className="text-base font-bold" style={{ color: "#94a3b8" }}>{item.quantity}</span>
                      <span className="text-xs ml-1" style={{ color: "#475569" }}>{item.unitName || item.product.unitName}</span>
                    </div>
                    <div className="col-span-2 text-right">
                      <span className="text-sm font-semibold" style={{ color: "#94a3b8" }}>${fmt(item.unitPrice)}</span>
                    </div>
                    <div className="col-span-2 text-right">
                      <span className="text-base font-bold" style={{ color: "#f1f5f9" }}>${fmt(lineTotal(item))}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Right: totals panel */}
        {!state.paid && state.items.length > 0 && (
          <div
            className="w-72 flex-shrink-0 flex flex-col justify-between p-6"
            style={{ backgroundColor: "#1e293b", borderLeft: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "#475569" }}>Summary</p>

              <div className="flex justify-between text-sm" style={{ color: "#64748b" }}>
                <span>Items</span>
                <span className="font-medium">{state.items.reduce((s, i) => s + i.quantity, 0)}</span>
              </div>
              <div className="flex justify-between text-sm" style={{ color: "#64748b" }}>
                <span>Subtotal</span>
                <span className="font-medium" style={{ color: "#94a3b8" }}>${fmt(subtotal)}</span>
              </div>
              {total !== subtotal && (
                <div className="flex justify-between text-sm" style={{ color: "#64748b" }}>
                  <span>Adjustments</span>
                  <span className="font-medium" style={{ color: total > subtotal ? "#f87171" : "#4ade80" }}>
                    {total > subtotal ? "+" : ""}${fmt(total - subtotal)}
                  </span>
                </div>
              )}

              <div
                className="rounded-xl p-4 mt-4"
                style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)" }}
              >
                <p className="text-xs font-semibold mb-1" style={{ color: "#c7d2fe" }}>Total Amount</p>
                <p className="text-4xl font-extrabold" style={{ color: "#fff" }}>${fmt(total)}</p>
                <p className="text-sm mt-1" style={{ color: "#a5b4fc" }}>
                  ≈ {fmtKHR(total * rate)} ៛
                </p>
              </div>

              <div
                className="rounded-xl p-3 text-center mt-2"
                style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <p className="text-xs" style={{ color: "#475569" }}>Exchange Rate</p>
                <p className="text-sm font-bold mt-0.5" style={{ color: "#64748b" }}>1$ = {fmtKHR(rate)} ៛</p>
              </div>
            </div>

            <div className="text-center mt-6">
              <p className="text-xs" style={{ color: "#334155" }}>Please wait while the cashier processes your order</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="flex-shrink-0 px-8 py-3 flex items-center justify-between"
        style={{ backgroundColor: "#0a0f1e", borderTop: "1px solid rgba(255,255,255,0.04)" }}
      >
        <p className="text-xs" style={{ color: "#1e293b" }}>© {new Date().getFullYear()} QuickPOS</p>
        <p className="text-xs" style={{ color: "#1e293b" }}>Thank you for your business</p>
      </div>
    </div>
  );
}
