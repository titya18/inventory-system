import { useState, useEffect, useCallback } from "react";
import { useAppContext } from "@/hooks/useAppContext";
import { getPackageSalesReport, getPackageSaleInstances } from "@/api/report";
import { getAllBranches } from "@/api/branch";
import { PackageSearch, TrendingUp, DollarSign, ShoppingCart, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, X, Eye } from "lucide-react";
import VisibleColumnsSelector from "@/components/VisibleColumnsSelector";
import ExportDropdown from "@/components/ExportDropdown";

const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const today = new Date().toISOString().slice(0, 10);
const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

const columns = ["#", "Package", "Times Sold", "Qty Sold", "Revenue", "COGS", "Profit", "Details"];

export default function ReportPackageSales() {
  const { user } = useAppContext();
  const isAdmin = user?.roleType === "ADMIN";

  const [data, setData]         = useState<any[]>([]);
  const [total, setTotal]       = useState(0);
  const [summary, setSummary]   = useState<any>({});
  const [loading, setLoading]   = useState(false);
  const [branches, setBranches] = useState<any[]>([]);

  const [startDate,   setStartDate]   = useState(monthStart);
  const [endDate,     setEndDate]     = useState(today);
  const [branchId,    setBranchId]    = useState<number>(0);
  const [search,      setSearch]      = useState("");
  const [page,        setPage]        = useState(1);
  const [pageSize]                    = useState(20);
  const [sortField,   setSortField]   = useState("totalQtySold");
  const [sortOrder,   setSortOrder]   = useState<"ASC"|"DESC">("DESC");
  const [visibleCols, setVisibleCols] = useState(columns);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const toggleCol = (col: string) => {
    setVisibleCols((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  };

  const exportData = data.map((row, index) => ({
    "#": index + 1 + (page - 1) * pageSize,
    "Package": row.packageName,
    "Times Sold": Number(row.timesSold),
    "Qty Sold": Number(row.totalQtySold),
    "Revenue": Number(row.totalRevenue),
    "COGS": Number(row.totalCogs),
    "Profit": Number(row.totalProfit),
  }));

  const [drillDownPackageId, setDrillDownPackageId] = useState<number | null>(null);
  const [drillDownName,      setDrillDownName]       = useState("");
  const [drillDownRows,      setDrillDownRows]       = useState<any[]>([]);
  const [drillDownLoading,   setDrillDownLoading]    = useState(false);

  useEffect(() => {
    if (isAdmin) getAllBranches().then(setBranches).catch(() => {});
  }, [isAdmin]);

  const openDrillDown = async (packageId: number, packageName: string) => {
    setDrillDownPackageId(packageId);
    setDrillDownName(packageName);
    setDrillDownLoading(true);
    try {
      const res = await getPackageSaleInstances(packageId, {
        startDate, endDate,
        branchId: branchId || undefined,
      });
      setDrillDownRows(res.data);
    } catch {
      setDrillDownRows([]);
    } finally {
      setDrillDownLoading(false);
    }
  };

  const closeDrillDown = () => {
    setDrillDownPackageId(null);
    setDrillDownRows([]);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPackageSalesReport({
        startDate, endDate,
        branchId: branchId || undefined,
        search:   search   || undefined,
        page, pageSize, sortField, sortOrder,
      });
      setData(res.data);
      setTotal(res.total);
      setSummary(res.summary ?? {});
    } catch { setData([]); setTotal(0); }
    finally { setLoading(false); }
  }, [startDate, endDate, branchId, search, page, pageSize, sortField, sortOrder]);

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
          <PackageSearch className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800">Package Sales</h1>
          <p className="text-sm text-gray-400">Bundles ranked by how often they're sold</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Times Sold",   value: Number(summary.timesSold    ?? 0).toLocaleString(), icon: ShoppingCart, color: "#6366f1", bg: "#eff6ff" },
          { label: "Total Qty Sold", value: Number(summary.totalQtySold ?? 0).toLocaleString(), icon: PackageSearch, color: "#0891b2", bg: "#ecfeff" },
          { label: "Total Revenue", value: `$${fmt(summary.totalRevenue ?? 0)}`, icon: DollarSign, color: "#059669", bg: "#f0fdf4" },
          { label: "Net Profit",    value: `$${fmt(summary.totalProfit  ?? 0)}`, icon: TrendingUp,   color: "#7c3aed", bg: "#f5f3ff" },
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
          <input type="text" placeholder="Search package name..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="form-input text-sm" style={{ flex: 1, minWidth: 180 }} />
          <VisibleColumnsSelector
            allColumns={columns}
            visibleColumns={visibleCols}
            onToggleColumn={toggleCol}
          />
          <ExportDropdown data={exportData} prefix="package-sales" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {[
                  { label: "#",             field: null, col: "#" },
                  { label: "Package",       field: null, col: "Package" },
                  { label: "Times Sold",    field: "timesSold", col: "Times Sold" },
                  { label: "Qty Sold",      field: "totalQtySold", col: "Qty Sold" },
                  { label: "Revenue",       field: "totalRevenue", col: "Revenue" },
                  { label: "COGS",          field: "totalCogs", col: "COGS" },
                  { label: "Profit",        field: "totalProfit", col: "Profit" },
                  { label: "",              field: null, col: "Details" },
                ].filter(col => visibleCols.includes(col.col)).map(col => (
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
                <tr><td colSpan={visibleCols.length} className="py-16 text-center text-gray-400 text-sm">Loading...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={visibleCols.length} className="py-16 text-center text-gray-400 text-sm">No package sales found for this filter</td></tr>
              ) : data.map((row) => {
                const margin = row.totalRevenue > 0 ? (row.totalProfit / row.totalRevenue) * 100 : 0;
                return (
                  <tr
                    key={row.packageId ?? row.packageName}
                    className={`cursor-pointer hover:bg-indigo-50/40 ${row.rank % 2 === 0 ? "bg-gray-50/50" : "bg-white"}`}
                    onClick={() => row.packageId && openDrillDown(row.packageId, row.packageName)}
                  >
                    {visibleCols.includes("#") && (
                      <td className="px-4 py-3">
                        <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white inline-flex"
                          style={{ backgroundColor: row.rank <= 3 ? ["#f59e0b","#94a3b8","#cd7c2f"][row.rank-1] : "#e2e8f0", color: row.rank <= 3 ? "#fff" : "#64748b" }}>
                          {row.rank}
                        </span>
                      </td>
                    )}
                    {visibleCols.includes("Package") && (
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-800">📦 {row.packageName}</p>
                      </td>
                    )}
                    {visibleCols.includes("Times Sold") && (
                      <td className="px-4 py-3 text-gray-600">{Number(row.timesSold).toLocaleString()}</td>
                    )}
                    {visibleCols.includes("Qty Sold") && (
                      <td className="px-4 py-3 font-bold text-indigo-600">{Number(row.totalQtySold).toLocaleString()}</td>
                    )}
                    {visibleCols.includes("Revenue") && (
                      <td className="px-4 py-3 font-semibold text-green-600">${fmt(row.totalRevenue)}</td>
                    )}
                    {visibleCols.includes("COGS") && (
                      <td className="px-4 py-3 text-orange-500">${fmt(row.totalCogs)}</td>
                    )}
                    {visibleCols.includes("Profit") && (
                      <td className="px-4 py-3">
                        <p className={`font-semibold ${row.totalProfit >= 0 ? "text-green-600" : "text-red-500"}`}>${fmt(row.totalProfit)}</p>
                        <p className="text-xs text-gray-400">{margin.toFixed(1)}%</p>
                      </td>
                    )}
                    {visibleCols.includes("Details") && (
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); row.packageId && openDrillDown(row.packageId, row.packageName); }}
                          className="p-1.5 rounded-lg border border-gray-200 hover:bg-white text-gray-500 hover:text-indigo-600"
                          title="View sale instances"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
          <span>{total} package{total !== 1 ? "s" : ""}</span>
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

      {/* Drill-down modal */}
      {drillDownPackageId !== null && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) closeDrillDown(); }}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl flex flex-col" style={{ maxHeight: "85vh" }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
              <div>
                <h5 className="text-base font-bold text-gray-800">📦 {drillDownName}</h5>
                <p className="text-xs text-gray-400">Every sale instance in the current date/branch filter</p>
              </div>
              <button type="button" onClick={closeDrillDown}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-600 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-grow">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 sticky top-0">
                    {["Invoice", "Date", "Branch", "Customer", "Qty", "Revenue", "COGS", "Profit"].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {drillDownLoading ? (
                    <tr><td colSpan={8} className="py-12 text-center text-gray-400 text-sm">Loading...</td></tr>
                  ) : drillDownRows.length === 0 ? (
                    <tr><td colSpan={8} className="py-12 text-center text-gray-400 text-sm">No sale instances found for this filter</td></tr>
                  ) : drillDownRows.map((row) => (
                    <tr key={row.orderId} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-2.5 font-semibold">
                        <a
                          href={`/printsale/${row.orderId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {row.orderRef}
                        </a>
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">{row.orderDate ? new Date(row.orderDate).toLocaleDateString() : "—"}</td>
                      <td className="px-4 py-2.5 text-gray-600">{row.branchName}</td>
                      <td className="px-4 py-2.5 text-gray-600">{row.customerName}</td>
                      <td className="px-4 py-2.5 font-bold text-indigo-600">{row.qty}</td>
                      <td className="px-4 py-2.5 font-semibold text-green-600">${fmt(row.revenue)}</td>
                      <td className="px-4 py-2.5 text-orange-500">${fmt(row.cogs)}</td>
                      <td className={`px-4 py-2.5 font-semibold ${row.profit >= 0 ? "text-green-600" : "text-red-500"}`}>${fmt(row.profit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-3 border-t border-gray-100 flex-shrink-0 text-xs text-gray-400">
              {drillDownRows.length} sale instance{drillDownRows.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
