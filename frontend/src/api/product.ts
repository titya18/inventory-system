import { ProductType } from "../data_types/types";
const API_BASE_URL = import.meta.env.VITE_API_URL || "";

// export interface ProductData {
//     id?: number;
//     categoryId: number;
//     brandId: number;
//     categories: { id: number, name: string } | null;
//     brands: { id: number, en_name: string, kh_name: string } | null;
//     name: string;
//     note: string;
//     isActive: string;
//     image: File[] | null;
//     imagesToDelete: string[];
// };

export const getAllProducts = async (
    sortField: string | null,
    sortOrder: 'asc' | 'desc' | null,
    page: number,
    searchTerm: string | null,
    pageSize: number
): Promise<{ data: ProductType[], total: number }> => {
    const sortParams = sortField && sortOrder ? `&sortField=${sortField}&sortOrder=${sortOrder}` : "";
    const response = await fetch(`${API_BASE_URL}/api/product?page=${page}&searchTerm=${searchTerm}&pageSize=${pageSize}${sortParams}`, {
        credentials: "include"
    });
    if (!response.ok) {
        throw new Error("Error fetching product");
    }
    return response.json();
};

export const getProductById = async (id: number): Promise<ProductType> => {
    const response = await fetch(`${API_BASE_URL}/api/product/${id}`, {
        credentials: "include"
    });
    if (!response.ok) {
        throw new Error("Error fetching product");
    }
    return response.json();
};

export const upsertProduct = async (productData: ProductType): Promise<ProductType> => {
    const { id, image, imagesToDelete, ...data } = productData;

    const method = id ? "PUT" : "POST";
    const url = id
        ? `${API_BASE_URL}/api/product/${id}`
        : `${API_BASE_URL}/api/product`;

    const formData = new FormData();

    formData.append("categoryId", data.categoryId.toString());
    formData.append("brandId", data.brandId.toString());
    formData.append("name", data.name);
    formData.append("note", data.note ?? "");

    // ===============================
    // VARIANT DATA
    // ===============================
    formData.append("productType", data.productType ?? "New");
    formData.append("unitId", (data.unitId ?? 0).toString());
    formData.append("barcode", data.barcode ?? "");
    formData.append("sku", data.sku ?? "");
    formData.append("stockAlert", (data.stockAlert ?? 0).toString());

    // ===============================
    // MULTI BRANCH STOCK
    // ===============================
    formData.append("updateStock", String(data.updateStock ?? false));
    formData.append("trackingType", data.trackingType ?? "NONE");

    // ✅ only send stocks when wanted
    if (data.updateStock) {
        formData.append("stocks", JSON.stringify(data.stocks ?? []));
        formData.append("trackedItems", JSON.stringify(data.trackedItems ?? []));
    }

    // ===============================
    // PRICES
    // ===============================
    formData.append("purchasePrice", ((data.purchasePrice ?? 0) as number).toString());
    formData.append("purchasePriceUnitId", (data.purchasePriceUnitId ?? 0).toString());
    formData.append("retailPrice", (data.retailPrice ?? 0).toString());
    formData.append("retailPriceUnitId", String(data.retailPriceUnitId ?? ""));
    formData.append("wholeSalePrice", (data.wholeSalePrice ?? 0).toString());
    formData.append("wholeSalePriceUnitId", String(data.wholeSalePriceUnitId ?? ""));

    formData.append("variantValueIds", JSON.stringify(data.variantValueIds ?? []));

    // ===============================
    // ✅ UOM (NEW PART)
    // ===============================

    // Base unit (stock stored in this unit)
    formData.append("baseUnitId", String(data.baseUnitId ?? 0));

    // Conversions (array -> JSON string)
    formData.append(
        "unitConversions",
        JSON.stringify(data.unitConversions ?? [])
    );

    // ===============================
    // IMAGES
    // ===============================
    if (image) {
        image.forEach((img) => {
            formData.append("images[]", img);
        });
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
        const custom_error = id ? "Error updating product" : "Error adding product";
        const errorResponse = await response.json();
        throw new Error(errorResponse.message || custom_error);
    }

    return response.json();
};

export const deleteProduct = async (id: number): Promise<ProductType> => {
    const response = await fetch(`${API_BASE_URL}/api/product/${id}`, {
        credentials: "include",
        method: "DELETE",
        headers: {
            "Content-Type": "application/json"
        }
    });
    if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(errorResponse.message || "Error deleting product");
    }
    return response.json();
};

export const statusProduct = async (id: number): Promise<ProductType> => {
    const response = await fetch(`${API_BASE_URL}/api/product/status/${id}`, {
        credentials: "include"
    });
    if (!response.ok) {
        throw new Error("Error updating status");
    }
    return response.json();
}