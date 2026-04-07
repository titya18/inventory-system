import { UserType, RoleType } from "@/data_types/types";
const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export const getAllUsers = async (
    sortField: string | null,
    sortOrder: 'asc' | 'desc' | null,
    page: number,
    searchTerm: string | null,
    pageSize: number
): Promise<{ data: UserType[], total: number }> => {
    const sortParams = sortField && sortOrder ? `&sortField=${sortField}&sortOrder=${sortOrder}` : "";
    const response = await fetch(`${API_BASE_URL}/api/user?page=${page}&searchTerm=${searchTerm}&pageSize=${pageSize}${sortParams}`, {
        credentials: "include"
    });
    if (!response.ok) {
        throw new Error("Error fetching User");
    }
    return response.json();
};

export const getUserById = async(id: number): Promise<UserType> => {
    const response = await fetch(`${API_BASE_URL}/api/user/${id}`, {
        credentials: "include"
    });
    if (!response.ok) {
        throw new Error("Error fetching User");  
    }
    return response.json();
};

export const statusUser = async (id: number): Promise<UserType> => {
    const response = await fetch(`${API_BASE_URL}/api/user/status/${id}`, {
        credentials: "include"
    });
    if (!response.ok) {
        throw new Error("Error updating status");
    }
    return response.json();
};

export const createUser = async(user: UserType): Promise<UserType> => {
    const response = await fetch(`${API_BASE_URL}/api/user/`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-type": "application/json"
        },
        body: JSON.stringify(user)
    });
    if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(errorResponse.message || "Error adding user");
    }
    return response.json();
};

export const updateUser = async(id: number, user: UserType): Promise<UserType> => {
    const response = await fetch(`${API_BASE_URL}/api/user/${id}`, {
        credentials: "include",
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(user)
    });
    if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(errorResponse.message || "Error updating user");
    }
    return response.json();
};

export const deleteUser = async(id: number): Promise<UserType> => {
    const response = await fetch(`${API_BASE_URL}/api/user/${id}`, {
        credentials: "include",
        method: "DELETE",
        headers: {
            "Content-Type": "application/json"
        }
    });
    if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(errorResponse.message || "Error deleting user");
    }
    return response.json();
}