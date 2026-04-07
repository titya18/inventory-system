import { useCart } from "@/hooks/useCart";
import { Button } from "@/components/ui/button";
import { OrderDetails } from "./OrderDetails";
import { 
  Percent, 
  Receipt, 
  Truck, 
  Pause, 
  XCircle, 
  CreditCard, 
  ClipboardList, 
  RefreshCw,
  ArrowRightLeft,
  Banknote,
  Wallet,
  Gift,
  Building,
  FileCheck,
  UserPlus
} from "lucide-react";

export const OrderSidebar = () => {
  const { 
    items, 
    subtotal, 
    shipping, 
    tax, 
    discount, 
    grandTotal, 
    clearCart 
  } = useCart();

  const orderId = `#${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  const actionButtons = [
    { label: "Discount", variant: "discount" as const, icon: Percent },
    { label: "Tax", variant: "tax" as const, icon: Receipt },
    { label: "Shipping", variant: "shipping" as const, icon: Truck },
    { label: "Hold", variant: "hold" as const, icon: Pause },
    { label: "Void", variant: "void" as const, icon: XCircle },
    { label: "Payment", variant: "payment" as const, icon: CreditCard },
    { label: "View Orders", variant: "orders" as const, icon: ClipboardList },
    { label: "Reset", variant: "reset" as const, icon: RefreshCw, onClick: clearCart },
    { label: "Transaction", variant: "transaction" as const, icon: ArrowRightLeft },
  ];

  const paymentMethods = [
    { id: "cash", label: "Cash", icon: Banknote },
    { id: "card", label: "Card", icon: CreditCard },
    { id: "points", label: "Points", icon: Gift },
    { id: "deposit", label: "Deposit", icon: Building },
    { id: "cheque", label: "Cheque", icon: FileCheck },
  ];

  return (
    <aside className="w-[380px] bg-sidebar border-l border-sidebar-border flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="font-heading font-semibold text-lg text-sidebar-foreground">
              New Order
            </h2>
            <span className="bg-warning text-warning-foreground text-xs font-bold px-2 py-0.5 rounded">
              {orderId}
            </span>
          </div>
          <Button variant="ghost" size="sm" className="gap-1 text-primary hover:text-primary">
            <UserPlus className="w-4 h-4" />
            Add Customer
          </Button>
        </div>

        <select className="w-full h-10 px-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary">
          <option value="">Choose a Name</option>
          <option value="john">John Doe</option>
          <option value="jane">Jane Smith</option>
          <option value="alex">Alex Johnson</option>
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
              <span className="font-medium">${subtotal().toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sidebar-foreground">
              <span>Shipping</span>
              <span className="font-medium">${shipping}</span>
            </div>
            <div className="flex justify-between text-sidebar-foreground">
              <span>Tax (15%)</span>
              <span className="font-medium">${tax().toFixed(0)}</span>
            </div>
            <div className="flex justify-between text-success">
              <span>Discount (5%)</span>
              <span className="font-medium">-${discount().toFixed(0)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-sidebar-border">
              <span>Grand Total</span>
              <span>${grandTotal().toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="grid grid-cols-3 gap-2 mb-4">
          {actionButtons.map((btn) => (
            <Button
              key={btn.label}
              variant={btn.variant}
              size="sm"
              className="gap-1 text-xs"
              onClick={btn.onClick}
            >
              <btn.icon className="w-3 h-3" />
              {btn.label}
            </Button>
          ))}
        </div>

        {/* Payment Methods */}
        <div className="mb-4">
          <p className="text-sm font-medium text-sidebar-foreground mb-2">
            Select Payment
          </p>
          <div className="flex gap-2">
            {paymentMethods.map((method) => (
              <button
                key={method.id}
                className="flex-1 flex flex-col items-center gap-1 p-2 rounded-lg bg-card border border-border hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <method.icon className="w-5 h-5 text-warning" />
                <span className="text-xs text-sidebar-foreground">
                  {method.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Pay Button */}
        <Button variant="pay" className="w-full" size="xl">
          Pay: ${grandTotal().toLocaleString()}
        </Button>
      </div>
    </aside>
  );
};
