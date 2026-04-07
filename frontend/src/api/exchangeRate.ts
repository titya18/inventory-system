import { ExchangeRateType } from "@/data_types/types";
const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export const getAllExchangeRatesWithPagination = async (
    sortField: string | null,
    sortOrder: 'asc' | 'desc' | null,
    page: number,
    searchTerm: string | null,
    pageSize: number
): Promise<{ data: ExchangeRateType[], total: number }> => {
    const sortParam =
        sortField && sortOrder
        ? `&sortField=${sortField}&sortOrder=${sortOrder}`
        : '';

    const url = `${API_BASE_URL}/api/exchange-rate?page=${page}&searchTerm=${
        searchTerm || ''
    }&pageSize=${pageSize}${sortParam}`;

    const response = await fetch(url, {
        credentials: 'include',
    });

    if (!response.ok) {
        throw new Error('Failed to fetch exchange rates');
    }

    const result = await response.json();

    return {
        data: result.data || [],
        total: result.total || 0,
    };
};

export const getLastExchangeRate = async (): Promise<ExchangeRateType> => {
    const url = `${API_BASE_URL}/api/exchange-rate/lastexchange`;
    const response = await fetch(url, {
        credentials: 'include',
    });

    if (!response.ok) {
        throw new Error('Failed to fetch last exchange rate');
    }

    return response.json();;
}

// Create or Update Exchange Rate
export const upsertExchangeRate = async (exchangeRateData: ExchangeRateType): Promise<ExchangeRateType> => {
    const { id, ...data } = exchangeRateData;
    const method = id ? "PUT" : "POST";
    const url =  id ? `${API_BASE_URL}/api/exchange-rate/${id}` : `${API_BASE_URL}/api/exchange-rate`;

    const response = await fetch(url, {
        method,
        credentials: "include",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        const custom_error = id ? "Error updating exchange rate" : "Error adding exchange rate";
        const errorResponse = await response.json();
        throw new Error(errorResponse.message || custom_error);
    }
    return response.json();
}