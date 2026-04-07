import { CategoryType, CustomerType } from "@/data_types/types";
const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export const upsertCustomer = async (customerData: CustomerType): Promise<CustomerType> => {
    const { id, ...data } = customerData;
    const method = id ? "PUT" : "POST";
    const url = id ? `${API_BASE_URL}/api/customer/${id}` : `${API_BASE_URL}/api/customer`;

    const response = await fetch(url, {
        method,
        credentials: "include",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        const custom_error = id ? "Error updating Customer" : "Error adding Customer";
        const errorResponse = await response.json();
        throw new Error(errorResponse.message || custom_error);
    }
    return response.json();
};

export const getAllCustomersWithPagination = async (
    sortField: string | null,
    sortOrder: 'asc' | 'desc' | null,
    page: number,
    searchTerm: string | null,
    pageSize: number
): Promise<{ data: CustomerType[], total: number }> => {
    const sortParams = sortField && sortOrder ? `&sortField=${sortField}&sortOrder=${sortOrder}` : "";
    const response = await fetch(`${API_BASE_URL}/api/customer?page=${page}&searchTerm=${searchTerm}&pageSize=${pageSize}${sortParams}`, {
        credentials: "include"
    });
    if (!response.ok) {
        throw new Error("Error fetching customer");
    }
    return response.json();
};

export const getAllCustomers = async (): Promise<CustomerType[]> => {
    const response = await fetch(`${API_BASE_URL}/api/customer/all`, {
        credentials: "include"
    });
    if (!response.ok) {
        throw new Error("Error fetching customers");
    }
    return response.json();
};

export const getCustomerByid = async (id: number): Promise<CustomerType> => {
    const response = await fetch(`${API_BASE_URL}/api/customer/${id}`, {
        credentials: "include"
    });
    if (!response.ok) {
        throw new Error("Error fetching customer");
    }

    return response.json();
};

export const deleteCustomer = async (id: number): Promise<CustomerType> => {
    const response = await fetch(`${API_BASE_URL}/api/customer/${id}`, {
        credentials: "include",
        method: "DELETE",
        headers: {
            "Content-Type": "application/json"
        }
    });
    if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(errorResponse.message || "Error deleting customer");
    }
    return response.json();
};