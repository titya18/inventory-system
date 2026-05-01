const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export interface CashSessionPaymentSummary {
    paymentMethodId: number;
    paymentMethodName: string;
    transactionCount: number;
    totalPaid: number;
}

export interface CashSessionType {
    id: number;
    branchId: number;
    shift: string | null;
    saleType: string | null;
    openedAt: string;
    closedAt: string;
    openedById: number | null;
    openingUSD: number;
    openingKHR: number;
    exchangeRate: number;
    totalSalesUSD: number;
    cashSalesUSD: number;
    actualCashUSD: number;
    differenceUSD: number;
    orderCount: number;
    note: string | null;
    paymentSummary: CashSessionPaymentSummary[];
    createdAt: string;
    branch?: { name: string };
    creator?: { firstName: string; lastName: string } | null;
    openedBy?: { firstName: string; lastName: string } | null;
}

export const createCashSession = async (data: Omit<CashSessionType, "id" | "createdAt" | "branch" | "creator" | "openedBy">): Promise<CashSessionType> => {
    const res = await fetch(`${API_BASE_URL}/api/cashsession`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Failed to save cash session");
    }
    return res.json();
};

export const getCashSessions = async (params: {
    branchId?: number;
    page?: number;
    pageSize?: number;
    from?: string;
    to?: string;
}): Promise<{ data: CashSessionType[]; total: number }> => {
    const q = new URLSearchParams();
    if (params.branchId) q.set("branchId", String(params.branchId));
    if (params.page)     q.set("page", String(params.page));
    if (params.pageSize) q.set("pageSize", String(params.pageSize));
    if (params.from)     q.set("from", params.from);
    if (params.to)       q.set("to", params.to);

    const res = await fetch(`${API_BASE_URL}/api/cashsession?${q}`, {
        credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to fetch cash sessions");
    return res.json();
};

export const getCashSessionById = async (id: number): Promise<CashSessionType> => {
    const res = await fetch(`${API_BASE_URL}/api/cashsession/${id}`, {
        credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to fetch cash session");
    return res.json();
};
