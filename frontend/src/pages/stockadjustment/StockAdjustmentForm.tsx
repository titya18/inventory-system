import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faSave } from "@fortawesome/free-solid-svg-icons";
import { NavLink, useNavigate, useParams } from "react-router-dom";
import {
    BranchType,
    ProductVariantType,
    StockAdjustmentType,
    StockAdjustmentDetailType,
} from "@/data_types/types";
import { getAllBranches } from "@/api/branch";
import { searchProduct } from "@/api/searchProduct";
import { upsertAdjustment, getStockAdjustmentById } from "@/api/stockAdjustment";
import StockAdjustmentTrackedModal from "@/components/StockAdjustmentTrackedModal";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { useAppContext } from "@/hooks/useAppContext";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { useQueryClient } from "@tanstack/react-query";
import { FilePenLine, Plus, Trash2 } from "lucide-react";
import ShowWarningMessage from "../components/ShowWarningMessage";

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
    suggestedPurchaseCost?: number;
};

type ProductVariantWithUnits = ProductVariantType & {
    unitOptions?: {
        unitId: number;
        unitName: string;
        operationValue: number;
        isBaseUnit?: boolean;
        operator?: string;
        suggestedPurchaseCost?: number;
    }[];
    units?: RawUnitRow[];
    productUnitRelations?: RawUnitRow[];
    products?: any;
};

