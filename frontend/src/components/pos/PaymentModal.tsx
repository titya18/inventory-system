import { useState } from "react";
import { toast } from "react-toastify";
import { useCart } from "@/hooks/useCart";
import { getNextInvoiceRef, upsertInvoice, ApprovedInvoice, insertInvoicePayment } from "@/api/invoice";
import { InvoiceType, InvoicePaymentType } from "@/data_types/types";
import { Button } from "@/components/ui/button";
import { X, Loader2 } from "lucide-react";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchId: number;
  customerId: number;
  grandTotal: number;
  exchangeRate: number;
  paymentMethodId: number | null;
  onSuccess: (paymentId: number) => void;
}

export const PaymentModal = ({
  isOpen,
  onClose,
  branchId,
  customerId,
  grandTotal,
  exchangeRate,
  paymentMethodId,
  onSuccess,
}: PaymentModalProps) => {
  const { items, clearCart } = useCart();
  const [receivedAmount, setReceivedAmount] = useState<string>("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const received = parseFloat(receivedAmount) || 0;
  const change = received - grandTotal;
  const canPay = received >= grandTotal && items.length > 0 && paymentMethodId !== null;

  const today = new Date().toISOString().slice(0, 10);

  const handleConfirm = async () => {
    if (!canPay) return;
    setLoading(true);
    try {
      // 1. Get next invoice ref
      const ref = await getNextInvoiceRef(branchId);

      // 2. Build invoice items from cart
      const invoiceItems = items.map((item) => ({
        id: 0,
        orderId: 0,
        productId: item.product.productId,
        productVariantId: item.product.variantId,
        ItemType: "PRODUCT",
        quantity: item.quantity,
        unitQty: item.quantity,
        baseQty: item.quantity,
        unitId: item.product.unitId ?? null,
        price: item.product.price,
        taxNet: 0,
        taxMethod: "0",
        discount: 0,
        discountMethod: "0",
        total: item.product.price * item.quantity,
        costPerBaseUnit: 0,
        stocks: item.product.stock,
      }));

      // 3. Build invoice payload
      const invoicePayload: InvoiceType = {
        branchId,
        customerId: customerId || 0,
        ref,
        orderDate: today,
        taxRate: "0",
        taxNet: 0,
        discount: 0,
        shipping: "0",
        totalAmount: grandTotal,
        exchangeRate: exchangeRate,
        paidAmount: null,
        status: "PENDING",
        OrderSaleType: "RETAIL",
        note: "",
        delReason: "",
        branch: null,
        customers: null,
        items: invoiceItems,
      };

      // 4. Create invoice
      const created = await upsertInvoice(invoicePayload);
      const orderId = created.id!;

      // 5. Approve invoice (cuts stock via FIFO)
      await ApprovedInvoice(orderId);

      // 6. Record payment
      const paymentPayload: InvoicePaymentType = {
        branchId,
        orderId,
        paymentMethodId,
        paidAmount: null,
        totalPaid: grandTotal,
        receive_usd: received,
        receive_khr: null,
        exchangerate: exchangeRate,
        due_balance: 0,
        createdAt: null,
        paymentMethods: null,
      };
      const payment = await insertInvoicePayment(paymentPayload);
      const paymentId = (payment as any).id as number;

      // 7. Clear cart and notify
      clearCart();
      toast.success("Payment successful!");
      setReceivedAmount("");
      onSuccess(paymentId);
    } catch (err: any) {
      toast.error(err?.message || "Payment failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setReceivedAmount("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card rounded-xl shadow-xl w-full max-w-md mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border flex-shrink-0">
          <h2 className="font-heading font-semibold text-lg text-foreground">
            Confirm Payment
          </h2>
          <button
            onClick={handleClose}
            disabled={loading}
            className="w-8 h-8 rounded-full bg-secondary hover:bg-destructive/10 hover:text-destructive flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Order summary */}
          <div className="bg-secondary/30 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Items</span>
              <span>{items.length} product{items.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="flex justify-between font-bold text-base text-foreground border-t border-border pt-2">
              <span>Total</span>
              <span>${grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Received Amount */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Received Amount (USD)
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              className="w-full h-10 px-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder={`Minimum $${grandTotal.toFixed(2)}`}
              value={receivedAmount}
              onChange={(e) => setReceivedAmount(e.target.value)}
              autoFocus
            />
          </div>

          {/* Change */}
          <div className="flex justify-between text-sm font-semibold">
            <span className="text-foreground">Change</span>
            <span className={change < 0 ? "text-destructive" : "text-success"}>
              ${change.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-border flex gap-3 flex-shrink-0">
          <Button
            variant="ghost"
            className="flex-1"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="pay"
            className="flex-1 gap-2"
            onClick={handleConfirm}
            disabled={!canPay || loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Confirm Payment"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
