import React, { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { getCompanySettings, updateCompanySettings, getLogoUrl } from "@/api/settings";

const CompanySettings: React.FC = () => {
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { data: saved, isLoading } = useQuery({
        queryKey: ["company-settings"],
        queryFn: getCompanySettings,
    });

    const [form, setForm] = useState({
        companyNameKh: "",
        companyNameEn: "",
        addressKh: "",
        addressEn: "",
        phone: "",
        vatNumber: "",
        invoiceTerms: "",
    });
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (saved) {
            setForm({
                companyNameKh: saved.companyNameKh || "",
                companyNameEn: saved.companyNameEn || "",
                addressKh:     saved.addressKh     || "",
                addressEn:     saved.addressEn     || "",
                phone:         saved.phone         || "",
                vatNumber:     saved.vatNumber     || "",
                invoiceTerms:  saved.invoiceTerms  || "",
            });
        }
    }, [saved]);

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setLogoFile(file);
        setLogoPreview(URL.createObjectURL(file));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const fd = new FormData();
            Object.entries(form).forEach(([k, v]) => fd.append(k, v));
            if (logoFile) fd.append("logo", logoFile);
            await updateCompanySettings(fd);
            await queryClient.invalidateQueries({ queryKey: ["company-settings"] });
            toast.success("Company settings saved successfully.", { position: "top-right", autoClose: 2500 });
        } catch (err: any) {
            toast.error(err.message || "Failed to save settings", { position: "top-right", autoClose: 3000 });
        } finally {
            setSaving(false);
        }
    };

    const currentLogo = logoPreview || getLogoUrl(saved?.logoUrl);

    if (isLoading) return <div className="panel p-6 text-center text-gray-400">Loading settings...</div>;

    return (
        <div className="max-w-3xl mx-auto space-y-5">
            <div>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white-light">Company Settings</h1>
                <p className="text-sm text-gray-500 mt-0.5">Configure your company information used on invoices, quotations, and purchase orders.</p>
            </div>

            {/* Logo */}
            <div className="panel">
                <div className="flex items-center gap-2 mb-4">
                    <span className="w-1 h-5 bg-primary rounded-full inline-block"></span>
                    <h2 className="font-semibold text-gray-700 dark:text-white-light">Company Logo</h2>
                </div>
                <div className="flex items-center gap-6">
                    <div className="w-32 h-32 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-600 flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-gray-800">
                        {currentLogo ? (
                            <img src={currentLogo} alt="Company Logo" className="w-full h-full object-contain p-2" />
                        ) : (
                            <span className="text-gray-400 text-xs text-center px-2">No logo uploaded</span>
                        )}
                    </div>
                    <div className="flex flex-col gap-2">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="btn btn-outline-primary btn-sm"
                        >
                            {saved?.logoUrl || logoFile ? "Change Logo" : "Upload Logo"}
                        </button>
                        {logoFile && (
                            <p className="text-xs text-gray-400">{logoFile.name}</p>
                        )}
                        <p className="text-xs text-gray-400">JPG, PNG, WebP, SVG — max 5 MB</p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".jpg,.jpeg,.png,.webp,.svg"
                            className="hidden"
                            onChange={handleLogoChange}
                        />
                    </div>
                </div>
            </div>

            {/* Company Info */}
            <div className="panel">
                <div className="flex items-center gap-2 mb-4">
                    <span className="w-1 h-5 bg-primary rounded-full inline-block"></span>
                    <h2 className="font-semibold text-gray-700 dark:text-white-light">Company Information</h2>
                </div>
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Company Name (Khmer)
                            </label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="ក្រុមហ៊ុន ..."
                                value={form.companyNameKh}
                                onChange={e => setForm(f => ({ ...f, companyNameKh: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Company Name (English)
                            </label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Company Co., Ltd"
                                value={form.companyNameEn}
                                onChange={e => setForm(f => ({ ...f, companyNameEn: e.target.value }))}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Phone Number
                            </label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="+855 ..."
                                value={form.phone}
                                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                VAT / TIN Number
                            </label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="K008-..."
                                value={form.vatNumber}
                                onChange={e => setForm(f => ({ ...f, vatNumber: e.target.value }))}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Address (Khmer)
                        </label>
                        <textarea
                            rows={2}
                            className="form-input"
                            placeholder="ផ្ទះ# ..."
                            value={form.addressKh}
                            onChange={e => setForm(f => ({ ...f, addressKh: e.target.value }))}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Address (English)
                        </label>
                        <textarea
                            rows={2}
                            className="form-input"
                            placeholder="No #..."
                            value={form.addressEn}
                            onChange={e => setForm(f => ({ ...f, addressEn: e.target.value }))}
                        />
                    </div>
                </div>
            </div>

            {/* Invoice Terms */}
            <div className="panel">
                <div className="flex items-center gap-2 mb-4">
                    <span className="w-1 h-5 bg-warning rounded-full inline-block"></span>
                    <h2 className="font-semibold text-gray-700 dark:text-white-light">Invoice Terms &amp; Conditions</h2>
                </div>
                <p className="text-xs text-gray-400 mb-2">Printed at the bottom of all invoices, quotations, and purchase orders.</p>
                <textarea
                    rows={3}
                    className="form-input"
                    placeholder="Please pay within 7 days..."
                    value={form.invoiceTerms}
                    onChange={e => setForm(f => ({ ...f, invoiceTerms: e.target.value }))}
                />
            </div>

            {/* Save */}
            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="btn btn-primary"
                >
                    {saving ? "Saving..." : "Save Settings"}
                </button>
            </div>
        </div>
    );
};

export default CompanySettings;
