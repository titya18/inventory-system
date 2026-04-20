import { StockSummaryRow, LowStockRow, StockValuationRow, AssetReportRow } from "@/data_types/types";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export interface Pagination {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface StockSummaryResponse {
  data: StockSummaryRow[];
  summary: {
    totalItems: number;
    inStock: number;
    lowStock: number;
    outOfStock: number;
  };
  pagination: Pagination;
}

export const getStockSummary = async (
  sortField: string | null,
  sortOrder: "asc" | "desc" | null,
  page: number,
  searchTerm: string | null,
  pageSize: number,
  branchId?: number,
  stockStatus?: string,
  lowStockOnly?: boolean
): Promise<StockSummaryResponse> => {
  const params = new URLSearchParams();

  params.set("page", String(page));
  params.set("pageSize", String(pageSize));

  if (sortField) params.set("sortField", sortField);
  if (sortOrder) params.set("sortOrder", sortOrder);
  if (searchTerm) params.set("searchTerm", searchTerm);
  if (branchId) params.set("branchId", String(branchId));
  if (stockStatus) params.set("stockStatus", stockStatus);
  if (lowStockOnly) params.set("lowStockOnly", "true");

  const response = await fetch(`${API_BASE_URL}/api/stock?${params.toString()}`, {
    credentials: "include",
  });

  if (!response.ok) throw new Error("Error fetching stock summary");
  return response.json();
};

export interface LowStockResponse {
  data: LowStockRow[];
  summary: {
    totalItems: number;
    lowStock: number;
    outOfStock: number;
    totalShortageQty: number;
  };
  pagination: Pagination;
}

export const getLowStockReport = async (
  sortField: string | null,
  sortOrder: "asc" | "desc" | null,
  page: number,
  searchTerm: string | null,
  pageSize: number,
  branchId?: number,
  stockStatus?: string
): Promise<LowStockResponse> => {
  const params = new URLSearchParams();

  params.set("page", String(page));
  params.set("pageSize", String(pageSize));

  if (sortField) params.set("sortField", sortField);
  if (sortOrder) params.set("sortOrder", sortOrder);
  if (searchTerm) params.set("searchTerm", searchTerm);
  if (branchId) params.set("branchId", String(branchId));
  if (stockStatus) params.set("stockStatus", stockStatus);

  const response = await fetch(
    `${API_BASE_URL}/api/stock/low-stock?${params.toString()}`,
    { credentials: "include" }
  );

  if (!response.ok) throw new Error("Error fetching low stock report");
  return response.json();
};

import type { StockMovementRow } from "@/data_types/types";

export interface StockMovementResponse {
  data: StockMovementRow[];
  pagination: Pagination;
}

export const getStockMovements = async (
  page: number,
  searchTerm: string | null,
  pageSize: number,
  branchId?: number,
  startDate?: string,
  endDate?: string
): Promise<StockMovementResponse> => {

  const params = new URLSearchParams();

  params.set("page", String(page));
  params.set("pageSize", String(pageSize));

  if (searchTerm) params.set("searchTerm", searchTerm);
  if (branchId) params.set("branchId", String(branchId));
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);

  const response = await fetch(
    `${API_BASE_URL}/api/stock/movements?${params.toString()}`,
    { credentials: "include" }
  );

  if (!response.ok) throw new Error("Error fetching stock movements");

  return response.json();
};

export interface StockValuationResponse {
  data: StockValuationRow[];
  summary: {
    totalStockValue: number;
  };
  pagination: Pagination;
}

export const getStockValuation = async (
  page: number,
  searchTerm: string | null,
  pageSize: number,
  branchId?: number
): Promise<StockValuationResponse> => {

  const params = new URLSearchParams();

  params.set("page", String(page));
  params.set("pageSize", String(pageSize));

  if (searchTerm) params.set("searchTerm", searchTerm);
  if (branchId) params.set("branchId", String(branchId));

  const response = await fetch(
    `${API_BASE_URL}/api/stock/valuation?${params.toString()}`,
    { credentials: "include" }
  );

  if (!response.ok) throw new Error("Error fetching stock valuation");

  return response.json();
};

export const getSerialsByVariant = async (
  variantId: number,
  branchId: number,
  status?: string
): Promise<{ data: { id: number; serialNumber: string | null; assetCode: string | null; macAddress: string | null; status: string; sourceType: string | null; createdAt: string }[]; total: number }> => {
  const params = new URLSearchParams();
  params.set("variantId", String(variantId));
  params.set("branchId", String(branchId));
  if (status) params.set("status", status);

  const response = await fetch(`${API_BASE_URL}/api/stock/serials?${params.toString()}`, {
    credentials: "include",
  });
  if (!response.ok) throw new Error("Error fetching serials");
  return response.json();
};

export interface AssetReportResponse {
  data: AssetReportRow[];
  summary: Record<string, number>;
  pagination: Pagination;
}

export const getAssetReport = async (
  page: number,
  pageSize: number,
  searchTerm?: string,
  branchId?: number,
  status?: string,
  trackingType?: string
): Promise<AssetReportResponse> => {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  if (searchTerm) params.set("searchTerm", searchTerm);
  if (branchId) params.set("branchId", String(branchId));
  if (status) params.set("status", status);
  if (trackingType) params.set("trackingType", trackingType);

  const response = await fetch(`${API_BASE_URL}/api/stock/asset-report?${params.toString()}`, {
    credentials: "include",
  });
  if (!response.ok) throw new Error("Error fetching asset report");
  return response.json();
};