import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/hooks/useCart";
import { OrderDetails } from "./OrderDetails";
import { PaymentModal } from "./PaymentModal";
import { getAllCustomers } from "@/api/customer";
import { getAllPaymentMethods } from "@/api/paymentMethod";
import { getLastExchangeRate } from "@/api/exchangeRate";
import { CustomerType, PaymentMethodType } from "@/data_types/types";
import { RefreshCw, XCircle, ShoppingCart, Banknote, CreditCard, Building2, Wallet, PauseCircle, ListOrdered, Landmark, AlertTriangle } from "lucide-react";
import { HeldOrdersModal } from "./HeldOrdersModal";
import { OpenCashModal, getOpenCashSession } from "./OpenCashModal";
import { CustomerPicker } from "./CustomerPicker";

interface OrderSidebarProps {
  branchId: number;
}

const METHOD_COLORS = [
  { icon: Banknote,   active: { background: '#059669', color: '#fff', borderColor: '#059669' }, idle: { background: '#ecfdf5', color: '#059669', borderColor: '#6ee7b7' } },
  { icon: Building2,  active: { background: '#2563eb', color: '#fff', borderColor: '#2563eb' }, idle: { background: '#eff6ff', color: '#2563eb', borderColor: '#93c5fd' } },
  { icon: CreditCard, active: { background: '#7c3aed', color: '#fff', borderColor: '#7c3aed' }, idle: { background: '#f5f3ff', color: '#7c3aed', borderColor: '#c4b5fd' } },
  { icon: Wallet,     active: { background: '#d97706', color: '#fff', borderColor: '#d97706' }, idle: { background: '#fffbeb', color: '#d97706', borderColor: '#fcd34d' } },
];

