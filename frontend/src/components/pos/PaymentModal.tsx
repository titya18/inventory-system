import { useState } from "react";
import { toast } from "react-toastify";
import { useCart } from "@/hooks/useCart";
import { getNextInvoiceRef, upsertInvoice, ApprovedInvoice, insertInvoicePayment } from "@/api/invoice";
import { InvoiceType, InvoicePaymentType } from "@/data_types/types";
import { X, Loader2, ShoppingBag, XCircle, CheckCircle2, Delete } from "lucide-react";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchId: number;
  customerId: number;
  grandTotal: number;
  exchangeRate: number;
  paymentMethodId: number | null;
  saleType: "RETAIL" | "WHOLESALE";
  onSuccess: (paymentId: number) => void;
}

const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtKHR = (n: number) => Math.round(n).toLocaleString();

const PAD = [
  ["7", "8", "9"],
  ["4", "5", "6"],
  ["1", "2", "3"],
  [".", "0", "⌫"],
];

export const PaymentModal = ({
  isOpen, onClose, branchId, customerId, grandTotal,
  exchangeRate, paymentMethodId, saleType, onSuccess,
}: PaymentModalProps) => {
  const { items, clearCart } = useCart();
  const [receivedUSD, setReceivedUSD] = useState("");
  const [receivedKHR, setReceivedKHR] = useState("");
  const [activeField, setActiveField] = useState<"usd" | "khr">("usd");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [orderTax, setOrderTax] = useState(0);      // percentage e.g. 10 = 10%
  const [discount, setDiscount] = useState(0);       // fixed USD amount

  if (!isOpen) return null;

  const taxAmount = grandTotal * (orderTax / 100);
  const effectiveTotal = Math.max(0, grandTotal + taxAmount - discount);

  const usd = parseFloat(receivedUSD) || 0;
  const khr = parseFloat(receivedKHR) || 0;
  const totalReceivedUSD = usd + khr / exchangeRate;
  const changeUSD = totalReceivedUSD - effectiveTotal;
  const changeKHR = changeUSD * exchangeRate;
  const canPay = totalReceivedUSD >= effectiveTotal && items.length > 0 && paymentMethodId !== null;
  const today = new Date().toISOString().slice(0, 10);

  const getValue = () => activeField === "usd" ? receivedUSD : receivedKHR;
  const setValue = (v: string) => activeField === "usd" ? setReceivedUSD(v) : setReceivedKHR(v);

  const handlePad = (key: string) => {
    const cur = getValue();
    if (key === "⌫") {
      setValue(cur.slice(0, -1));
    } else if (key === ".") {
      if (!cur.includes(".")) setValue(cur + ".");
    } else {
      // prevent leading zeros
      const next = cur === "0" ? key : cur + key;
      setValue(next);
    }
  };

  const handleClear = () => setValue("");
  const handleExact = () => {
    if (activeField === "usd") setReceivedUSD(effectiveTotal.toFixed(2));
    else setReceivedKHR(Math.round(effectiveTotal * exchangeRate).toString());
  };

  const handleConfirm = async () => {
    if (!canPay) return;
    setLoading(true);
    try {
      const ref = await getNextInvoiceRef(branchId);
      const invoiceItems = items.map((item) => {
        const unitQty = item.quantity;
        const baseQty = unitQty * (item.multiplier ?? 1);
        const discountType = item.discountType ?? "Fixed";
        const discount = item.discount ?? 0;
        const orderTaxRate = item.orderTax ?? 0;
        const taxType = item.taxType ?? "Include";

        const baseAmount = item.unitPrice * unitQty;
        const discountAmount = discountType === "%" ? baseAmount * (discount / 100) : discount;
        const afterDiscount = Math.max(0, baseAmount - discountAmount);
        const lineTotal = taxType === "Exclude"
          ? afterDiscount * (1 + orderTaxRate / 100)
          : afterDiscount;

        return {
          id: 0, orderId: 0,
          productId: item.product.productId,
          productVariantId: item.product.variantId,
          ItemType: "PRODUCT",
          quantity: unitQty, unitQty, baseQty,
          unitId: item.unitId ?? item.product.unitId ?? null,
          price: item.unitPrice,
          taxNet: orderTaxRate,
          taxMethod: taxType,
          discount,
          discountMethod: discountType,
          total: lineTotal,
          costPerBaseUnit: 0,
          stocks: item.product.stock,
          serialSelectionMode: item.serialSelectionMode ?? "AUTO",
          selectedTrackedItemIds: item.selectedTrackedItemIds ?? [],
          selectedTrackedItems: item.selectedTrackedItems ?? [],
          trackingType: item.product.trackingType as "NONE" | "ASSET_ONLY" | "MAC_ONLY" | "ASSET_AND_MAC" | undefined,
        };
      });

      const invoicePayload: InvoiceType = {
        branchId, customerId: customerId || 0, ref, orderDate: today,
        taxRate: String(orderTax), taxNet: taxAmount, discount, shipping: "0",
        totalAmount: effectiveTotal, exchangeRate, paidAmount: null,
        status: "PENDING", OrderSaleType: saleType, note: note.trim(), delReason: "",
        branch: null, customers: null, items: invoiceItems,
      };

      const created = await upsertInvoice(invoicePayload);
      await ApprovedInvoice(created.id!);

      const payment = await insertInvoicePayment({
        branchId, orderId: created.id!, paymentMethodId, paidAmount: null,
        totalPaid: effectiveTotal,
        receive_usd: usd || null,
        receive_khr: khr || null,
        exchangerate: exchangeRate,
        due_balance: Math.max(0, changeUSD),
        createdAt: null, paymentMethods: null,
      } as InvoicePaymentType);

      // Signal customer display — show "Thank You" then clear after 5s
      const displaySaleType = localStorage.getItem("pos-sale-type") ?? "RETAIL";
      localStorage.setItem("pos-customer-display", JSON.stringify({ items: [], saleType: displaySaleType, paid: true, grandTotal: effectiveTotal, exchangeRate }));
      setTimeout(() => localStorage.setItem("pos-customer-display", JSON.stringify({ items: [], saleType: displaySaleType, paid: false })), 5000);

      clearCart();
      toast.success("Payment successful!");
      setReceivedUSD(""); setReceivedKHR(""); setNote("");
      onSuccess((payment as any).id as number);
    } catch (err: any) {
      toast.error(err?.message || "Payment failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setReceivedUSD(""); setReceivedKHR("");
    setOrderTax(0); setDiscount(0);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 99999, backgroundColor: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(2px)' }}
    >
      <div
        className="w-full flex flex-col rounded-2xl overflow-hidden"
        style={{ maxWidth: '460px', backgroundColor: '#ffffff', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', maxHeight: '95vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 flex-shrink-0" style={{ borderBottom: '1px solid #f1f5f9' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
              <ShoppingBag className="w-4 h-4" style={{ color: '#fff' }} />
            </div>
            <h2 className="font-bold text-base" style={{ color: '#1e293b' }}>Confirm Payment</h2>
          </div>
          <button onClick={handleClose} disabled={loading}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#f1f5f9', color: '#64748b' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#fee2e2'; (e.currentTarget as HTMLElement).style.color = '#ef4444'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#f1f5f9'; (e.currentTarget as HTMLElement).style.color = '#64748b'; }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 min-h-0">
          <div className="px-5 py-4 space-y-3">

            {/* Order summary */}
            <div className="rounded-xl p-3.5 space-y-1.5" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div className="flex justify-between text-xs font-medium" style={{ color: '#64748b' }}>
                <span>Items</span>
                <span>{items.length} product{items.length !== 1 ? "s" : ""}</span>
              </div>
              {items.map((item) => (
                <div key={item.product.id} className="flex justify-between text-xs" style={{ color: '#94a3b8' }}>
                  <span className="truncate mr-2">{item.product.name} × {item.quantity} {item.unitName}</span>
                  <span className="flex-shrink-0">${fmt(item.unitPrice * item.quantity)}</span>
                </div>
              ))}

              {/* Subtotal */}
              <div className="flex justify-between text-xs pt-1.5" style={{ borderTop: '1px solid #e2e8f0', color: '#64748b' }}>
                <span>Subtotal</span>
                <span className="font-medium">${fmt(grandTotal)}</span>
              </div>

              {/* Order Tax input */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs" style={{ color: '#64748b' }}>Order Tax (%)</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number" min={0} max={100} step={0.01}
                    value={orderTax}
                    onChange={e => setOrderTax(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-20 h-7 text-center text-xs font-semibold rounded-lg focus:outline-none"
                    style={{ border: '1.5px solid #e2e8f0', backgroundColor: '#fff', color: '#1e293b' }}
                  />
                  <span className="text-xs" style={{ color: '#94a3b8' }}>%</span>
                  {taxAmount > 0 && <span className="text-xs font-medium" style={{ color: '#6366f1' }}>+${fmt(taxAmount)}</span>}
                </div>
              </div>

              {/* Discount input */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs" style={{ color: '#64748b' }}>Discount ($)</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs" style={{ color: '#94a3b8' }}>$</span>
                  <input
                    type="number" min={0} step={0.01}
                    value={discount}
                    onChange={e => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-20 h-7 text-center text-xs font-semibold rounded-lg focus:outline-none"
                    style={{ border: '1.5px solid #e2e8f0', backgroundColor: '#fff', color: '#1e293b' }}
                  />
                  {discount > 0 && <span className="text-xs font-medium" style={{ color: '#ef4444' }}>-${fmt(discount)}</span>}
                </div>
              </div>

              {/* Grand Total */}
              <div className="flex justify-between font-bold text-sm pt-2" style={{ borderTop: '1px solid #e2e8f0', color: '#1e293b' }}>
                <span>Total</span>
                <span style={{ color: '#4f46e5' }}>${fmt(effectiveTotal)}</span>
              </div>
            </div>

            {/* Exchange rate */}
            <div className="rounded-xl px-4 py-2.5 flex items-center justify-between" style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a' }}>
              <span className="text-xs font-bold uppercase tracking-wide" style={{ color: '#92400e' }}>Exchange Rate</span>
              <span className="text-sm font-bold" style={{ color: '#b45309' }}>1$ = {fmtKHR(exchangeRate)} ៛</span>
            </div>

            {/* USD + KHR inputs */}
            <div className="grid grid-cols-2 gap-3">
              {/* USD */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: '#374151' }}>Receive USD</label>
                <div
                  className="relative rounded-xl overflow-hidden"
                  style={{ border: `2px solid ${activeField === 'usd' ? '#6366f1' : '#e2e8f0'}` }}
                  onClick={() => setActiveField("usd")}
                >
                  <span className="absolute top-1/2 -translate-y-1/2 font-bold text-sm select-none" style={{ left: '12px', color: '#6366f1' }}>$</span>
                  <input
                    type="number" min={0} step="0.01"
                    placeholder="0.00"
                    value={receivedUSD}
                    onChange={e => setReceivedUSD(e.target.value)}
                    onFocus={() => setActiveField("usd")}
                    className="w-full focus:outline-none"
                    style={{ height: '42px', paddingLeft: '32px', paddingRight: '8px', backgroundColor: activeField === 'usd' ? '#eef2ff' : '#f8fafc', fontSize: '14px', fontWeight: 600 }}
                  />
                </div>
              </div>

              {/* KHR */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: '#374151' }}>Receive KHR</label>
                <div
                  className="relative rounded-xl overflow-hidden"
                  style={{ border: `2px solid ${activeField === 'khr' ? '#d97706' : '#e2e8f0'}` }}
                  onClick={() => setActiveField("khr")}
                >
                  <span className="absolute top-1/2 -translate-y-1/2 font-bold text-sm select-none" style={{ left: '12px', color: '#d97706' }}>៛</span>
                  <input
                    type="number" min={0} step="100"
                    placeholder="0"
                    value={receivedKHR}
                    onChange={e => setReceivedKHR(e.target.value)}
                    onFocus={() => setActiveField("khr")}
                    className="w-full focus:outline-none"
                    style={{ height: '42px', paddingLeft: '32px', paddingRight: '8px', backgroundColor: activeField === 'khr' ? '#fffbeb' : '#f8fafc', fontSize: '14px', fontWeight: 600 }}
                  />
                </div>
                {khr > 0 && (
                  <p className="text-[11px] mt-1" style={{ color: '#6366f1' }}>≈ ${fmt(khr / exchangeRate)}</p>
                )}
              </div>
            </div>

            {/* Calculator */}
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #e2e8f0' }}>
              {/* Exact amount shortcut */}
              <button
                onClick={handleExact}
                className="w-full py-2 text-xs font-semibold"
                style={{ backgroundColor: '#f0fdf4', color: '#16a34a', borderBottom: '1px solid #e2e8f0' }}
              >
                Exact Amount: {activeField === 'usd' ? `$${fmt(effectiveTotal)}` : `${fmtKHR(effectiveTotal * exchangeRate)} ៛`}
              </button>

              {/* Numpad */}
              <div className="grid grid-cols-3">
                {PAD.flat().map((key) => (
                  <button
                    key={key}
                    onClick={() => handlePad(key)}
                    className="flex items-center justify-center font-semibold transition-colors"
                    style={{
                      height: '52px',
                      fontSize: key === '⌫' ? '12px' : '18px',
                      backgroundColor: '#ffffff',
                      color: key === '⌫' ? '#ef4444' : '#1e293b',
                      borderRight: '1px solid #f1f5f9',
                      borderBottom: '1px solid #f1f5f9',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#ffffff')}
                  >
                    {key === '⌫' ? <Delete className="w-5 h-5" /> : key}
                  </button>
                ))}
                {/* Clear — full width */}
                <button
                  onClick={handleClear}
                  className="col-span-3 py-3 text-sm font-bold"
                  style={{ backgroundColor: '#fef2f2', color: '#ef4444', borderTop: '1px solid #fee2e2' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#fee2e2')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#fef2f2')}
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Change summary */}
            {(usd > 0 || khr > 0) && (
              <div className="rounded-xl p-3.5" style={{ backgroundColor: changeUSD < 0 ? '#fef2f2' : '#f0fdf4', border: `1px solid ${changeUSD < 0 ? '#fecaca' : '#bbf7d0'}` }}>
                <div className="flex justify-between text-xs mb-2" style={{ color: '#64748b' }}>
                  <span>Total Received</span>
                  <span className="font-semibold" style={{ color: '#1e293b' }}>${fmt(totalReceivedUSD)}</span>
                </div>
                <div className="flex justify-between items-center pt-2" style={{ borderTop: `1px solid ${changeUSD < 0 ? '#fecaca' : '#bbf7d0'}` }}>
                  <span className="font-bold text-sm" style={{ color: changeUSD < 0 ? '#dc2626' : '#16a34a' }}>Change</span>
                  <div className="text-right">
                    <div className="font-bold" style={{ color: changeUSD < 0 ? '#dc2626' : '#16a34a' }}>
                      ${fmt(Math.abs(changeUSD))}{changeUSD < 0 ? ' (short)' : ''}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: changeUSD < 0 ? '#dc2626' : '#16a34a' }}>
                      {fmtKHR(Math.abs(changeKHR))} ៛
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Note */}
        <div className="px-5 pt-3 flex-shrink-0">
          <input
            type="text"
            placeholder="Order note (optional)..."
            value={note}
            onChange={e => setNote(e.target.value)}
            className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none"
            style={{ border: '1.5px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#1e293b' }}
          />
        </div>

        {/* Footer */}
        <div className="px-5 pt-3 pb-8 flex gap-3 flex-shrink-0">
          <button
            onClick={handleClose} disabled={loading}
            className="flex-1 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5"
            style={{ height: '44px', border: '1.5px solid #e2e8f0', color: '#64748b', backgroundColor: '#fff' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f8fafc')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#fff')}
          >
            <XCircle className="w-4 h-4" /> Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canPay || loading}
            className="flex-1 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5"
            style={{
              height: '44px',
              background: canPay && !loading ? 'linear-gradient(to right,#22c55e,#16a34a)' : '#e5e7eb',
              color: canPay && !loading ? '#fff' : '#9ca3af',
              boxShadow: canPay && !loading ? '0 4px 14px rgba(34,197,94,0.35)' : 'none',
              cursor: !canPay || loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
              : <><CheckCircle2 className="w-4 h-4" /> Confirm Payment</>
            }
          </button>
        </div>
      </div>
    </div>
  );
};
