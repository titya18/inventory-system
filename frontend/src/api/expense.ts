import { ExpenseType } from "@/data_types/types";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export const upsertExpense = async (expenseData: ExpenseType): Promise<ExpenseType> => {
    const { id, ...data } = expenseData;
    const method = id ? "PUT" : "POST";
    const url = id ? `${API_BASE_URL}/api/expense/${id}` : `${API_BASE_URL}/api/expense`;

    const response = await fetch(url, {
        method,
        credentials: "include",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        const custom_error = id ? "Error updating expense" : "Error adding expense";
        const errorResponse = await response.json();
        throw new Error(errorResponse.message || custom_error);
    }
    return response.json();
};

export const getAllExpensesWithPagination = async (
    sortField: string | null,
    sortOrder: 'asc' | 'desc' | null,
    page: number,
    searchTerm: string | null,
    pageSize: number
): Promise<{ data: ExpenseType[], total: number }> => {
    const sortParams = sortField && sortOrder ? `&sortField=${sortField}&sortOrder=${sortOrder}` : "";
    const response = await fetch(`${API_BASE_URL}/api/expense?page=${page}&searchTerm=${searchTerm}&pageSize=${pageSize}${sortParams}`, {
        credentials: "include"
    });
    if (!response.ok) {
        throw new Error("Error fetching expense");
    }
    return response.json();
};

export const getAllExpenses = async (): Promise<ExpenseType[]> => {
    const response = await fetch(`${API_BASE_URL}/api/expense/all`, {
        credentials: "include"
    });
    if (!response.ok) {
        throw new Error("Error fetching expense");
    }
    return response.json();
};

export const getExpenseByid = async (id: number): Promise<ExpenseType> => {
    const response = await fetch(`${API_BASE_URL}/api/expense/${id}`, {
        credentials: "include"
    });
    if (!response.ok) {
        throw new Error("Error fetching expense");
    }

    return response.json();
};

export const deleteExpense = async (id: number, delReason: string): Promise<ExpenseType> => {
    const response = await fetch(`${API_BASE_URL}/api/expense/${id}`, {
        credentials: "include",
        method: "DELETE",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ delReason })
    });
    if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(errorResponse.message || "Error deleting expense");
    }
    return response.json();
};