interface LowStockProduct {
  productVariantId: number;
  productId: number;
  productName: string;
  variantName: string;
  sku: string;
  barcode?: string | null;
  currentStock: number;
  stockStatus: "OUT_OF_STOCK" | "LOW_STOCK";
  branch?: {
    id: number;
    name: string;
  } | null;
}

interface Props {
  products: LowStockProduct[];
  mode?: "branch" | "all";
  threshold?: number;
}

const LowStockAlert = ({ products, mode = "all", threshold = 5 }: Props) => {
  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          Low Stock Alert
        </h3>
        <p className="text-sm text-gray-500">
          {mode === "branch"
            ? `Products in selected branch with stock at or below ${threshold}`
            : `Products across all branches with total stock at or below ${threshold}`}
        </p>
      </div>

      {products.length === 0 ? (
        <div className="py-8 text-center text-gray-400">
          No low stock product found
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {products.map((item) => (
            <div
              key={item.productVariantId}
              className="border border-gray-100 rounded-xl p-4 hover:shadow-sm transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-semibold text-gray-800">
                    {item.productName}
                  </div>

                  <div className="text-sm text-gray-500 mt-1">
                    {item.variantName}
                  </div>

                  <div className="text-xs text-gray-400 mt-1">
                    SKU: {item.sku || "-"}
                  </div>

                  {mode === "branch" && item.branch?.name && (
                    <div className="text-xs text-gray-400 mt-1">
                      Branch: {item.branch.name}
                    </div>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                      item.stockStatus === "OUT_OF_STOCK"
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {item.stockStatus === "OUT_OF_STOCK"
                      ? "Out of Stock"
                      : "Low Stock"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 mt-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500">
                    {mode === "branch" ? "Current Stock" : "Total Stock"}
                  </div>
                  <div className="text-base font-bold text-gray-800 mt-1">
                    {Number(item.currentStock || 0).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LowStockAlert;