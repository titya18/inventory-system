import { StockTransferType } from "../data_types/types";
const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export const upsertTransfer = async (transferData: StockTransferType): Promise<StockTransferType> => {
    const { id, ...data } = transferData;
    const method = id ? "PUT" : "POST";
    const url = id ? `${API_BASE_URL}/api/stocktransfer/${id}` : `${API_BASE_URL}/api/stocktransfer`;

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
        const customError = id ? "Error updating transfer" : "Error creating transfer";
        throw new Error(errorResponse.message || customError);
    }

    return response.json();
};

export const getAllStockTransfers = async (
    sortField: string | null,
    sortOrder: 'desc' | 'asc' | null,
    page: number,
    searchTerm: string | null,
    pageSize: number
): Promise<{ data: StockTransferType[], total: number }> => {
    const sortParam =
        sortField && sortOrder
        ? `&sortField=${sortField}&sortOrder=${sortOrder}`
        : '';

    const url = `${API_BASE_URL}/api/stocktransfer?page=${page}&searchTerm=${
        searchTerm || ''
    }&pageSize=${pageSize}${sortParam}`;

    const response = await fetch(url, {
        credentials: 'include',
    });

    if (!response.ok) {
        throw new Error('Failed to fetch transfer');
    }

    const result = await response.json();

    return {
        data: result.data || [],
        total: result.total || 0,
    };
};

export const getStockTransferById = async (id: number): Promise<StockTransferType> => {
    const response = await fetch(`${API_BASE_URL}/api/stocktransfer/${id}`, {
        credentials: "include"
    });
    if (!response.ok) {
        throw new Error("Error fetching transfer");
    }

    return response.json();
};

export const deleteTransfer = async (id: number, delReason: string): Promise<StockTransferType> => {
    const response = await fetch(`${API_BASE_URL}/api/stocktransfer/${id}`, {
        credentials: "include",
        method: "DELETE",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ delReason })
    });
    if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(errorResponse.message || "Error deleting transfer");
    }
    return response.json();
};