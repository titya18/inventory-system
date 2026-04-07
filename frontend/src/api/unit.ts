import { UnitType } from "@/data_types/types";
const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export const upsertUnit = async (unitData: UnitType): Promise<UnitType> => {
    const { id, ...data } =  unitData;
    const method = id ? "PUT" : "POST";
    const url = id ? `${API_BASE_URL}/api/unit/${id}` : `${API_BASE_URL}/api/unit`;

    const response = await fetch(url, {
        method,
        credentials: "include",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        const custom_error = id ? "Error updating unit" : "Error adding unit";
        const errorResponse = await response.json();
        throw new Error(errorResponse.message || custom_error);  
    }
    return response.json();
};

export const getAllUnitsWithPagination = async (
    sortField: string | null,
    sortOrder: 'asc' | 'desc' | null,
    page: number,
    searchTerm: string | null,
    pageSize: number
): Promise<{ data: UnitType[], total: number }> => {
    const sortParams = sortField && sortOrder ? `&sortField=${sortField}&sortOrder=${sortOrder}` : "";
    const response = await fetch(`${API_BASE_URL}/api/unit?page=${page}&searchTerm=${searchTerm}&pageSize=${pageSize}${sortParams}`, {
        credentials: "include"
    });
    if (!response.ok) {
        throw new Error("Error fetching unit");
    }
    return response.json();
};

export const getAllUnits = async (): Promise<UnitType[]> => {
    const response = await fetch(`${API_BASE_URL}/api/unit/all`, {
        credentials: "include"
    });
    if (!response.ok) {
        throw new Error("Error fetching units");
    }
    return response.json();
};

export const getUnitById = async (id: number): Promise<UnitType> => {
    const response = await fetch(`${API_BASE_URL}/api/unit/${id}`, {
        credentials: "include"
    });
    if (!response.ok) {
        throw new Error("Error fetching unit");
    }
    return response.json();
};

export const deleteUnit = async (id: number): Promise<UnitType> => {
    const response = await fetch(`${API_BASE_URL}/api/unit/${id}`, {
        credentials: "include",
        method: "DELETE",
        headers: {
            "Content-Type": "application/json"
        }
    });
    if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(errorResponse.message || "Error deleting unit");
    }
    return response.json();
}