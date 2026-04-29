import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/hooks/useCart";
import { OrderDetails } from "./OrderDetails";
import { PaymentModal } from "./PaymentModal";
import { getAllCustomers } from "@/api/customer";
import { getAllPaymentMethods } from "@/api/paymentMethod";
import { getLastExchangeRate } from "@/api/exchangeRate";
import { CustomerType, PaymentMethodType } from "@/data_types/types";
import { RefreshCw, XCircle, ShoppingCart, User, Banknote, CreditCard, Building2, Wallet } from "lucide-react";

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
  const { items, subtotal, grandTotal, clearCart } = useCart();

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

  const handleVoid = () => {
    if (items.length === 0) return;
    if (window.confirm("Void this order? All items will be removed.")) clearCart();
  };

  const handlePaySuccess = (paymentId: number) => {
    setIsPaymentModalOpen(false);
    navigate(`/print-payment-receipt/${paymentId}`);
  };

  const total = grandTotal();

  return (
    <aside className="lg:w-[340px] flex-shrink-0 flex flex-col lg:h-full border-t lg:border-t-0 lg:border-l border-gray-200 bg-gray-50">

      {/* ── Dark header: title + controls only ── */}
      <div className="flex-shrink-0 px-4 py-3 flex items-center justify-between" style={{ backgroundColor: '#1e293b' }}>
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

      {/* ── Customer selector (light bg so native dropdown is readable) ── */}
      <div className="flex-shrink-0 px-3 py-2 border-b border-gray-100" style={{ backgroundColor: '#f8fafc' }}>
        <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-gray-200">
          <User className="w-3.5 h-3.5 flex-shrink-0 text-indigo-400" />
          <select
            className="bg-transparent text-sm flex-1 focus:outline-none cursor-pointer text-gray-700"
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(Number(e.target.value))}
          >
            <option value={0}>Walk-in Customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}{c.phone ? ` — ${c.phone}` : ""}
              </option>
            ))}
          </select>
        </div>
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
          {(items.length === 0 || !selectedPaymentMethodId) ? (
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

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        branchId={branchId}
        customerId={selectedCustomerId}
        grandTotal={total}
        exchangeRate={exchangeRate}
        paymentMethodId={selectedPaymentMethodId}
        onSuccess={handlePaySuccess}
      />
    </aside>
  );
};
