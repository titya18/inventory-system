import { 
    InvoiceType, 
    OrderOnPaymentType, 
    QuotationType, 
    PurchaseType, 
    PaymentType,
    StockAdjustmentType,
    StockTransferType, 
    StockRequestType,
    StockReturnType,
    ExpenseType,
    IncomeType,
    SaleReturnType,
    ProfitReportRow
} from "../data_types/types";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

interface ReportAllParams {
    sortField?: string | null;
    sortOrder?: "asc" | "desc" | null;
    page: number;
    pageSize: number;
    searchTerm?: string | null;

    // new filters
    startDate?: string; // YYYY-MM-DD
    endDate?: string;   // YYYY-MM-DD
    status?: string;    // PENDING, COMPLETED, etc (CANCELLED excluded in backend)
    branchId?: number;
}

interface ReportInvoiceParams {
    sortField?: string | null;
    sortOrder?: "asc" | "desc" | null;
    page: number;
    pageSize: number;
    searchTerm?: string | null;

    startDate?: string;
    endDate?: string;
    saleType?: "RETAIL" | "WHOLESALE";
    status?: string;
    statuses?: string; // comma-separated multi-status, e.g. "RECEIVED,COMPLETED"
    branchId?: number;
}

interface ReportAdjustmentParams {
    sortField?: string | null;
    sortOrder?: "asc" | "desc" | null;
    page: number;
    pageSize: number;
    searchTerm?: string | null;

    // new filters
    startDate?: string; // YYYY-MM-DD
    endDate?: string;   // YYYY-MM-DD
    adjustType?: "POSITIVE" | "NEGATIVE";
    status?: string;
    reason?: string;
    branchId?: number;
}

interface ReportInvoiceResponse {
    data: InvoiceType[];
    total: number;
    summary: {
        totalInvoice: number;
        totalAmount: number;
        totalReceivedAmount: number;
        totalRemainAmount: number;
        totalProfit: number;
    };
}

interface ReportCancelInvoiceResponse {
    data: InvoiceType[];
    total: number;
    summary: {
        totalInvoice: number;
        totalAmount: number;
        totalReceivedAmount: number;
        totalRemainAmount: number;
        totalLostProfit: number;
    };
}

interface ReportPaymentInvoiceResponse {
    data: OrderOnPaymentType[];
    total: number;
    summary: {
        totalPayments: number;
        totalPaid: number;
    };
}

interface ReportPaymentPurchaseResponse {
    data: PaymentType[];
    total: number;
    summary: {
        totalPayments: number;
        totalPaid: number;
    };
}

interface ReportQuotationResponse {
    data: QuotationType[];
    total: number;
    summary: {
        totalQuotation: number;
        totalAmount: number;
    };
}

interface ReportPurchaseResponse {
    data: PurchaseType[];
    total: number;
    summary: {
        totalPurchase: number;
        grandTotalAmount: number;
        totalPaidAmount: number;
        totalRemainAmount: number;
    };
    growth: number | null; // new field for growth percentage
}

interface ReportSaleReturnsponse {
    data: SaleReturnType[];
    total: number;
    summary: {
        totalNumberSaleReturn: number;
        totalAmount: number;
    };
}

interface ReportSaleReturnParams {
    sortField?: string | null;
    sortOrder?: "asc" | "desc" | null;
    page: number;
    pageSize: number;
    searchTerm?: string | null;

    // new filters
    startDate?: string; // YYYY-MM-DD
    endDate?: string;   // YYYY-MM-DD
    branchId?: number;
}