export const OrderSidebar = ({ branchId }: OrderSidebarProps) => {
  const navigate = useNavigate();
  const { items, subtotal, grandTotal, clearCart, holdCurrentOrder, heldOrders, saleType, setSaleType, addItemWithConfig } = useCart();

  const handleSaleTypeToggle = (type: "RETAIL" | "WHOLESALE") => {
    if (type === saleType) return;
    setSaleType(type);
    // Reprice all items in the cart to the new sale type price
    items.forEach((item) => {
      const unit = item.product.unitOptions.find(u => u.unitId === item.unitId) ?? item.product.unitOptions[0];
      const newPrice = type === "WHOLESALE"
        ? (unit?.wholeSalePrice ?? item.product.wholeSalePrice)
        : (unit?.price ?? item.product.price);
      addItemWithConfig({ ...item, unitPrice: newPrice });
    });
  };
  const [showHeldOrders, setShowHeldOrders] = useState(false);
  const [showOpenCash, setShowOpenCash] = useState(false);
  const [cashOpened, setCashOpened] = useState(() => !!getOpenCashSession());

  const [customers, setCustomers] = useState<CustomerType[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodType[]>([]);
  const [exchangeRate, setExchangeRate] = useState<number>(4100);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number>(0);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<number | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  useEffect(() => {
    getAllCustomers().then(setCustomers).catch(() => {});
    getAllPaymentMethods().then(setPaymentMethods).catch(() => {});
    getLastExchangeRate()
      .then((rate) => { if (rate?.amount) setExchangeRate(Number(rate.amount)); })
      .catch(() => {});
  }, []);

  const [showVoidConfirm, setShowVoidConfirm] = useState(false);

  const handleVoid = () => {
    if (items.length === 0) return;
    setShowVoidConfirm(true);
  };

  const handlePaySuccess = (paymentId: number) => {
    setIsPaymentModalOpen(false);
    navigate(`/print-payment-receipt/${paymentId}`);
  };

  const total = grandTotal();

  return (
    <aside className="lg:w-[340px] flex-shrink-0 flex flex-col lg:h-full border-t lg:border-t-0 lg:border-l border-gray-200 bg-gray-50">

      {/* ── Sale type toggle ── */}
      <div className="flex-shrink-0 px-3 py-2 flex gap-1.5" style={{ backgroundColor: '#0f172a' }}>
        {(["RETAIL", "WHOLESALE"] as const).map(type => (
          <button
            key={type}
            onClick={() => handleSaleTypeToggle(type)}
            className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all"
            style={{
              backgroundColor: saleType === type ? (type === "RETAIL" ? '#6366f1' : '#d97706') : 'rgba(255,255,255,0.07)',
              color: saleType === type ? '#fff' : '#64748b',
            }}
          >
            {type === "RETAIL" ? "Retail" : "Wholesale"}
          </button>
        ))}
      </div>

      {/* ── Dark header: title + controls only ── */}
      <div className="flex-shrink-0 px-4 py-2.5 flex items-center justify-between" style={{ backgroundColor: '#1e293b' }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
            <ShoppingCart className="w-3.5 h-3.5" style={{ color: '#94a3b8' }} />
          </div>
          <span className="font-bold text-sm tracking-wider uppercase" style={{ color: '#e2e8f0' }}>New Order</span>
          {items.length > 0 && (
            <span className="text-[10px] font-extrabold rounded-full w-5 h-5 flex items-center justify-center" style={{ backgroundColor: '#6366f1', color: '#fff' }}>
              {items.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* Open cash drawer */}
          <button
            onClick={() => setShowOpenCash(true)}
            title={cashOpened ? "Cash drawer open" : "Open cash drawer"}
            className="w-7 h-7 rounded-lg flex items-center justify-center relative transition-colors"
            style={{ color: cashOpened ? '#34d399' : '#94a3b8', backgroundColor: 'transparent' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <Landmark className="w-3.5 h-3.5" />
            {cashOpened && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#34d399' }} />
            )}
          </button>
          {/* Held orders list */}
          <button
            onClick={() => setShowHeldOrders(true)}
            title="Held orders"
            className="w-7 h-7 rounded-lg flex items-center justify-center relative transition-colors"
            style={{ color: '#fbbf24', backgroundColor: 'transparent' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <ListOrdered className="w-3.5 h-3.5" />
            {heldOrders.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                style={{ backgroundColor: '#f59e0b', color: '#fff' }}>
                {heldOrders.length}
              </span>
            )}
          </button>
          {/* Hold current order */}
          <button
            onClick={() => { if (items.length > 0) holdCurrentOrder(); }}
            disabled={items.length === 0}
            title="Hold order"
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: items.length === 0 ? '#475569' : '#a78bfa', backgroundColor: 'transparent', cursor: items.length === 0 ? 'not-allowed' : 'pointer' }}
            onMouseEnter={e => { if (items.length > 0) (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'); }}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <PauseCircle className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={clearCart}
            title="Reset order"
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: '#94a3b8', backgroundColor: 'transparent' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleVoid}
            disabled={items.length === 0}
            title="Void order"
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: items.length === 0 ? '#475569' : '#f87171', backgroundColor: 'transparent', cursor: items.length === 0 ? 'not-allowed' : 'pointer' }}
            onMouseEnter={e => { if (items.length > 0) e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.15)'; }}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <XCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Customer selector ── */}
      <div className="flex-shrink-0 px-3 py-2 border-b border-gray-100" style={{ backgroundColor: '#f8fafc' }}>
        <CustomerPicker
          customers={customers}
          selectedCustomerId={selectedCustomerId}
          onSelect={setSelectedCustomerId}
          onCustomerCreated={(c) => setCustomers((prev) => [...prev, c])}
        />
      </div>

      {/* ── Items list (scrollable) ── */}
      <div className="flex-1 overflow-y-auto min-h-0 bg-white px-4 py-3">
        <OrderDetails />
      </div>

      {/* ── Footer: totals + payment + pay ── */}
      <div className="flex-shrink-0 bg-white border-t border-gray-100">

        {/* Totals */}
        <div className="px-4 pt-3 pb-2 space-y-1">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Subtotal</span>
            <span className="text-gray-600 font-medium">${subtotal().toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span>Tax</span>
            <span className="text-gray-600 font-medium">$0.00</span>
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span>Discount</span>
            <span className="text-gray-600 font-medium">$0.00</span>
          </div>
        </div>

        {/* Grand total highlight */}
        <div
          className="mx-4 mb-2 rounded-xl px-3 py-2 flex items-center justify-between"
          style={{ background: 'linear-gradient(to right,#4f46e5,#6366f1)', boxShadow: '0 3px 10px rgba(99,102,241,0.25)' }}
        >
          <span className="text-xs font-semibold" style={{ color: '#c7d2fe' }}>Grand Total</span>
          <span className="font-extrabold text-lg" style={{ color: '#fff' }}>${total.toFixed(2)}</span>
        </div>

        {/* Payment methods */}
        {paymentMethods.length > 0 && (
          <div className="px-4 pb-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
              Payment Method
            </p>
            <div className="grid grid-cols-2 gap-2">
              {paymentMethods.map((method, i) => {
                const colors = METHOD_COLORS[i % METHOD_COLORS.length];
                const Icon = colors.icon;
                const isSelected = selectedPaymentMethodId === method.id;
                const btnStyle = isSelected ? colors.active : colors.idle;
                return (
                  <button
                    key={method.id}
                    onClick={() => setSelectedPaymentMethodId(method.id ?? null)}
                    className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-xs font-bold transition-all"
                    style={{ ...btnStyle, borderWidth: '1.5px', borderStyle: 'solid' }}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {method.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Pay button */}
        <div className="px-4 pb-4 mt-2">
          {!cashOpened ? (
            <button
              onClick={() => setShowOpenCash(true)}
              className="w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
              style={{ background: 'linear-gradient(to right,#f59e0b,#d97706)', color: '#fff', boxShadow: '0 4px 14px rgba(245,158,11,0.35)' }}
            >
              <Landmark className="w-4 h-4" />
              Open Cash Drawer First
            </button>
          ) : (items.length === 0 || !selectedPaymentMethodId) ? (
            <div className="w-full py-2.5 rounded-xl text-sm font-medium text-center border-2 border-dashed border-gray-200 text-gray-400 select-none">
              {items.length === 0 ? "Add items to pay" : "Select payment method"}
            </div>
          ) : (
            <button
              onClick={() => setIsPaymentModalOpen(true)}
              className="w-full py-2.5 rounded-xl font-bold text-sm transition-all active:scale-[0.98]"
              style={{ background: 'linear-gradient(to right,#22c55e,#10b981)', color: '#fff', boxShadow: '0 4px 14px rgba(34,197,94,0.4)' }}
            >
              Pay  ${total.toFixed(2)}
            </button>
          )}
        </div>
      </div>

      {showHeldOrders && <HeldOrdersModal onClose={() => setShowHeldOrders(false)} />}

      {showOpenCash && (
        <OpenCashModal
          exchangeRate={exchangeRate}
          branchId={branchId}
          onClose={() => { setShowOpenCash(false); setCashOpened(!!getOpenCashSession()); }}
        />
      )}

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        branchId={branchId}
        customerId={selectedCustomerId}
        grandTotal={total}
        exchangeRate={exchangeRate}
        paymentMethodId={selectedPaymentMethodId}
        saleType={saleType}
        onSuccess={handlePaySuccess}
      />

      {/* Void order confirmation */}
      {showVoidConfirm && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ zIndex: 99999, backgroundColor: "rgba(15,23,42,0.6)", backdropFilter: "blur(2px)" }}
        >
          <div className="w-full max-w-sm rounded-2xl overflow-hidden" style={{ backgroundColor: "#fff", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div className="px-5 pt-5 pb-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#fef2f2" }}>
                <AlertTriangle className="w-5 h-5" style={{ color: "#ef4444" }} />
              </div>
              <div>
                <h3 className="font-bold text-sm" style={{ color: "#1e293b" }}>Void Order?</h3>
                <p className="text-sm mt-1" style={{ color: "#64748b" }}>
                  All <span className="font-semibold" style={{ color: "#ef4444" }}>{items.length} item{items.length !== 1 ? "s" : ""}</span> will be removed from the cart. This cannot be undone.
                </p>
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-2">
              <button
                onClick={() => setShowVoidConfirm(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ backgroundColor: "#f1f5f9", color: "#64748b" }}
              >
                Cancel
              </button>
              <button
                onClick={() => { clearCart(); setShowVoidConfirm(false); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                style={{ background: "linear-gradient(to right,#ef4444,#dc2626)", color: "#fff", boxShadow: "0 4px 14px rgba(239,68,68,0.3)" }}
              >
                Void Order
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
