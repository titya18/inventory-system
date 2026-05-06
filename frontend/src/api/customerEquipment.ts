const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export const getAllCustomerEquipments = async (
    page = 1,
    pageSize = 10,
    searchTerm = "",
    status = "",
    branchId = 0,
    assignType = ""
) => {
    const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        searchTerm,
        status,
        branchId: String(branchId),
        assignType,
    });
    const res = await fetch(`${API_BASE_URL}/api/customerequipment?${params}`, {
        credentials: "include",
    });
    if (!res.ok) throw new Error((await res.json()).message || "Failed to fetch");
    return res.json();
};

export const getCustomerEquipmentById = async (id: number) => {
    const res = await fetch(`${API_BASE_URL}/api/customerequipment/${id}`, {
        credentials: "include",
    });
    if (!res.ok) throw new Error((await res.json()).message || "Failed to fetch");
    return res.json();
};

export const getSerialHistory = async (assetItemId: number) => {
    const res = await fetch(`${API_BASE_URL}/api/customerequipment/serial-history/${assetItemId}`, {
        credentials: "include",
    });
    if (!res.ok) throw new Error((await res.json()).message || "Failed to fetch");
    return res.json();
};

export const getAvailableAssetItems = async (variantId: number, branchId: number, excludeCeqId?: number, stockRequestId?: number) => {
    const params = new URLSearchParams({ variantId: String(variantId), branchId: String(branchId) });
    if (excludeCeqId)   params.set("excludeCeqId",   String(excludeCeqId));
    if (stockRequestId) params.set("stockRequestId", String(stockRequestId));
    const res = await fetch(`${API_BASE_URL}/api/customerequipment/asset-items?${params}`, {
        credentials: "include",
    });
    if (!res.ok) throw new Error((await res.json()).message || "Failed to fetch");
    return res.json();
};

export const searchStockRequests = async (branchId: number, ref = ""): Promise<{ id: number; ref: string; requestDate: string; linkedCeq?: { id: number; ref: string } | null }[]> => {
    const params = new URLSearchParams({ branchId: String(branchId), ref });
    const res = await fetch(`${API_BASE_URL}/api/customerequipment/search-stock-requests?${params}`, {
        credentials: "include",
    });
    if (!res.ok) throw new Error((await res.json()).message || "Failed to fetch");
    return res.json();
};

export const getVariantUnits = async (variantId: number): Promise<{ id: number; name: string }[]> => {
    const res = await fetch(`${API_BASE_URL}/api/customerequipment/variant-units/${variantId}`, {
        credentials: "include",
    });
    if (!res.ok) throw new Error((await res.json()).message || "Failed to fetch");
    return res.json();
};

export const searchOrders = async (branchId: number, ref = ""): Promise<{ id: number; ref: string; customer?: { name: string } | null; linkedStockRequest?: { id: number; ref: string } | null; linkedCeq?: { id: number; ref: string } | null }[]> => {
    const params = new URLSearchParams({ branchId: String(branchId), ref });
    const res = await fetch(`${API_BASE_URL}/api/customerequipment/search-orders?${params}`, {
        credentials: "include",
    });
    if (!res.ok) throw new Error((await res.json()).message || "Failed to fetch");
    return res.json();
};

type CEQItemPayload =
    | { type: "TRACKED";     productAssetItemId: number }
    | { type: "NON_TRACKED"; productVariantId: number; quantity: number; unitId?: number | null };

export const createCustomerEquipment = async (data: {
    customerId: number;
    branchId: number;
    assignType: string;
    assignedAt: string;
    items: CEQItemPayload[];
    orderId?: number | null;
    stockRequestId?: number | null;
    note?: string;
    swaps?: { oldSerialId: number; newSerialId: number; reason: string }[];
}) => {
    const res = await fetch(`${API_BASE_URL}/api/customerequipment`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error((await res.json()).message || "Failed to create");
    return res.json();
};

export const updateCustomerEquipment = async (id: number, data: {
    customerId?: number;
    assignType?: string;
    assignedAt?: string;
    orderId?: number | null;
    stockRequestId?: number | null;
    note?: string;
    items?: CEQItemPayload[];
    swaps?: { oldSerialId: number; newSerialId: number; reason: string }[];
}) => {
    const res = await fetch(`${API_BASE_URL}/api/customerequipment/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error((await res.json()).message || "Failed to update");
    return res.json();
};

export const returnCustomerEquipment = async (id: number, returnedAt: string, note?: string, convertToSecondHandItems?: number[], convertToSecondHandVariants?: number[]) => {
    const res = await fetch(`${API_BASE_URL}/api/customerequipment/${id}/return`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnedAt, note, convertToSecondHandItems, convertToSecondHandVariants }),
    });
    if (!res.ok) throw new Error((await res.json()).message || "Failed to return");
    return res.json();
};

export const getCeqReturnedQty = async (orderId: number): Promise<{ orderItemId: number; productVariantId: number; ceqReturnedBaseQty: number; ceqRefs: string[] }[]> => {
    const res = await fetch(`${API_BASE_URL}/api/customerequipment/ceq-returned-qty?orderId=${orderId}`, {
        credentials: "include",
    });
    if (!res.ok) throw new Error((await res.json()).message || "Failed to fetch");
    return res.json();
};

export const deleteCustomerEquipment = async (id: number) => {
    const res = await fetch(`${API_BASE_URL}/api/customerequipment/${id}`, {
        method: "DELETE",
        credentials: "include",
    });
    if (!res.ok) throw new Error((await res.json()).message || "Failed to delete");
    return res.json();
};

export const swapSerial = async (
    ceqId: number,
    oldSerialId: number,
    newSerialId: number,
    reason: string
) => {
    const res = await fetch(`${API_BASE_URL}/api/customerequipment/${ceqId}/swap-serial`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldSerialId, newSerialId, reason }),
    });
    if (!res.ok) throw new Error((await res.json()).message || "Failed to swap serial");
    return res.json();
};