export interface DashboardTopSellingProductType {
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

export interface DashboardLowStockProductType {
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

interface DashboardWidgetParams {
    startDate?: string;
    endDate?: string;
    branchId?: number;
    limit?: number;
    threshold?: number;
}

export const getAllReportInvoices = async ({
    sortField,
    sortOrder,
    page,
    pageSize,
    searchTerm,
    startDate,
    endDate,
    saleType,
    status,
    branchId
}: ReportInvoiceParams): Promise<ReportInvoiceResponse> => {

    const params = new URLSearchParams();

    params.set("page", String(page));
    params.set("pageSize", String(pageSize));

    if (searchTerm) params.set("searchTerm", searchTerm);
    if (sortField && sortOrder) {
        params.set("sortField", sortField);
        params.set("sortOrder", sortOrder);
    }

    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (saleType) params.set("saleType", saleType);
    if (status) params.set("status", status);
    if (branchId) params.set("branchId", String(branchId));

    const url = `${API_BASE_URL}/api/report/reportInvoices?${params.toString()}`;

    const response = await fetch(url, { credentials: "include" });

    if (!response.ok) {
        throw new Error("Failed to fetch invoices");
    }

    const result = await response.json();

    return {
        data: result.data || [],
        total: result.total || 0,
        summary: result.summary || {
            totalInvoice: 0,
            totalAmount: 0,
            totalReceivedAmount: 0,
            totalRemainAmount: 0,
            totalProfit: 0,
        },
    };
};

export const getAllCancelReportInvoices = async ({
    sortField,
    sortOrder,
    page,
    pageSize,
    searchTerm,
    startDate,
    endDate,
    saleType,
    status,
    branchId
}: ReportInvoiceParams): Promise<ReportCancelInvoiceResponse> => {

    const params = new URLSearchParams();

    params.set("page", String(page));
    params.set("pageSize", String(pageSize));

    if (searchTerm) params.set("searchTerm", searchTerm);
    if (sortField && sortOrder) {
        params.set("sortField", sortField);
        params.set("sortOrder", sortOrder);
    }

    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (saleType) params.set("saleType", saleType);
    if (status) params.set("status", status);
    if (branchId) params.set("branchId", String(branchId));

    const url = `${API_BASE_URL}/api/report/reportCancelInvoices?${params.toString()}`;

    const response = await fetch(url, { credentials: "include" });

    if (!response.ok) {
        throw new Error("Failed to fetch invoices");
    }

    const result = await response.json();

    return {
        data: result.data || [],
        total: result.total || 0,
        summary: result.summary || {
            totalInvoice: 0,
            totalAmount: 0,
            totalReceivedAmount: 0,
            totalRemainAmount: 0,
            totalLostProfit: 0,
        },
    };
};

export const getAllPaymentReportInvoices = async ({
    sortField,
    sortOrder,
    page,
    pageSize,
    searchTerm,
    startDate,
    endDate,
    saleType,
    status,
    branchId
}: ReportInvoiceParams): Promise<ReportPaymentInvoiceResponse> => {

    const params = new URLSearchParams();

    params.set("page", String(page));
    params.set("pageSize", String(pageSize));

    if (searchTerm) params.set("searchTerm", searchTerm);
    if (sortField && sortOrder) {
        params.set("sortField", sortField);
        params.set("sortOrder", sortOrder);
    }

    const today = new Date().toISOString().split('T')[0];

    params.set("startDate", startDate || today);
    params.set("endDate", endDate || today);

    if (saleType) params.set("saleType", saleType);
    if (status) params.set("status", status);
    if (branchId) params.set("branchId", String(branchId));

    const url = `${API_BASE_URL}/api/report/reportPaymentInvoices?${params.toString()}`;

    const response = await fetch(url, { credentials: "include" });

    if (!response.ok) {
        throw new Error("Failed to fetch payment invoices");
    }

    const result = await response.json();

    return {
        data: result.data || [],
        total: result.total || 0,
        summary: result.summary || {
            totalOrders: 0,
            totalPaid: 0,
        },
    };
};

export const getAllReportQuotations = async ({
    sortField,
    sortOrder,
    page,
    pageSize,
    searchTerm,
    startDate,
    endDate,
    saleType,
    status,
    statuses,
    branchId
}: ReportInvoiceParams): Promise<ReportQuotationResponse> => {

    const params = new URLSearchParams();

    params.set("page", String(page));
    params.set("pageSize", String(pageSize));

    if (searchTerm) params.set("searchTerm", searchTerm);
    if (sortField && sortOrder) {
        params.set("sortField", sortField);
        params.set("sortOrder", sortOrder);
    }

    const today = new Date().toISOString().split('T')[0];

    params.set("startDate", startDate || today);
    params.set("endDate", endDate || today);

    if (saleType) params.set("saleType", saleType);
    if (status) params.set("status", status);
    if (statuses) params.set("statuses", statuses);
    if (branchId) params.set("branchId", String(branchId));

    const url = `${API_BASE_URL}/api/report/reportQuotations?${params.toString()}`;

    const response = await fetch(url, { credentials: "include" });

    if (!response.ok) {
        throw new Error("Failed to fetch quotation report");
    }

    const result = await response.json();

    return {
        data: result.data || [],
        total: result.total || 0,
        summary: result.summary || {
            totalQuotation: 0,
            totalAmount: 0,
        },
    };
};

export const getAllReportPurchases = async ({
    sortField,
    sortOrder,
    page,
    pageSize,
    searchTerm,
    startDate,
    endDate,
    status,
    statuses,
    branchId
}: ReportInvoiceParams): Promise<ReportPurchaseResponse> => {

    const params = new URLSearchParams();

    params.set("page", String(page));
    params.set("pageSize", String(pageSize));

    if (searchTerm) params.set("searchTerm", searchTerm);
    if (sortField && sortOrder) {
        params.set("sortField", sortField);
        params.set("sortOrder", sortOrder);
    }

    const today = new Date().toISOString().split('T')[0];

    params.set("startDate", startDate || today);
    params.set("endDate", endDate || today);

    if (status) params.set("status", status);
    if (statuses) params.set("statuses", statuses);
    if (branchId) params.set("branchId", String(branchId));

    const url = `${API_BASE_URL}/api/report/reportPurchases?${params.toString()}`;

    const response = await fetch(url, { credentials: "include" });

    if (!response.ok) {
        throw new Error("Failed to fetch purchase report");
    }

    const result = await response.json();

    return {
        data: result.data || [],
        total: result.total || 0,
        summary: result.summary || {
            totalPurchase: 0,
            grandTotalAmount: 0,
            totalPaidAmount: 0,
            totalRemainAmount: 0,
        },
        growth: result.growth ?? null,
    };
};

export const getAllPaymentReportPurchases = async ({
    sortField,
    sortOrder,
    page,
    pageSize,
    searchTerm,
    startDate,
    endDate,
    saleType,
    status,
    branchId
}: ReportInvoiceParams): Promise<ReportPaymentPurchaseResponse> => {

    const params = new URLSearchParams();

    params.set("page", String(page));
    params.set("pageSize", String(pageSize));

    if (searchTerm) params.set("searchTerm", searchTerm);
    if (sortField && sortOrder) {
        params.set("sortField", sortField);
        params.set("sortOrder", sortOrder);
    }

    const today = new Date().toISOString().split('T')[0];

    params.set("startDate", startDate || today);
    params.set("endDate", endDate || today);

    if (saleType) params.set("saleType", saleType);
    if (status) params.set("status", status);
    if (branchId) params.set("branchId", String(branchId));

    const url = `${API_BASE_URL}/api/report/reportPaymentPurchases?${params.toString()}`;

    const response = await fetch(url, { credentials: "include" });

    if (!response.ok) {
        throw new Error("Failed to fetch payment invoices");
    }

    const result = await response.json();

    return {
        data: result.data || [],
        total: result.total || 0,
        summary: result.summary || {
            totalOrders: 0,
            totalPaid: 0,
        },
    };
};

export const getAllReportAdjustments = async ({
    sortField,
    sortOrder,
    page,
    pageSize,
    searchTerm,
    startDate,
    endDate,
    adjustType,
    status,
    reason,
    branchId
}: ReportAdjustmentParams): Promise<{ data: StockAdjustmentType[], total: number }> => {

    const params = new URLSearchParams();

    params.set("page", String(page));
    params.set("pageSize", String(pageSize));

    if (searchTerm) params.set("searchTerm", searchTerm);
    if (sortField && sortOrder) {
        params.set("sortField", sortField);
        params.set("sortOrder", sortOrder);
    }

    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (adjustType) params.set("adjustType", adjustType);
    if (status) params.set("status", status);
    if (reason) params.set("reason", reason);
    if (branchId) params.set("branchId", String(branchId));

    const url = `${API_BASE_URL}/api/report/reportAdjustments?${params.toString()}`;

    const response = await fetch(url, { credentials: "include" });

    if (!response.ok) {
        throw new Error("Failed to fetch adjustment report");
    }

    const result = await response.json();

    return {
        data: result.data || [],
        total: result.total || 0,
    };
};

export const getAllReportTransfers = async ({
    sortField,
    sortOrder,
    page,
    pageSize,
    searchTerm,
    startDate,
    endDate,
    status,
    branchId
}: ReportAllParams): Promise<{ data: StockTransferType[], total: number }> => {

    const params = new URLSearchParams();

    params.set("page", String(page));
    params.set("pageSize", String(pageSize));

    if (searchTerm) params.set("searchTerm", searchTerm);
    if (sortField && sortOrder) {
        params.set("sortField", sortField);
        params.set("sortOrder", sortOrder);
    }

    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (status) params.set("status", status);
    if (branchId) params.set("branchId", String(branchId));

    const url = `${API_BASE_URL}/api/report/reportTransfers?${params.toString()}`;

    const response = await fetch(url, { credentials: "include" });

    if (!response.ok) {
        throw new Error("Failed to fetch transfer report");
    }

    const result = await response.json();

    return {
        data: result.data || [],
        total: result.total || 0,
    };
};

export const getAllReportRequests = async ({
    sortField,
    sortOrder,
    page,
    pageSize,
    searchTerm,
    startDate,
    endDate,
    status,
    branchId
}: ReportAllParams): Promise<{ data: StockRequestType[], total: number }> => {

    const params = new URLSearchParams();

    params.set("page", String(page));
    params.set("pageSize", String(pageSize));

    if (searchTerm) params.set("searchTerm", searchTerm);
    if (sortField && sortOrder) {
        params.set("sortField", sortField);
        params.set("sortOrder", sortOrder);
    }

    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (status) params.set("status", status);
    if (branchId) params.set("branchId", String(branchId));

    const url = `${API_BASE_URL}/api/report/reportRequests?${params.toString()}`;

    const response = await fetch(url, { credentials: "include" });

    if (!response.ok) {
        throw new Error("Failed to fetch request report");
    }

    const result = await response.json();

    return {
        data: result.data || [],
        total: result.total || 0,
    };
};

export const getAllReportReturns = async ({
    sortField,
    sortOrder,
    page,
    pageSize,
    searchTerm,
    startDate,
    endDate,
    status,
    branchId
}: ReportAllParams): Promise<{ data: StockReturnType[], total: number }> => {

    const params = new URLSearchParams();

    params.set("page", String(page));
    params.set("pageSize", String(pageSize));

    if (searchTerm) params.set("searchTerm", searchTerm);
    if (sortField && sortOrder) {
        params.set("sortField", sortField);
        params.set("sortOrder", sortOrder);
    }

    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (status) params.set("status", status);
    if (branchId) params.set("branchId", String(branchId));

    const url = `${API_BASE_URL}/api/report/reportReturns?${params.toString()}`;

    const response = await fetch(url, { credentials: "include" });

    if (!response.ok) {
        throw new Error("Failed to fetch return report");
    }

    const result = await response.json();

    return {
        data: result.data || [],
        total: result.total || 0,
    };
};

export const getAllReportExpenses = async ({
    sortField,
    sortOrder,
    page,
    pageSize,
    searchTerm,
    startDate,
    endDate,
    status,
    branchId
}: ReportAllParams): Promise<{ data: ExpenseType[], total: number }> => {

    const params = new URLSearchParams();

    params.set("page", String(page));
    params.set("pageSize", String(pageSize));

    if (searchTerm) params.set("searchTerm", searchTerm);
    if (sortField && sortOrder) {
        params.set("sortField", sortField);
        params.set("sortOrder", sortOrder);
    }

    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (status) params.set("status", status);
    if (branchId) params.set("branchId", String(branchId));

    const url = `${API_BASE_URL}/api/report/reportExpenses?${params.toString()}`;

    const response = await fetch(url, { credentials: "include" });

    if (!response.ok) {
        throw new Error("Failed to fetch expenses report");
    }

    const result = await response.json();

    return {
        data: result.data || [],
        total: result.total || 0,
    };
};

export const getAllReportIncomes = async ({
    sortField,
    sortOrder,
    page,
    pageSize,
    searchTerm,
    startDate,
    endDate,
    status,
    branchId
}: ReportAllParams): Promise<{ data: IncomeType[], total: number }> => {

    const params = new URLSearchParams();

    params.set("page", String(page));
    params.set("pageSize", String(pageSize));

    if (searchTerm) params.set("searchTerm", searchTerm);
    if (sortField && sortOrder) {
        params.set("sortField", sortField);
        params.set("sortOrder", sortOrder);
    }

    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (status) params.set("status", status);
    if (branchId) params.set("branchId", String(branchId));

    const url = `${API_BASE_URL}/api/report/reportIncomes?${params.toString()}`;

    const response = await fetch(url, { credentials: "include" });

    if (!response.ok) {
        throw new Error("Failed to fetch incomes report");
    }

    const result = await response.json();

    return {
        data: result.data || [],
        total: result.total || 0,
    };
};

export const getAllReportSaleReturns = async (params: {
    page?: number;
    pageSize?: number;
    searchTerm?: string;
    sortField?: string;
    sortOrder?: "asc" | "desc";
    startDate?: string;
    endDate?: string;
    saleType?: "RETAIL" | "WHOLESALE";
    status?: string;
    branchId?: number;
}) => {
    const query = new URLSearchParams();

    if (params.page) query.set("page", String(params.page));
    if (params.pageSize) query.set("pageSize", String(params.pageSize));
    if (params.searchTerm) query.set("searchTerm", params.searchTerm);
    if (params.sortField) query.set("sortField", params.sortField);
    if (params.sortOrder) query.set("sortOrder", params.sortOrder);
    if (params.startDate) query.set("startDate", params.startDate);
    if (params.endDate) query.set("endDate", params.endDate);
    if (params.saleType) query.set("saleType", params.saleType);
    if (params.status) query.set("status", params.status);
    if (params.branchId) query.set("branchId", String(params.branchId));

    const url = `${API_BASE_URL}/api/report/reportSalesReturns?${query.toString()}`;

    const response = await fetch(url, { credentials: "include" });

    if (!response.ok) {
        throw new Error("Failed to fetch sale return report");
    }

    const result = await response.json();

    return {
        data: result.data || [],
        total: result.total || 0,
        summary: result.summary || {
            totalNumberSaleReturn: 0,
            totalAmount: 0,
        },
    };
};

export const getDashboardTopSellingProducts = async ({
    startDate,
    endDate,
    branchId,
    limit = 10,
}: DashboardWidgetParams): Promise<{
    data: DashboardTopSellingProductType[];
    total: number;
}> => {
    const params = new URLSearchParams();

    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (branchId) params.set("branchId", String(branchId));
    params.set("limit", String(limit));

    const url = `${API_BASE_URL}/api/report/dashboardTopSellingProducts?${params.toString()}`;

    const response = await fetch(url, { credentials: "include" });

    if (!response.ok) {
        throw new Error("Failed to fetch top selling products");
    }

    const result = await response.json();

    return {
        data: result.data || [],
        total: result.total || 0,
    };
};

export const getDashboardLowStockProducts = async ({
    branchId,
    limit = 10,
    threshold = 5,
}: DashboardWidgetParams): Promise<{
    data: DashboardLowStockProductType[];
    total: number;
    mode: "branch" | "all";
    threshold: number;
}> => {
    const params = new URLSearchParams();

    if (branchId) params.set("branchId", String(branchId));
    params.set("limit", String(limit));
    params.set("threshold", String(threshold));

    const url = `${API_BASE_URL}/api/report/dashboardLowStockProducts?${params.toString()}`;

    const response = await fetch(url, { credentials: "include" });

    if (!response.ok) {
        throw new Error("Failed to fetch low stock products");
    }

    const result = await response.json();

    return {
        data: result.data || [],
        total: result.total || 0,
        mode: result.mode || "all",
        threshold: result.threshold || threshold,
    };
};

export interface Pagination {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ProfitReportResponse {
    data: ProfitReportRow[];
    summary: {
        totalSales: number;
        totalCogs: number;
        totalProfit: number;
        avgMarginPercent: number;
    };
    pagination: Pagination;
}

export const getProfitReport = async (
    sortField: string | null,
    sortOrder: "asc" | "desc" | null,
    page: number,
    searchTerm: string | null,
    pageSize: number,
    branchId?: number,
    startDate?: string,
    endDate?: string
): Promise<ProfitReportResponse> => {
    const params = new URLSearchParams();

    params.set("page", String(page));
    params.set("pageSize", String(pageSize));

    if (sortField) params.set("sortField", sortField);
    if (sortOrder) params.set("sortOrder", sortOrder);
    if (searchTerm) params.set("searchTerm", searchTerm);
    if (branchId) params.set("branchId", String(branchId));
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);

