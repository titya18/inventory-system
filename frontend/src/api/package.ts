import { PackageType, PackageExplodeResult } from "@/data_types/types";
const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export const getNextPackageSku = async (): Promise<string> => {
    const response = await fetch(`${API_BASE_URL}/api/package/next-sku`, {
        credentials: "include"
    });
    if (!response.ok) {
        throw new Error("Error generating next package SKU");
    }
    const data = await response.json();
    return data.sku;
};

export const getAllPackagesWithPagination = async (
    sortField: string | null,
    sortOrder: 'asc' | 'desc' | null,
    page: number,
    searchTerm: string | null,
    pageSize: number
): Promise<{ data: PackageType[], total: number }> => {
    const sortParams = sortField && sortOrder ? `&sortField=${sortField}&sortOrder=${sortOrder}` : "";
    const response = await fetch(`${API_BASE_URL}/api/package?page=${page}&searchTerm=${searchTerm}&pageSize=${pageSize}${sortParams}`, {
        credentials: "include"
    });
    if (!response.ok) {
        throw new Error("Error fetching packages");
    }
    return response.json();
};

export const getAllPackages = async (searchTerm?: string): Promise<PackageType[]> => {
    const response = await fetch(`${API_BASE_URL}/api/package/all${searchTerm ? `?searchTerm=${encodeURIComponent(searchTerm)}` : ""}`, {
        credentials: "include"
    });
    if (!response.ok) {
        throw new Error("Error fetching packages");
    }
    return response.json();
};

export const getPackageById = async (id: number): Promise<PackageType> => {
    const response = await fetch(`${API_BASE_URL}/api/package/${id}`, {
        credentials: "include"
    });
    if (!response.ok) {
        throw new Error("Error fetching package");
    }
    return response.json();
};

export const upsertPackage = async (packageData: PackageType): Promise<PackageType> => {
    const { id, image, imagesToDelete, items, ...data } = packageData;

    const method = id ? "PUT" : "POST";
    const url = id ? `${API_BASE_URL}/api/package/${id}` : `${API_BASE_URL}/api/package`;

    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("sku", data.sku ?? "");
    formData.append("barcode", data.barcode ?? "");
    formData.append("note", data.note ?? "");
    formData.append("isActive", String(data.isActive ?? 1));
    formData.append("packageRetailPrice", String(data.packageRetailPrice ?? 0));
    formData.append("packageWholeSalePrice", String(data.packageWholeSalePrice ?? ""));
    formData.append("items", JSON.stringify(items ?? []));

    if (image) {
        image.forEach((img) => formData.append("images[]", img));
    }
    if (imagesToDelete && imagesToDelete.length > 0) {
        formData.append("imagesToDelete", JSON.stringify(imagesToDelete));
    }

    const response = await fetch(url, {
        method,
        credentials: "include",
        body: formData,
    });

    if (!response.ok) {
        const custom_error = id ? "Error updating package" : "Error adding package";
        const errorResponse = await response.json();
        throw new Error(errorResponse.message || custom_error);
    }
    return response.json();
};

export const deletePackage = async (id: number): Promise<PackageType> => {
    const response = await fetch(`${API_BASE_URL}/api/package/${id}`, {
        credentials: "include",
        method: "DELETE",
        headers: {
            "Content-Type": "application/json"
        }
    });
    if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(errorResponse.message || "Error deleting package");
    }
    return response.json();
};

export const explodePackage = async (
    id: number,
    qty: number,
    branchId?: number | null,
    saleType: "RETAIL" | "WHOLESALE" = "RETAIL"
): Promise<PackageExplodeResult> => {
    const params = new URLSearchParams({ qty: String(qty), saleType });
    if (branchId) params.set("branchId", String(branchId));

    const response = await fetch(`${API_BASE_URL}/api/package/${id}/explode?${params.toString()}`, {
        credentials: "include"
    });
    if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(errorResponse.message || "Error exploding package");
    }
    return response.json();
};

// Persistent "how many can I still sell" figure per package for a branch —
// computed the same way explodePackage's maxSellable is, just batched across
// every active package at once for display on the catalog list.
export const getPackagesAvailability = async (
    branchId: number
): Promise<{ packageId: number; maxSellable: number }[]> => {
    const response = await fetch(`${API_BASE_URL}/api/package/availability?branchId=${branchId}`, {
        credentials: "include"
    });
    if (!response.ok) {
        throw new Error("Error fetching package availability");
    }
    return response.json();
};
