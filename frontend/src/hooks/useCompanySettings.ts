import { useQuery } from "@tanstack/react-query";
import { getCompanySettings, CompanySettings } from "@/api/settings";

const DEFAULTS: CompanySettings = {
    companyNameKh: "ក្រុមហ៊ុន អាយហ៊្សូម សឹលូសិន ឯ.ក",
    companyNameEn: "iZOOM SOLUTIONS CO., LTD",
    addressKh: "ផ្ទះ#៤៨ ផ្លូវបុរីអង្គរ (បុរីអង្គរភ្នំពេញ) ភូមិបឹងរាំង សង្កាត់ទួលសង្កែទី២ ខណ្ឌឬស្សីកែវ រាជធានីភ្នំពេញ",
    addressEn: "No #48, St. Borey Angkor (Borey Angkor Phnom Penh) Sangkat Tuol Sangke 2, Khan Russeykeo, Phnom Penh",
    phone: "+855 16 589 299",
    vatNumber: "K008-902305248",
    invoiceTerms: "Please pay within 7 days from the date of invoice, overdue interest @ 10% will be charged on delayed payments.",
    logoUrl: null,
};

export const useCompanySettings = () => {
    const { data, isLoading } = useQuery({
        queryKey: ["company-settings"],
        queryFn: getCompanySettings,
        staleTime: 5 * 60 * 1000,
        retry: false,
    });

    const settings: CompanySettings = {
        ...DEFAULTS,
        ...Object.fromEntries(
            Object.entries(data ?? {}).filter(([, v]) => v !== null && v !== undefined && v !== "")
        ),
    };

    return { settings, isLoading };
};
