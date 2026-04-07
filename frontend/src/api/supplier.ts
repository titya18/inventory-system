import { SupplierType } from "../data_types/types";
const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export const getAllSuppliersWithPagination = async (
    sortField: string | null,
    sortOrder: 'asc' | 'desc' | null,
    page: number,
    searchTerm: string | null,
    pageSize: number
): Promise<{ data: SupplierType[], total: number }> => {
    const sortParams = sortField && sortOrder ? `&sortField=${sortField}&sortOrder=${sortOrder}` : "";
    const response = await fetch(`${API_BASE_URL}/api/supplier?page=${page}&searchTerm=${searchTerm}&pageSize=${pageSize}${sortParams}`, {
        credentials: "include"
    });
    if (!response.ok) {
        throw new Error("Error fetching supplier");
    }
    return response.json();
};

export const getAllSuppliers = async (): Promise<SupplierType[]> => {
    const response = await fetch(`${API_BASE_URL}/api/supplier/all`, {
        credentials: "include"
    });
    if (!response.ok) {
        throw new Error("Error fetching suppliers");
    }
    return response.json();
};

export const upsertSupplier = async (supplierdata: SupplierType): Promise<SupplierType> => {
    const { id, ...data } = supplierdata;
    const method = id ? "PUT" : "POST";
    const url = id ? `${API_BASE_URL}/api/supplier/${id}` : `${API_BASE_URL}/api/supplier`;

    const response = await fetch(url, {
        method,
        credentials: "include",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        const custom_error = id ? "Error updating supplier" : "Error adding supplier";
        const errorResponse = await response.json();
        throw new Error(errorResponse.message || custom_error);
    }
    return response.json();
};

export const getSupplierById = async (id: number): Promise<SupplierType> => {
    const response = await fetch(`${API_BASE_URL}/api/supplier/${id}`, {
        credentials: "include"
    });
    if (!response.ok) {
        throw new Error("Error fetching supplier");
    }
    return response.json();
};

export const deleteSupplier = async (id: number): Promise<SupplierType> => {
    const response = await fetch(`${API_BASE_URL}/api/supplier/${id}`, {
        credentials: "include",
        method: "DELETE",
        headers: {
            "Content-Type": "application/json"
        }
    });
    if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(errorResponse.message || "Error deleting supplier");   
    }
    return response.json();
};