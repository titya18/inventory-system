import { useState, useEffect, useCallback } from "react";
import { useAppContext } from "@/hooks/useAppContext";
import { getTopSalesPersonReport } from "@/api/report";
import { getAllBranches } from "@/api/branch";
import { Users, DollarSign, ShoppingCart, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
const today = new Date().toISOString().slice(0, 10);
const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

export default function ReportTopSalesPerson() {
  const { user } = useAppContext();
  const isAdmin = user?.roleType === "ADMIN";

  const [data, setData]       = useState<any[]>([]);
  const [total, setTotal]     = useState(0);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);

  const [startDate, setStartDate] = useState(monthStart);
  const [endDate,   setEndDate]   = useState(today);
  const [branchId,  setBranchId]  = useState<number>(0);
  const [page,      setPage]      = useState(1);
  const [pageSize]                = useState(20);
  const [sortField, setSortField] = useState("totalSales");
  const [sortOrder, setSortOrder] = useState<"ASC"|"DESC">("DESC");

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    if (isAdmin) getAllBranches().then(setBranches).catch(() => {});
  }, [isAdmin]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getTopSalesPersonReport({
        startDate, endDate,
        branchId: branchId || undefined,
        page, pageSize, sortField, sortOrder,
      });
      setData(res.data);
      setTotal(res.total);
      setSummary(res.summary ?? {});
    } catch { setData([]); setTotal(0); }
    finally { setLoading(false); }
  }, [startDate, endDate, branchId, page, pageSize, sortField, sortOrder]);

  useEffect(() => { load(); }, [load]);

  const toggleSort = (field: string) => {
    if (sortField === field) setSortOrder(o => o === "DESC" ? "ASC" : "DESC");
    else { setSortField(field); setSortOrder("DESC"); }
    setPage(1);
  };

  const SortIcon = ({ field }: { field: string }) =>
    sortField === field
      ? (sortOrder === "DESC" ? <ChevronDown className="w-3.5 h-3.5 inline ml-0.5" /> : <ChevronUp className="w-3.5 h-3.5 inline ml-0.5" />)
      : null;

  const RANK_COLORS = ["#f59e0b", "#94a3b8", "#cd7c2f"];

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#059669,#10b981)" }}>
          <Users className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800">Top Sales Person</h1>
          <p className="text-sm text-gray-400">Staff ranked by total sales amount</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Sales People",   value: Number(summary.personCount ?? 0).toLocaleString(), icon: Users,        color: "#6366f1", bg: "#eff6ff" },
          { label: "Total Orders",   value: Number(summary.totalOrders ?? 0).toLocaleString(), icon: ShoppingCart, color: "#d97706", bg: "#fffbeb" },
          { label: "Total Sales",    value: `$${fmt(summary.totalSales ?? 0)}`,                icon: DollarSign,   color: "#059669", bg: "#f0fdf4" },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <card.icon className="w-4 h-4" style={{ color: card.color }} />
              <span className="text-xs text-gray-400">{card.label}</span>
            </div>
            <p className="text-lg font-extrabold" style={{ color: card.color }}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1); }}
            className="form-input text-sm" style={{ width: 150 }} />
          <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(1); }}
            className="form-input text-sm" style={{ width: 150 }} />
          {isAdmin && (
            <select className="form-select text-sm" value={branchId} onChange={e => { setBranchId(Number(e.target.value)); setPage(1); }}>
              <option value={0}>All Branches</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {[
                  { label: "#",            field: null },
                  { label: "Sales Person", field: null },
                  { label: "Branch",       field: null },
                  { label: "Orders",       field: "orderCount" },
                  { label: "Total Sales",  field: "totalSales" },
                  { label: "Avg Sale Value", field: "avgOrder" },
                  { label: "First Sale",   field: null },
                  { label: "Last Sale",    field: null },
                ].map(col => (
                  <th key={col.label}
                    className={`px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap ${col.field ? "cursor-pointer hover:text-gray-700 select-none" : ""}`}
                    onClick={() => col.field && toggleSort(col.field)}
                  >
                    {col.label}{col.field && <SortIcon field={col.field} />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="py-16 text-center text-gray-400 text-sm">Loading...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={8} className="py-16 text-center text-gray-400 text-sm">No data found</td></tr>
              ) : data.map((row, i) => (
                <tr key={row.userId} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                  <td className="px-4 py-3">
                    <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold inline-flex"
                      style={{ backgroundColor: row.rank <= 3 ? RANK_COLORS[row.rank-1] : "#e2e8f0", color: row.rank <= 3 ? "#fff" : "#64748b" }}>
                      {row.rank}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ background: "linear-gradient(135deg,#6366f1,#3b82f6)" }}>
                        {row.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{row.fullName}</p>
                        {row.firstName && row.lastName && (
                          <p className="text-xs text-gray-400">{row.firstName} {row.lastName}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{row.branchName}</td>
                  <td className="px-4 py-3 font-bold text-indigo-600">{Number(row.orderCount).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <p className="font-bold text-green-600">${fmt(row.totalSales)}</p>
                    {summary.totalSales > 0 && (
                      <div className="mt-1 w-24 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div className="h-1.5 rounded-full bg-green-400" style={{ width: `${Math.min(100, (row.totalSales / summary.totalSales) * 100)}%` }} />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600" title="Total Sales ÷ Orders">${fmt(row.avgOrder)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(row.firstSaleDate)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(row.lastSaleDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
          <span>{total} person{total !== 1 ? "s" : ""}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3">Page {page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
