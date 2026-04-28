import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/hooks/useCart";
import { Button } from "@/components/ui/button";
import { OrderDetails } from "./OrderDetails";
import { PaymentModal } from "./PaymentModal";
import { getAllCustomers } from "@/api/customer";
import { getAllPaymentMethods } from "@/api/paymentMethod";
import { getLastExchangeRate } from "@/api/exchangeRate";
import { CustomerType, PaymentMethodType } from "@/data_types/types";
import { RefreshCw, XCircle, UserPlus } from "lucide-react";

interface OrderSidebarProps {
  branchId: number;
}

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
    getAllCustomers()
      .then(setCustomers)
      .catch(() => {});

    getAllPaymentMethods()
      .then(setPaymentMethods)
      .catch(() => {});

    getLastExchangeRate()
      .then((rate) => {
        if (rate?.amount) setExchangeRate(Number(rate.amount));
      })
      .catch(() => {});
  }, []);

  const handleVoid = () => {
    if (items.length === 0) return;
    if (window.confirm("Void this order? All items will be removed.")) {
      clearCart();
    }
  };

  const handlePaySuccess = (paymentId: number) => {
    setIsPaymentModalOpen(false);
    navigate(`/print-payment-receipt/${paymentId}`);
  };

  const total = grandTotal();

  return (
    <aside className="w-full lg:w-[320px] flex-shrink-0 bg-sidebar border-t lg:border-t-0 lg:border-l border-sidebar-border flex flex-col lg:h-full">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading font-semibold text-lg text-sidebar-foreground">
            New Order
          </h2>
          <Button variant="ghost" size="sm" className="gap-1 text-primary hover:text-primary">
            <UserPlus className="w-4 h-4" />
            Walk-in
          </Button>
        </div>

        <select
          className="w-full h-10 px-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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

      {/* Order Details */}
      <div className="flex-1 p-4 overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading font-medium text-sidebar-foreground">
            Order Details
          </h3>
          <span className="text-xs text-muted-foreground">
            Items: {items.length}
          </span>
        </div>

        <OrderDetails />

        {/* Summary */}
        {items.length > 0 && (
          <div className="mt-4 pt-4 border-t border-sidebar-border space-y-2 text-sm">
            <div className="flex justify-between text-sidebar-foreground">
              <span>Sub Total</span>
              <span className="font-medium">${subtotal().toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sidebar-foreground">
              <span>Tax</span>
              <span className="font-medium">$0.00</span>
            </div>
            <div className="flex justify-between text-sidebar-foreground">
              <span>Discount</span>
              <span className="font-medium">$0.00</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-sidebar-border">
              <span>Grand Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Actions + Payment */}
      <div className="p-4 border-t border-sidebar-border">
        {/* Quick action buttons */}
        <div className="flex gap-2 mb-4">
          <Button
            variant="reset"
            size="sm"
            className="gap-1 text-xs flex-1"
            onClick={clearCart}
          >
            <RefreshCw className="w-3 h-3" />
            Reset
          </Button>
          <Button
            variant="void"
            size="sm"
            className="gap-1 text-xs flex-1"
            onClick={handleVoid}
            disabled={items.length === 0}
          >
            <XCircle className="w-3 h-3" />
            Void
          </Button>
        </div>

        {/* Payment Methods */}
        {paymentMethods.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-medium text-sidebar-foreground mb-2">
              Select Payment
            </p>
            <div className="flex flex-wrap gap-2">
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  className={`flex-1 min-w-[70px] flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors ${
                    selectedPaymentMethodId === method.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "bg-card border-border hover:border-primary hover:bg-primary/5"
                  }`}
                  onClick={() => setSelectedPaymentMethodId(method.id ?? null)}
                >
                  <span className="text-xs text-sidebar-foreground font-medium">
                    {method.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Pay Button */}
        <Button
          variant="pay"
          className="w-full"
          size="xl"
          disabled={items.length === 0 || !selectedPaymentMethodId}
          onClick={() => setIsPaymentModalOpen(true)}
        >
          Pay: ${total.toFixed(2)}
        </Button>
      </div>

      {/* Payment Modal */}
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
