import { POSHeader } from "@/components/pos/POSHeader";
import { CategoryTabs } from "@/components/pos/CategoryTabs";
import { ProductGrid } from "@/components/pos/ProductGrid";
import { OrderSidebar } from "@/components/pos/OrderSidebar";
import { useClock } from "@/hooks/useClock";
import { useAppContext } from "@/hooks/useAppContext";
import { useState, useEffect, useCallback, useRef } from "react";
import { Search, X, GitBranch } from "lucide-react";
import { searchProduct } from "@/api/searchProduct";
import { getAllCategories } from "@/api/category";
import { getAllBranches } from "@/api/branch";
import { POSProduct } from "@/hooks/useCart";

const API_BASE = import.meta.env.VITE_API_URL || "";

export interface POSCategory {
  id: number | string;
  name: string;
}

const mapVariantToProduct = (v: any, branchId: number): POSProduct => {
  const retailUnit =
    v.unitOptions?.find((u: any) => u.unitId === v.defaultRetailUnitId) ??
    v.unitOptions?.find((u: any) => u.isBaseUnit) ??
    v.unitOptions?.[0];

  const rawImage = v.products?.image?.[0] ?? null;
  const image = rawImage
    ? rawImage.startsWith("http") ? rawImage : `${API_BASE}/${rawImage}`
    : null;

  const unitOptions = (v.unitOptions ?? []).map((u: any) => ({
    unitId: u.unitId,
    unitName: u.unitName,
    price: Number(u.suggestedRetailPrice ?? u.price ?? 0),
    isBaseUnit: Boolean(u.isBaseUnit),
    multiplier: Number(u.conversionQty ?? u.multiplier ?? 1),
  }));

  return {
    id: String(v.id),
    variantId: v.id,
    productId: v.productId ?? v.products?.id ?? 0,
    name: v.products?.name ?? v.name ?? "Unknown",
    price: Number(retailUnit?.suggestedRetailPrice ?? v.retailPrice ?? 0),
    stock: Number(v.stocks?.[0]?.quantity ?? 0),
    categoryId: v.products?.categories?.id ?? 0,
    categoryName: v.products?.categories?.name ?? "Other",
    image,
    barcode: v.barcode ?? undefined,
    trackingType: v.trackingType ?? "NONE",
    unitId: retailUnit?.unitId ?? v.defaultRetailUnitId ?? v.baseUnitId ?? null,
    unitName: retailUnit?.unitName ?? v.baseUnit?.name ?? "",
    branchId,
    unitOptions,
  };
};

const Pos: React.FC = () => {
  const { user } = useAppContext();
  const { formattedDate } = useClock();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [allProducts, setAllProducts] = useState<POSProduct[]>([]);
  const [categories, setCategories] = useState<POSCategory[]>([{ id: "all", name: "All" }]);
  const [loading, setLoading] = useState(false);

  // Branch handling — needed for ADMIN users who have no assigned branch
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Effective branchId: user's own branch (regular users) or selected branch (admins)
  const userBranchId = user?.branchId && user.branchId > 0 ? user.branchId : null;
  const effectiveBranchId = userBranchId ?? selectedBranchId;

  // Keep a ref so loadProducts always reads latest branchId without being recreated
  const branchIdRef = useRef(effectiveBranchId);
  branchIdRef.current = effectiveBranchId;

  // Load branches for admin users (or any user without a branchId)
  useEffect(() => {
    if (!userBranchId) {
      getAllBranches()
        .then((data) => {
          setBranches(data.map((b: any) => ({ id: b.id, name: b.name })));
          setSelectedBranchId(0); // 0 = All Branches default
        })
        .catch(() => {});
    }
  }, [userBranchId]);

  // Load categories
  useEffect(() => {
    getAllCategories()
      .then((cats) => {
        setCategories([
          { id: "all", name: "All" },
          ...cats.map((c: any) => ({ id: c.id, name: c.name })),
        ]);
      })
      .catch(() => {});
  }, []);

  // Stable load function — reads branchId from ref, never recreated
  const loadProducts = useCallback(async (term: string) => {
    const branchId = branchIdRef.current;
    if (!branchId) return; // 0 or null = no branch selected
    setLoading(true);
    try {
      const variants = await searchProduct(term, branchId);
      setAllProducts((variants || []).map((v: any) => mapVariantToProduct(v, branchId)));
    } catch (err) {
      console.error("POS product load failed:", err);
      setAllProducts([]);
    } finally {
      setLoading(false);
    }
  }, []); // stable — no deps needed

  // Branch change: immediate reload (clears any pending debounce)
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    loadProducts(searchQuery);
  }, [effectiveBranchId]); // eslint-disable-line

  // Search: debounced reload
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => loadProducts(searchQuery), 400);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [searchQuery]); // eslint-disable-line

  const filteredProducts =
    selectedCategory === "all"
      ? allProducts
      : allProducts.filter((p) => String(p.categoryId) === String(selectedCategory));

  const productCounts = Object.fromEntries(
    categories.map((c) => [
      String(c.id),
      c.id === "all"
        ? allProducts.length
        : allProducts.filter((p) => String(p.categoryId) === String(c.id)).length,
    ])
  );

  return (
    <div className="bg-background flex flex-col lg:h-screen lg:overflow-hidden">
      <POSHeader />

      <div className="flex flex-col lg:flex-row lg:flex-1 lg:overflow-hidden">
        {/* ── Left: Products ── */}
        <main className="flex-1 min-w-0 flex flex-col lg:overflow-hidden">

          {/* Top bar */}
          <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-indigo-50 via-white to-blue-50 flex items-center gap-3 flex-shrink-0">
            {/* User avatar + info */}
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #6366f1, #3b82f6)' }}
              >
                <span className="text-sm font-bold" style={{ color: '#fff' }}>
                  {(user?.name ?? "U").charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800 leading-none">{user?.name ?? "User"}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{formattedDate}</p>
              </div>
            </div>

            {/* Branch selector */}
            {!userBranchId && branches.length > 0 && (
              <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2.5 h-9 shadow-sm flex-shrink-0">
                <GitBranch className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                <select
                  className="bg-transparent text-sm text-gray-700 focus:outline-none cursor-pointer"
                  value={selectedBranchId ?? 0}
                  onChange={(e) => setSelectedBranchId(Number(e.target.value))}
                >
                  <option value={0}>All Branches</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Search */}
            <div className="relative flex-1 min-w-0 flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2.5 h-9 shadow-sm">
              <Search className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by name, SKU or barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm text-gray-700 focus:outline-none min-w-0"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="flex-shrink-0 text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Category tabs */}
          <div className="px-4 py-2.5 border-b border-gray-100 bg-white overflow-x-auto flex-shrink-0">
            <CategoryTabs
              categories={categories}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              productCounts={productCounts}
            />
          </div>

          {/* Product grid */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-950">
            {!effectiveBranchId ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-300">
                <GitBranch className="w-12 h-12" />
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-400">No branch selected</p>
                  <p className="text-xs text-gray-300 mt-0.5">Select a branch above to load products</p>
                </div>
              </div>
            ) : (
              <ProductGrid products={filteredProducts} loading={loading} />
            )}
          </div>
        </main>

        {/* ── Right: Order sidebar ── */}
        <OrderSidebar branchId={effectiveBranchId ?? 0} />
      </div>
    </div>
  );
};

export default Pos;
