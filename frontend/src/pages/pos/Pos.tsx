import { POSHeader } from "@/components/pos/POSHeader";
import { CategoryTabs } from "@/components/pos/CategoryTabs";
import { ProductGrid } from "@/components/pos/ProductGrid";
import { OrderSidebar } from "@/components/pos/OrderSidebar";
import { BarcodeScanner } from "@/components/pos/BarcodeScanner";
import { useClock } from "@/hooks/useClock";
import { useAppContext } from "@/hooks/useAppContext";
import { useState, useEffect, useCallback, useRef } from "react";
import { Search, X, GitBranch, AlertTriangle, ScanLine } from "lucide-react";
import { searchProduct } from "@/api/searchProduct";
import { getAllCategories } from "@/api/category";
import { getAllBranches } from "@/api/branch";
import { POSProduct, useCart } from "@/hooks/useCart";

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
    wholeSalePrice: Number(u.suggestedWholesalePrice ?? 0),
    isBaseUnit: Boolean(u.isBaseUnit),
    multiplier: Number(u.operationValue ?? u.conversionQty ?? u.multiplier ?? 1),
  }));

  return {
    id: String(v.id),
    variantId: v.id,
    productId: v.productId ?? v.products?.id ?? 0,
    name: v.products?.name ?? v.name ?? "Unknown",
    price: Number(retailUnit?.suggestedRetailPrice ?? v.retailPrice ?? 0),
    wholeSalePrice: Number(retailUnit?.suggestedWholesalePrice ?? v.wholeSalePrice ?? 0),
    stock: Number(v.stocks?.[0]?.quantity ?? 0),
    categoryId: v.products?.categories?.id ?? 0,
    categoryName: v.products?.categories?.name ?? "Other",
    image,
    barcode: v.barcode ?? undefined,
    trackingType: v.trackingType ?? "NONE",
    unitId: retailUnit?.unitId ?? v.defaultRetailUnitId ?? v.baseUnitId ?? null,
    unitName: retailUnit?.unitName ?? v.baseUnit?.name ?? "",
    baseUnitName: v.baseUnit?.name ?? v.unitOptions?.find((u: any) => u.isBaseUnit)?.unitName ?? retailUnit?.unitName ?? "",
    branchId,
    unitOptions,
    productType: v.productType ?? undefined,
  };
};

const Pos: React.FC = () => {
  const { user } = useAppContext();
  const { formattedDate } = useClock();
  const { items, clearCart } = useCart();

  const [searchQuery, setSearchQuery] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [allProducts, setAllProducts] = useState<POSProduct[]>([]);
  const [categories, setCategories] = useState<POSCategory[]>([{ id: "all", name: "All" }]);
  const [loading, setLoading] = useState(false);

  // Branch handling — needed for ADMIN users who have no assigned branch
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(() => {
    const saved = localStorage.getItem("pos-branch");
    return saved ? Number(saved) : null;
  });
  const [pendingBranchId, setPendingBranchId] = useState<number | null>(null);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Effective branchId: user's own branch (regular users) or selected branch (admins)
  const userBranchId = user?.branchId && user.branchId > 0 ? user.branchId : null;
  const effectiveBranchId = userBranchId ?? selectedBranchId;

  // Keep a ref so loadProducts always reads latest branchId without being recreated
  const branchIdRef = useRef(effectiveBranchId);
  branchIdRef.current = effectiveBranchId;

  // Persist branch selection — warn and clear cart if items exist from another branch
  const handleSetBranch = (id: number) => {
    if (items.length > 0 && id !== selectedBranchId) {
      setPendingBranchId(id);
      return;
    }
    applyBranch(id);
  };

  const applyBranch = (id: number) => {
    clearCart();
    setSelectedBranchId(id);
    localStorage.setItem("pos-branch", String(id));
    setPendingBranchId(null);
  };

  // Load branches for admin users (or any user without a branchId)
  useEffect(() => {
    if (!userBranchId) {
      getAllBranches()
        .then((data) => {
          setBranches(data.map((b: any) => ({ id: b.id, name: b.name })));
          // Only default to 0 if nothing was previously saved
          setSelectedBranchId(prev => prev !== null ? prev : 0);
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

  // When cart items change (recall / page restore), sync branch selector to cart's branch
  useEffect(() => {
    if (!userBranchId && items.length > 0) {
      const cartBranchId = items[0].product.branchId;
      if (cartBranchId > 0 && cartBranchId !== selectedBranchId) {
        handleSetBranch(cartBranchId);
      }
    }
  }, [items]); // eslint-disable-line

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
    <div
      className="flex flex-col lg:h-screen lg:overflow-hidden"
      style={{ backgroundColor: '#f8fafc', color: '#1e293b' }}
    >
      <POSHeader />

      <div className="flex flex-col lg:flex-row lg:flex-1 lg:overflow-hidden">
        {/* ── Left: Products ── */}
        <main className="flex-1 min-w-0 flex flex-col lg:overflow-hidden">

          {/* Top bar */}
          <div className="px-4 py-3 flex items-center gap-3 flex-shrink-0" style={{ backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0' }}>
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
                  onChange={(e) => handleSetBranch(Number(e.target.value))}
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

            {/* Camera scan button */}
            <button
              onClick={() => setScannerOpen(true)}
              title="Scan barcode / QR code"
              className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white shadow-sm text-indigo-500 hover:bg-indigo-50 hover:border-indigo-300 transition-colors"
            >
              <ScanLine className="w-4 h-4" />
            </button>
          </div>

          {/* Category tabs */}
          <div className="px-4 py-2.5 overflow-x-auto flex-shrink-0" style={{ backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0' }}>
            <CategoryTabs
              categories={categories}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              productCounts={productCounts}
            />
          </div>

          {/* Product grid */}
          <div className="flex-1 overflow-y-auto p-4" style={{ backgroundColor: '#f1f5f9' }}>
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

      {/* Barcode / QR scanner */}
      {scannerOpen && (
        <BarcodeScanner
          onDetected={(value) => {
            setSearchQuery(value);
            setScannerOpen(false);
          }}
          onClose={() => setScannerOpen(false)}
        />
      )}

      {/* Branch-switch confirmation modal */}
      {pendingBranchId !== null && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ zIndex: 99999, backgroundColor: "rgba(15,23,42,0.6)", backdropFilter: "blur(2px)" }}
        >
          <div className="w-full max-w-sm rounded-2xl overflow-hidden" style={{ backgroundColor: "#fff", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            {/* Header */}
            <div className="px-5 pt-5 pb-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#fef3c7" }}>
                <AlertTriangle className="w-5 h-5" style={{ color: "#d97706" }} />
              </div>
              <div>
                <h3 className="font-bold text-sm" style={{ color: "#1e293b" }}>Switch Branch?</h3>
                <p className="text-sm mt-1" style={{ color: "#64748b" }}>
                  Switching branch will <span className="font-semibold" style={{ color: "#ef4444" }}>clear all items</span> in the current cart. This cannot be undone.
                </p>
              </div>
            </div>
            {/* Footer */}
            <div className="px-5 pb-5 flex gap-2">
              <button
                onClick={() => setPendingBranchId(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ backgroundColor: "#f1f5f9", color: "#64748b" }}
              >
                Keep Cart
              </button>
              <button
                onClick={() => applyBranch(pendingBranchId)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                style={{ background: "linear-gradient(to right,#ef4444,#dc2626)", color: "#fff", boxShadow: "0 4px 14px rgba(239,68,68,0.3)" }}
              >
                Clear &amp; Switch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pos;
