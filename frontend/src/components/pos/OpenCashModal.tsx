import { useState } from "react";
import { X, Landmark, DollarSign, RefreshCw, Clock, Pencil, Trash2, CheckCircle2, Sun, Sunset, Moon } from "lucide-react";
import { CloseCashModal } from "./CloseCashModal";
import { useAppContext } from "@/hooks/useAppContext";

interface Props {
  onClose: () => void;
  exchangeRate: number;
  branchId: number;
}

const OPEN_CASH_KEY = "pos-open-cash";

export interface OpenCashSession {
  openedAt: string;
  usdAmount: number;
  khrAmount: number;
  note: string;
  shift: string;
  openedById: number | null;
  openedByName: string;
}

const SHIFTS = ["Morning", "Afternoon", "Night", "Custom"];

export function getOpenCashSession(): OpenCashSession | null {
  try {
    const raw = localStorage.getItem(OPEN_CASH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearOpenCashSession() {
  localStorage.removeItem(OPEN_CASH_KEY);
}

const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const timeAgo = (iso: string) => {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
};

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

export const OpenCashModal = ({ onClose, exchangeRate, branchId }: Props) => {
  const { user } = useAppContext();
  const existing = getOpenCashSession();
  const [mode, setMode] = useState<"view" | "edit" | "close">(existing ? "view" : "edit");
  const [usdAmount, setUsdAmount] = useState(existing ? String(existing.usdAmount) : "");
  const [note, setNote] = useState(existing ? existing.note : "");
  const [shift, setShift] = useState(existing?.shift ?? "Morning");
  const [customShift, setCustomShift] = useState(existing?.shift && !SHIFTS.slice(0, 3).includes(existing.shift) ? existing.shift : "");

  const usd = parseFloat(usdAmount) || 0;
  const khr = Math.round(usd * exchangeRate);
  const effectiveShift = shift === "Custom" ? customShift.trim() || "Custom" : shift;

  const handleSave = () => {
    const session: OpenCashSession = {
      openedAt: existing && mode === "edit" ? existing.openedAt : new Date().toISOString(),
      usdAmount: usd,
      khrAmount: khr,
      note: note.trim(),
      shift: effectiveShift,
      openedById: existing?.openedById ?? (user?.id ?? null),
      openedByName: existing?.openedByName ?? (user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() : ""),
    };
    localStorage.setItem(OPEN_CASH_KEY, JSON.stringify(session));
    onClose();
  };

  const isView = mode === "view" && !!existing;

  if (mode === "close" && existing) {
    return (
      <CloseCashModal
        session={existing}
        branchId={branchId}
        onClosed={onClose}
        onCancel={() => setMode("view")}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 99999, backgroundColor: "rgba(15,23,42,0.6)", backdropFilter: "blur(2px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-sm rounded-2xl flex flex-col overflow-hidden"
        style={{ backgroundColor: "#fff", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid #f1f5f9" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: isView ? "linear-gradient(135deg,#059669,#047857)" : "linear-gradient(135deg,#10b981,#059669)" }}>
              <Landmark className="w-4 h-4" style={{ color: "#fff" }} />
            </div>
            <div>
              <h2 className="font-bold text-sm" style={{ color: "#1e293b" }}>
                {isView ? "Cash Drawer" : existing ? "Update Cash" : "Open Cash Drawer"}
              </h2>
              <p className="text-xs" style={{ color: "#94a3b8" }}>
                {isView ? "Current session info" : "Enter opening cash amount"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "#f1f5f9", color: "#64748b" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "#fee2e2"; (e.currentTarget as HTMLElement).style.color = "#ef4444"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "#f1f5f9"; (e.currentTarget as HTMLElement).style.color = "#64748b"; }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Exchange rate badge */}
        <div className="flex items-center justify-center gap-1.5 px-5 py-2" style={{ backgroundColor: "#fffbeb" }}>
          <RefreshCw className="w-3 h-3" style={{ color: "#d97706" }} />
          <span className="text-xs font-semibold" style={{ color: "#d97706" }}>
            Exchange Rate: 1 USD = {exchangeRate.toLocaleString()} KHR
          </span>
        </div>

        {/* VIEW MODE */}
        {isView && existing ? (
          <div className="px-5 py-4 space-y-3">
            {/* Opened at + shift + cashier */}
            <div className="flex items-center gap-1.5" style={{ color: "#94a3b8" }}>
              <Clock className="w-3.5 h-3.5" />
              <span className="text-xs">Opened at {formatTime(existing.openedAt)} · {timeAgo(existing.openedAt)}</span>
            </div>

            {existing.shift && (
              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ backgroundColor: "#ede9fe", color: "#6d28d9" }}>
                  {existing.shift === "Morning" ? "🌅" : existing.shift === "Afternoon" ? "☀️" : existing.shift === "Night" ? "🌙" : "✏️"} {existing.shift} Shift
                </span>
                {existing.openedByName && (
                  <span className="text-xs" style={{ color: "#94a3b8" }}>by {existing.openedByName}</span>
                )}
              </div>
            )}

            {/* Amounts */}
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #d1fae5" }}>
              <div className="px-4 py-3 flex items-center justify-between" style={{ backgroundColor: "#ecfdf5" }}>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" style={{ color: "#059669" }} />
                  <span className="text-sm font-bold" style={{ color: "#065f46" }}>Cash Drawer Open</span>
                </div>
              </div>
              <div className="px-4 py-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span style={{ color: "#64748b" }}>Opening (USD)</span>
                  <span className="font-bold" style={{ color: "#1e293b" }}>${fmt(existing.usdAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: "#64748b" }}>Opening (KHR)</span>
                  <span className="font-bold" style={{ color: "#1e293b" }}>៛ {existing.khrAmount.toLocaleString()}</span>
                </div>
                {existing.note && (
                  <div className="flex justify-between text-sm">
                    <span style={{ color: "#64748b" }}>Note</span>
                    <span className="font-medium" style={{ color: "#1e293b" }}>{existing.note}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setMode("close")}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold"
                style={{ backgroundColor: "#fef2f2", color: "#ef4444", border: "1px solid #fee2e2" }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#fee2e2")}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#fef2f2")}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Close Cash
              </button>
              <button
                onClick={() => setMode("edit")}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold"
                style={{ background: "linear-gradient(to right,#6366f1,#4f46e5)", color: "#fff", boxShadow: "0 4px 14px rgba(99,102,241,0.3)" }}
              >
                <Pencil className="w-3.5 h-3.5" />
                Update
              </button>
            </div>
          </div>
        ) : (
          /* EDIT / CREATE MODE */
          <>
            <div className="px-5 py-4 space-y-4">
              {/* Shift selector */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "#64748b" }}>Shift</label>
                <div className="grid grid-cols-4 gap-1.5 mb-2">
                  {SHIFTS.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setShift(s)}
                      className="py-2 rounded-xl text-xs font-bold transition-all"
                      style={{
                        backgroundColor: shift === s ? "#6366f1" : "#f1f5f9",
                        color: shift === s ? "#fff" : "#64748b",
                      }}
                    >
                      {s === "Morning" ? "🌅" : s === "Afternoon" ? "☀️" : s === "Night" ? "🌙" : "✏️"} {s}
                    </button>
                  ))}
                </div>
                {shift === "Custom" && (
                  <input
                    type="text"
                    placeholder="Enter shift name..."
                    value={customShift}
                    onChange={e => setCustomShift(e.target.value)}
                    className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none"
                    style={{ border: "1.5px solid #6366f1", backgroundColor: "#eef2ff", color: "#1e293b" }}
                    autoFocus
                  />
                )}
              </div>

              {/* Opened by (read-only, from logged-in user) */}
              {user && (
                <div className="rounded-xl px-3 py-2.5 flex items-center gap-2" style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ backgroundColor: "#6366f1", color: "#fff" }}>
                    {(user.firstName ?? user.name ?? "?").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: "#1e293b" }}>
                      {`${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.name || "Unknown"}
                    </p>
                    <p className="text-[10px]" style={{ color: "#94a3b8" }}>Opening cashier</p>
                  </div>
                </div>
              )}

              {/* USD input */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "#64748b" }}>Opening Amount (USD)</label>
                <div className="relative">
                  <span className="absolute top-1/2 -translate-y-1/2 text-sm font-bold" style={{ left: "14px", color: "#6366f1" }}>$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={usdAmount}
                    onChange={e => setUsdAmount(e.target.value)}
                    className="w-full rounded-xl py-2.5 text-sm font-semibold focus:outline-none"
                    style={{ paddingLeft: "2.25rem", paddingRight: "1rem", border: "1.5px solid #e2e8f0", backgroundColor: "#f8fafc", color: "#1e293b" }}
                    autoFocus
                  />
                </div>
              </div>

              {/* KHR equivalent */}
              <div className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ backgroundColor: "#fef3c7" }}>
                <span className="text-xs font-semibold" style={{ color: "#92400e" }}>KHR Equivalent</span>
                <span className="text-sm font-bold" style={{ color: "#d97706" }}>
                  ៛ {khr.toLocaleString()}
                </span>
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "#64748b" }}>Note (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Morning shift opening"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                  style={{ border: "1.5px solid #e2e8f0", backgroundColor: "#f8fafc", color: "#1e293b" }}
                />
              </div>

              {/* Summary */}
              {usd > 0 && (
                <div className="rounded-xl p-3 space-y-1" style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                  <div className="flex justify-between text-xs" style={{ color: "#166534" }}>
                    <span>USD</span>
                    <span className="font-bold">${fmt(usd)}</span>
                  </div>
                  <div className="flex justify-between text-xs" style={{ color: "#166534" }}>
                    <span>KHR</span>
                    <span className="font-bold">៛ {khr.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 pb-5 flex gap-2">
              <button
                onClick={existing ? () => setMode("view") : onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ backgroundColor: "#f1f5f9", color: "#64748b" }}
              >
                {existing ? "Back" : "Cancel"}
              </button>
              <button
                onClick={handleSave}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold"
                style={{ background: "linear-gradient(to right,#10b981,#059669)", color: "#fff", boxShadow: "0 4px 14px rgba(16,185,129,0.35)" }}
              >
                <DollarSign className="w-4 h-4" />
                {existing ? "Update Cash" : "Open Cash"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
