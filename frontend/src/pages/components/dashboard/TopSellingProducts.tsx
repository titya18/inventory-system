interface TopSellingProduct {
  rank: number;
  productVariantId: number;
  productId: number;
  productName: string;
  variantName: string;
  sku: string;
  barcode?: string | null;
  totalQty: number;
  totalRevenue: number;
  currentStock: number;
  stockAlert: number;
  branch: {
    id: number;
    name: string;
  };
}

interface Props {
  products: TopSellingProduct[];
}

const formatCurrency = (value: number) =>
  `$${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const TopSellingProducts = ({ products }: Props) => {
  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          Top Selling Products
        </h3>
        <p className="text-sm text-gray-500">
          Best selling variants in selected period
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-gray-500">
              <th className="py-3 pr-4">#</th>
              <th className="py-3 pr-4">Product</th>
              <th className="py-3 pr-4">SKU</th>
              <th className="py-3 pr-4">Qty Sold</th>
              <th className="py-3 pr-4">Revenue</th>
              <th className="py-3 pr-4">Stock</th>
              <th className="py-3 pr-0">Branch</th>
            </tr>
          </thead>

          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-400">
                  No top selling product found
                </td>
              </tr>
            ) : (
              products.map((item) => (
                <tr
                  key={item.productVariantId}
                  className="border-b border-gray-50 hover:bg-gray-50 transition"
                >
                  <td className="py-3 pr-4 font-semibold text-blue-600">
                    #{item.rank}
                  </td>

                  <td className="py-3 pr-4">
                    <div className="font-medium text-gray-800">
                      {item.productName}
                    </div>
                    <div className="text-xs text-gray-500">
                      {item.variantName}
                    </div>
                  </td>

                  <td className="py-3 pr-4 text-gray-600">
                    {item.sku || "-"}
                  </td>

                  <td className="py-3 pr-4 font-medium text-gray-800">
                    {Number(item.totalQty || 0).toLocaleString()}
                  </td>

                  <td className="py-3 pr-4 font-semibold text-emerald-600">
                    {formatCurrency(item.totalRevenue)}
                  </td>

                  <td className="py-3 pr-4">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                        item.currentStock <= 0
                          ? "bg-red-100 text-red-700"
                          : item.currentStock <= item.stockAlert
                          ? "bg-amber-100 text-amber-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {Number(item.currentStock || 0).toLocaleString()}
                    </span>
                  </td>

                  <td className="py-3 pr-0 text-gray-600">
                    {item.branch?.name || "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TopSellingProducts;