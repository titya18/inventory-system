import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faSave } from "@fortawesome/free-solid-svg-icons";
import { NavLink, useNavigate, useParams } from "react-router-dom";
import {
    BranchType,
    ProductVariantType,
    StockReturnType,
    StockReturnDetailType,
    PurchaseType,
} from "@/data_types/types";
import { getAllBranches } from "@/api/branch";
import { getAllPurchases, getPurchaseByid } from "@/api/purchase";
import { upsertReturn, getStockReturnById, getReturnedQtyByPurchase } from "@/api/stockReturn";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { useAppContext } from "@/hooks/useAppContext";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { useQueryClient } from "@tanstack/react-query";
import { FilePenLine, Plus, Trash2, X } from "lucide-react";
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
    Units?: { id?: number; name?: string };
    unit?: { id?: number; name?: string };
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

    // Purchase order search
    const [poSearch, setPoSearch] = useState("");
    const [poResults, setPoResults] = useState<PurchaseType[]>([]);
    const [showPoSuggestions, setShowPoSuggestions] = useState(false);
    const [linkedPurchase, setLinkedPurchase] = useState<PurchaseType | null>(null);
    const poSearchRef = useRef<HTMLDivElement>(null);

    const [returnDetails, setReturnDetails] = useState<StockReturnDetailType[]>([]);
    const [statusValue, setStatusValue] = useState<string>("PENDING");
    const [trackedModalIndex, setTrackedModalIndex] = useState<number | null>(null);
    const prevBranchRef = useRef<number | string | undefined>(undefined);

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

    // Close PO dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (poSearchRef.current && !poSearchRef.current.contains(e.target as Node)) {
                setShowPoSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Clear PO + items when branch actually changes (new record only)
    useEffect(() => {
        if (prevBranchRef.current === undefined) {
            prevBranchRef.current = branchId;
            return;
        }
        if (prevBranchRef.current !== branchId) {
            prevBranchRef.current = branchId;
            if (!id) {
                setLinkedPurchase(null);
                setPoSearch("");
                setPoResults([]);
                setShowPoSuggestions(false);
                setReturnDetails([]);
                setValue("supplierId", undefined);
            }
        }
    }, [branchId, id, setValue]);

    // ── Unit helpers ────────────────────────────────────────────────────────
    const normalizeUnit = (raw: RawUnitRow): VariantUnitType | null => {
        const unitId = Number(raw.unitId ?? raw.id ?? raw.unit?.id ?? raw.Units?.id ?? 0);
        const unitName = raw.unitName ?? raw.name ?? raw.unit?.name ?? raw.Units?.name ?? "";
        const operationValue = Number(raw.operationValue ?? 1) || 1;
        const isBaseUnit = Boolean(raw.isBaseUnit ?? raw.isBase ?? false);
        if (!unitId || !unitName) return null;
        return { unitId, unitName, operationValue, operator: raw.operator ?? "*", isBaseUnit };
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
        const normalized = rawUnits.map(normalizeUnit).filter((u): u is VariantUnitType => u !== null);
        return normalized.filter((item, i, arr) => arr.findIndex((x) => x.unitId === item.unitId) === i);
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

    const calculateBaseQty = (unitQty: number | string | null | undefined, operationValue: number, operator: string = "*") => {
        const qty = Number(unitQty ?? 0);
        const opValue = Number(operationValue || 1);
        return operator === "/" ? (opValue === 0 ? 0 : qty / opValue) : qty * opValue;
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
        return { ...detail, baseQty, quantity: baseQty };
    };

    const getDisplayStockInSelectedUnit = (detail: StockReturnDetailType) => {
        const selectedUnit = getSelectedUnit(detail);
        const operationValue = Number(selectedUnit?.operationValue ?? 1) || 1;
        const operator = selectedUnit?.operator ?? "*";
        const stockBaseQty = Number(detail.stocks ?? 0);
        if (!operationValue) return 0;
        const result = operator === "/" ? stockBaseQty * operationValue : stockBaseQty / operationValue;
        return Number(result.toFixed(4));
    };

    // ── Data loading ─────────────────────────────────────────────────────────
    const fetchBranches = useCallback(async () => {
        try {
            const data = await getAllBranches();
            setBranches(data as BranchType[]);
        } catch {
            // ignore
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

            setValue("branchId", returnData.branchId);
            setValue("supplierId", returnData.supplierId ?? undefined);
            setValue("returnDate", returnData.returnDate ? new Date(returnData.returnDate).toISOString() : null);
            setValue("StatusType", returnData.StatusType);
            setValue("note", returnData.note);
            setStatusValue(returnData.StatusType);

            // Restore linked purchase if any
            if (returnData.purchase) {
                setLinkedPurchase({ id: returnData.purchase.id, ref: returnData.purchase.ref } as PurchaseType);
                setPoSearch(returnData.purchase.ref);
            }

            setReturnDetails(
                (returnData.returnDetails || []).map((detail) => {
                    let serialSelectionMode: "AUTO" | "MANUAL" = "AUTO";
                    let selectedTrackedItemIds: number[] = [];
                    if (detail.trackedPayload) {
                        try {
                            const parsed = JSON.parse(detail.trackedPayload);
                            serialSelectionMode = parsed.mode ?? "AUTO";
                            selectedTrackedItemIds = parsed.selectedIds ?? [];
                        } catch { /* ignore */ }
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
        } catch {
            toast.error("Failed to fetch purchase return");
        } finally {
            setIsLoading(false);
        }
    }, [id, setValue]);

    useEffect(() => {
        fetchBranches();
        fetchStockReturn();
    }, [fetchBranches, fetchStockReturn]);

    // ── Purchase Order search ────────────────────────────────────────────────
    const handlePoSearch = async (term: string) => {
        setPoSearch(term);
        if (!term.trim()) { setPoResults([]); setShowPoSuggestions(false); return; }
        const currentBranchId = branchId ? Number(branchId) : null;
        try {
            const result = await getAllPurchases(null, null, 1, term, 10, currentBranchId, true);
            setPoResults(result.data || []);
            setShowPoSuggestions(true);
        } catch {
            setPoResults([]);
        }
    };

    // Build unit options from purchase detail data (getPurchaseByid includes
    // productvariants.baseUnit + products.unitConversions but NOT unitOptions array)
    const buildUnitOptionsFromPODetail = (detail: any): VariantUnitType[] => {
        const pv = detail.productvariants as any;
        const baseUnitId = pv?.baseUnitId ?? null;
        const baseUnit = pv?.baseUnit ?? null;
        const conversions: any[] = detail.products?.unitConversions ?? [];

        const unitMap = new Map<number, VariantUnitType>();

        if (baseUnit?.id) {
            unitMap.set(baseUnit.id, {
                unitId: baseUnit.id,
                unitName: baseUnit.name,
                operationValue: 1,
                isBaseUnit: true,
                operator: "*",
            });
        }

        for (const conv of conversions) {
            if (baseUnitId === conv.toUnitId && conv.fromUnit?.id) {
                unitMap.set(conv.fromUnit.id, {
                    unitId: conv.fromUnit.id,
                    unitName: conv.fromUnit.name,
                    operationValue: Number(conv.multiplier ?? 1),
                    isBaseUnit: false,
                    operator: "*",
                });
            }
            if (baseUnitId === conv.fromUnitId && conv.toUnit?.id) {
                const multiplier = Number(conv.multiplier ?? 1);
                unitMap.set(conv.toUnit.id, {
                    unitId: conv.toUnit.id,
                    unitName: conv.toUnit.name,
                    operationValue: multiplier === 0 ? 1 : 1 / multiplier,
                    isBaseUnit: false,
                    operator: "*",
                });
            }
        }

        // Always include the saved unit from the PO detail if not already present
        const savedUnit = detail.unit as any;
        if (savedUnit?.id && !unitMap.has(savedUnit.id)) {
            unitMap.set(savedUnit.id, {
                unitId: savedUnit.id,
                unitName: savedUnit.name,
                operationValue: 1,
                isBaseUnit: false,
                operator: "*",
            });
        }

        return Array.from(unitMap.values());
    };

    const selectPurchaseOrder = async (po: PurchaseType) => {
        setLinkedPurchase(po);
        setPoSearch(po.ref);
        setShowPoSuggestions(false);
        setValue("supplierId", po.supplierId);

        // Fetch full PO details + already-returned quantities to compute remaining returnable qty
        if (!po.id) return;
        setIsLoading(true);
        try {
            const [full, alreadyReturned] = await Promise.all([
                getPurchaseByid(po.id),
                getReturnedQtyByPurchase(po.id),
            ]);

            const newDetails: StockReturnDetailType[] = (full.purchaseDetails || [])
            .map((detail: any) => {
                // Build unit options from PO detail structure (not from variant.unitOptions)
                const unitOptions = buildUnitOptionsFromPODetail(detail);

                // Match the unit that was used in the PO
                const poUnitId = detail.unitId ?? null;
                const matchedUnit = poUnitId ? unitOptions.find((u) => u.unitId === Number(poUnitId)) : null;
                const defaultUnit = matchedUnit ?? unitOptions.find((u) => u.isBaseUnit) ?? unitOptions[0] ?? null;

                // PO unit qty → compute base qty from original PO line
                const poUnitQty = Number(detail.unitQty ?? detail.quantity ?? 1) || 1;
                const poBaseQty = calculateBaseQty(poUnitQty, defaultUnit?.operationValue ?? 1, defaultUnit?.operator ?? "*");

                // Subtract already-approved returned base qty for this variant
                const returnedBaseQty = alreadyReturned[detail.productVariantId] ?? 0;
                const remainingBaseQty = Math.max(0, poBaseQty - returnedBaseQty);

                // Convert remaining base qty back to unit qty
                const opValue = defaultUnit?.operationValue ?? 1;
                const op = defaultUnit?.operator ?? "*";
                const remainingUnitQty = op === "/" ? remainingBaseQty * opValue : (opValue > 0 ? remainingBaseQty / opValue : remainingBaseQty);
                const unitQty = Number(remainingUnitQty.toFixed(4)) || 0;
                const baseQty = remainingBaseQty;

                const variant = detail.productvariants as ProductVariantWithUnits | null;

                return {
                    id: 0,
                    productId: detail.productId,
                    productVariantId: detail.productVariantId,
                    products: detail.products ?? null,
                    productvariants: variant ? { ...variant, unitOptions } : variant,
                    stocks: Number(detail.stocks ?? 0),
                    unitId: defaultUnit?.unitId ?? null,
                    unitQty,
                    baseQty,
                    quantity: baseQty,
                    trackingType: detail.trackingType ?? "NONE",
                    serialSelectionMode: (detail.trackingType && detail.trackingType !== "NONE" ? "MANUAL" : "AUTO") as "AUTO" | "MANUAL",
                    selectedTrackedItemIds: [],
                    selectedTrackedItems: [],
                    branchId: Number(branchId || 0),
                    maxBaseQty: remainingBaseQty,
                    _remainingBaseQty: remainingBaseQty,
                } as any;
            })
            // Remove items that have already been fully returned
            .filter((d: any) => d._remainingBaseQty > 0)
            .map((d: any) => { delete d._remainingBaseQty; return d; });

            setReturnDetails(newDetails);
        } catch {
            toast.error("Failed to load purchase order details");
        } finally {
            setIsLoading(false);
        }
    };

    const clearPurchaseOrder = () => {
        setLinkedPurchase(null);
        setPoSearch("");
        setValue("supplierId", undefined);
        setReturnDetails([]);
    };

    // ── Detail row edits ─────────────────────────────────────────────────────
    const handleUnitChange = (index: number, unitId: number) => {
        setReturnDetails((prev) =>
            prev.map((detail, i) => (i !== index ? detail : recalcDetailBaseQty({ ...detail, unitId })))
        );
    };

    const handleUnitQtyChange = (index: number, value: string) => {
        let cleaned = value.replace(/[^0-9.]/g, "");
        const parts = cleaned.split(".");
        if (parts.length > 2) cleaned = `${parts[0]}.${parts.slice(1).join("")}`;
        setReturnDetails((prev) =>
            prev.map((detail, i) => (i !== index ? detail : recalcDetailBaseQty({ ...detail, unitQty: cleaned })))
        );
    };

    const increaseUnitQty = (index: number) => {
        setReturnDetails((prev) =>
            prev.map((detail, i) => {
                if (i !== index) return detail;
                const next = recalcDetailBaseQty({ ...detail, unitQty: Number(detail.unitQty ?? 0) + 1 });
                // Cap at maxBaseQty (remaining returnable qty from PO)
                const maxBase = (detail as any).maxBaseQty;
                if (maxBase != null && Number(next.baseQty) > Number(maxBase)) return detail;
                return next;
            })
        );
    };

    const decreaseUnitQty = (index: number) => {
        setReturnDetails((prev) =>
            prev.map((detail, i) => {
                if (i !== index) return detail;
                const next = Math.max(1, Number(detail.unitQty ?? 1) - 1);
                return recalcDetailBaseQty({ ...detail, unitQty: next });
            })
        );
    };

    const removeItem = (index: number) => {
        setReturnDetails((prev) => prev.filter((_, i) => i !== index));
    };

    // ── Submit ───────────────────────────────────────────────────────────────
    const onSubmit: SubmitHandler<StockReturnType> = async (formData) => {
        setIsLoading(true);
        try {
            if (!linkedPurchase) {
                toast.error("Please link a Purchase Order");
                setIsLoading(false);
                return;
            }

            if (returnDetails.length === 0) {
                toast.error("Please keep at least one item to return");
                setIsLoading(false);
                return;
            }

            for (const row of returnDetails) {
                if (!row.unitId) {
                    toast.error(`Please select unit for ${row.products?.name || ""}`);
                    setIsLoading(false);
                    return;
                }
                if (!row.unitQty || Number(row.unitQty) <= 0) {
                    toast.error(`Please enter valid quantity for ${row.products?.name || ""}`);
                    setIsLoading(false);
                    return;
                }
                const maxBase = (row as any).maxBaseQty;
                if (maxBase != null && Number(row.baseQty) > Number(maxBase)) {
                    toast.error(`"${row.products?.name || ""}": return qty (${row.baseQty}) exceeds remaining returnable qty (${maxBase})`);
                    setIsLoading(false);
                    return;
                }
            }

            // Serial validation on APPROVED
            for (const row of returnDetails) {
                if (
                    formData.StatusType === "APPROVED" &&
                    row.trackingType && row.trackingType !== "NONE" &&
                    row.serialSelectionMode === "MANUAL"
                ) {
                    const productName = row.products?.name || `Product #${row.productVariantId}`;
                    const requiredQty = Math.round(Number(row.baseQty ?? 0));
                    const selected = row.selectedTrackedItemIds?.length ?? 0;
                    if (selected === 0) {
                        toast.error(`"${productName}": Please select serials before approving`, { position: "top-right", autoClose: 4000 });
                        setIsLoading(false);
                        return;
                    }
                    if (selected !== requiredQty) {
                        toast.error(`"${productName}": Selected ${selected} but quantity is ${requiredQty}`, { position: "top-right", autoClose: 4000 });
                        setIsLoading(false);
                        return;
                    }
                }
            }

            await queryClient.invalidateQueries({ queryKey: ["validateToken"] });

            const cleanedDetails: StockReturnDetailType[] = returnDetails.map((detail) => {
                const mode = detail.serialSelectionMode ?? "AUTO";
                const selectedIds = detail.selectedTrackedItemIds ?? [];
                const trackedPayload = detail.trackingType && detail.trackingType !== "NONE"
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
                supplierId: linkedPurchase.supplierId,
                purchaseId: linkedPurchase.id ?? null,
                returnBy: Number(user?.id),
                branch: null,
                returnDate: formData.returnDate,
                StatusType: formData.StatusType,
                note: formData.note,
                delReason: "",
                returnDetails: cleanedDetails,
            };

            await upsertReturn(returnData);

            const statusLabel = formData.StatusType === "APPROVED" ? "approved" : "saved as pending";
            toast.success(id ? `Purchase Return updated and ${statusLabel} successfully` : `Purchase Return ${statusLabel} successfully`, { position: "top-right", autoClose: 2000 });

            reset({ id: undefined, branchId: undefined, supplierId: undefined, returnDate: undefined, StatusType: undefined, note: undefined, returnDetails: [] });
            setReturnDetails([]);
            clearPurchaseOrder();
            navigate("/stockreturn");
        } catch (err: any) {
            toast.error(err.message || "Error saving purchase return", { position: "top-right", autoClose: 3000 });
        } finally {
            setIsLoading(false);
        }
    };

    const supplierName = linkedPurchase
        ? ((linkedPurchase as any).supplier?.name ?? linkedPurchase.suppliers?.name ?? "—")
        : "";

    return (
        <div className="panel">
            <div className="mb-5">
                <h5 className="flex items-center text-lg font-semibold dark:text-white-light gap-2">
                    {id ? <FilePenLine /> : <Plus />}
                    {id ? "Update Purchase Return" : "Add Purchase Return"}
                </h5>
            </div>

            <div className="mb-5">
                <form onSubmit={handleSubmit(onSubmit)}>

                    {/* ── Row 1: Branch + PO search ── */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-5">
                        <div>
                            <label>Branch <span className="text-danger text-md">*</span></label>
                            <select
                                className="form-select"
                                disabled={!!id}
                                {...register("branchId", { required: "Branch is required" })}
                            >
                                <option value="">Select a branch</option>
                                {branches.map((b) => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                            {errors.branchId && <span className="error_validate">{errors.branchId.message}</span>}
                        </div>

                        <div ref={poSearchRef} className="relative">
                            <label>Purchase Order <span className="text-danger text-md">*</span></label>
                            {linkedPurchase ? (
                                <div className="flex items-center gap-2">
                                    <div className="form-input flex-1 bg-gray-50 flex items-center gap-2">
                                        <span className="font-semibold text-primary">{linkedPurchase.ref}</span>
                                        {supplierName && <span className="text-gray-500 text-sm">— {supplierName}</span>}
                                    </div>
                                    {(!id || statusValue === "PENDING") && (
                                        <button type="button" onClick={clearPurchaseOrder} className="btn btn-sm btn-outline-danger" title="Unlink PO">
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder={branchId ? "Search by PO ref..." : "Select branch first"}
                                        value={poSearch}
                                        disabled={!branchId}
                                        onChange={(e) => handlePoSearch(e.target.value)}
                                        onFocus={() => poResults.length > 0 && setShowPoSuggestions(true)}
                                        autoComplete="off"
                                    />
                                    {showPoSuggestions && poResults.length > 0 && (
                                        <ul className="absolute z-20 w-full bg-white border border-gray-200 rounded shadow-lg max-h-56 overflow-y-auto mt-1">
                                            {poResults.map((po) => (
                                                <li
                                                    key={po.id}
                                                    className="px-3 py-2 cursor-pointer hover:bg-primary/10 border-b border-gray-100 last:border-0"
                                                    onClick={() => selectPurchaseOrder(po)}
                                                >
                                                    <span className="font-medium">{po.ref}</span>
                                                    {(po as any).supplier?.name && (
                                                        <span className="ml-2 text-gray-500 text-sm">— {(po as any).supplier.name}</span>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                    {showPoSuggestions && poSearch.trim() && poResults.length === 0 && (
                                        <div className="absolute z-20 w-full bg-white border border-gray-200 rounded shadow-lg mt-1 px-3 py-2 text-gray-400 text-sm">
                                            No received purchase orders found
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* ── Row 2: Date + Supplier (read-only) ── */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-5">
                        <div style={wrapperStyle}>
                            <label>Return Date <span className="text-danger text-md">*</span></label>
                            <LocalizationProvider dateAdapter={AdapterDateFns}>
                                <Controller
                                    name="returnDate"
                                    control={control}
                                    rules={{ required: "Return date is required" }}
                                    render={({ field }) => (
                                        <DatePicker
                                            value={field.value ? new Date(field.value as string) : null}
                                            onChange={(date) => field.onChange(date)}
                                            slotProps={{ textField: { fullWidth: true, error: !!errors.returnDate } }}
                                        />
                                    )}
                                />
                            </LocalizationProvider>
                            {errors.returnDate && <span className="error_validate">{errors.returnDate.message}</span>}
                        </div>

                        <div>
                            <label>Supplier</label>
                            <input
                                type="text"
                                className="form-input bg-gray-50 text-gray-600"
                                value={supplierName}
                                readOnly
                                placeholder="Auto-filled from PO"
                            />
                        </div>
                    </div>

                    {/* ── Items table ── */}
                    {!linkedPurchase && (
                        <div className="mb-5 flex items-center gap-3 p-4 rounded-lg bg-blue-50 border border-blue-200 text-blue-700">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                            </svg>
                            <span>Select a Purchase Order above to load items for return.</span>
                        </div>
                    )}

                    {linkedPurchase && (
                        <div className="dataTable-container mb-5">
                            <table className="whitespace-nowrap dataTable-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Product</th>
                                        <th>Unit</th>
                                        <th>Return Qty</th>
                                        <th>Base Qty</th>
                                        {statusValue === "PENDING" && <th>Stock On Hand</th>}
                                        <th>Serial</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {returnDetails.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="text-center py-4 text-gray-400">
                                                All items removed — add items or select a different PO
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
                                                        <p className="font-medium">
                                                            {detail.products?.name}
                                                            <span className="ml-1 text-xs text-gray-400">({detail.productvariants?.productType})</span>
                                                        </p>
                                                        <span className="badge badge-outline-primary rounded-full text-xs">
                                                            {detail.productvariants?.barcode}
                                                        </span>
                                                    </td>

                                                    <td style={{ minWidth: "160px" }}>
                                                        <select
                                                            className="form-select"
                                                            value={detail.unitId ?? ""}
                                                            onChange={(e) => handleUnitChange(index, Number(e.target.value))}
                                                        >
                                                            <option value="">Select unit</option>
                                                            {units.map((unit) => (
                                                                <option key={unit.unitId} value={unit.unitId}>{unit.unitName}</option>
                                                            ))}
                                                        </select>
                                                    </td>

                                                    <td style={{ minWidth: "180px" }}>
                                                        <div className="flex items-center gap-0" style={{ minWidth: 120 }}>
                                                            <button type="button" onClick={() => decreaseUnitQty(index)}
                                                                className="h-9 w-9 shrink-0 flex items-center justify-center border border-r-0 border-danger bg-danger text-white rounded-l-md">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                                            </button>
                                                            <input
                                                                type="text"
                                                                className="form-input rounded-none text-center w-14 min-w-0"
                                                                value={detail.unitQty ?? ""}
                                                                onChange={(e) => handleUnitQtyChange(index, e.target.value)}
                                                            />
                                                            <button type="button" onClick={() => increaseUnitQty(index)}
                                                                className="h-9 w-9 shrink-0 flex items-center justify-center border border-l-0 border-warning bg-warning text-white rounded-r-md">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                                            </button>
                                                        </div>
                                                        {(detail as any).maxBaseQty != null && (
                                                            <small className="text-gray-400 text-xs">
                                                                max {(detail as any).maxBaseQty} {selectedUnit?.unitName ?? ""}
                                                            </small>
                                                        )}
                                                    </td>

                                                    <td style={{ minWidth: "120px" }}>
                                                        <input type="text" className="form-input text-right bg-gray-100" value={detail.baseQty ?? ""} readOnly />
                                                    </td>

                                                    {statusValue === "PENDING" && (
                                                        <td>
                                                            <div>{Number(detail.stocks ?? 0)}</div>
                                                            {selectedUnit && (
                                                                <small className="text-gray-500">{stockInSelectedUnit} {selectedUnit.unitName}</small>
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
                                                                    <button type="button" onClick={() => setTrackedModalIndex(index)}
                                                                        className="btn btn-xs mb-1"
                                                                        style={{ backgroundColor: isManual ? "#f59e0b" : "#22c55e", color: "white" }}>
                                                                        {selectedCount}/{maxQty} Serial(s)
                                                                    </button>
                                                                );
                                                            } else if (isManual) {
                                                                return (
                                                                    <button type="button" onClick={() => setTrackedModalIndex(index)}
                                                                        className="btn btn-xs mb-1 btn-outline-primary">
                                                                        + Select Serial
                                                                    </button>
                                                                );
                                                            } else {
                                                                return (
                                                                    <button type="button" onClick={() => setTrackedModalIndex(index)}
                                                                        className="btn btn-xs mb-1"
                                                                        style={{ backgroundColor: "#06b6d4", color: "white" }}>
                                                                        Auto Assign
                                                                    </button>
                                                                );
                                                            }
                                                        })()}
                                                    </td>

                                                    <td>
                                                        <button type="button" onClick={() => removeItem(index)} className="hover:text-danger" title="Remove from return">
                                                            <Trash2 color="red" size={18} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* ── Status + Note ── */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-5 mt-5">
                        <div>
                            <label>Status <span className="text-danger text-md">*</span></label>
                            <select className="form-select" {...register("StatusType", { required: "Status is required" })}>
                                <option value="">Select a status...</option>
                                <option value="PENDING">Pending</option>
                                {(hasPermission("Stock-Return-Approve") || statusValue === "APPROVED") && (
                                    <option value="APPROVED">Approved</option>
                                )}
                            </select>
                            {errors.StatusType && <span className="error_validate">{errors.StatusType.message}</span>}
                        </div>
                    </div>

                    <div className="mb-5">
                        <label>Note</label>
                        <textarea {...register("note")} className="form-input" rows={3}></textarea>
                    </div>

                    {/* ── Actions ── */}
                    <div className="flex justify-end items-center mt-8 gap-4">
                        <NavLink to="/stockreturn" className="btn btn-outline-warning">
                            <FontAwesomeIcon icon={faArrowLeft} className="mr-1" />
                            Go Back
                        </NavLink>

                        {statusValue === "PENDING" && (hasPermission("Stock-Return-Create") || hasPermission("Stock-Return-Edit")) && (
                            <button type="submit" className="btn btn-primary" disabled={isLoading}>
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
                        branchId={Number(detail.branchId ?? branchId ?? 0)}
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
