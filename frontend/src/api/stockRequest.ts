import { StockRequestType } from "../data_types/types";
const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export const upsertRequest = async (requestData: StockRequestType): Promise<StockRequestType> => {
    const { id, ...data } = requestData;
    const method = id ? "PUT" : "POST";
    const url = id ? `${API_BASE_URL}/api/stockrequest/${id}` : `${API_BASE_URL}/api/stockrequest`;

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
        const customError = id ? "Error updating stock request" : "Error creating stock request";
        throw new Error(errorResponse.message || customError);
    }

    return response.json();
};

export const getAllStockRequests = async (
    sortField: string | null,
    sortOrder: 'desc' | 'asc' | null,
    page: number,
    searchTerm: string | null,
    pageSize: number
): Promise<{ data: StockRequestType[], total: number }> => {
    const sortParam =
        sortField && sortOrder
        ? `&sortField=${sortField}&sortOrder=${sortOrder}`
        : '';

    const url = `${API_BASE_URL}/api/stockrequest?page=${page}&searchTerm=${
        searchTerm || ''
    }&pageSize=${pageSize}${sortParam}`;

    const response = await fetch(url, {
        credentials: 'include',
    });

    if (!response.ok) {
        throw new Error('Failed to fetch stock requests');
    }

    const result = await response.json();

    return {
        data: result.data || [],
        total: result.total || 0,
    };
};

export const getStockRequestById = async (id: number): Promise<StockRequestType> => {
    const response = await fetch(`${API_BASE_URL}/api/stockrequest/${id}`, {
        credentials: "include"
    });
    if (!response.ok) {
        throw new Error("Error fetching stock request");
    }

    return response.json();
};

export const deleteRequest = async (id: number, delReason: string): Promise<StockRequestType> => {
    const response = await fetch(`${API_BASE_URL}/api/stockrequest/${id}`, {
        credentials: "include",
        method: "DELETE",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ delReason })
    });
    if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(errorResponse.message || "Error deleting stock request");
    }
    return response.json();
};