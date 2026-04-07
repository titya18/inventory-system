const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export const searchService = async (searchTerm: string) => {
    const response = await fetch(`${API_BASE_URL}/api/searchServiceRoute?searchTerm=${encodeURIComponent(searchTerm)}`, {
        credentials: "include"
    });
    if (!response.ok) {
        throw new Error("Error fetching search service");
    }

    return response.json();
};