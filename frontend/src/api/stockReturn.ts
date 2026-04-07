import { StockReturnType } from "../data_types/types";
const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export const upsertReturn = async (returnData: StockReturnType): Promise<StockReturnType> => {
    const { id, ...data } = returnData;
    const method = id ? "PUT" : "POST";
    const url = id ? `${API_BASE_URL}/api/stockreturn/${id}` : `${API_BASE_URL}/api/stockreturn`;

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
        const customError = id ? "Error updating stock return" : "Error creating stock return";
        throw new Error(errorResponse.message || customError);
    }

    return response.json();
};

export const getAllStockReturns = async (
    sortField: string | null,
    sortOrder: 'desc' | 'asc' | null,
    page: number,
    searchTerm: string | null,
    pageSize: number
): Promise<{ data: StockReturnType[], total: number }> => {
    const sortParam =
        sortField && sortOrder
        ? `&sortField=${sortField}&sortOrder=${sortOrder}`
        : '';

    const url = `${API_BASE_URL}/api/stockreturn?page=${page}&searchTerm=${
        searchTerm || ''
    }&pageSize=${pageSize}${sortParam}`;

    const response = await fetch(url, {
        credentials: 'include',
    });

    if (!response.ok) {
        throw new Error('Failed to fetch stock returns');
    }

    const result = await response.json();

    return {
        data: result.data || [],
        total: result.total || 0,
    };
};

export const getStockReturnById = async (id: number): Promise<StockReturnType> => {
    const response = await fetch(`${API_BASE_URL}/api/stockreturn/${id}`, {
        credentials: "include"
    });
    if (!response.ok) {
        throw new Error("Error fetching stock return");
    }

    return response.json();
};

export const deleteReturn = async (id: number, delReason: string): Promise<StockReturnType> => {
    const response = await fetch(`${API_BASE_URL}/api/stockreturn/${id}`, {
        credentials: "include",
        method: "DELETE",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ delReason })
    });
    if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(errorResponse.message || "Error deleting stock return");
    }
    return response.json();
};