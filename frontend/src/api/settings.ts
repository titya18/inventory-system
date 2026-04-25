const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export interface CompanySettings {
    id?: number;
    companyNameKh?: string | null;
    companyNameEn?: string | null;
    addressKh?: string | null;
    addressEn?: string | null;
    phone?: string | null;
    vatNumber?: string | null;
    logoUrl?: string | null;
    invoiceTerms?: string | null;
}

export const getCompanySettings = async (): Promise<CompanySettings> => {
    const res = await fetch(`${API_BASE_URL}/api/settings`, { credentials: "include" });
    if (!res.ok) throw new Error("Failed to fetch company settings");
    return res.json();
};

export const updateCompanySettings = async (formData: FormData): Promise<CompanySettings> => {
    const res = await fetch(`${API_BASE_URL}/api/settings`, {
        method: "PUT",
        credentials: "include",
        body: formData,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to update settings");
    }
    return res.json();
};

export const getLogoUrl = (logoUrl?: string | null): string => {
    if (!logoUrl) return `${import.meta.env.BASE_URL}admin_assets/images/izoom-logo.png`;
    return `${API_BASE_URL}/${logoUrl}`;
};
