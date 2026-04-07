import { IncomeType } from "@/data_types/types";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export const upsertIncome = async (expenseData: IncomeType): Promise<IncomeType> => {
    const { id, ...data } = expenseData;
    const method = id ? "PUT" : "POST";
    const url = id ? `${API_BASE_URL}/api/income/${id}` : `${API_BASE_URL}/api/income`;

    const response = await fetch(url, {
        method,
        credentials: "include",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        const custom_error = id ? "Error updating income" : "Error adding income";
        const errorResponse = await response.json();
        throw new Error(errorResponse.message || custom_error);
    }
    return response.json();
};

export const getAllIncomesWithPagination = async (
    sortField: string | null,
    sortOrder: 'asc' | 'desc' | null,
    page: number,
    searchTerm: string | null,
    pageSize: number
): Promise<{ data: IncomeType[], total: number }> => {
    const sortParams = sortField && sortOrder ? `&sortField=${sortField}&sortOrder=${sortOrder}` : "";
    const response = await fetch(`${API_BASE_URL}/api/income?page=${page}&searchTerm=${searchTerm}&pageSize=${pageSize}${sortParams}`, {
        credentials: "include"
    });
    if (!response.ok) {
        throw new Error("Error fetching income");
    }
    return response.json();
};

export const getAllIncomes = async (): Promise<IncomeType[]> => {
    const response = await fetch(`${API_BASE_URL}/api/income/all`, {
        credentials: "include"
    });
    if (!response.ok) {
        throw new Error("Error fetching incomes");
    }
    return response.json();
};

export const getIncomeByid = async (id: number): Promise<IncomeType> => {
    const response = await fetch(`${API_BASE_URL}/api/income/${id}`, {
        credentials: "include"
    });
    if (!response.ok) {
        throw new Error("Error fetching income");
    }

    return response.json();
};

export const deleteIncome = async (id: number, delReason: string): Promise<IncomeType> => {
    const response = await fetch(`${API_BASE_URL}/api/income/${id}`, {
        credentials: "include",
        method: "DELETE",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ delReason })
    });
    if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(errorResponse.message || "Error deleting income");
    }
    return response.json();
};