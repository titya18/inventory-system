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

const METHOD_STYLES = [
  { icon: Banknote,   active: "bg-emerald-500 text-white border-emerald-500", idle: "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100" },
  { icon: Building2,  active: "bg-blue-500 text-white border-blue-500",    idle: "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100" },
  { icon: CreditCard, active: "bg-violet-500 text-white border-violet-500", idle: "bg-violet-50 text-violet-600 border-violet-200 hover:bg-violet-100" },
  { icon: Wallet,     active: "bg-amber-500 text-white border-amber-500",   idle: "bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100" },
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

      {/* ── Dark header ── */}
      <div className="flex-shrink-0 bg-gray-900 px-4 pt-4 pb-3">
        {/* Title row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold text-sm tracking-widest uppercase">New Order</span>
            {items.length > 0 && (
              <span className="bg-primary text-white text-[10px] font-extrabold rounded-full w-5 h-5 flex items-center justify-center shadow">
                {items.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={clearCart}
              title="Reset"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleVoid}
              disabled={items.length === 0}
              title="Void"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-red-400 hover:bg-white/10 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
            >
              <XCircle className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Customer select */}
        <div className="flex items-center gap-2 bg-white/10 border border-white/10 rounded-xl px-3 py-2">
          <User className="w-3.5 h-3.5 text-white/50 flex-shrink-0" />
          <select
            className="bg-transparent text-white text-sm flex-1 focus:outline-none appearance-none cursor-pointer"
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(Number(e.target.value))}
          >
            <option value={0} className="text-gray-900">Walk-in Customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id} className="text-gray-900">
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
        <div className="mx-4 mb-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-4 py-3 flex items-center justify-between shadow-md shadow-indigo-500/20">
          <span className="text-indigo-100 text-sm font-semibold">Grand Total</span>
          <span className="text-white font-extrabold text-2xl">${total.toFixed(2)}</span>
        </div>

        {/* Payment methods */}
        {paymentMethods.length > 0 && (
          <div className="px-4 pb-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
              Payment Method
            </p>
            <div className="grid grid-cols-2 gap-2">
              {paymentMethods.map((method, i) => {
                const style = METHOD_STYLES[i % METHOD_STYLES.length];
                const Icon = style.icon;
                const isSelected = selectedPaymentMethodId === method.id;
                return (
                  <button
                    key={method.id}
                    onClick={() => setSelectedPaymentMethodId(method.id ?? null)}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                      isSelected ? style.active : style.idle
                    }`}
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
        <div className="px-4 pb-4">
          <button
            disabled={items.length === 0 || !selectedPaymentMethodId}
            onClick={() => setIsPaymentModalOpen(true)}
            className="w-full py-3.5 rounded-xl font-extrabold text-base transition-all active:scale-[0.98]
              bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600
              text-white shadow-lg shadow-green-500/30
              disabled:from-gray-100 disabled:to-gray-100 disabled:text-gray-400 disabled:shadow-none disabled:cursor-not-allowed"
          >
            {items.length === 0 ? "Select items to pay" : `Pay  $${total.toFixed(2)}`}
          </button>
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
