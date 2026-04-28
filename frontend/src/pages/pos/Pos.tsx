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

const mapVariantToProduct = (v: any): POSProduct => {
  const retailUnit =
    v.unitOptions?.find((u: any) => u.unitId === v.defaultRetailUnitId) ??
    v.unitOptions?.find((u: any) => u.isBaseUnit) ??
    v.unitOptions?.[0];

  const rawImage = v.products?.image?.[0] ?? null;
  const image = rawImage
    ? rawImage.startsWith("http") ? rawImage : `${API_BASE}/${rawImage}`
    : null;

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

  // Load branches for admin users (or any user without a branchId)
  useEffect(() => {
    if (!userBranchId) {
      getAllBranches()
        .then((data) => {
          setBranches(data.map((b: any) => ({ id: b.id, name: b.name })));
          if (data.length > 0) {
            setSelectedBranchId(data[0].id ?? null);
          }
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

  const loadProducts = useCallback(async (term: string) => {
    if (!effectiveBranchId) return;
    setLoading(true);
    try {
      const variants = await searchProduct(term, effectiveBranchId);
      setAllProducts((variants || []).map(mapVariantToProduct));
    } catch (err) {
      console.error("POS product load failed:", err);
      setAllProducts([]);
    } finally {
      setLoading(false);
    }
  }, [effectiveBranchId]);

  // Initial load when branchId becomes available
  useEffect(() => {
    loadProducts(searchQuery);
  }, [loadProducts]); // runs whenever effectiveBranchId changes

  // Debounced search
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => loadProducts(searchQuery), 400);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [searchQuery, loadProducts]);

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
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center shadow-sm flex-shrink-0">
                <span className="text-white text-sm font-bold">
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
              <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2.5 h-9 shadow-sm">
                <GitBranch className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                <select
                  className="bg-transparent text-sm text-gray-700 focus:outline-none cursor-pointer"
                  value={selectedBranchId ?? ""}
                  onChange={(e) => setSelectedBranchId(Number(e.target.value))}
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Search */}
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by name or barcode…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-9 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
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
              <div className="flex flex-col items-center justify-center h-64 gap-2 text-muted-foreground">
                <GitBranch className="w-10 h-10 opacity-30" />
                <p className="text-sm">Select a branch to load products</p>
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
