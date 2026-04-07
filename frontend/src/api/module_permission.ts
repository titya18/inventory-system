const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export interface PermissionData {
    name: string;
}

export interface ModulePermissionData {
    id?: number;
    name: string;
    permissions: PermissionData[]; // Array of objects
}

// Create or Update a Module Permission
export const upsertModule = async (modulePermissionData: ModulePermissionData): Promise<ModulePermissionData> => {
    const { id, ...data } = modulePermissionData;
    const method = id ? "PUT" : "POST";
    const url = id ? `${API_BASE_URL}/api/module_permission/${id}` : `${API_BASE_URL}/api/module_permission`;
    
    const response = await fetch(url, {
        method,
        credentials: "include",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        const custom_error = id ? "Error updating Module" : "Error adding Module";
        const  errorResponse = await response.json();
        throw new Error(errorResponse.message || custom_error);
    }
    return response.json();
};

export const getAllModulesWithPagination = async (
    sortField: string | null,
    sortOrder: 'asc' | 'desc' | null,
    page: number,
    searchTerm: string | null,
    pageSize: number
): Promise<{ data: ModulePermissionData[], total: number }> => {
    const sortParams = sortField && sortOrder ? `&sortField=${sortField}&sortOrder=${sortOrder}` : "";
    const response = await fetch(`${API_BASE_URL}/api/module_permission?page=${page}&searchTerm=${searchTerm}&pageSize=${pageSize}${sortParams}`, {
        credentials: "include"
    });
    if (!response.ok) {
        throw new Error("Error fetching Module Permission");
    }
    return response.json();
};

export const getAllModules = async (): Promise<ModulePermissionData[]> => {
    const response = await fetch(`${API_BASE_URL}/api/module_permission/all`, {
        credentials: "include"
    });
    if (!response.ok) {
        throw new Error("Error fetching Module Permission");
    }
    return response.json();
};

export const getModuleById = async (id: number): Promise<ModulePermissionData> => {
    const response = await fetch(`${API_BASE_URL}/api/module_permission/${id}`, {
        credentials: "include"
    });
    if (!response.ok) {
        throw new Error("Error fetching Module Permission");
    }
    return response.json();
};

export const deleteModule = async (id: number): Promise<ModulePermissionData> => {
    const response = await fetch(`${API_BASE_URL}/api/module_permission/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
            "Content-Type": "application/json"
        }
    });
    if (!response.ok) {
        const errorResponse = await response.json(); // Parse the error response
        throw new Error(errorResponse.message || "Error deleting Module Permission");
    }
    return response.json();
}