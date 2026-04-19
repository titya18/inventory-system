import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faSave } from "@fortawesome/free-solid-svg-icons";
import { NavLink, useNavigate, useParams } from "react-router-dom";
import {
    BranchType,
    ProductVariantType,
    StockReturnType,
    StockReturnDetailType,
} from "@/data_types/types";
import { getAllBranches } from "@/api/branch";
import { searchProduct } from "@/api/searchProduct";
import { upsertReturn, getStockReturnById } from "@/api/stockReturn";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { useAppContext } from "@/hooks/useAppContext";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { useQueryClient } from "@tanstack/react-query";
import { FilePenLine, Plus, Trash2 } from "lucide-react";
import ShowWarningMessage from "../components/ShowWarningMessage";
import TrackedItemsPickerModal from "@/components/TrackedItemsPickerModal";

type RawUnitRow = {
    unitId?: number;
    id?: number;
    unitName?: string;
    name?: string;
    operationValue?: number | string;
    operator?: string;
    isBaseUnit?: boolean;
    isBase?: boolean;
    Units?: {
        id?: number;
        name?: string;
    };
    unit?: {
        id?: number;
        name?: string;
    };
};

type VariantUnitType = {
    unitId: number;
    unitName: string;
    operationValue: number;
    operator?: string;
    isBaseUnit?: boolean;
};

type ProductVariantWithUnits = ProductVariantType & {
    unitOptions?: {
        unitId: number;
        unitName: string;
        operationValue: number;
        isBaseUnit?: boolean;
        operator?: string;
    }[];
    units?: RawUnitRow[];
    productUnitRelations?: RawUnitRow[];
    products?: any;
};

