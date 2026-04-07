import { StockAdjustmentType } from "../data_types/types";
const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export const upsertAdjustment = async (adjustmentData: StockAdjustmentType): Promise<StockAdjustmentType> => {
    const { id, ...data } = adjustmentData;
    const method = id ? "PUT" : "POST";
    const url = id ? `${API_BASE_URL}/api/stockadjustment/${id}` : `${API_BASE_URL}/api/stockadjustment`;

    const response = await fetch(url, {
        method,
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const errorResponse = await response.json();
        const customError = id ? "Error updating adjustment" : "Error creating adjustment";
        throw new Error(errorResponse.message || customError);
    }

    return response.json();
};

export const getAllStockAdjustments = async (
    sortField: string | null,
    sortOrder: 'desc' | 'asc' | null,
    page: number,
    searchTerm: string | null,
    pageSize: number
): Promise<{ data: StockAdjustmentType[], total: number }> => {
    const sortParam =
        sortField && sortOrder
        ? `&sortField=${sortField}&sortOrder=${sortOrder}`
        : '';

    const url = `${API_BASE_URL}/api/stockadjustment?page=${page}&searchTerm=${
        searchTerm || ''
    }&pageSize=${pageSize}${sortParam}`;

    const response = await fetch(url, {
        credentials: 'include',
    });

    if (!response.ok) {
        throw new Error('Failed to fetch adjustment');
    }

    const result = await response.json();

    return {
        data: result.data || [],
        total: result.total || 0,
    };
};

export const getStockAdjustmentById = async (id: number): Promise<StockAdjustmentType> => {
    const response = await fetch(`${API_BASE_URL}/api/stockadjustment/${id}`, {
        credentials: "include"
    });
    if (!response.ok) {
        throw new Error("Error fetching adjustment");
    }

    return response.json();
};

export const deleteAdjustment = async (id: number, delReason: string): Promise<StockAdjustmentType> => {
    const response = await fetch(`${API_BASE_URL}/api/stockadjustment/${id}`, {
        credentials: "include",
        method: "DELETE",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ delReason })
    });
    if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(errorResponse.message || "Error deleting adjustment");
    }
    return response.json();
};