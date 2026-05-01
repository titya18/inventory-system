import { useEffect, useState } from "react";
import { Landmark, ChevronDown, ChevronUp, Clock, CheckCircle2, AlertCircle, XCircle, Calendar, FileSpreadsheet, FileText, Printer } from "lucide-react";
import { getCashSessions, CashSessionType } from "@/api/cashSession";
import { getAllBranches } from "@/api/branch";
import { useAppContext } from "@/hooks/useAppContext";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const fmt = (n: number | string) =>
  Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtKHR = (n: number | string) => Math.round(Number(n)).toLocaleString();

const duration = (openedAt: string, closedAt: string) => {
  const ms = new Date(closedAt).getTime() - new Date(openedAt).getTime();
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const formatDT = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

const METHOD_COLORS = [
  { bg: "#ecfdf5", text: "#059669" },
  { bg: "#eff6ff", text: "#2563eb" },
  { bg: "#f5f3ff", text: "#7c3aed" },
  { bg: "#fffbeb", text: "#d97706" },
];

const DiffBadge = ({ diff }: { diff: number }) => {
  if (Math.abs(diff) < 0.005) return <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#dcfce7", color: "#166534" }}>Balanced</span>;
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: diff > 0 ? "#dbeafe" : "#fee2e2", color: diff > 0 ? "#1d4ed8" : "#dc2626" }}>
      {diff > 0 ? "Over" : "Short"} ${fmt(Math.abs(diff))}
    </span>
  );
};

