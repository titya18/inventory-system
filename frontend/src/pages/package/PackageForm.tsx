import React, { useEffect, useState } from "react";
import { NavLink, useNavigate, useParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faSave } from "@fortawesome/free-solid-svg-icons";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useAppContext } from "@/hooks/useAppContext";
import { getAllBranches } from "@/api/branch";
import { searchProduct } from "@/api/searchProduct";
import { getPackageById, upsertPackage, getNextPackageSku } from "@/api/package";
import { PackageItemType, PackageType } from "@/data_types/types";

type UnitOption = {
    unitId: number;
    unitName: string;
    isBaseUnit?: boolean;
};

type SearchVariant = {
    id: number;
    name: string;
    sku: string;
    barcode: string;
    baseUnitId?: number | null;
    products?: { name?: string } | null;
    unitOptions?: UnitOption[];
};

interface PackageLine extends PackageItemType {
    displayName: string;
    unitOptions: UnitOption[];
}

interface FormData {
    name: string;
    sku: string;
    barcode: string;
    note: string;
    isActive: boolean;
    packageRetailPrice: string;
    packageWholeSalePrice: string;
}

const PackageForm: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user, hasPermission } = useAppContext();

    const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({
        defaultValues: { isActive: true },
    });

    const [isLoading, setIsLoading] = useState(false);
    const [searchBranchId, setSearchBranchId] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState<SearchVariant[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [lines, setLines] = useState<PackageLine[]>([]);
    const [existingImages, setExistingImages] = useState<string[]>([]);
    const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);
    const [newImages, setNewImages] = useState<File[]>([]);

    useEffect(() => {
        (async () => {
            try {
                const data = await getAllBranches();
                if (user?.branchId) {
                    setSearchBranchId(user.branchId);
                } else if (data && data.length > 0 && data[0].id) {
                    setSearchBranchId(data[0].id);
                }
            } catch (err) {
                console.error("Error fetching branches:", err);
            }
        })();
    }, [user?.branchId]);

    // Auto-generate SKU + Barcode for new packages (PKG-00001, ...) — still
    // editable in case the admin wants to override.
    useEffect(() => {
        if (id) return;
        (async () => {
            try {
                const sku = await getNextPackageSku();
                setValue("sku", sku);
                setValue("barcode", sku);
            } catch (err) {
                console.error("Error generating package SKU:", err);
            }
        })();
    }, [id, setValue]);

    useEffect(() => {
        if (!id) return;
        (async () => {
            setIsLoading(true);
            try {
                const pkg = await getPackageById(Number(id));
                reset({
                    name: pkg.name,
                    sku: pkg.sku || "",
                    barcode: pkg.barcode || "",
                    note: pkg.note || "",
                    isActive: pkg.isActive !== 0,
                    packageRetailPrice: String(pkg.packageRetailPrice ?? ""),
                    packageWholeSalePrice: pkg.packageWholeSalePrice ? String(pkg.packageWholeSalePrice) : "",
                });
                setExistingImages((pkg.image as unknown as string[]) || []);
                setLines(
                    (pkg.items || []).map((it) => ({
                        ...it,
                        displayName: `${it.productVariant?.name ?? it.variantName ?? ""} (${it.productVariant?.sku ?? it.sku ?? ""})`,
                        unitOptions: it.unit
                            ? [{ unitId: it.unit.id!, unitName: it.unit.name, isBaseUnit: it.unit.id === it.productVariant?.baseUnitId }]
                            : [],
                    }))
                );
            } catch (err: any) {
                toast.error(err.message || "Error loading package", { position: "top-right", autoClose: 2000 });
            } finally {
                setIsLoading(false);
            }
        })();
    }, [id, reset]);

    const handleSearch = async (term: string) => {
        setSearchTerm(term);
        if (term.trim() === "") {
            setSearchResults([]);
            setShowSuggestions(false);
            return;
        }
        if (!searchBranchId) {
            toast.error("No branch available to search products", { position: "top-right", autoClose: 3000 });
            return;
        }
        try {
            const response = (await searchProduct(term, searchBranchId)) as SearchVariant[];
            setSearchResults(response);
            setShowSuggestions(true);
        } catch (err) {
            console.error("Error searching product:", err);
        }
    };

    const addLine = (variant: SearchVariant) => {
        if (lines.some((l) => l.productVariantId === variant.id)) {
            toast.warning("This product is already a component of the package", { position: "top-right", autoClose: 2000 });
            return;
        }
        const unitOptions = variant.unitOptions && variant.unitOptions.length > 0
            ? variant.unitOptions
            : variant.baseUnitId
                ? [{ unitId: variant.baseUnitId, unitName: "Base Unit", isBaseUnit: true }]
                : [];
        const defaultUnit = unitOptions.find((u) => u.isBaseUnit) || unitOptions[0];

        setLines((prev) => [
            ...prev,
            {
                productVariantId: variant.id,
                quantity: 1,
                unitId: defaultUnit?.unitId ?? null,
                displayName: `${variant.name} (${variant.sku})`,
                unitOptions,
            },
        ]);
        setSearchTerm("");
        setShowSuggestions(false);
    };

    const updateLine = (index: number, patch: Partial<PackageLine>) => {
        setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
    };

    const removeLine = (index: number) => {
        setLines((prev) => prev.filter((_, i) => i !== index));
    };

    const handleRemoveExistingImage = (img: string) => {
        setExistingImages((prev) => prev.filter((i) => i !== img));
        setImagesToDelete((prev) => [...prev, img]);
    };

    const onSubmit = async (data: FormData) => {
        if (lines.length === 0) {
            toast.error("Add at least one component product", { position: "top-right", autoClose: 3000 });
            return;
        }
        if (lines.some((l) => !l.quantity || Number(l.quantity) <= 0)) {
            toast.error("Every component needs a quantity greater than 0", { position: "top-right", autoClose: 3000 });
            return;
        }

        setIsLoading(true);
        try {
            await queryClient.invalidateQueries({ queryKey: ["validateToken"] });

            const payload: PackageType = {
                id: id ? Number(id) : undefined,
                name: data.name,
                sku: data.sku || null,
                barcode: data.barcode || null,
                note: data.note || null,
                isActive: data.isActive ? 1 : 0,
                packageRetailPrice: data.packageRetailPrice,
                packageWholeSalePrice: data.packageWholeSalePrice || null,
                image: newImages.length > 0 ? newImages : null,
                imagesToDelete,
                items: lines.map((l) => ({
                    productVariantId: l.productVariantId,
                    quantity: Number(l.quantity),
                    unitId: l.unitId ?? undefined,
                })),
            };

            await upsertPackage(payload);
            toast.success(`Package ${id ? "updated" : "created"} successfully`, { position: "top-right", autoClose: 2000 });
            navigate("/packages");
        } catch (err: any) {
            toast.error(err.message || "Error saving package", { position: "top-right", autoClose: 3000 });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="pt-0">
            <ul className="flex space-x-2 rtl:space-x-reverse mb-5">
                <li>
                    <NavLink to="/packages" className="text-primary hover:underline">Packages</NavLink>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <span>{id ? "Edit Package" : "Add New Package"}</span>
                </li>
            </ul>

            <form onSubmit={handleSubmit(onSubmit)}>
                <div className="panel mb-5">
                    <h5 className="font-semibold text-lg mb-4">Package Details</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        <div>
                            <label>Name <span className="text-danger text-md">*</span></label>
                            <input type="text" className="form-input" placeholder="e.g. WiFi Starter Kit" {...register("name", { required: "Name is required" })} />
                            {errors.name && <p className="error_validate">{errors.name.message}</p>}
                        </div>
                        <div>
                            <label>SKU <span className="text-xs text-gray-500">(auto-generated, editable)</span></label>
                            <input type="text" className="form-input" placeholder="Auto-generated" {...register("sku")} />
                        </div>
                        <div>
                            <label>Barcode <span className="text-xs text-gray-500">(auto-generated, editable)</span></label>
                            <input type="text" className="form-input" placeholder="Auto-generated" {...register("barcode")} />
                        </div>
                        <div>
                            <label>Retail Price <span className="text-danger text-md">*</span></label>
                            <input type="number" step="0.01" className="form-input" {...register("packageRetailPrice", { required: "Retail price is required" })} />
                            {errors.packageRetailPrice && <p className="error_validate">{errors.packageRetailPrice.message}</p>}
                        </div>
                        <div>
                            <label>Wholesale Price</label>
                            <input type="number" step="0.01" className="form-input" placeholder="Optional" {...register("packageWholeSalePrice")} />
                        </div>
                        <div className="flex items-center mt-6">
                            <label className="inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="form-checkbox" {...register("isActive")} />
                                <span className="ltr:ml-2 rtl:mr-2">Active</span>
                            </label>
                        </div>
                        <div className="sm:col-span-2 lg:col-span-3">
                            <label>Note</label>
                            <textarea className="form-textarea" rows={2} {...register("note")} />
                        </div>
                        <div className="sm:col-span-2 lg:col-span-3">
                            <label>Images</label>
                            <input
                                type="file"
                                multiple
                                accept="image/*"
                                className="form-input"
                                onChange={(e) => setNewImages(e.target.files ? Array.from(e.target.files) : [])}
                            />
                            {existingImages.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {existingImages.map((img) => (
                                        <div key={img} className="relative">
                                            <img src={`${import.meta.env.VITE_API_URL}/${img}`} alt="" className="h-16 w-16 object-cover rounded" />
                                            <button type="button" className="absolute -top-2 -right-2 bg-danger text-white rounded-full w-5 h-5 text-xs" onClick={() => handleRemoveExistingImage(img)}>×</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="panel mb-5">
                    <h5 className="font-semibold text-lg mb-4">Component Products</h5>

                    <div className="mb-5 relative">
                        <label>Add Component <span className="text-danger text-md">*</span></label>
                        <input
                            type="text"
                            placeholder="Search product by name, SKU, or barcode"
                            className="form-input"
                            value={searchTerm}
                            onChange={(e) => handleSearch(e.target.value)}
                            onFocus={() => searchResults.length > 0 && setShowSuggestions(true)}
                        />
                        {showSuggestions && searchResults.length > 0 && (
                            <ul
                                style={{
                                    listStyle: "none",
                                    border: "1px solid #ccc",
                                    padding: 0,
                                    margin: 0,
                                    position: "absolute",
                                    backgroundColor: "white",
                                    zIndex: 10,
                                    maxHeight: "250px",
                                    overflowY: "auto",
                                    width: "100%",
                                }}
                            >
                                {searchResults.map((variant) => (
                                    <li
                                        key={variant.id}
                                        style={{ padding: "8px", cursor: "pointer", borderBottom: "1px solid #eee" }}
                                        onClick={() => addLine(variant)}
                                    >
                                        {variant.name} - {variant.sku} / {variant.barcode}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="dataTable-container">
                        <table className="whitespace-nowrap dataTable-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Product</th>
                                    <th>Qty</th>
                                    <th>Unit</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {lines.length === 0 ? (
                                    <tr><td colSpan={5}>No components added yet</td></tr>
                                ) : (
                                    lines.map((line, index) => (
                                        <tr key={`${line.productVariantId}-${index}`}>
                                            <td>{index + 1}</td>
                                            <td>{line.displayName}</td>
                                            <td style={{ maxWidth: 120 }}>
                                                <input
                                                    type="number"
                                                    min={0.0001}
                                                    step="0.0001"
                                                    className="form-input"
                                                    value={line.quantity}
                                                    onChange={(e) => updateLine(index, { quantity: Number(e.target.value) })}
                                                />
                                            </td>
                                            <td style={{ maxWidth: 140 }}>
                                                {line.unitOptions.length > 1 ? (
                                                    <select
                                                        className="form-select"
                                                        value={line.unitId ?? ""}
                                                        onChange={(e) => updateLine(index, { unitId: Number(e.target.value) })}
                                                    >
                                                        {line.unitOptions.map((u) => (
                                                            <option key={u.unitId} value={u.unitId}>{u.unitName}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <span>{line.unitOptions[0]?.unitName ?? "-"}</span>
                                                )}
                                            </td>
                                            <td>
                                                <button type="button" className="hover:text-danger" onClick={() => removeLine(index)} title="Remove">
                                                    <Trash2 color="red" size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="flex justify-end items-center gap-3">
                    <button type="button" className="btn btn-outline-danger" onClick={() => navigate("/packages")}>
                        <FontAwesomeIcon icon={faArrowLeft} className="mr-1" />
                        Back
                    </button>
                    {(hasPermission("Package-Create") || hasPermission("Package-Edit")) && (
                        <button type="submit" className="btn btn-primary" disabled={isLoading}>
                            <FontAwesomeIcon icon={faSave} className="mr-1" />
                            {isLoading ? "Saving..." : "Save"}
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
};

export default PackageForm;