    const response = await fetch(
        `${API_BASE_URL}/api/report/profitReport?${params.toString()}`,
        { credentials: "include" }
    );

    if (!response.ok) throw new Error("Error fetching profit report");
    return response.json();
};

export const getCustomerEquipmentReport = async ({
    page = 1,
    pageSize = 10,
    searchTerm = "",
    startDate = "",
    endDate = "",
    status = "",
    assignType = "",
    branchId,
}: {
    page?: number;
    pageSize?: number;
    searchTerm?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    assignType?: string;
    branchId?: number;
}): Promise<{
    data: any[];
    total: number;
    summary: { total: number; active: number; returned: number; byType: Record<string, number> };
}> => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    if (searchTerm) params.set("searchTerm", searchTerm);
    if (startDate)  params.set("startDate", startDate);
    if (endDate)    params.set("endDate", endDate);
    if (status)     params.set("status", status);
    if (assignType) params.set("assignType", assignType);
    if (branchId)   params.set("branchId", String(branchId));

    const res = await fetch(`${API_BASE_URL}/api/report/reportCustomerEquipment?${params.toString()}`, {
        credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to fetch customer equipment report");
    return res.json();
};

export interface CashSessionPayment {
    paymentMethodId: number;
    paymentMethodName: string;
    transactionCount: number;
    totalPaid: number;
    totalUSD: number;
    totalKHR: number;
}

export interface CashSessionReport {
    from: string;
    to: string;
    payments: CashSessionPayment[];
    totals: {
        orderCount: number;
        grandTotal: number;
        totalUSD: number;
        totalKHR: number;
    };
}

export const getCashSessionReport = async (
    branchId: number,
    from: string
): Promise<CashSessionReport> => {
    const params = new URLSearchParams({ branchId: String(branchId), from });
    const res = await fetch(`${API_BASE_URL}/api/report/cashSessionReport?${params}`, {
        credentials: "include",
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Server error ${res.status}`);
    }
    return res.json();
};
