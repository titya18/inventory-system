import { useState, useEffect, useCallback } from "react";
import { useAppContext } from "@/hooks/useAppContext";
import { getTopSellingProductsReport } from "@/api/report";
import { getAllBranches } from "@/api/branch";
import { getAllCategories } from "@/api/category";
import { TrendingUp, Package, DollarSign, ShoppingCart, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const today = new Date().toISOString().slice(0, 10);
const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

export default function ReportTopSellingProducts() {
  const { user } = useAppContext();
  const isAdmin = user?.roleType === "ADMIN";

  const [data, setData]         = useState<any[]>([]);
  const [total, setTotal]       = useState(0);
  const [summary, setSummary]   = useState<any>({});
  const [loading, setLoading]   = useState(false);
  const [branches, setBranches] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  const [startDate,   setStartDate]   = useState(monthStart);
  const [endDate,     setEndDate]     = useState(today);
  const [branchId,    setBranchId]    = useState<number>(0);
  const [categoryId,  setCategoryId]  = useState<number>(0);
  const [search,      setSearch]      = useState("");
  const [page,        setPage]        = useState(1);
  const [pageSize]                    = useState(20);
  const [sortField,   setSortField]   = useState("totalQty");
  const [sortOrder,   setSortOrder]   = useState<"ASC"|"DESC">("DESC");

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    if (isAdmin) getAllBranches().then(setBranches).catch(() => {});
    getAllCategories().then(setCategories).catch(() => {});
  }, [isAdmin]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getTopSellingProductsReport({
        startDate, endDate,
        branchId:   branchId   || undefined,
        categoryId: categoryId || undefined,
        search:     search     || undefined,
        page, pageSize, sortField, sortOrder,
      });
      setData(res.data);
      setTotal(res.total);
      setSummary(res.summary ?? {});
    } catch { setData([]); setTotal(0); }
    finally { setLoading(false); }
  }, [startDate, endDate, branchId, categoryId, search, page, pageSize, sortField, sortOrder]);

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

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)" }}>
          <TrendingUp className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800">Top Selling Products</h1>
          <p className="text-sm text-gray-400">Products ranked by quantity sold</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Qty Sold", value: Number(summary.totalQty ?? 0).toLocaleString(), icon: Package, color: "#6366f1", bg: "#eff6ff" },
          { label: "Total Revenue",  value: `$${fmt(summary.totalRevenue ?? 0)}`, icon: DollarSign, color: "#059669", bg: "#f0fdf4" },
          { label: "Total COGS",     value: `$${fmt(summary.totalCogs    ?? 0)}`, icon: ShoppingCart, color: "#d97706", bg: "#fffbeb" },
          { label: "Net Profit",     value: `$${fmt(summary.totalProfit  ?? 0)}`, icon: TrendingUp,   color: "#7c3aed", bg: "#f5f3ff" },
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
        <div className="flex flex-wrap gap-3 items-center">
          <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1); }}
            className="form-input text-sm" style={{ width: 150 }} />
          <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(1); }}
            className="form-input text-sm" style={{ width: 150 }} />
          {isAdmin && (
            <select className="form-select text-sm" style={{ width: 160 }} value={branchId} onChange={e => { setBranchId(Number(e.target.value)); setPage(1); }}>
              <option value={0}>All Branches</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
          <select className="form-select text-sm" style={{ width: 160 }} value={categoryId} onChange={e => { setCategoryId(Number(e.target.value)); setPage(1); }}>
            <option value={0}>All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input type="text" placeholder="Search product / SKU..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="form-input text-sm" style={{ flex: 1, minWidth: 180 }} />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {[
                  { label: "#",             field: null },
                  { label: "Product",       field: null },
                  { label: "Category",      field: null },
                  { label: "Type",          field: null },
                  { label: "Qty Sold",      field: "totalQty" },
                  { label: "Orders",        field: "orderCount" },
                  { label: "Revenue",       field: "totalRevenue" },
                  { label: "COGS",          field: "totalCogs" },
                  { label: "Profit",        field: "totalProfit" },
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
                <tr><td colSpan={9} className="py-16 text-center text-gray-400 text-sm">Loading...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={9} className="py-16 text-center text-gray-400 text-sm">No data found</td></tr>
              ) : data.map((row, i) => {
                const margin = row.totalRevenue > 0 ? (row.totalProfit / row.totalRevenue) * 100 : 0;
                return (
                  <tr key={row.productVariantId} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                    <td className="px-4 py-3">
                      <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white inline-flex"
                        style={{ backgroundColor: row.rank <= 3 ? ["#f59e0b","#94a3b8","#cd7c2f"][row.rank-1] : "#e2e8f0", color: row.rank <= 3 ? "#fff" : "#64748b" }}>
                        {row.rank}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-800">{row.productName}</p>
                      <p className="text-xs text-gray-400">{row.sku || "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{row.categoryName}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{ backgroundColor: row.productType === "SecondHand" ? "#fef3c7" : "#eff6ff", color: row.productType === "SecondHand" ? "#b45309" : "#2563eb" }}>
                        {row.productType === "SecondHand" ? "2nd Hand" : "New"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-indigo-600">{Number(row.totalQty).toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-600">{Number(row.orderCount).toLocaleString()}</td>
                    <td className="px-4 py-3 font-semibold text-green-600">${fmt(row.totalRevenue)}</td>
                    <td className="px-4 py-3 text-orange-500">${fmt(row.totalCogs)}</td>
                    <td className="px-4 py-3">
                      <p className={`font-semibold ${row.totalProfit >= 0 ? "text-green-600" : "text-red-500"}`}>${fmt(row.totalProfit)}</p>
                      <p className="text-xs text-gray-400">{margin.toFixed(1)}%</p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
          <span>{total} product{total !== 1 ? "s" : ""}</span>
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
