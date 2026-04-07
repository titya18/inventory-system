import { VarientAttributeType } from "../data_types/types";
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export const getAllVarientAttributesWithPagination = async (
    sortField: string | null,
    sortOrder: 'asc' | 'desc' | null,
    page: number,
    searchTerm: string | null,
    pageSize: number
): Promise<{ data: VarientAttributeType[]; total: number }> => {
    const sortParams = sortField && sortOrder ? `&sortField=${sortField}&sortOrder=${sortOrder}` : "";
    const response = await fetch(`${API_BASE_URL}/api/variant_attribute?page=${page}&searchTerm=${searchTerm}&pageSize=${pageSize}${sortParams}`, {
        credentials: "include"
    });
    if (!response.ok) {
        throw new Error("Error fetching Varient Attributes");
    }
    return response.json();
}

export const getAllVarientAttributes = async (): Promise<VarientAttributeType[]> => {
    const response = await fetch(`${API_BASE_URL}/api/variant_attribute/all`, {
        credentials: "include"
    });
    if (!response.ok) {
        throw new Error("Error fetching Varient Attributes");
    }
    return response.json();
};

export const getVarientAttributeById = async (id: number): Promise<VarientAttributeType> => {
    const response = await fetch(`${API_BASE_URL}/api/variant_attribute/${id}`, {
        credentials: "include"
    });
    if (!response.ok) {
        throw new Error("Error fetching Varient Attribute");
    }
    return response.json();
};

export const upsertVarientAttribute = async (varientAttributeData: VarientAttributeType): Promise<VarientAttributeType> => {
    const { id, ...data } = varientAttributeData;
    const method = id ? "PUT" : "POST";
    const url = id ? `${API_BASE_URL}/api/variant_attribute/${id}` : `${API_BASE_URL}/api/variant_attribute`;
    
    const response = await fetch(url, {
        method,
        credentials: "include",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        const custom_error = id ? "Error updating Varient Attribute" : "Error adding Varient Attribute";
        const errorResponse = await response.json();
        throw new Error(errorResponse.message || custom_error);
    }
    return response.json();
};

export const deleteVarientAttribute = async (id: number): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/variant_attribute/${id}`, {
        method: "DELETE",
        credentials: "include"
    });
    if (!response.ok) {
        throw new Error("Error deleting Varient Attribute");
    }
};
