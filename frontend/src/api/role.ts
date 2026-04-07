const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export interface RoleData {
    id?: number;
    branchId: number;
    name: string;
    permissions: number[]; // Array of objects
}

// Create or Update a Role Permission
export const upsertRole = async (roleData: RoleData): Promise<RoleData> => {
    const { id, ...data } = roleData;
    const method = id ? "PUT" : "POST";
    const url = id ? `${API_BASE_URL}/api/role/${id}` : `${API_BASE_URL}/api/role`;
    
    const response = await fetch(url, {
        method,
        credentials: "include",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        const custom_error = id ? "Error updating Role" : "Error adding Role";
        const errorResponse = await response.json();
        throw new Error(errorResponse.message || custom_error);
    }
    return response.json();
};

export const getRolesWithPagination = async (
    sortField: string | null,
    sortOrder: 'asc' | 'desc' | null,
    page: number,
    searchTerm: string | null,
    pageSize: number
): Promise<{ data: RoleData[], total: number }> => {
    const sortParams = sortField && sortOrder ? `&sortField=${sortField}&sortOrder=${sortOrder}` : "";
    const response = await fetch(`${API_BASE_URL}/api/role?page=${page}&searchTerm=${searchTerm}&pageSize=${pageSize}${sortParams}`, {
        credentials: "include"
    });
    if (!response.ok) {
        throw new Error("Error fetching Role Permission");
    }
    return response.json();
};

export const getAllRoles = async (): Promise<RoleData[]> => {
    const response = await fetch(`${API_BASE_URL}/api/role/all`, {
        credentials: "include"
    });
    if (!response.ok) {
        throw new Error("Error fetching Role Permission");
    }
    return response.json();
};

export const getRoleById = async (id: number): Promise<RoleData> => {
    const response = await fetch(`${API_BASE_URL}/api/role/${id}`, {
        credentials: "include"
    });
    if (!response.ok) {
        throw new Error("Error fetching Role Permission");
    }
    return response.json();
};

export const deleteRole = async (id: number): Promise<RoleData> => {
    const response = await fetch(`${API_BASE_URL}/api/role/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
            "Content-Type": "application/json"
        }
    });
    if (!response.ok) {
        const errorResponse = await response.json(); // Parse the error response
        throw new Error(errorResponse.message || "Error deleting Role Permission");
    }
    return response.json();
}