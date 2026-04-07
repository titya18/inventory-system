import { CategoryType } from "@/data_types/types";
const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export const upsertCategory = async (categoryData: CategoryType): Promise<CategoryType> => {
    const { id, ...data } = categoryData;
    const method = id ? "PUT" : "POST";
    const url = id ? `${API_BASE_URL}/api/category/${id}` : `${API_BASE_URL}/api/category`;

    const response = await fetch(url, {
        method,
        credentials: "include",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        const custom_error = id ? "Error updating Category" : "Error adding Category";
        const errorResponse = await response.json();
        throw new Error(errorResponse.message || custom_error);
    }
    return response.json();
};

export const getAllCategoriesWithPagination = async (
    sortField: string | null,
    sortOrder: 'asc' | 'desc' | null,
    page: number,
    searchTerm: string | null,
    pageSize: number
): Promise<{ data: CategoryType[], total: number }> => {
    const sortParams = sortField && sortOrder ? `&sortField=${sortField}&sortOrder=${sortOrder}` : "";
    const response = await fetch(`${API_BASE_URL}/api/category?page=${page}&searchTerm=${searchTerm}&pageSize=${pageSize}${sortParams}`, {
        credentials: "include"
    });
    if (!response.ok) {
        throw new Error("Error fetching category");
    }
    return response.json();
};

export const getAllCategories = async (): Promise<CategoryType[]> => {
    const response = await fetch(`${API_BASE_URL}/api/category/all`, {
        credentials: "include"
    });
    if (!response.ok) {
        throw new Error("Error fetching categories");
    }
    return response.json();
};

export const getCategoryByid = async (id: number): Promise<CategoryType> => {
    const response = await fetch(`${API_BASE_URL}/api/category/${id}`, {
        credentials: "include"
    });
    if (!response.ok) {
        throw new Error("Error fetching category");
    }

    return response.json();
};

export const deleteCategory = async (id: number): Promise<CategoryType> => {
    const response = await fetch(`${API_BASE_URL}/api/category/${id}`, {
        credentials: "include",
        method: "DELETE",
        headers: {
            "Content-Type": "application/json"
        }
    });
    if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(errorResponse.message || "Error deleting category");
    }
    return response.json();
};