const StockAdjustmentForm: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user, hasPermission } = useAppContext();

    const [isLoading, setIsLoading] = useState(false);
    const [branches, setBranches] = useState<BranchType[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [productResults, setProductResults] = useState<ProductVariantWithUnits[]>([]);
    const [adjustmentDetails, setAdjustmentDetails] = useState<StockAdjustmentDetailType[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [statusValue, setStatusValue] = useState<string>("PENDING");
    const [branchInitialized, setBranchInitialized] = useState(false);
    const [trackedModalIndex, setTrackedModalIndex] = useState<number | null>(null);

    const {
        control,
        register,
        handleSubmit,
        setValue,
        watch,
        reset,
        formState: { errors },
    } = useForm<StockAdjustmentType>();

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
                suggestedPurchaseCost: Number(u.suggestedPurchaseCost ?? 0),
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
            suggestedPurchaseCost: Number(defaultUnit?.suggestedPurchaseCost ?? 0),
        };
    };

    const getSuggestedCostForUnit = (
        variant: ProductVariantType | null | undefined,
        unitId: number
    ): number => {
        const units = getVariantUnits(variant);
        const unit = units.find((u) => u.unitId === unitId);
        return Number(unit?.suggestedPurchaseCost ?? 0);
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

    const getSelectedUnit = (detail: StockAdjustmentDetailType): VariantUnitType | null => {
        const units = getVariantUnits(detail.productvariants);
        return units.find((u) => Number(u.unitId) === Number(detail.unitId ?? 0)) || null;
    };

    const recalcDetailBaseQty = (detail: StockAdjustmentDetailType): StockAdjustmentDetailType => {
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

    const getDisplayStockInSelectedUnit = (detail: StockAdjustmentDetailType) => {
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

    const fetchStockAdjustment = useCallback(async () => {
        if (!id) return;

        setIsLoading(true);
        try {
            const adjustmentData: StockAdjustmentType = await getStockAdjustmentById(parseInt(id, 10));
            await fetchBranches();

            setValue("branchId", adjustmentData.branchId);
            setValue("AdjustMentType", adjustmentData.AdjustMentType);
            setValue(
                "adjustDate",
                adjustmentData.adjustDate
                    ? new Date(adjustmentData.adjustDate).toISOString()
                    : null
            );
            setValue("StatusType", adjustmentData.StatusType);
            setValue("note", adjustmentData.note);

            setAdjustmentDetails(
                (adjustmentData.adjustmentDetails || []).map((detail: any) => {
                    let tracked: any = {};
                    if (detail.trackedPayload) {
                        try {
                            const payload = JSON.parse(detail.trackedPayload);
                            if (payload.type === "NEW") {
                                tracked = { adjustmentTrackedMode: "NEW", newSerials: payload.newSerials ?? [] };
                            } else if (payload.type === "REACTIVATE") {
                                tracked = { adjustmentTrackedMode: "REACTIVATE", reactivateIds: payload.reactivateIds ?? [] };
                            } else if (payload.type === "SELECT") {
                                tracked = { selectedToRemoveIds: payload.selectedIds ?? [] };
                            }
                        } catch (_e) { /* ignore parse error */ }
                    }
                    return {
                        ...detail,
                        unitId: detail.unitId ?? null,
                        unitQty: detail.unitQty ?? 1,
                        baseQty: detail.baseQty ?? detail.quantity ?? 1,
                        quantity: detail.quantity ?? Number(detail.baseQty ?? 1),
                        cost: detail.cost ?? "",
                        costPerBaseUnit: detail.costPerBaseUnit ?? 0,
                        trackingType: detail.productvariants?.trackingType ?? "NONE",
                        ...tracked,
                    };
                })
            );

            setStatusValue(adjustmentData.StatusType);
        } catch (error) {
            console.error("Error fetching adjustment:", error);
            toast.error("Failed to fetch stock adjustment");
        } finally {
            setIsLoading(false);
        }
    }, [id, setValue, fetchBranches]);

    useEffect(() => {
        fetchBranches();
        fetchStockAdjustment();
    }, [fetchBranches, fetchStockAdjustment]);

    useEffect(() => {
        if (!branchInitialized) {
            setBranchInitialized(true);
            return;
        }

        if (!id) {
            setAdjustmentDetails([]);
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

        const existingIndex = adjustmentDetails.findIndex(
            (item) => item.productVariantId === variant.id
        );

        if (existingIndex !== -1) {
            toast.warning("Product already added");
            return;
        }

        const defaultUnit = getDefaultUnitData(variant);
        const isPositive = watch("AdjustMentType") === "POSITIVE";
        const autoCost = isPositive && defaultUnit.suggestedPurchaseCost > 0
            ? String(defaultUnit.suggestedPurchaseCost)
            : "";

        const newDetail: StockAdjustmentDetailType = {
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
            cost: autoCost,
            costPerBaseUnit: 0,
            trackingType: (variant as any).trackingType ?? "NONE",
            serialSelectionMode: "AUTO",
            selectedTrackedItemIds: [],
            selectedTrackedItems: [],
            branchId: Number(watch("branchId") || 0),
        };

        setAdjustmentDetails((prev) => [...prev, newDetail]);
    };

    const addOrUpdateAdjustmentDetail = async (detail: StockAdjustmentDetailType) => {
        const exists = adjustmentDetails.find(
            (item) => item.productVariantId === detail.productVariantId
        );

        if (exists) {
            await ShowWarningMessage("Product already in cart");
            return;
        }

        const variant = detail.productvariants;
        const defaultUnit = getDefaultUnitData(variant);
        const isPositive = watch("AdjustMentType") === "POSITIVE";
        const autoCost = isPositive && defaultUnit.suggestedPurchaseCost > 0
            ? String(defaultUnit.suggestedPurchaseCost)
            : "";

        const newDetail: StockAdjustmentDetailType = {
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
            cost: autoCost,
            costPerBaseUnit: 0,
            trackingType: (detail.productvariants as any)?.trackingType ?? "NONE",
            serialSelectionMode: "AUTO",
            selectedTrackedItemIds: [],
            selectedTrackedItems: [],
            branchId: Number(watch("branchId") || 0),
        };

        setAdjustmentDetails((prev) => [...prev, newDetail]);
        setSearchTerm("");
        setShowSuggestions(false);
    };

    const handleUnitChange = (index: number, unitId: number) => {
        const isPositiveAdj = watch("AdjustMentType") === "POSITIVE";
        setAdjustmentDetails((prev) =>
            prev.map((detail, i) => {
                if (i !== index) return detail;

                const updated: StockAdjustmentDetailType = { ...detail, unitId };

                // Auto-update cost for USER role or when cost hasn't been manually set
                if (isPositiveAdj && user?.roleType === "USER") {
                    const suggested = getSuggestedCostForUnit(detail.productvariants, unitId);
                    if (suggested > 0) updated.cost = String(suggested);
                }

                return recalcDetailBaseQty(updated);
            })
        );
    };

    const handleCostChange = (index: number, value: string) => {
        let cleaned = value.replace(/[^0-9.]/g, "");
        const parts = cleaned.split(".");

        if (parts.length > 2) {
            cleaned = `${parts[0]}.${parts.slice(1).join("")}`;
        }

        setAdjustmentDetails((prev) =>
            prev.map((detail, i) =>
                i === index
                    ? {
                        ...detail,
                        cost: cleaned,
                    }
                    : detail
            )
        );
    };

    const handleUnitQtyChange = (index: number, value: string) => {
        let cleaned = value.replace(/[^0-9.]/g, "");
        const parts = cleaned.split(".");

        if (parts.length > 2) {
            cleaned = `${parts[0]}.${parts.slice(1).join("")}`;
        }

        setAdjustmentDetails((prev) =>
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
        setAdjustmentDetails((prev) =>
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
        setAdjustmentDetails((prev) =>
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
        setAdjustmentDetails((prev) => prev.filter((_, i) => i !== index));
    };

    const onSubmit: SubmitHandler<StockAdjustmentType> = async (formData) => {
        setIsLoading(true);

        try {
            if (adjustmentDetails.length === 0) {
                toast.error("Please add at least one product");
                setIsLoading(false);
                return;
            }

            for (const row of adjustmentDetails) {
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

                if (formData.AdjustMentType === "POSITIVE" && (!row.cost || Number(row.cost) <= 0)) {
                    const msg = user?.roleType === "USER"
                        ? `No purchase cost found for "${row.products?.name || ""}". Please contact your manager.`
                        : `Please enter valid cost for product ${row.products?.name || ""}`;
                    toast.error(msg);
                    setIsLoading(false);
                    return;
                }

                if (
                    formData.AdjustMentType === "NEGATIVE" &&
                    formData.StatusType === "APPROVED" &&
                    Number(row.baseQty) > Number(row.stocks ?? 0)
                ) {
                    toast.error(`Insufficient stock for ${row.products?.name || ""}`);
                    setIsLoading(false);
                    return;
                }

                // Serial tracking validation — only enforced on APPROVED
                if (
                    formData.StatusType === "APPROVED" &&
                    row.trackingType &&
                    row.trackingType !== "NONE"
                ) {
                    const productName = row.products?.name || "unknown product";
                    const requiredQty = Math.round(Number(row.baseQty ?? 0));

                    if (formData.AdjustMentType === "POSITIVE") {
                        if (row.adjustmentTrackedMode === "REACTIVATE") {
                            const selected = row.reactivateIds?.length ?? 0;
                            if (selected === 0) {
                                toast.error(`"${productName}": Please select serials to reactivate before approving.`);
                                setIsLoading(false);
                                return;
                            }
                            if (selected !== requiredQty) {
                                toast.error(`"${productName}": Selected ${selected} serial(s) but quantity is ${requiredQty}. They must match.`);
                                setIsLoading(false);
                                return;
                            }
                        } else {
                            const entered = (row.newSerials ?? []).filter(s => s.serialNumber?.trim()).length;
                            if (entered === 0) {
                                toast.error(`"${productName}": Please enter serial numbers before approving.`);
                                setIsLoading(false);
                                return;
                            }
                            if (entered !== requiredQty) {
                                toast.error(`"${productName}": Entered ${entered} serial(s) but quantity is ${requiredQty}. They must match.`);
                                setIsLoading(false);
                                return;
                            }
                        }
                    } else {
                        const selected = row.selectedToRemoveIds?.length ?? 0;
                        if (selected === 0) {
                            toast.error(`"${productName}": Please select serials to remove before approving.`);
                            setIsLoading(false);
                            return;
                        }
                        if (selected !== requiredQty) {
                            toast.error(`"${productName}": Selected ${selected} serial(s) but quantity is ${requiredQty}. They must match.`);
                            setIsLoading(false);
                            return;
                        }
                    }
                }
            }

            await queryClient.invalidateQueries({ queryKey: ["validateToken"] });

            const cleanedDetails = adjustmentDetails.map((detail) => ({
                id: detail.id ?? 0,
                productId: Number(detail.productId),
                productVariantId: Number(detail.productVariantId),
                unitId: detail.unitId ? Number(detail.unitId) : null,
                unitQty: detail.unitQty != null ? Number(detail.unitQty) : 0,
                baseQty: detail.baseQty != null ? Number(detail.baseQty) : 0,
                quantity: detail.baseQty != null ? Number(detail.baseQty) : 0,
                cost: detail.cost != null && detail.cost !== "" ? Number(detail.cost) : 0,
                costPerBaseUnit: detail.costPerBaseUnit != null ? Number(detail.costPerBaseUnit) : 0,
                products: detail.products ?? null,
                productvariants: detail.productvariants ?? null,
                stocks: detail.stocks ?? 0,
                trackedItemData: (() => {
                    if (!detail.trackingType || detail.trackingType === "NONE") return undefined;
                    if (formData.AdjustMentType === "POSITIVE") {
                        if (detail.adjustmentTrackedMode === "REACTIVATE") {
                            return { type: "REACTIVATE" as const, reactivateIds: detail.reactivateIds ?? [] };
                        }
                        return {
                            type: "NEW" as const,
                            newSerials: (detail.newSerials ?? []).filter((s) => s.serialNumber?.trim()),
                        };
                    }
                    return { type: "SELECT" as const, selectedIds: detail.selectedToRemoveIds ?? [] };
                })(),
            }));

            const effectiveBranchId = Number(formData.branchId ?? 0);

            const adjustmentData: StockAdjustmentType = {
                id: id ? Number(id) : undefined,
                ref: "",
                branchId: effectiveBranchId,
                branch: {
                    id: effectiveBranchId,
                    name: "Default Branch",
                    address: "Default Address",
                },
                adjustDate: formData.adjustDate,
                AdjustMentType: formData.AdjustMentType,
                StatusType: formData.StatusType,
                note: formData.note,
                delReason: "",
                adjustmentDetails: cleanedDetails,
            };

            await upsertAdjustment(adjustmentData);

            toast.success(
                id ? "Adjustment updated successfully" : "Adjustment created successfully",
                {
                    position: "top-right",
                    autoClose: 2000,
                }
            );

            reset({
                id: undefined,
                branchId: undefined,
                adjustDate: undefined,
                AdjustMentType: undefined,
                StatusType: undefined,
                note: undefined,
                adjustmentDetails: [],
            });

            setAdjustmentDetails([]);
            navigate("/adjuststock");
        } catch (err: any) {
            toast.error(err.message || "Error adding/editing adjustment", {
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
                    {id ? "Update Stock Adjustment" : "Add Stock Adjustment"}
                </h5>
            </div>

            <div className="mb-5">
                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="mb-5">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-5">
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

                            <div>
                                <label>
                                    Adjustment Type <span className="text-danger text-md">*</span>
                                </label>
                                <select
                                    id="AdjustMentType"
                                    className="form-input"
                                    {...register("AdjustMentType", {
                                        required: "Adjustment type is required",
                                    })}
                                >
                                    <option value="">Select an adjustment type...</option>
                                    <option value="POSITIVE">Positive</option>
                                    <option value="NEGATIVE">Negative</option>
                                </select>
                                {errors.AdjustMentType && (
                                    <span className="error_validate">{errors.AdjustMentType.message}</span>
                                )}
                            </div>

                            <div style={wrapperStyle}>
                                <label htmlFor="date-picker">
                                    Select a Date: <span className="text-danger text-md">*</span>
                                </label>
                                <LocalizationProvider dateAdapter={AdapterDateFns}>
                                    <Controller
                                        name="adjustDate"
                                        control={control}
                                        rules={{ required: "Adjustment date is required" }}
                                        render={({ field }) => (
                                            <DatePicker
                                                value={field.value ? new Date(field.value as string) : null}
                                                onChange={(date) => field.onChange(date)}
                                                disablePast
                                                slotProps={{
                                                    textField: {
                                                        fullWidth: true,
                                                        error: !!errors.adjustDate,
                                                    },
                                                }}
                                            />
                                        )}
                                    />
                                </LocalizationProvider>
                                {errors.adjustDate && (
                                    <span className="error_validate">{errors.adjustDate.message}</span>
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
                                                addOrUpdateAdjustmentDetail({
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
                            {watch("AdjustMentType") === "POSITIVE" && (
                                <div className="mb-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                                    {user?.roleType === "USER"
                                        ? "Cost is automatically determined from the product's last purchase price."
                                        : "Cost is pre-filled from the product master price. You may override it per unit for FIFO accuracy."}
                                </div>
                            )}
                            <table id="myTable1" className="whitespace-nowrap dataTable-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Product</th>
                                        <th>Unit</th>
                                        <th>Qty</th>
                                        {watch("AdjustMentType") === "POSITIVE" && user?.roleType !== "USER" && <th>Cost</th>}
                                        <th>Base Qty</th>
                                        {statusValue === "PENDING" && <th>Qty On Hand</th>}
                                        <th></th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {adjustmentDetails.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="text-center py-4">
                                                No products added
                                            </td>
                                        </tr>
                                    ) : (
                                        adjustmentDetails.map((detail, index) => {
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

                                                    {watch("AdjustMentType") === "POSITIVE" && user?.roleType !== "USER" && (
                                                        <td style={{ minWidth: "160px" }}>
                                                            <input
                                                                type="text"
                                                                className="form-input text-right"
                                                                value={detail.cost ?? ""}
                                                                onChange={(e) => handleCostChange(index, e.target.value)}
                                                                placeholder={`Cost / ${selectedUnit?.unitName || "unit"}`}
                                                            />
                                                        </td>
                                                    )}

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
                                                            {/* {selectedUnit && (
                                                                <small className="text-gray-500">
                                                                    {stockInSelectedUnit} {selectedUnit.unitName}
                                                                </small>
                                                            )} */}
                                                        </td>
                                                    )}

                                                    <td>
                                                        {detail.trackingType && detail.trackingType !== "NONE" && (() => {
                                                            const adjType = watch("AdjustMentType");
                                                            const requiredQty = Math.round(Number(detail.baseQty ?? 0));
                                                            let count = 0;
                                                            if (adjType === "POSITIVE") {
                                                                if (detail.adjustmentTrackedMode === "REACTIVATE") {
                                                                    count = detail.reactivateIds?.length ?? 0;
                                                                } else {
                                                                    count = detail.newSerials?.filter(s => s.serialNumber?.trim()).length ?? 0;
                                                                }
                                                            } else {
                                                                count = detail.selectedToRemoveIds?.length ?? 0;
                                                            }
                                                            const isMatch = count === requiredQty && count > 0;
                                                            const isMismatch = count > 0 && count !== requiredQty;
                                                            return (
                                                                <div className="flex flex-col items-start gap-1">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setTrackedModalIndex(index)}
                                                                    className="mb-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                                                                    style={isMatch
                                                                        ? { background: "linear-gradient(135deg,#17c653,#10a944)", color: "#fff", boxShadow: "0 2px 8px rgba(23,198,83,.35)" }
                                                                        : isMismatch
                                                                        ? { background: "linear-gradient(135deg,#fff3cd,#ffeaa0)", color: "#856404", border: "1px solid #ffc107" }
                                                                        : { background: "linear-gradient(135deg,#e8f0ff,#dce8ff)", color: "#4361ee", border: "1px solid #b8caff" }
                                                                    }
                                                                >
                                                                    {isMatch ? (
                                                                        <>
                                                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                                                            {count} Serial{count > 1 ? "s" : ""}
                                                                        </>
                                                                    ) : isMismatch ? (
                                                                        <>
                                                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                                                                            {count}/{requiredQty} Serials
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                                                                            Select Serial
                                                                        </>
                                                                    )}
                                                                </button>
                                                                {isMismatch && (
                                                                    <span className="text-xs" style={{ color: "#856404" }}>
                                                                        Need {requiredQty - count} more
                                                                    </span>
                                                                )}
                                                                {count === 0 && statusValue === "PENDING" && (
                                                                    <span className="text-xs text-gray-400">Required on approve</span>
                                                                )}
                                                                </div>
                                                            );
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
                                        required: "Status is required",
                                        // onChange: (e) => setStatusValue(e.target.value),
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
                                        hidden={!(hasPermission("Adjust-Stock-Approve") && statusValue === "PENDING")}
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
                        <NavLink to="/adjuststock" type="button" className="btn btn-outline-warning">
                            <FontAwesomeIcon icon={faArrowLeft} className="mr-1" />
                            Go Back
                        </NavLink>

                        {statusValue === "PENDING" &&
                            (hasPermission("Adjust-Stock-Create") ||
                                hasPermission("Adjust-Stock-Edit")) && (
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
                const detail = adjustmentDetails[trackedModalIndex];
                const adjType = watch("AdjustMentType") as "POSITIVE" | "NEGATIVE";
                return detail && adjType ? (
                    <StockAdjustmentTrackedModal
                        isOpen={true}
                        onClose={() => setTrackedModalIndex(null)}
                        adjustmentType={adjType}
                        trackingType={(detail.trackingType as any) ?? "NONE"}
                        variantId={detail.productVariantId}
                        branchId={Number(detail.branchId ?? watch("branchId") ?? 0)}
                        expectedQty={Number(detail.baseQty ?? 0)}
                        adjustmentTrackedMode={detail.adjustmentTrackedMode}
                        newSerials={detail.newSerials}
                        reactivateIds={detail.reactivateIds}
                        selectedToRemoveIds={detail.selectedToRemoveIds}
                        onSave={(data) => {
                            setAdjustmentDetails((prev) =>
                                prev.map((d, i) =>
                                    i === trackedModalIndex
                                        ? {
                                            ...d,
                                            adjustmentTrackedMode: data.adjustmentTrackedMode,
                                            newSerials: data.newSerials,
                                            reactivateIds: data.reactivateIds,
                                            reactivateItems: data.reactivateItems,
                                            selectedToRemoveIds: data.selectedToRemoveIds,
                                            selectedToRemoveItems: data.selectedToRemoveItems,
                                        }
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

export default StockAdjustmentForm;