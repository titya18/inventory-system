import { useEffect, useState } from "react";
import { X, Landmark, Clock, Loader2, Printer, CheckCircle2, AlertCircle } from "lucide-react";
import { getCashSessionReport, CashSessionReport } from "@/api/report";
import { OpenCashSession, clearOpenCashSession } from "./OpenCashModal";
import { createCashSession } from "@/api/cashSession";
import { useCart } from "@/hooks/useCart";
import { toast } from "react-toastify";

interface Props {
  session: OpenCashSession;
  branchId: number;
  onClosed: () => void;
  onCancel: () => void;
}

const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtKHR = (n: number) => Math.round(n).toLocaleString();

const duration = (from: string) => {
  const ms = Date.now() - new Date(from).getTime();
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

const METHOD_COLOR_LIST = [
  { bg: "#ecfdf5", text: "#059669" },
  { bg: "#eff6ff", text: "#2563eb" },
  { bg: "#f5f3ff", text: "#7c3aed" },
  { bg: "#fffbeb", text: "#d97706" },
];

export const CloseCashModal = ({ session, branchId, onClosed, onCancel }: Props) => {
  const { saleType } = useCart();
  const [report, setReport] = useState<CashSessionReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actualCash, setActualCash] = useState("");
  const [closeNote, setCloseNote] = useState("");
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!branchId) {
      setError("No branch selected. Please select a branch before closing cash.");
      setLoading(false);
      return;
    }
    getCashSessionReport(branchId, session.openedAt)
      .then(setReport)
      .catch((err) => setError(err?.message || "Failed to load session data"))
      .finally(() => setLoading(false));
  }, [branchId, session.openedAt]);

  const cashPayment = report?.payments.find(p =>
    p.paymentMethodName?.toLowerCase().includes("cash")
  );
  const cashSales = cashPayment?.totalPaid ?? 0;
  const expectedCash = session.usdAmount + cashSales;
  const actual = parseFloat(actualCash) || 0;
  const difference = actual - expectedCash;
  const isOver = difference > 0;

  const handleConfirm = async () => {
    if (!report) return;
    setConfirming(true);
    try {
      await createCashSession({
        branchId,
        shift: session.shift || null,
        saleType,
        openedAt: session.openedAt,
        closedAt: new Date().toISOString(),
        openedById: session.openedById ?? null,
        openingUSD: session.usdAmount,
        openingKHR: session.khrAmount,
        exchangeRate: Math.round(session.khrAmount / (session.usdAmount || 1)),
        totalSalesUSD: report.totals.grandTotal,
        cashSalesUSD: cashSales,
        actualCashUSD: actual,
        differenceUSD: difference,
        orderCount: report.totals.orderCount,
        note: closeNote.trim() || session.note || null,
        paymentSummary: report.payments,
      });
      clearOpenCashSession();
      setConfirming(false);
      toast.success("Cash session closed successfully.");
      onClosed();
    } catch (err: any) {
      setConfirming(false);
      toast.error(err?.message || "Failed to close cash session. Please try again.");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 99999, backgroundColor: "rgba(15,23,42,0.7)", backdropFilter: "blur(2px)" }}
    >
      <div
        className="w-full max-w-md rounded-2xl flex flex-col overflow-hidden"
        style={{ backgroundColor: "#fff", boxShadow: "0 20px 60px rgba(0,0,0,0.25)", maxHeight: "92vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: "1px solid #f1f5f9" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#ef4444,#dc2626)" }}>
              <Landmark className="w-4 h-4" style={{ color: "#fff" }} />
            </div>
            <div>
              <h2 className="font-bold text-sm" style={{ color: "#1e293b" }}>Close Cash Session</h2>
              <div className="flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3" style={{ color: "#94a3b8" }} />
                <span className="text-xs" style={{ color: "#94a3b8" }}>
                  {formatDateTime(session.openedAt)} · {duration(session.openedAt)} session
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "#f1f5f9", color: "#64748b" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "#fee2e2"; (e.currentTarget as HTMLElement).style.color = "#ef4444"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "#f1f5f9"; (e.currentTarget as HTMLElement).style.color = "#64748b"; }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12 gap-2" style={{ color: "#94a3b8" }}>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading session data...</span>
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 py-6 justify-center" style={{ color: "#ef4444" }}>
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          ) : report && (
            <>
              {/* Opening balance */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#94a3b8" }}>Opening Balance</p>
                <div className="rounded-xl px-4 py-3 flex justify-between items-center" style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                  <div>
                    <p className="text-sm font-bold" style={{ color: "#166534" }}>${fmt(session.usdAmount)}</p>
                    <p className="text-xs" style={{ color: "#4ade80" }}>៛ {fmtKHR(session.khrAmount)}</p>
                  </div>
                  {session.note && <span className="text-xs px-2 py-1 rounded-lg" style={{ backgroundColor: "#dcfce7", color: "#166534" }}>{session.note}</span>}
                </div>
              </div>

              {/* Sales by payment method */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#94a3b8" }}>
                  Sales During Session ({report.totals.orderCount} orders)
                </p>
                {report.payments.length === 0 ? (
                  <div className="rounded-xl px-4 py-3 text-center text-sm" style={{ backgroundColor: "#f8fafc", color: "#94a3b8" }}>
                    No transactions recorded
                  </div>
                ) : (
                  <div className="space-y-2">
                    {report.payments.map((p, i) => {
                      const color = METHOD_COLOR_LIST[i % METHOD_COLOR_LIST.length];
                      return (
                        <div key={p.paymentMethodId} className="rounded-xl px-4 py-3 flex items-center justify-between"
                          style={{ backgroundColor: color.bg, border: `1px solid ${color.text}22` }}>
                          <div>
                            <p className="text-sm font-bold" style={{ color: color.text }}>{p.paymentMethodName}</p>
                            <p className="text-xs" style={{ color: color.text, opacity: 0.7 }}>{p.transactionCount} transaction{p.transactionCount !== 1 ? "s" : ""}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold" style={{ color: color.text }}>${fmt(p.totalPaid)}</p>
                            {p.totalKHR > 0 && <p className="text-xs" style={{ color: color.text, opacity: 0.7 }}>+៛ {fmtKHR(p.totalKHR)}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Grand total */}
              <div className="rounded-xl px-4 py-3 flex justify-between items-center"
                style={{ background: "linear-gradient(to right,#4f46e5,#6366f1)" }}>
                <span className="text-sm font-semibold" style={{ color: "#c7d2fe" }}>Total Sales</span>
                <span className="font-extrabold text-lg" style={{ color: "#fff" }}>${fmt(report.totals.grandTotal)}</span>
              </div>

              {/* Divider */}
              <div style={{ borderTop: "1px dashed #e2e8f0" }} />

              {/* Cash reconciliation */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#94a3b8" }}>Cash Reconciliation</p>
                <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
                  <div className="px-4 py-2.5 flex justify-between text-sm" style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <span style={{ color: "#64748b" }}>Opening cash</span>
                    <span className="font-semibold" style={{ color: "#1e293b" }}>${fmt(session.usdAmount)}</span>
                  </div>
                  <div className="px-4 py-2.5 flex justify-between text-sm" style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <span style={{ color: "#64748b" }}>Cash sales</span>
                    <span className="font-semibold" style={{ color: "#1e293b" }}>${fmt(cashSales)}</span>
                  </div>
                  <div className="px-4 py-2.5 flex justify-between text-sm font-bold" style={{ backgroundColor: "#f8fafc" }}>
                    <span style={{ color: "#1e293b" }}>Expected in drawer</span>
                    <span style={{ color: "#4f46e5" }}>${fmt(expectedCash)}</span>
                  </div>
                </div>
              </div>

              {/* Actual cash counted */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "#64748b" }}>
                  Actual Cash Counted (USD)
                </label>
                <div className="relative">
                  <span className="absolute top-1/2 -translate-y-1/2 text-sm font-bold" style={{ left: "14px", color: "#6366f1" }}>$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={actualCash}
                    onChange={e => setActualCash(e.target.value)}
                    className="w-full rounded-xl py-2.5 text-sm font-semibold focus:outline-none"
                    style={{ paddingLeft: "2.25rem", paddingRight: "1rem", border: "1.5px solid #e2e8f0", backgroundColor: "#f8fafc", color: "#1e293b" }}
                  />
                </div>
              </div>

              {/* Difference */}
              {actualCash !== "" && (
                <div className="rounded-xl px-4 py-3 flex justify-between items-center"
                  style={{
                    backgroundColor: difference === 0 ? "#f0fdf4" : isOver ? "#eff6ff" : "#fef2f2",
                    border: `1px solid ${difference === 0 ? "#bbf7d0" : isOver ? "#bfdbfe" : "#fecaca"}`,
                  }}>
                  <div className="flex items-center gap-2">
                    {difference === 0
                      ? <CheckCircle2 className="w-4 h-4" style={{ color: "#059669" }} />
                      : <AlertCircle className="w-4 h-4" style={{ color: isOver ? "#2563eb" : "#ef4444" }} />
                    }
                    <span className="text-sm font-semibold" style={{ color: difference === 0 ? "#059669" : isOver ? "#2563eb" : "#ef4444" }}>
                      {difference === 0 ? "Balanced" : isOver ? "Over" : "Short"}
                    </span>
                  </div>
                  <span className="font-bold text-sm" style={{ color: difference === 0 ? "#059669" : isOver ? "#2563eb" : "#ef4444" }}>
                    {difference === 0 ? "—" : `${isOver ? "+" : ""}$${fmt(Math.abs(difference))}`}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Close note */}
        {!loading && !error && (
          <div className="flex-shrink-0 px-5 pt-3" style={{ borderTop: "1px solid #f1f5f9" }}>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "#64748b" }}>
              Closing Note (optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. End of shift, discrepancy reason..."
              value={closeNote}
              onChange={e => setCloseNote(e.target.value)}
              className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none resize-none"
              style={{ border: "1.5px solid #e2e8f0", backgroundColor: "#f8fafc", color: "#1e293b" }}
            />
          </div>
        )}

        {/* Footer */}
        {!loading && !error && (
          <div className="flex-shrink-0 px-5 pb-5 pt-2 flex gap-2">
            <button
              onClick={handlePrint}
              className="w-10 h-10 flex items-center justify-center rounded-xl flex-shrink-0"
              style={{ backgroundColor: "#f1f5f9", color: "#64748b" }}
              title="Print report"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
              style={{ backgroundColor: "#f1f5f9", color: "#64748b" }}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={confirming}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold"
              style={{ background: "linear-gradient(to right,#ef4444,#dc2626)", color: "#fff", boxShadow: "0 4px 14px rgba(239,68,68,0.35)" }}
            >
              {confirming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Landmark className="w-4 h-4" />}
              Close Session
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
