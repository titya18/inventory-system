import { CategoryType, ServiceType } from "@/data_types/types";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export const upsertService = async (serviceData: ServiceType): Promise<ServiceType> => {
    const { id, ...data } = serviceData;
    const method = id ? "PUT" : "POST";
    const url = id ? `${API_BASE_URL}/api/service/${id}` : `${API_BASE_URL}/api/service`;

    const response = await fetch(url, {
        method,
        credentials: "include",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        const custom_error = id ? "Error updating Service" : "Error adding Service";
        const errorResponse = await response.json();
        throw new Error(errorResponse.message || custom_error);
    }
    return response.json();
};

export const getAllServicesWithPagination = async (
    sortField: string | null,
    sortOrder: 'asc' | 'desc' | null,
    page: number,
    searchTerm: string | null,
    pageSize: number
): Promise<{ data: ServiceType[], total: number }> => {
    const sortParams = sortField && sortOrder ? `&sortField=${sortField}&sortOrder=${sortOrder}` : "";
    const response = await fetch(`${API_BASE_URL}/api/service?page=${page}&searchTerm=${searchTerm}&pageSize=${pageSize}${sortParams}`, {
        credentials: "include"
    });
    if (!response.ok) {
        throw new Error("Error fetching service");
    }
    return response.json();
};

export const getAllServices = async (): Promise<ServiceType[]> => {
    const response = await fetch(`${API_BASE_URL}/api/service/all`, {
        credentials: "include"
    });
    if (!response.ok) {
        throw new Error("Error fetching services");
    }
    return response.json();
};

export const getServiceByid = async (id: number): Promise<ServiceType> => {
    const response = await fetch(`${API_BASE_URL}/api/service/${id}`, {
        credentials: "include"
    });
    if (!response.ok) {
        throw new Error("Error fetching service");
    }

    return response.json();
};

export const deleteService = async (id: number): Promise<ServiceType> => {
    const response = await fetch(`${API_BASE_URL}/api/service/${id}`, {
        credentials: "include",
        method: "DELETE",
        headers: {
            "Content-Type": "application/json"
        }
    });
    if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(errorResponse.message || "Error deleting service");
    }
    return response.json();
};