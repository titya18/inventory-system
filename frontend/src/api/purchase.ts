import { PurchaseAuthorizeAmountType, PurchaseType, PurchaseDetailType, PaymentType } from "../data_types/types";
const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export const getNextPurchaseRef = async (branchId: number): Promise<string> => {
    const response = await fetch(`${API_BASE_URL}/api/purchase/next-ref/${branchId}`, {
        credentials: "include"
    });
    if (!response.ok) {
        throw new Error("Error fetching next-ref");
    }

    return response.json();
};

export const upsertPurchase = async (purchaseData: PurchaseType): Promise<PurchaseType> => {
    const { id, image, imagesToDelete, ...data } = purchaseData;
    const method = id ? "PUT" : "POST";
    const url = id ? `${API_BASE_URL}/api/purchase/${id}` : `${API_BASE_URL}/api/purchase`;

    const formData = new FormData();

    // ---------- NORMAL DATA ----------
    Object.entries(data).forEach(([key, value]) => {
        if (value === null || value === undefined) return;

        if (Array.isArray(value) || typeof value === "object") {
            formData.append(key, JSON.stringify(value));
        } else {
            formData.append(key, String(value));
        }
    });

    // ---------- NEW IMAGES ----------
    if (image) {
        if (Array.isArray(image) && image.length > 0) {
            image.forEach((file) => {
                formData.append("images[]", file);
            });
        } else if (image instanceof File) {
            formData.append("images[]", image);
        } else if (typeof image === "string" && image.length > 0) {
            // image is a URL/string — if backend expects URLs, send as part of the JSON fields above;
            // otherwise ignore here since it's not a File to append.
        }
    }

    // ---------- DELETE IMAGES ----------
    if (imagesToDelete && imagesToDelete.length > 0) {
        formData.append(
            "imagesToDelete",
            JSON.stringify(imagesToDelete)
        );
    }

    const response = await fetch(url, {
        method,
        credentials: "include",
        body: formData, // NO Content-Type
    });

    if (!response.ok) {
        const errorResponse = await response.json();
        const customError = id ? "Error updating purchase" : "Error creating purchase";
        const validationMessage =
            Array.isArray(errorResponse?.errors) && errorResponse.errors.length > 0
                ? errorResponse.errors[0]?.msg
                : null;
        throw new Error(errorResponse.message || validationMessage || customError);
    }

    return response.json();
};

export const insertPurchasePayment = async (paymentData: PaymentType): Promise<PaymentType> => {
    // const { ...data } = paymentData;
    const response = await fetch(`${API_BASE_URL}/api/purchase/payment`, {
        credentials: "include",
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(paymentData)
    });

    if (!response.ok) {
        const errorResponse = await response.json();
        const customError = "Error inserting purchase payment";
        throw new Error(errorResponse.message || customError);
    }

    return response.json();
};

export const getPurchasePaymentReceipt = async (id: number): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/api/purchase/payment-receipt/${id}`, {
        credentials: "include",
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Error fetching purchase payment receipt");
    }
    return response.json();
};

export const getPurchasePaymentById = async (id: number): Promise<PaymentType[]> => {
    const response = await fetch(`${API_BASE_URL}/api/purchase/payment/${id}`, {
        credentials: "include"
    });
    if (!response.ok) {
        throw new Error("Error fetching purchase payments");
    }

    return response.json();
};

export const getAllPurchases = async (
    sortField: string | null,
    sortOrder: 'desc' | 'asc' | null,
    page: number,
    searchTerm: string | null,
    pageSize: number,
    branchId?: number | null,
    receivedOnly?: boolean
): Promise<{ data: PurchaseType[], total: number }> => {
    const sortParam =
        sortField && sortOrder
        ? `&sortField=${sortField}&sortOrder=${sortOrder}`
        : '';

    const branchParam = branchId ? `&branchId=${branchId}` : '';
    const receivedParam = receivedOnly ? `&receivedOnly=1` : '';

    const url = `${API_BASE_URL}/api/purchase?page=${page}&searchTerm=${
        searchTerm || ''
    }&pageSize=${pageSize}${sortParam}${branchParam}${receivedParam}`;

    const response = await fetch(url, {
        credentials: 'include',
    });

    if (!response.ok) {
        throw new Error('Failed to fetch purchases');
    }

    const result = await response.json();

    return {
        data: result.data || [],
        total: result.total || 0,
    };
};

export const getPurchaseByid = async (id: number): Promise<PurchaseType> => {
    const response = await fetch(`${API_BASE_URL}/api/purchase/${id}`, {
        credentials: "include"
    });
    if (!response.ok) {
        throw new Error("Error fetching purchase");
    }

    return response.json();
};

export const delPaymentPurchase = async (id: number, delReason: string): Promise<PaymentType> => {
    const response = await fetch(`${API_BASE_URL}/api/purchase/delpayment/${id}`, {
        credentials: "include",
        method: "DELETE",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ delReason })
    });
    if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(errorResponse.message || "Error deleting purchase payment");
    }
    return response.json();
};

export const deletePurchase = async (id: number, delReason: string): Promise<PurchaseType> => {
    const response = await fetch(`${API_BASE_URL}/api/purchase/${id}`, {
        credentials: "include",
        method: "DELETE",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ delReason })
    });
    if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(errorResponse.message || "Error deleting purchase");
    }
    return response.json();
};

export const getAmoutAuthorized = async (): Promise<PurchaseAuthorizeAmountType> => {
    const response = await fetch(`${API_BASE_URL}/api/purchase/amount-purchasing`, {
        credentials: 'include',
    });

    if (!response.ok) {
        throw new Error('Error fetching amount authorized');
    }

    const result = await response.json();
    return result;
};

export const updateAmountAuthorized = async (amountAuthorizedData: PurchaseAuthorizeAmountType): Promise<PurchaseAuthorizeAmountType> => {
    const { id, ...data } = amountAuthorizedData;
    const response = await fetch(`${API_BASE_URL}/api/purchase/amount-purchasing/${id}`, {
        credentials: "include",
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        throw new Error("Error updating amount authorized");
    }

    return response.json();
};
