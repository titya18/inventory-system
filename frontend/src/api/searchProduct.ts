const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export const searchProduct = async (searchTerm: string, branchId: number) => {
    const response = await fetch(
        `${API_BASE_URL}/api/searchProductRoute?searchTerm=${encodeURIComponent(
            searchTerm
        )}&branchId=${branchId}`,
        {
            credentials: "include",
        }
    );

    if (!response.ok) {
        throw new Error("Error fetching search product");
    }

    return response.json();
};
