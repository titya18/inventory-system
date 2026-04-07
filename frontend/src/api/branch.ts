import { BranchType } from "@/data_types/types";
const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export const getAllBranchesWithPagination = async (
    sortField: string | null,
    sortOrder: 'asc' | 'desc' | null,
    page: number,
    searchTerm: string | null,
    pageSize: number
): Promise<{ data: BranchType[], total: number }> => {
    const sortParam =
        sortField && sortOrder
        ? `&sortField=${sortField}&sortOrder=${sortOrder}`
        : '';

    const url = `${API_BASE_URL}/api/branch?page=${page}&searchTerm=${
        searchTerm || ''
    }&pageSize=${pageSize}${sortParam}`;

    const response = await fetch(url, {
        credentials: 'include',
    });

    if (!response.ok) {
        throw new Error('Failed to fetch branches');
    }

    const result = await response.json();

    return {
        data: result.data || [],
        total: result.total || 0,
    };
};

export const getAllBranches = async (): Promise<BranchType[]> => {
    const response = await fetch(`${API_BASE_URL}/api/branch/all`, {
        credentials: "include"
    });
    if (!response.ok) {
        throw new Error("Error fetching Branches");
    }
    return response.json();
};

export const getBranchById = async (id: number): Promise<BranchType> => {
    const response = await fetch(`${API_BASE_URL}/api/branch/${id}`, {
        credentials: "include"
    });
    if (!response.ok) {
        throw new Error("Error fetching Branch");
    }
    return response.json();
};

// Create or Update Branch
export const upsertBranch = async (branchData: BranchType): Promise<BranchType> => {
    const { id, ...data } = branchData;
    const method = id ? "PUT" : "POST";
    const url =  id ? `${API_BASE_URL}/api/branch/${id}` : `${API_BASE_URL}/api/branch`;

    const response = await fetch(url, {
        method,
        credentials: "include",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        const custom_error = id ? "Error updating branch" : "Error adding branch";
        const errorResponse = await response.json();
        throw new Error(errorResponse.message || custom_error);
    }
    return response.json();
}