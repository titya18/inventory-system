import React, { useEffect, useMemo, useState } from "react";
import { getReturnTrackedItems } from "@/api/saleReturn";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  clickData: any;
  onSave: (selectedIds: number[]) => void;
}

const ReturnTrackedModal: React.FC<Props> = ({ isOpen, onClose, clickData, onSave }) => {
  const [available, setAvailable] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !clickData?.orderItemId) return;
    setLoading(true);
    setSearch("");
    getReturnTrackedItems(clickData.orderItemId)
      .then((rows) => {
        setAvailable(rows);
        setSelectedIds(clickData.selectedTrackedItemIds || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isOpen, clickData]);

  const filtered = useMemo(() =>
    available.filter((item) =>
      `${item.serialNumber ?? ""} ${item.assetCode ?? ""} ${item.macAddress ?? ""}`
        .toLowerCase().includes(search.toLowerCase())
    ), [available, search]);

  const toggle = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds((p) => p.filter((x) => x !== id));
    } else {
      if (selectedIds.length >= clickData.quantity) return;
      setSelectedIds((p) => [...p, id]);
    }
  };

  const handleSave = () => {
    if (selectedIds.length !== clickData.quantity) return;
    onSave(selectedIds);
    onClose();
  };

  if (!isOpen) return null;

  const required: number = clickData?.quantity ?? 0;
  const filled = selectedIds.length;
  const isFulfilled = filled === required;
  const progress = required > 0 ? (filled / required) * 100 : 0;

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      {/* Backdrop */}
      <div
        style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      />

      {/* Dialog */}
      <div style={{
        position: "relative",
        width: 820,
        maxWidth: "calc(100vw - 32px)",
        maxHeight: "calc(100vh - 48px)",
        background: "#fff",
        borderRadius: 16,
        boxShadow: "0 24px 48px rgba(0,0,0,0.18)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}>

        {/* ── Header ── */}
        <div style={{ padding: "18px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#3b82f6" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: 600, fontSize: 15, color: "#0f172a" }}>Select Return Serials</p>
              <p style={{ margin: 0, fontSize: 12, color: "#94a3b8", marginTop: 1 }}>
                Choose <strong style={{ color: "#3b82f6" }}>{required}</strong> serial{required !== 1 ? "s" : ""} to return
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>

          {/* Left – Available */}
          <div style={{ flex: "0 0 58%", display: "flex", flexDirection: "column", borderRight: "1px solid #f1f5f9" }}>
            {/* Search */}
            <div style={{ padding: "12px 20px", borderBottom: "1px solid #f8fafc" }}>
              <div style={{ position: "relative" }}>
                <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#94a3b8" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="m21 21-4.35-4.35" />
                </svg>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search serial, asset code, MAC..."
                  style={{
                    width: "100%", height: 36, paddingLeft: 32, paddingRight: 12,
                    border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13,
                    outline: "none", background: "#f8fafc", color: "#334155", boxSizing: "border-box"
                  }}
                />
              </div>
            </div>

            {/* Items grid */}
            <div style={{ flex: 1, overflow: "auto", padding: "14px 16px" }}>
              {loading ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 8, color: "#94a3b8" }}>
                  <div style={{ width: 28, height: 28, border: "2.5px solid #dbeafe", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  <span style={{ fontSize: 13 }}>Loading serials...</span>
                </div>
              ) : filtered.length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 6, color: "#cbd5e1" }}>
                  <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <span style={{ fontSize: 13 }}>No serials found</span>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {filtered.map((item) => {
                    const sel = selectedIds.includes(item.id);
                    const isCeqAssigned = (item as any).activeCeqAssigned === true;
                    const ceqRef = (item as any).ceqRef as string | null;
                    const alreadyReturnedViaCeq = (item as any).alreadyReturnedViaCeq === true;
                    const returnedCeqRef = (item as any).returnedCeqRef as string | null;
                    const isBlocked = isCeqAssigned || alreadyReturnedViaCeq;
                    const canPick = !isBlocked && (sel || selectedIds.length < required);
                    const borderColor = isCeqAssigned ? "#e9d5ff" : alreadyReturnedViaCeq ? "#fde68a" : sel ? "#3b82f6" : "#e2e8f0";
                    const bgColor = isCeqAssigned ? "#faf5ff" : alreadyReturnedViaCeq ? "#fffbeb" : sel ? "#eff6ff" : "#fff";
                    const textColor = isCeqAssigned ? "#7c3aed" : alreadyReturnedViaCeq ? "#92400e" : "#1e293b";
                    return (
                      <div
                        key={item.id}
                        onClick={() => canPick && toggle(item.id)}
                        style={{
                          position: "relative",
                          border: `1.5px solid ${borderColor}`,
                          borderRadius: 10,
                          padding: "10px 12px",
                          background: bgColor,
                          cursor: canPick ? "pointer" : "not-allowed",
                          opacity: (!canPick && !isBlocked) ? 0.45 : 1,
                          transition: "border-color 0.15s, background 0.15s",
                          userSelect: "none",
                        }}
                      >
                        {sel && (
                          <div style={{ position: "absolute", top: 8, right: 8, width: 18, height: 18, borderRadius: "50%", background: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth="3">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                        <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: textColor, paddingRight: sel ? 20 : 0 }}>
                          {item.serialNumber || <em style={{ color: "#94a3b8", fontStyle: "normal" }}>No Serial</em>}
                        </p>
                        <div style={{ display: "flex", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
                          {item.assetCode && <span style={{ fontSize: 11, color: "#64748b" }}><span style={{ color: "#94a3b8" }}>Asset:</span> {item.assetCode}</span>}
                          {item.macAddress && <span style={{ fontSize: 11, color: "#64748b" }}><span style={{ color: "#94a3b8" }}>MAC:</span> {item.macAddress}</span>}
                          {!item.assetCode && !item.macAddress && !isBlocked && <span style={{ fontSize: 11, color: "#cbd5e1" }}>—</span>}
                          {isCeqAssigned && (
                            <span style={{ fontSize: 11, color: "#7c3aed", fontWeight: 500 }}>
                              Assigned to CEQ {ceqRef ? `(${ceqRef})` : ""}
                            </span>
                          )}
                          {alreadyReturnedViaCeq && (
                            <span style={{ fontSize: 11, color: "#92400e", fontWeight: 500 }}>
                              Already returned via CEQ {returnedCeqRef ? `(${returnedCeqRef})` : ""}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right – Selected panel */}
          <div style={{ flex: "0 0 42%", display: "flex", flexDirection: "column", background: "#fafbfc" }}>
            {/* Progress header */}
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: "#475569" }}>Selected</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: isFulfilled ? "#16a34a" : "#3b82f6" }}>
                  {filled} / {required}
                </span>
              </div>
              <div style={{ height: 4, background: "#e2e8f0", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${progress}%`, background: isFulfilled ? "#22c55e" : "#3b82f6", borderRadius: 4, transition: "width 0.25s ease" }} />
              </div>
              {isFulfilled && (
                <p style={{ margin: "6px 0 0", fontSize: 11, color: "#16a34a", display: "flex", alignItems: "center", gap: 4 }}>
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  All items selected
                </p>
              )}
            </div>

            {/* Selected list */}
            <div style={{ flex: 1, overflow: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
              {filled === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 6, color: "#cbd5e1" }}>
                  <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span style={{ fontSize: 12 }}>No items selected</span>
                </div>
              ) : (
                selectedIds.map((id, i) => {
                  const item = available.find((x) => x.id === id);
                  if (!item) return null;
                  return (
                    <div key={id} style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "8px 12px" }}>
                      <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#eff6ff", color: "#3b82f6", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {i + 1}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.serialNumber}</p>
                        {item.assetCode && <p style={{ margin: 0, fontSize: 11, color: "#94a3b8", marginTop: 1 }}>{item.assetCode}</p>}
                      </div>
                      <button
                        onClick={() => toggle(id)}
                        style={{ width: 24, height: 24, borderRadius: 6, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", flexShrink: 0 }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#fef2f2"; (e.currentTarget as HTMLButtonElement).style.color = "#ef4444"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "#94a3b8"; }}
                      >
                        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{ padding: "14px 24px", borderTop: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff" }}>
          <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>
            {isFulfilled ? "Ready to save" : `Select ${required - filled} more item${required - filled !== 1 ? "s" : ""}`}
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={onClose}
              style={{ height: 36, padding: "0 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 13, fontWeight: 500, color: "#475569", cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!isFulfilled}
              style={{
                height: 36, padding: "0 18px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600,
                cursor: isFulfilled ? "pointer" : "not-allowed",
                background: isFulfilled ? "#3b82f6" : "#e2e8f0",
                color: isFulfilled ? "#fff" : "#94a3b8",
                transition: "background 0.15s",
              }}
            >
              Save Selection
            </button>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default ReturnTrackedModal;