export const CashSessionReport = () => {
  const { user } = useAppContext();
  const [sessions, setSessions] = useState<CashSessionType[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);
  const [branchId, setBranchId] = useState(0);
  const [from, setFrom]         = useState("");
  const [to, setTo]             = useState("");

  const pageSize = 15;
  const isAdmin  = !user?.branchId || user.branchId === 0;

  useEffect(() => {
    if (isAdmin) {
      getAllBranches()
        .then((d: any[]) => setBranches(d.map((b) => ({ id: b.id, name: b.name }))))
        .catch(() => {});
    }
  }, [isAdmin]);

  const load = () => {
    setLoading(true);
    getCashSessions({
      branchId: branchId || (user?.branchId ?? 0) || undefined,
      page,
      pageSize,
      from: from || undefined,
      to: to || undefined,
    })
      .then((r) => { setSessions(r.data); setTotal(r.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, branchId, from, to]);

  const totalPages = Math.ceil(total / pageSize);

  const exportRows = () => sessions.map(s => ({
    "Date Closed": new Date(s.closedAt).toLocaleString("en-US"),
    "Branch": s.branch?.name ?? "",
    "Shift": s.shift ?? "",
    "Sale Type": s.saleType ?? "RETAIL",
    "Opened At": new Date(s.openedAt).toLocaleString("en-US"),
    "Opened By": s.openedBy ? `${s.openedBy.firstName} ${s.openedBy.lastName}` : "",
    "Duration": duration(s.openedAt, s.closedAt),
    "Orders": s.orderCount,
    "Opening USD": Number(s.openingUSD),
    "Total Sales USD": Number(s.totalSalesUSD),
    "Cash Sales USD": Number(s.cashSalesUSD),
    "Expected in Drawer": Number(s.openingUSD) + Number(s.cashSalesUSD),
    "Actual Counted USD": Number(s.actualCashUSD),
    "Difference USD": Number(s.differenceUSD),
    "Status": Math.abs(Number(s.differenceUSD)) < 0.005 ? "Balanced" : Number(s.differenceUSD) > 0 ? "Over" : "Short",
    "Closed By": s.creator ? `${s.creator.firstName} ${s.creator.lastName}` : "",
    "Note": s.note ?? "",
  }));

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(exportRows());
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cash Sessions");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buf], { type: "application/octet-stream" }), `cash-sessions-${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text("Cash Session Report", 14, 15);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString("en-US")}`, 14, 22);

    autoTable(doc, {
      startY: 27,
      head: [["Date Closed", "Branch", "Orders", "Opening", "Sales", "Cash Sales", "Expected", "Actual", "Diff", "Status", "By"]],
      body: sessions.map(s => [
        new Date(s.closedAt).toLocaleDateString("en-US"),
        s.branch?.name ?? "",
        s.orderCount,
        `$${fmt(s.openingUSD)}`,
        `$${fmt(s.totalSalesUSD)}`,
        `$${fmt(s.cashSalesUSD)}`,
        `$${fmt(Number(s.openingUSD) + Number(s.cashSalesUSD))}`,
        `$${fmt(s.actualCashUSD)}`,
        `${Number(s.differenceUSD) >= 0 ? "+" : ""}$${fmt(s.differenceUSD)}`,
        Math.abs(Number(s.differenceUSD)) < 0.005 ? "Balanced" : Number(s.differenceUSD) > 0 ? "Over" : "Short",
        s.creator ? `${s.creator.firstName} ${s.creator.lastName}` : "",
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [16, 185, 129] },
      alternateRowStyles: { fillColor: [240, 253, 244] },
    });

    doc.save(`cash-sessions-${new Date().toISOString().slice(0,10)}.pdf`);
  };

  const handlePrint = () => {
    const doc = new jsPDF({ orientation: "landscape" });

    doc.setFontSize(16);
    doc.text("Cash Session Report", 14, 16);
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(`Generated: ${new Date().toLocaleString("en-US")}`, 14, 23);
    doc.setTextColor(0);

    sessions.forEach((s, idx) => {
      const startY = idx === 0 ? 30 : (doc as any).lastAutoTable.finalY + 12;
      const diff = Number(s.differenceUSD);
      const status = Math.abs(diff) < 0.005 ? "Balanced" : diff > 0 ? `Over +$${fmt(Math.abs(diff))}` : `Short -$${fmt(Math.abs(diff))}`;

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`${new Date(s.closedAt).toLocaleString("en-US")}  |  ${s.branch?.name ?? ""}  |  ${status}  |  ${s.orderCount} orders  |  ${duration(s.openedAt, s.closedAt)} session`, 14, startY);
      doc.setFont("helvetica", "normal");

      autoTable(doc, {
        startY: startY + 3,
        head: [["Method", "Transactions", "Amount"]],
        body: [
          ...(s.paymentSummary as any[]).map(p => [p.paymentMethodName, `×${p.transactionCount}`, `$${fmt(p.totalPaid)}`]),
          [{ content: "Opening Cash", styles: { fontStyle: "bold" } }, "", `$${fmt(s.openingUSD)}`],
          [{ content: "Cash Sales", styles: { fontStyle: "bold" } }, "", `$${fmt(s.cashSalesUSD)}`],
          [{ content: "Expected in Drawer", styles: { fontStyle: "bold", textColor: [79, 70, 229] } }, "", { content: `$${fmt(Number(s.openingUSD) + Number(s.cashSalesUSD))}`, styles: { fontStyle: "bold", textColor: [79, 70, 229] } }],
          [{ content: "Actual Counted", styles: { fontStyle: "bold" } }, "", `$${fmt(s.actualCashUSD)}`],
          [{ content: "Difference", styles: { fontStyle: "bold", textColor: Math.abs(diff) < 0.005 ? [5, 150, 105] : diff > 0 ? [37, 99, 235] : [220, 38, 38] } }, "", { content: Math.abs(diff) < 0.005 ? "—" : `${diff > 0 ? "+" : ""}$${fmt(diff)}`, styles: { fontStyle: "bold", textColor: Math.abs(diff) < 0.005 ? [5, 150, 105] : diff > 0 ? [37, 99, 235] : [220, 38, 38] } }],
        ],
        styles: { fontSize: 8 },
        headStyles: { fillColor: [16, 185, 129] },
        columnStyles: { 2: { halign: "right" } },
        margin: { left: 14, right: 14 },
      });
    });

    doc.autoPrint();
    doc.output("dataurlnewwindow");
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#10b981,#059669)" }}>
          <Landmark className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold" style={{ color: "#1e293b" }}>Cash Session Report</h1>
          <p className="text-sm" style={{ color: "#94a3b8" }}>History of all cash drawer sessions</p>
        </div>
        {/* Export buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            disabled={sessions.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-40"
            style={{ backgroundColor: "#ecfdf5", color: "#059669", border: "1px solid #a7f3d0" }}
            title="Export to Excel"
          >
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </button>
          <button
            onClick={handleExportPDF}
            disabled={sessions.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-40"
            style={{ backgroundColor: "#fef2f2", color: "#ef4444", border: "1px solid #fecaca" }}
            title="Export to PDF"
          >
            <FileText className="w-4 h-4" /> PDF
          </button>
          <button
            onClick={handlePrint}
            disabled={sessions.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-40"
            style={{ backgroundColor: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe" }}
            title="Print"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        {isAdmin && (
          <select
            value={branchId}
            onChange={e => { setBranchId(Number(e.target.value)); setPage(1); }}
            className="rounded-lg px-3 py-2 text-sm border border-gray-200 bg-white focus:outline-none"
          >
            <option value={0}>All Branches</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}
        <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-3 py-2">
          <Calendar className="w-3.5 h-3.5 text-gray-400" />
          <input type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }}
            className="text-sm text-gray-700 focus:outline-none" placeholder="From" />
        </div>
        <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-3 py-2">
          <Calendar className="w-3.5 h-3.5 text-gray-400" />
          <input type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1); }}
            className="text-sm text-gray-700 focus:outline-none" placeholder="To" />
        </div>
        {(from || to || branchId > 0) && (
          <button onClick={() => { setFrom(""); setTo(""); setBranchId(0); setPage(1); }}
            className="text-xs font-medium px-3 py-2 rounded-lg"
            style={{ backgroundColor: "#fee2e2", color: "#ef4444" }}>Clear</button>
        )}
        <span className="ml-auto text-xs self-center" style={{ color: "#94a3b8" }}>{total} session{total !== 1 ? "s" : ""}</span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16 text-gray-300">
          <Landmark className="w-8 h-8 animate-pulse" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-16" style={{ color: "#94a3b8" }}>
          <Landmark className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No cash sessions found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => {
            const diff   = Number(s.differenceUSD);
            const isOpen = expandedId === s.id;
            return (
              <div key={s.id} className="rounded-xl overflow-hidden" style={{ border: "1px solid #e2e8f0", backgroundColor: "#fff" }}>
                {/* Row */}
                <button
                  className="w-full flex items-center gap-4 px-5 py-4 text-left"
                  onClick={() => setExpandedId(isOpen ? null : s.id)}
                >
                  {/* Diff icon */}
                  <div className="flex-shrink-0">
                    {Math.abs(diff) < 0.005
                      ? <CheckCircle2 className="w-5 h-5" style={{ color: "#059669" }} />
                      : diff > 0
                        ? <AlertCircle className="w-5 h-5" style={{ color: "#2563eb" }} />
                        : <XCircle className="w-5 h-5" style={{ color: "#ef4444" }} />}
                  </div>

                  {/* Date + branch */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold" style={{ color: "#1e293b" }}>{formatDT(s.closedAt)}</span>
                      {s.branch && <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: "#eff6ff", color: "#2563eb" }}>{s.branch.name}</span>}
                      {s.shift && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: "#ede9fe", color: "#6d28d9" }}>
                          {s.shift === "Morning" ? "🌅" : s.shift === "Afternoon" ? "☀️" : s.shift === "Night" ? "🌙" : "✏️"} {s.shift}
                        </span>
                      )}
                      {s.saleType && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{
                          backgroundColor: s.saleType === "WHOLESALE" ? "#fffbeb" : "#f0fdf4",
                          color: s.saleType === "WHOLESALE" ? "#d97706" : "#059669",
                        }}>
                          {s.saleType === "WHOLESALE" ? "Wholesale" : "Retail"}
                        </span>
                      )}
                      <DiffBadge diff={diff} />
                    </div>
                    <div className="flex items-center gap-1 mt-0.5 flex-wrap" style={{ color: "#94a3b8" }}>
                      <Clock className="w-3 h-3" />
                      <span className="text-xs">{duration(s.openedAt, s.closedAt)} session · {s.orderCount} order{s.orderCount !== 1 ? "s" : ""}</span>
                      {s.openedBy && <span className="text-xs">· opened by {s.openedBy.firstName} {s.openedBy.lastName}</span>}
                      {s.creator && <span className="text-xs">· closed by {s.creator.firstName} {s.creator.lastName}</span>}
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold" style={{ color: "#4f46e5" }}>${fmt(s.totalSalesUSD)}</p>
                    <p className="text-xs" style={{ color: "#94a3b8" }}>total sales</p>
                  </div>

                  {isOpen ? <ChevronUp className="w-4 h-4 flex-shrink-0 text-gray-400" /> : <ChevronDown className="w-4 h-4 flex-shrink-0 text-gray-400" />}
                </button>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="px-5 pb-4 space-y-4" style={{ borderTop: "1px solid #f1f5f9" }}>
                    <div className="grid grid-cols-2 gap-4 pt-3">
                      {/* Left: opening + sales */}
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#94a3b8" }}>Opening Balance</p>
                          <div className="rounded-xl px-3 py-2.5" style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                            <p className="text-sm font-bold" style={{ color: "#166534" }}>${fmt(s.openingUSD)}</p>
                            <p className="text-xs" style={{ color: "#4ade80" }}>៛ {fmtKHR(s.openingKHR)}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#94a3b8" }}>Sales by Method</p>
                          <div className="space-y-1.5">
                            {(s.paymentSummary as any[]).map((p, i) => {
                              const c = METHOD_COLORS[i % METHOD_COLORS.length];
                              return (
                                <div key={i} className="flex justify-between items-center rounded-lg px-3 py-2"
                                  style={{ backgroundColor: c.bg }}>
                                  <span className="text-xs font-semibold" style={{ color: c.text }}>{p.paymentMethodName} <span className="opacity-60">×{p.transactionCount}</span></span>
                                  <span className="text-xs font-bold" style={{ color: c.text }}>${fmt(p.totalPaid)}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Right: reconciliation */}
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#94a3b8" }}>Cash Reconciliation</p>
                        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
                          {[
                            { label: "Opening cash",      val: `$${fmt(s.openingUSD)}` },
                            { label: "Cash sales",        val: `$${fmt(s.cashSalesUSD)}` },
                            { label: "Expected in drawer",val: `$${fmt(Number(s.openingUSD) + Number(s.cashSalesUSD))}`, bold: true },
                            { label: "Actual counted",    val: `$${fmt(s.actualCashUSD)}` },
                          ].map(({ label, val, bold }) => (
                            <div key={label} className="flex justify-between px-3 py-2 text-sm" style={{ borderBottom: "1px solid #f8fafc" }}>
                              <span style={{ color: bold ? "#1e293b" : "#64748b", fontWeight: bold ? 700 : 400 }}>{label}</span>
                              <span style={{ color: bold ? "#4f46e5" : "#1e293b", fontWeight: bold ? 700 : 600 }}>{val}</span>
                            </div>
                          ))}
                          <div className="flex justify-between px-3 py-2 text-sm" style={{ backgroundColor: Math.abs(diff) < 0.005 ? "#f0fdf4" : diff > 0 ? "#eff6ff" : "#fef2f2" }}>
                            <span className="font-bold" style={{ color: Math.abs(diff) < 0.005 ? "#059669" : diff > 0 ? "#2563eb" : "#ef4444" }}>Difference</span>
                            <span className="font-bold" style={{ color: Math.abs(diff) < 0.005 ? "#059669" : diff > 0 ? "#2563eb" : "#ef4444" }}>
                              {Math.abs(diff) < 0.005 ? "—" : `${diff > 0 ? "+" : ""}$${fmt(Math.abs(diff))}`}
                            </span>
                          </div>
                        </div>
                        {s.note && (
                          <p className="mt-2 text-xs italic" style={{ color: "#94a3b8" }}>Note: {s.note}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-40"
            style={{ backgroundColor: "#f1f5f9", color: "#64748b" }}>Prev</button>
          <span className="px-3 py-1.5 text-sm" style={{ color: "#64748b" }}>{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-40"
            style={{ backgroundColor: "#f1f5f9", color: "#64748b" }}>Next</button>
        </div>
      )}
    </div>
  );
};

export default CashSessionReport;
