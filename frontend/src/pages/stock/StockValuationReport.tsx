import React, { useEffect, useMemo, useState } from "react";
import Pagination from "../components/Pagination";
import ExportDropdown from "@/components/ExportDropdown";
import { StockValuationRow } from "@/data_types/types";
import * as apiClient from "@/api/stock";

const formatCurrency = (value: number) =>
  `$${Number(value || 0)
    .toFixed(2)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;

const formatNumber = (value: number) =>
  Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });

const StockValuationReport: React.FC = () => {
  const [rows, setRows] = useState<StockValuationRow[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await apiClient.getStockValuation(
          page,
          null,
          pageSize
        );

        setRows(res.data || []);
        setTotalValue(Number(res.summary?.totalStockValue || 0));
        setTotal(Number(res.pagination?.total || 0));
      } catch (err: any) {
        console.error("Failed to load stock valuation report:", err);
        setError(err?.message || "Failed to load stock valuation report");
        setRows([]);
        setTotalValue(0);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [page, pageSize]);

  const exportData = useMemo(
    () =>
      rows.map((r, i) => ({
        No: (page - 1) * pageSize + i + 1,
        Product: r.productName,
        Variant: r.variantName || "",
        SKU: r.sku || "",
        Barcode: r.barcode || "",
        Branch: r.branchName,
        Quantity: r.quantity,
        Unit: r.unitName || "",
        Cost: r.unitCost,
        Value: r.stockValue,
      })),
    [rows, page, pageSize]
  );

  return (
    <div className="panel">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Stock Valuation Report</h2>
          <p className="text-sm text-gray-500">
            Current inventory value based on stock quantity and unit cost
          </p>
        </div>

        <ExportDropdown data={exportData} prefix="StockValuation" />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Rows</p>
          <h3 className="mt-1 text-xl font-semibold">{total}</h3>
        </div>

        <div className="rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Current Page Rows</p>
          <h3 className="mt-1 text-xl font-semibold">{rows.length}</h3>
        </div>

        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm text-green-700">Total Inventory Value</p>
          <h3 className="mt-1 text-xl font-bold text-green-600">
            {formatCurrency(totalValue)}
          </h3>
        </div>
      </div>

      <div className="dataTable-container overflow-x-auto">
        <table className="dataTable-table min-w-full">
          <thead>
            <tr>
              <th>No</th>
              <th>Product</th>
              <th>Variant</th>
              <th>SKU</th>
              <th>Barcode</th>
              <th>Branch</th>
              <th className="text-right">Quantity</th>
              <th>Unit</th>
              <th className="text-right">Cost</th>
              <th className="text-right">Value</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className="py-6 text-center text-gray-500">
                  Loading stock valuation report...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={10} className="py-6 text-center text-danger">
                  {error}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-6 text-center text-gray-500">
                  No stock valuation data found
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={`${r.variantId}-${r.branchId}`}>
                  <td>{(page - 1) * pageSize + i + 1}</td>

                  <td className="font-medium">{r.productName}</td>

                  <td>{r.variantName || "-"}</td>

                  <td>{r.sku || "-"}</td>

                  <td>{r.barcode || "-"}</td>

                  <td>{r.branchName}</td>

                  <td className="text-right">{formatNumber(r.quantity)}</td>

                  <td>{r.unitName || "-"}</td>

                  <td className="text-right">{formatCurrency(r.unitCost)}</td>

                  <td className="text-right font-semibold text-green-600">
                    {formatCurrency(r.stockValue)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-right text-lg font-bold">
        Total Inventory Value: {formatCurrency(totalValue)}
      </div>

      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setPage(1);
        }}
      />
    </div>
  );
};

export default StockValuationReport;