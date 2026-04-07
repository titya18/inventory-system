import { PaymentMethodType } from "../data_types/types";
const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export const upsertPaymentMethod = async (unitData: PaymentMethodType): Promise<PaymentMethodType> => {
    const { id, ...data } =  unitData;
    const method = id ? "PUT" : "POST";
    const url = id ? `${API_BASE_URL}/api/paymentmethod/${id}` : `${API_BASE_URL}/api/paymentmethod`;

    const response = await fetch(url, {
        method,
        credentials: "include",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        const custom_error = id ? "Error updating payment method" : "Error adding payment method";
        const errorResponse = await response.json();
        throw new Error(errorResponse.message || custom_error);  
    }
    return response.json();
};

export const getAllPaymentMethodsWithPagination = async (
    sortField: string | null,
    sortOrder: 'asc' | 'desc' | null,
    page: number,
    searchTerm: string | null,
    pageSize: number
): Promise<{ data: PaymentMethodType[], total: number }> => {
    const sortParams = sortField && sortOrder ? `&sortField=${sortField}&sortOrder=${sortOrder}` : "";
    const response = await fetch(`${API_BASE_URL}/api/paymentmethod?page=${page}&searchTerm=${searchTerm}&pageSize=${pageSize}${sortParams}`, {
        credentials: "include"
    });
    if (!response.ok) {
        throw new Error("Error fetching payment method");
    }
    return response.json();
};

export const getAllPaymentMethods = async (): Promise<PaymentMethodType[]> => {
    const response = await fetch(`${API_BASE_URL}/api/paymentmethod/all`, {
        credentials: "include"
    });
    if (!response.ok) {
        throw new Error("Error fetching payment methods");
    }
    return response.json();
};

export const getPaymentMethodById = async (id: number): Promise<PaymentMethodType> => {
    const response = await fetch(`${API_BASE_URL}/api/paymentmethod/${id}`, {
        credentials: "include"
    });
    if (!response.ok) {
        throw new Error("Error fetching payment method");
    }
    return response.json();
};

export const deletePaymentMethod = async (id: number): Promise<PaymentMethodType> => {
    const response = await fetch(`${API_BASE_URL}/api/paymentmethod/${id}`, {
        credentials: "include",
        method: "DELETE",
        headers: {
            "Content-Type": "application/json"
        }
    });
    if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(errorResponse.message || "Error deleting payment method");
    }
    return response.json();
}