const StockReturnForm: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user, hasPermission } = useAppContext();

    const [isLoading, setIsLoading] = useState(false);
    const [branches, setBranches] = useState<BranchType[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [productResults, setProductResults] = useState<ProductVariantWithUnits[]>([]);
    const [returnDetails, setReturnDetails] = useState<StockReturnDetailType[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [statusValue, setStatusValue] = useState<string>("PENDING");
    const [trackedModalIndex, setTrackedModalIndex] = useState<number | null>(null);
    const [branchInitialized, setBranchInitialized] = useState(false);

    const {
        control,
        register,
        handleSubmit,
        setValue,
        watch,
        reset,
        formState: { errors },
    } = useForm<StockReturnType>();

    const wrapperStyle = useMemo(() => ({ width: "100%" }), []);
    const branchId = watch("branchId");

    const normalizeUnit = (raw: RawUnitRow): VariantUnitType | null => {
        const unitId = Number(raw.unitId ?? raw.id ?? raw.unit?.id ?? raw.Units?.id ?? 0);
        const unitName =
            raw.unitName ??
            raw.name ??
            raw.unit?.name ??
            raw.Units?.name ??
            "";

        const operationValue = Number(raw.operationValue ?? 1) || 1;
        const isBaseUnit = Boolean(raw.isBaseUnit ?? raw.isBase ?? false);

        if (!unitId || !unitName) return null;

        return {
            unitId,
            unitName,
            operationValue,
            operator: raw.operator ?? "*",
            isBaseUnit,
        };
    };

    const getVariantUnits = (variant: ProductVariantType | null | undefined): VariantUnitType[] => {
        const v = variant as ProductVariantWithUnits | null | undefined;
        if (!v) return [];

        if (Array.isArray(v.unitOptions) && v.unitOptions.length > 0) {
            return v.unitOptions.map((u) => ({
                unitId: Number(u.unitId),
                unitName: String(u.unitName),
                operationValue: Number(u.operationValue ?? 1),
                isBaseUnit: Boolean(u.isBaseUnit),
                operator: u.operator ?? "*",
            }));
        }

        const rawUnits: RawUnitRow[] = [
            ...(Array.isArray(v.units) ? v.units : []),
            ...(Array.isArray(v.productUnitRelations) ? v.productUnitRelations : []),
            ...(Array.isArray(v.products?.productUnitRelations) ? v.products.productUnitRelations : []),
            ...(Array.isArray(v.products?.units) ? v.products.units : []),
        ];

        const normalized = rawUnits
            .map(normalizeUnit)
            .filter((u): u is VariantUnitType => u !== null);

        const unique = normalized.filter(
            (item, index, arr) =>
                arr.findIndex((x) => x.unitId === item.unitId) === index
        );

        return unique;
    };

    const getDefaultUnitData = (variant: ProductVariantType | null | undefined) => {
        const units = getVariantUnits(variant);
        const defaultUnit = units.find((u) => u.isBaseUnit) || units[0] || null;

        return {
            unitId: defaultUnit?.unitId ?? null,
            unitName: defaultUnit?.unitName ?? "",
            operationValue: Number(defaultUnit?.operationValue ?? 1) || 1,
            operator: defaultUnit?.operator ?? "*",
        };
    };

    const calculateBaseQty = (
        unitQty: number | string | null | undefined,
        operationValue: number,
        operator: string = "*"
    ) => {
        const qty = Number(unitQty ?? 0);
        const opValue = Number(operationValue || 1);

        if (operator === "/") {
            return opValue === 0 ? 0 : qty / opValue;
        }

        return qty * opValue;
    };

    const getSelectedUnit = (detail: StockReturnDetailType): VariantUnitType | null => {
        const units = getVariantUnits(detail.productvariants);
        return units.find((u) => Number(u.unitId) === Number(detail.unitId ?? 0)) || null;
    };

    const recalcDetailBaseQty = (detail: StockReturnDetailType): StockReturnDetailType => {
        const selectedUnit = getSelectedUnit(detail);
        const operationValue = Number(selectedUnit?.operationValue ?? 1) || 1;
        const operator = selectedUnit?.operator ?? "*";

        const baseQty = calculateBaseQty(detail.unitQty, operationValue, operator);

        return {
            ...detail,
            baseQty,
            quantity: baseQty,
        };
    };

    const getDisplayStockInSelectedUnit = (detail: StockReturnDetailType) => {
        const selectedUnit = getSelectedUnit(detail);
        const operationValue = Number(selectedUnit?.operationValue ?? 1) || 1;
        const operator = selectedUnit?.operator ?? "*";
        const stockBaseQty = Number(detail.stocks ?? 0);

        if (!operationValue) return 0;

        const result =
            operator === "/"
                ? stockBaseQty * operationValue
                : stockBaseQty / operationValue;

        return Number(result.toFixed(4));
    };

    const fetchBranches = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getAllBranches();
            setBranches(data as BranchType[]);
        } catch (error) {
            console.error("Error fetching branch:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!id && user?.branchId && branches.length > 0) {
            setValue("branchId", user.branchId, { shouldValidate: false });
        }
    }, [branches, id, user?.branchId, setValue]);

    const fetchStockReturn = useCallback(async () => {
        if (!id) return;

        setIsLoading(true);
        try {
            const returnData: StockReturnType = await getStockReturnById(parseInt(id, 10));
            await fetchBranches();

            setValue("branchId", returnData.branchId);
            setValue(
                "returnDate",
                returnData.returnDate
                    ? new Date(returnData.returnDate).toISOString()
                    : null
            );
            setValue("StatusType", returnData.StatusType);
            setValue("note", returnData.note);

            setReturnDetails(
                (returnData.returnDetails || []).map((detail) => {
                    let serialSelectionMode: "AUTO" | "MANUAL" = "AUTO";
                    let selectedTrackedItemIds: number[] = [];
                    if (detail.trackedPayload) {
                        try {
                            const parsed = JSON.parse(detail.trackedPayload);
                            serialSelectionMode = parsed.mode ?? "AUTO";
                            selectedTrackedItemIds = parsed.selectedIds ?? [];
                        } catch {}
                    }
                    return {
                        ...detail,
                        unitId: detail.unitId ?? null,
                        unitQty: detail.unitQty ?? 1,
                        baseQty: detail.baseQty ?? detail.quantity ?? 1,
                        quantity: detail.quantity ?? Number(detail.baseQty ?? 1),
                        trackingType: (detail.productvariants as any)?.trackingType ?? "NONE",
                        serialSelectionMode,
                        selectedTrackedItemIds,
                        selectedTrackedItems: [],
                        branchId: Number(returnData.branchId),
                    };
                })
            );

            setStatusValue(returnData.StatusType);
        } catch (error) {
            console.error("Error fetching stock return:", error);
            toast.error("Failed to fetch stock return");
        } finally {
            setIsLoading(false);
        }
    }, [id, setValue, fetchBranches]);

    useEffect(() => {
        fetchBranches();
        fetchStockReturn();
    }, [fetchBranches, fetchStockReturn]);

    useEffect(() => {
        if (!branchInitialized) {
            setBranchInitialized(true);
            return;
        }

        if (!id) {
            setReturnDetails([]);
            setSearchTerm("");
        }
    }, [branchId, id, branchInitialized]);

    const handleSearch = async (term: string) => {
        if (term.trim() === "") {
            setProductResults([]);
            setShowSuggestions(false);
            return;
        }

        const selectedBranchId = watch("branchId");

        if (!selectedBranchId) {
            toast.error("No branch selected", {
                position: "top-right",
                autoClose: 4000,
            });
            return;
        }

        try {
            const response = (await searchProduct(term, selectedBranchId)) as ProductVariantWithUnits[];

            const matches = response.filter(
                (p) => p.barcode === term || p.sku === term
            );

            if (matches.length === 0) {
                setProductResults(response);
                setShowSuggestions(true);
            } else if (matches.length === 1) {
                addToCartDirectly(matches[0]);
                setSearchTerm("");
                setShowSuggestions(false);
            } else {
                setProductResults(matches);
                setShowSuggestions(true);
            }
        } catch (error) {
            console.error("Error fetching products:", error);
            toast.error("Failed to search product");
        }
    };

    const handleFocus = () => {
        setShowSuggestions(false);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const term = e.target.value;
        setSearchTerm(term);
        handleSearch(term);
    };

    const addToCartDirectly = (variant: ProductVariantWithUnits) => {
        const stockQty =
            Number(
                Array.isArray(variant.stocks)
                    ? (variant.stocks[0] as any)?.quantity ?? 0
                    : (variant.stocks as any)?.quantity ?? 0
            ) || 0;

        const existingIndex = returnDetails.findIndex(
            (item) => item.productVariantId === variant.id
        );

        if (existingIndex !== -1) {
            toast.warning("Product already added");
            return;
        }

        const defaultUnit = getDefaultUnitData(variant);

        const newDetail: StockReturnDetailType = {
            id: 0,
            productId: variant.products?.id || 0,
            productVariantId: variant.id,
            products: variant.products || null,
            productvariants: variant,
            stocks: stockQty,
            unitId: defaultUnit.unitId,
            unitQty: 1,
            baseQty: calculateBaseQty(1, defaultUnit.operationValue, defaultUnit.operator),
            quantity: calculateBaseQty(1, defaultUnit.operationValue, defaultUnit.operator),
            trackingType: (variant as any).trackingType ?? "NONE",
            serialSelectionMode: "AUTO",
            selectedTrackedItemIds: [],
            selectedTrackedItems: [],
            branchId: Number(watch("branchId") || 0),
        };

        setReturnDetails((prev) => [...prev, newDetail]);
    };

    const addOrUpdateReturnDetail = async (detail: StockReturnDetailType) => {
        const exists = returnDetails.find(
            (item) => item.productVariantId === detail.productVariantId
        );

        if (exists) {
            await ShowWarningMessage("Product already in cart");
            return;
        }

        const variant = detail.productvariants;
        const defaultUnit = getDefaultUnitData(variant);

        const newDetail: StockReturnDetailType = {
            id: detail.id ?? 0,
            productId: detail.productId ?? 0,
            productVariantId: detail.productVariantId ?? 0,
            products: detail.products ?? null,
            productvariants: detail.productvariants ?? null,
            stocks: detail.stocks ?? 0,
            unitId: defaultUnit.unitId,
            unitQty: 1,
            baseQty: calculateBaseQty(1, defaultUnit.operationValue, defaultUnit.operator),
            quantity: calculateBaseQty(1, defaultUnit.operationValue, defaultUnit.operator),
            trackingType: (detail.productvariants as any)?.trackingType ?? "NONE",
            serialSelectionMode: "AUTO",
            selectedTrackedItemIds: [],
            selectedTrackedItems: [],
            branchId: Number(watch("branchId") || 0),
        };

        setReturnDetails((prev) => [...prev, newDetail]);
        setSearchTerm("");
        setShowSuggestions(false);
    };

    const handleUnitChange = (index: number, unitId: number) => {
        setReturnDetails((prev) =>
            prev.map((detail, i) => {
                if (i !== index) return detail;

                const updated = {
                    ...detail,
                    unitId,
                };

                return recalcDetailBaseQty(updated);
            })
        );
    };

    const handleUnitQtyChange = (index: number, value: string) => {
        let cleaned = value.replace(/[^0-9.]/g, "");
        const parts = cleaned.split(".");

        if (parts.length > 2) {
            cleaned = `${parts[0]}.${parts.slice(1).join("")}`;
        }

        setReturnDetails((prev) =>
            prev.map((detail, i) => {
                if (i !== index) return detail;

                const updated = {
                    ...detail,
                    unitQty: cleaned,
                };

                return recalcDetailBaseQty(updated);
            })
        );
    };

    const increaseUnitQty = (index: number) => {
        setReturnDetails((prev) =>
            prev.map((detail, i) => {
                if (i !== index) return detail;

                const currentQty = Number(detail.unitQty ?? 0);
                const updated = {
                    ...detail,
                    unitQty: currentQty + 1,
                };

                return recalcDetailBaseQty(updated);
            })
        );
    };

    const decreaseUnitQty = (index: number) => {
        setReturnDetails((prev) =>
            prev.map((detail, i) => {
                if (i !== index) return detail;

                const currentQty = Number(detail.unitQty ?? 0);
                const nextQty = currentQty > 1 ? currentQty - 1 : 1;

                const updated = {
                    ...detail,
                    unitQty: nextQty,
                };

                return recalcDetailBaseQty(updated);
            })
        );
    };

    const removeProductFromCart = (index: number) => {
        setReturnDetails((prev) => prev.filter((_, i) => i !== index));
    };

    const onSubmit: SubmitHandler<StockReturnType> = async (formData) => {
        setIsLoading(true);

        try {
            if (returnDetails.length === 0) {
                toast.error("Please add at least one product");
                setIsLoading(false);
                return;
            }

            for (const row of returnDetails) {
                if (!row.unitId) {
                    toast.error(`Please select unit for product ${row.products?.name || ""}`);
                    setIsLoading(false);
                    return;
                }

                if (!row.unitQty || Number(row.unitQty) <= 0) {
                    toast.error(`Please enter valid quantity for product ${row.products?.name || ""}`);
                    setIsLoading(false);
                    return;
                }

                if (!row.baseQty || Number(row.baseQty) <= 0) {
                    toast.error(`Invalid base quantity for product ${row.products?.name || ""}`);
                    setIsLoading(false);
                    return;
                }
            }

            // Serial tracking validation for APPROVED + MANUAL mode
            for (const row of returnDetails) {
                if (
                    formData.StatusType === "APPROVED" &&
                    row.trackingType &&
                    row.trackingType !== "NONE" &&
                    row.serialSelectionMode === "MANUAL"
                ) {
                    const productName = row.products?.name || `Product #${row.productVariantId}`;
                    const requiredQty = Math.round(Number(row.baseQty ?? 0));
                    const selected = row.selectedTrackedItemIds?.length ?? 0;
                    if (selected === 0) {
                        toast.error(`"${productName}": Please select serials before approving`, {
                            position: "top-right",
                            autoClose: 4000,
                        });
                        setIsLoading(false);
                        return;
                    }
                    if (selected !== requiredQty) {
                        toast.error(
                            `"${productName}": Selected ${selected} serial(s) but quantity is ${requiredQty}. Please select exactly ${requiredQty} serial(s).`,
                            { position: "top-right", autoClose: 4000 }
                        );
                        setIsLoading(false);
                        return;
                    }
                }
            }

            await queryClient.invalidateQueries({ queryKey: ["validateToken"] });

            const cleanedDetails: StockReturnDetailType[] = returnDetails.map((detail) => {
                const mode = detail.serialSelectionMode ?? "AUTO";
                const selectedIds = detail.selectedTrackedItemIds ?? [];
                const trackedPayload =
                    detail.trackingType && detail.trackingType !== "NONE"
                        ? JSON.stringify({ mode, selectedIds })
                        : null;
                return {
                    id: detail.id ?? 0,
                    productId: Number(detail.productId),
                    productVariantId: Number(detail.productVariantId),
                    unitId: detail.unitId ? Number(detail.unitId) : null,
                    unitQty: detail.unitQty != null ? Number(detail.unitQty) : 0,
                    baseQty: detail.baseQty != null ? Number(detail.baseQty) : 0,
                    quantity: detail.baseQty != null ? Number(detail.baseQty) : 0,
                    products: detail.products ?? null,
                    productvariants: detail.productvariants ?? null,
                    stocks: detail.stocks ?? 0,
                    trackedPayload,
                };
            });

            const returnData: StockReturnType = {
                id: id ? Number(id) : undefined,
                ref: "",
                branchId: Number(formData.branchId ?? 0),
                returnBy: Number(user?.id),
                branch: {
                    id: Number(formData.branchId ?? 0),
                    name: "Default Branch",
                    address: "Default Address",
                },
                returnDate: formData.returnDate,
                StatusType: formData.StatusType,
                note: formData.note,
                delReason: "",
                returnDetails: cleanedDetails,
            };

            await upsertReturn(returnData);

            const statusLabel = formData.StatusType === "APPROVED" ? "approved" : "saved as pending";
            toast.success(
                id
                    ? `Stock Return updated and ${statusLabel} successfully`
                    : `Stock Return ${statusLabel} successfully`,
                {
                    position: "top-right",
                    autoClose: 2000,
                }
            );

            reset({
                id: undefined,
                branchId: undefined,
                returnDate: undefined,
                StatusType: undefined,
                note: undefined,
                returnDetails: [],
            });

            setReturnDetails([]);
            navigate("/stockreturn");
        } catch (err: any) {
            toast.error(err.message || "Error adding/editing stock return", {
                position: "top-right",
                autoClose: 3000,
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="panel">
            <div className="mb-5">
                <h5 className="flex items-center text-lg font-semibold dark:text-white-light gap-2">
                    {id ? <FilePenLine /> : <Plus />}
                    {id ? "Update Stock Return" : "Add Stock Return"}
                </h5>
            </div>

            <div className="mb-5">
                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="mb-5">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-5">
                            <div>
                                <label>
                                    Branch <span className="text-danger text-md">*</span>
                                </label>
                                <select
                                    id="branch"
                                    className="form-input"
                                    disabled={!!id}
                                    {...register("branchId", {
                                        required: "Branch is required",
                                    })}
                                >
                                    <option value="">Select a branch</option>
                                    {branches.map((option) => (
                                        <option key={option.id} value={option.id}>
                                            {option.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.branchId && (
                                    <span className="error_validate">{errors.branchId.message}</span>
                                )}
                            </div>

                            <div style={wrapperStyle}>
                                <label htmlFor="date-picker">
                                    Select a Date: <span className="text-danger text-md">*</span>
                                </label>
                                <LocalizationProvider dateAdapter={AdapterDateFns}>
                                    <Controller
                                        name="returnDate"
                                        control={control}
                                        rules={{ required: "Return date is required" }}
                                        render={({ field }) => (
                                            <DatePicker
                                                value={field.value ? new Date(field.value as string) : null}
                                                onChange={(date) => field.onChange(date)}
                                                disablePast
                                                slotProps={{
                                                    textField: {
                                                        fullWidth: true,
                                                        error: !!errors.returnDate,
                                                    },
                                                }}
                                            />
                                        )}
                                    />
                                </LocalizationProvider>
                                {errors.returnDate && (
                                    <span className="error_validate">{errors.returnDate.message}</span>
                                )}
                            </div>
                        </div>

                        <div className="mb-5 relative">
                            <label>
                                Product <span className="text-danger text-md">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Scan/Search Product by Code Or Name"
                                    className="peer form-input bg-gray-100 placeholder:tracking-widest ltr:pl-9 ltr:pr-9 rtl:pl-9 rtl:pr-9 sm:bg-transparent ltr:sm:pr-4 rtl:sm:pl-4"
                                    value={searchTerm}
                                    onChange={handleInputChange}
                                    onFocus={handleFocus}
                                />
                                <button
                                    type="button"
                                    className="absolute inset-0 h-9 w-9 appearance-none peer-focus:text-primary ltr:right-auto rtl:left-auto"
                                >
                                    <svg
                                        className="mx-auto"
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <circle
                                            cx="11.5"
                                            cy="11.5"
                                            r="9.5"
                                            stroke="currentColor"
                                            strokeWidth="1.5"
                                            opacity="0.5"
                                        ></circle>
                                        <path
                                            d="M18.5 18.5L22 22"
                                            stroke="currentColor"
                                            strokeWidth="1.5"
                                            strokeLinecap="round"
                                        ></path>
                                    </svg>
                                </button>
                            </div>

                            {showSuggestions && productResults.length > 0 && (
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
                                    {productResults.map((variant) => (
                                        <li
                                            key={variant.id}
                                            style={{
                                                padding: "8px",
                                                cursor: "pointer",
                                                borderBottom: "1px solid #eee",
                                            }}
                                            onClick={() =>
                                                addOrUpdateReturnDetail({
                                                    id: 0,
                                                    productId: variant.products?.id || 0,
                                                    productVariantId: variant.id,
                                                    products: variant.products || null,
                                                    productvariants: variant,
                                                    quantity: 1,
                                                    stocks:
                                                        Number(
                                                            Array.isArray(variant.stocks)
                                                                ? (variant.stocks[0] as any)?.quantity ?? 0
                                                                : (variant.stocks as any)?.quantity ?? 0
                                                        ) || 0,
                                                    unitId: null,
                                                    unitQty: 1,
                                                    baseQty: 1,
                                                })
                                            }
                                        >
                                            {variant.products?.name} - {variant.barcode} ({variant.productType})
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div className="dataTable-container">
                            <table id="myTable1" className="whitespace-nowrap dataTable-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Product</th>
                                        <th>Unit</th>
                                        <th>Qty</th>
                                        <th>Base Qty</th>
                                        {statusValue === "PENDING" && <th>Qty On Hand</th>}
                                        <th></th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {returnDetails.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="text-center py-4">
                                                No products added
                                            </td>
                                        </tr>
                                    ) : (
                                        returnDetails.map((detail, index) => {
                                            const units = getVariantUnits(detail.productvariants);
                                            const selectedUnit = getSelectedUnit(detail);
                                            const stockInSelectedUnit = getDisplayStockInSelectedUnit(detail);

                                            return (
                                                <tr key={index}>
                                                    <td>{index + 1}</td>

                                                    <td>
                                                        <p>
                                                            {detail.products?.name} ({detail.productvariants?.productType})
                                                        </p>
                                                        <p className="text-center">
                                                            <span className="badge badge-outline-primary rounded-full">
                                                                {detail.productvariants?.barcode}
                                                            </span>
                                                        </p>
                                                    </td>

                                                    <td style={{ minWidth: "160px" }}>
                                                        <select
                                                            className="form-input"
                                                            value={detail.unitId ?? ""}
                                                            onChange={(e) =>
                                                                handleUnitChange(index, Number(e.target.value))
                                                            }
                                                        >
                                                            <option value="">Select unit</option>
                                                            {units.map((unit) => (
                                                                <option key={unit.unitId} value={unit.unitId}>
                                                                    {unit.unitName}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </td>

                                                    <td style={{ minWidth: "220px" }}>
                                                        <div className="inline-flex w-full">
                                                            <button
                                                                type="button"
                                                                onClick={() => decreaseUnitQty(index)}
                                                                className="flex items-center justify-center border border-r-0 border-danger bg-danger px-3 font-semibold text-white ltr:rounded-l-md rtl:rounded-r-md"
                                                            >
                                                                <svg
                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                    width="24px"
                                                                    height="24px"
                                                                    viewBox="0 0 24 24"
                                                                    fill="none"
                                                                    stroke="currentColor"
                                                                    strokeWidth="1.5"
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    className="h-5 w-5"
                                                                >
                                                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                                                </svg>
                                                            </button>

                                                            <input
                                                                type="text"
                                                                className="form-input rounded-none text-center"
                                                                value={detail.unitQty ?? ""}
                                                                onChange={(e) =>
                                                                    handleUnitQtyChange(index, e.target.value)
                                                                }
                                                                placeholder="Qty"
                                                            />

                                                            <button
                                                                type="button"
                                                                onClick={() => increaseUnitQty(index)}
                                                                className="flex items-center justify-center border border-l-0 border-warning bg-warning px-3 font-semibold text-white ltr:rounded-r-md rtl:rounded-l-md"
                                                            >
                                                                <svg
                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                    width="24px"
                                                                    height="24px"
                                                                    viewBox="0 0 24 24"
                                                                    fill="none"
                                                                    stroke="currentColor"
                                                                    strokeWidth="1.5"
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    className="h-5 w-5"
                                                                >
                                                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </td>

                                                    <td style={{ minWidth: "140px" }}>
                                                        <input
                                                            type="text"
                                                            className="form-input text-right bg-gray-100"
                                                            value={detail.baseQty ?? ""}
                                                            readOnly
                                                        />
                                                    </td>

                                                    {statusValue === "PENDING" && (
                                                        <td>
                                                            <div>{Number(detail.stocks ?? 0)}</div>
                                                            {selectedUnit && (
                                                                <small className="text-gray-500">
                                                                    {stockInSelectedUnit} {selectedUnit.unitName}
                                                                </small>
                                                            )}
                                                        </td>
                                                    )}

                                                    <td>
                                                        {detail.trackingType && detail.trackingType !== "NONE" && (() => {
                                                            const selectedCount = detail.selectedTrackedItemIds?.length ?? 0;
                                                            const maxQty = Math.round(Number(detail.baseQty ?? 0));
                                                            const isManual = detail.serialSelectionMode === "MANUAL";
                                                            if (selectedCount > 0) {
                                                                return (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setTrackedModalIndex(index)}
                                                                        className="btn btn-xs mb-1"
                                                                        style={{ backgroundColor: isManual ? "#f59e0b" : "#22c55e", color: "white" }}
                                                                    >
                                                                        {selectedCount}/{maxQty} Serial(s)
                                                                    </button>
                                                                );
                                                            } else if (isManual) {
                                                                return (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setTrackedModalIndex(index)}
                                                                        className="btn btn-xs mb-1 btn-outline-primary"
                                                                    >
                                                                        + Select Serial
                                                                    </button>
                                                                );
                                                            } else {
                                                                return (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setTrackedModalIndex(index)}
                                                                        className="btn btn-xs mb-1"
                                                                        style={{ backgroundColor: "#06b6d4", color: "white" }}
                                                                    >
                                                                        Auto Assign
                                                                    </button>
                                                                );
                                                            }
                                                        })()}
                                                        <button
                                                            type="button"
                                                            onClick={() => removeProductFromCart(index)}
                                                            className="hover:text-danger block"
                                                            title="Delete"
                                                        >
                                                            <Trash2 color="red" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-5 mt-5">
                            <div>
                                <label>
                                    Status <span className="text-danger text-md">*</span>
                                </label>
                                <select
                                    id="status"
                                    className="form-input"
                                    {...register("StatusType", {
                                        required: "Status is required"
                                    })}
                                >
                                    <option value="">Select a status...</option>
                                    <option value="PENDING">Pending</option>
                                    <option
                                        value="APPROVED"
                                        hidden={!(user?.roleType === "USER" && statusValue !== "PENDING")}
                                    >
                                        Approved
                                    </option>
                                    <option
                                        value="APPROVED"
                                        hidden={!(hasPermission("Stock-Return-Approve") && statusValue === "PENDING")}
                                    >
                                        Approved
                                    </option>
                                </select>
                                {errors.StatusType && (
                                    <span className="error_validate">{errors.StatusType.message}</span>
                                )}
                            </div>
                        </div>

                        <div className="mb-5">
                            <label>Note</label>
                            <textarea {...register("note")} className="form-input" rows={3}></textarea>
                        </div>
                    </div>

                    <div className="flex justify-end items-center mt-8">
                        <NavLink to="/stockreturn" type="button" className="btn btn-outline-warning">
                            <FontAwesomeIcon icon={faArrowLeft} className="mr-1" />
                            Go Back
                        </NavLink>

                        {statusValue === "PENDING" &&
                            (hasPermission("Stock-Return-Create") ||
                                hasPermission("Stock-Return-Edit")) && (
                                <button
                                    type="submit"
                                    className="btn btn-primary ltr:ml-4 rtl:mr-4"
                                    disabled={isLoading}
                                >
                                    <FontAwesomeIcon icon={faSave} className="mr-1" />
                                    {isLoading ? "Saving..." : "Save"}
                                </button>
                            )}
                    </div>
                </form>
            </div>

            {trackedModalIndex !== null && (() => {
                const detail = returnDetails[trackedModalIndex];
                return detail ? (
                    <TrackedItemsPickerModal
                        isOpen={true}
                        onClose={() => setTrackedModalIndex(null)}
                        variantId={detail.productVariantId}
                        branchId={Number(detail.branchId ?? watch("branchId") ?? 0)}
                        existingItemId={detail.id || null}
                        mode={detail.serialSelectionMode ?? "AUTO"}
                        selectedIds={detail.selectedTrackedItemIds ?? []}
                        onSave={(mode, ids, items) => {
                            setReturnDetails((prev) =>
                                prev.map((d, i) =>
                                    i === trackedModalIndex
                                        ? { ...d, serialSelectionMode: mode, selectedTrackedItemIds: ids, selectedTrackedItems: items }
                                        : d
                                )
                            );
                        }}
                    />
                ) : null;
            })()}
        </div>
    );
};

export default StockReturnForm;