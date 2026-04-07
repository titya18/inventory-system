import { ProductVariantType } from "../data_types/types";
const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export const getAllProductVariants = async (
    id: number,
    sortField: string | null,
    sortOrder: 'asc' | 'desc' | null,
    page: number,
    searchTerm: string | null,
    pageSize: number
): Promise<{ data: ProductVariantType[], total: number}> => {
    const sortParams = sortField && sortOrder ? `&sortField=${sortField}&sortOrder=${sortOrder}` : "";
    const response = await fetch(`${API_BASE_URL}/api/productvariant/${id}?page=${page}&searchTerm=${searchTerm}&pageSize=${pageSize}${sortParams}`, {
        credentials: "include"
    });
    if (!response.ok) {
        throw new Error("Error fetching product variant");
    }
    return response.json();
};

export const getProductVariantById = async (id: number): Promise<ProductVariantType> => {
    const response = await fetch(`${API_BASE_URL}/api/productvariant/${id}`, {
        credentials: "include"
    });
    if (!response.ok) {
        throw new Error("Error fetching product's varaint");
    }
    return response.json();
}

export const upsertProductVariant = async (productVariantData: ProductVariantType): Promise<ProductVariantType> => {
    const { id, image, imagesToDelete, ...data } = productVariantData;
    const method = id ? "PUT" : "POST";
    const url = id ?    `${API_BASE_URL}/api/productvariant/${id}` : `${API_BASE_URL}/api/productvariant`;

    const formData = new FormData();
    formData.append("productId", (data.productId ?? 0).toString());
    formData.append("unitId", (data.unitId ?? 0).toString());
    formData.append("barcode", data.barcode ?? "");
    formData.append("sku", data.sku);
    formData.append("name", data.name);
    formData.append("purchasePrice", data.purchasePrice.toString());
    formData.append("retailPrice", (data.retailPrice ?? 0).toString());
    formData.append("retailPriceUnitId", String(data.retailPriceUnitId ?? ""));
    formData.append("wholeSalePrice", (data.wholeSalePrice ?? 0).toString());
    formData.append("wholeSalePriceUnitId", String(data.wholeSalePriceUnitId ?? ""));
    formData.append("variantValueIds", JSON.stringify(data.variantValueIds));
    
    // Append images if they exist
    if (image) {
        if (Array.isArray(image)) {
            image.forEach((img) => {
                formData.append("images[]", img);
            });
        } else if (image instanceof File) {
            formData.append("images[]", image);
        } else if (typeof image === "string") {
            formData.append("existingImage", image); 
        }
    }

    // Add imagesToDelete as a JSON string
    if (imagesToDelete && imagesToDelete.length > 0) {
        formData.append("imagesToDelete", JSON.stringify(imagesToDelete));
    }

    const response = await fetch(url, {
        method,
        credentials: "include",
        body: formData // Send FormData instead of JSON
    });

    if (!response.ok) {
        const custom_error = id ? "Error uupdating product's variant" : "Error adding product's varint";
        const errorResponse = await response.json();
        throw new Error(errorResponse.message || custom_error);
    }
    return response.json();
};

export const deleteProductVaraint = async (id: number): Promise<ProductVariantType> => {
    const response = await fetch(`${API_BASE_URL}/api/productvaraint/${id}`, {
        credentials: "include",
        method: "DELETE",
        headers: {
            "Content-Type": "application/json"
        }
    });
    if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(errorResponse.message || "Error deleting product's variant");
    }
    return response.json();
};

export const statusProductVariant = async (id: number): Promise<ProductVariantType> => {
    const response = await fetch(`${API_BASE_URL}/api/productvariant/status/${id}`, {
        credentials: "include"
    });
    if (!response) {
        throw new Error("Error updating status");
    }
    return response.json();
};