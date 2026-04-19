import React, { useCallback, useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faSave, faCirclePlus } from "@fortawesome/free-solid-svg-icons";
import { NavLink, useNavigate, useParams } from "react-router-dom";
import { BranchType, CustomerType, ProductVariantType, ProductType, ServiceType, QuotationType, QuotationDetailType } from "@/data_types/types";
import { getAllBranches } from "@/api/branch";
import { getAllCustomers } from "@/api/customer";
import { searchProduct } from "@/api/searchProduct";
import { searchService } from "@/api/searchService";
import { getNextQuotationRef } from "@/api/quotation";
import { upsertQuotation, getQuotationByid } from "@/api/quotation";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { useAppContext } from '@/hooks/useAppContext';
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import "./dateStyle.css";
import Modal from "./Modal";
import ShowWarningMessage from "../components/ShowWarningMessage";
import ShowConfirmationMessage from "../components/ShowConfirmationMessage";
import CustomerModal from "../customer/Modal";
import { upsertCustomerAction } from "@/utils/customerActions";
// import { useSuppliers } from "@/hooks/useSupplier";
import { useQueryClient } from "@tanstack/react-query";
import { FilePenLine, Pencil, Plus, Trash2 } from 'lucide-react';

type StoredQuotationTrackedSelection = {
    detailId?: number | null;
    ItemType?: "PRODUCT" | "SERVICE" | null;
    productVariantId?: number | null;
    serviceId?: number | null;
    unitId?: number | null;
    serialSelectionMode?: "AUTO" | "MANUAL" | null;
    selectedTrackedItemIds?: number[];
    selectedTrackedItems?: any[];
};

const getTrackedSelectionStorageKeys = (
    quotationId?: number | string | null,
    ref?: string | null
) => {
    const keys: string[] = [];

    if (quotationId) {
        keys.push(`quotation-tracked-selections:id:${quotationId}`);
    }

    if (ref) {
        keys.push(`quotation-tracked-selections:ref:${ref}`);
    }

    return keys;
};

const readTrackedSelectionsFromStorage = (
    quotationId?: number | string | null,
    ref?: string | null
): StoredQuotationTrackedSelection[] => {
    for (const key of getTrackedSelectionStorageKeys(quotationId, ref)) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) continue;

            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                return parsed;
            }
        } catch (error) {
            console.error("Error reading quotation tracked selections:", error);
        }
    }

    return [];
};

const writeTrackedSelectionsToStorage = (
    details: QuotationDetailType[],
    persistedDetails?: QuotationDetailType[] | null,
    quotationId?: number | string | null,
    ref?: string | null
) => {
    const payload: StoredQuotationTrackedSelection[] = details.map((detail, index) => {
        const persistedDetail = Array.isArray(persistedDetails) ? persistedDetails[index] : null;

        return {
            detailId: persistedDetail?.id ?? detail.id ?? null,
            ItemType: (persistedDetail?.ItemType ?? detail.ItemType ?? null) as "PRODUCT" | "SERVICE" | null,
            productVariantId: persistedDetail?.productVariantId ?? detail.productVariantId ?? null,
            serviceId: persistedDetail?.serviceId ?? detail.serviceId ?? null,
            unitId: persistedDetail?.unitId ?? detail.unitId ?? null,
            serialSelectionMode: detail.serialSelectionMode ?? persistedDetail?.serialSelectionMode ?? "AUTO",
            selectedTrackedItemIds: Array.isArray(detail.selectedTrackedItemIds)
                ? detail.selectedTrackedItemIds.map(Number)
                : [],
            selectedTrackedItems: Array.isArray(detail.selectedTrackedItems)
                ? detail.selectedTrackedItems
                : [],
        };
    });

    for (const key of getTrackedSelectionStorageKeys(quotationId, ref)) {
        try {
            localStorage.setItem(key, JSON.stringify(payload));
        } catch (error) {
            console.error("Error saving quotation tracked selections:", error);
        }
    }
};

const findStoredTrackedSelection = (
    savedSelections: StoredQuotationTrackedSelection[],
    detail: QuotationDetailType,
    index: number
) => {
    const detailId = Number(detail.id ?? 0);

    if (detailId > 0) {
        const exactById = savedSelections.find(
            (saved) => Number(saved.detailId ?? 0) === detailId
        );

        if (exactById) {
            return exactById;
        }
    }

    const signatureMatch = savedSelections.find((saved) => {
        if (String(saved.ItemType ?? "") !== String(detail.ItemType ?? "")) {
            return false;
        }

        if (detail.ItemType === "PRODUCT") {
            return (
                Number(saved.productVariantId ?? 0) === Number(detail.productVariantId ?? 0) &&
                Number(saved.unitId ?? 0) === Number(detail.unitId ?? 0)
            );
        }

        return Number(saved.serviceId ?? 0) === Number(detail.serviceId ?? 0);
    });

    if (signatureMatch) {
        return signatureMatch;
    }

    const fallback = savedSelections[index];
    if (!fallback) {
        return null;
    }

    if (String(fallback.ItemType ?? "") !== String(detail.ItemType ?? "")) {
        return null;
    }

    if (detail.ItemType === "PRODUCT") {
        const sameProduct =
            Number(fallback.productVariantId ?? 0) === Number(detail.productVariantId ?? 0);
        const sameUnit = Number(fallback.unitId ?? 0) === Number(detail.unitId ?? 0);
        return sameProduct && sameUnit ? fallback : null;
    }

    return Number(fallback.serviceId ?? 0) === Number(detail.serviceId ?? 0)
        ? fallback
        : null;
};

const QuotationForm: React.FC = () => {
    // Customer is a React component (Element); it doesn't return methods — provide a local handler for CustomerModal instead.
    const handleAddorEditCustomer = (payload: { data: CustomerType }) => {
        return upsertCustomerAction(
            payload,
            () => queryClient.invalidateQueries({ queryKey: ["validateToken"] }),
            fetchCustomers,
            () => setIsModalOpen(false)
        );
    };

    const { id } = useParams<{ id: string }>();
    const [isLoading, setIsLoading] = useState(false);
    const [braches, setBranches] = useState<BranchType[]>([]);
    const [customers, setCustomers] = useState<CustomerType[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [searchTermService, setSearchTermService] = useState("");
    const [productResults, setProductResults] = useState<ProductVariantType[]>([]);
    const [serviceResults, setServiceResults] = useState<ServiceType[]>([]);
    const [quotationDetails, setQuotationDetails] = useState<QuotationDetailType[]>([]);
    const [shipping, setShipping] = useState<number>(0);
    const [discount, setDiscount] = useState<number>(0);
    const [taxRate, setTaxRate] = useState<number>(0);
    const [grandTotal, setGrandTotal] = useState<number>(0);
    const [clickData, setClickData] = useState<QuotationDetailType | null>(null);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [showSuggestionsService, setShowSuggestionsService] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [statusValue, setStatusValue] = useState<string>("PENDING");
    const prevQuoteSaleType = useRef<"RETAIL" | "WHOLESALE">("RETAIL");

    const queryClient = useQueryClient();

    const { user, hasPermission } = useAppContext();

    const navigate = useNavigate(); // Initialize useNavigate

    // const navigate = useNavigate()

    const { control, register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<QuotationType> ();

    const persistDraftTrackedSelections = useCallback((details: QuotationDetailType[]) => {
        const activeRef = watch("ref") ?? null;

        writeTrackedSelectionsToStorage(
            details,
            null,
            id ? Number(id) : undefined,
            activeRef
        );
    }, [id, watch]);

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
        if (!id && user?.branchId && braches.length > 0) {
            setValue("branchId", user.branchId, { shouldValidate: false });
        }
    }, [braches, id, user?.branchId, setValue]);

    const fetchCustomers = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getAllCustomers();
            setCustomers(data as CustomerType[]);
        } catch (error) {
            console.error("Error fetching customer:", error);
        } finally {
            setIsLoading(false);
        }
    }, [id, setValue]);

    const fetchQuotation = useCallback(async () => {
        if (id) { // Only fetch when 'id' is available and not already fetching
            setIsLoading(true);
            try {
                if (id) {
                    const quotationData: QuotationType = await getQuotationByid(parseInt(id, 10));
                    const resolveBasePriceFromStoredUnit = (
                        storedPrice: number,
                        storedUnitId: number | null | undefined,
                        baseUnitId: number | null | undefined,
                        conversions: any[]
                    ) => {
                        const safePrice = Number(storedPrice ?? 0);
                        const safeStoredUnitId = Number(storedUnitId ?? 0);
                        const safeBaseUnitId = Number(baseUnitId ?? 0);

                        if (!safePrice || !safeBaseUnitId) return 0;

                        if (!safeStoredUnitId || safeStoredUnitId === safeBaseUnitId) {
                            return safePrice;
                        }

                        const directConv = conversions.find(
                            (c: any) =>
                            Number(c.fromUnitId) === safeStoredUnitId &&
                            Number(c.toUnitId) === safeBaseUnitId
                        );

                        if (directConv && Number(directConv.multiplier) > 0) {
                            return safePrice / Number(directConv.multiplier);
                        }

                        const reverseConv = conversions.find(
                            (c: any) =>
                            Number(c.fromUnitId) === safeBaseUnitId &&
                            Number(c.toUnitId) === safeStoredUnitId
                        );

                        if (reverseConv && Number(reverseConv.multiplier) > 0) {
                            return safePrice * Number(reverseConv.multiplier);
                        }

                        return safePrice;
                    };

                    console.log("[DEBUG] raw quotationDetails from API:", (quotationData.quotationDetails || []).map((d: any) => ({ id: d.id, ItemType: d.ItemType, serialSelectionMode: d.serialSelectionMode })));

                    const hydratedDetails = (quotationData.quotationDetails || []).map((detail: any) => {
                        const variant = detail.productvariants;
                        const product = detail.products;

                        if (detail.ItemType !== "PRODUCT" || !variant || !product) {
                            return {
                                ...detail,
                                serialSelectionMode: detail.serialSelectionMode ?? "AUTO",
                                selectedTrackedItemIds: Array.isArray(detail.selectedAssetItems)
                                    ? detail.selectedAssetItems.map((x: any) => Number(x.productAssetItemId))
                                    : Array.isArray(detail.selectedTrackedItemIds)
                                    ? detail.selectedTrackedItemIds.map(Number)
                                    : [],
                                selectedTrackedItems: Array.isArray(detail.selectedAssetItems)
                                    ? detail.selectedAssetItems.map((x: any) => ({
                                        id: x.productAssetItem?.id,
                                        branchId: x.productAssetItem?.branchId,
                                        serialNumber: x.productAssetItem?.serialNumber,
                                        assetCode: x.productAssetItem?.assetCode ?? null,
                                        macAddress: x.productAssetItem?.macAddress ?? null,
                                        status: x.productAssetItem?.status ?? null,
                                        soldOrderItemId: x.productAssetItem?.soldOrderItemId ?? null,
                                    }))
                                    : Array.isArray(detail.selectedTrackedItems)
                                    ? detail.selectedTrackedItems
                                    : [],
                            };
                        }

                        const conversions = product.unitConversions || [];

                        const retailBasePrice = resolveBasePriceFromStoredUnit(
                            Number(variant.retailPrice ?? 0),
                            Number(variant.retailPriceUnitId ?? variant.baseUnitId ?? 0),
                            Number(variant.baseUnitId ?? 0),
                            conversions
                        );

                        const wholesaleBasePrice = resolveBasePriceFromStoredUnit(
                            Number(variant.wholeSalePrice ?? 0),
                            Number(variant.wholeSalePriceUnitId ?? variant.baseUnitId ?? 0),
                            Number(variant.baseUnitId ?? 0),
                            conversions
                        );

                        const unitMap = new Map<number, any>();

                        if (variant.baseUnit) {
                            unitMap.set(variant.baseUnit.id, {
                                unitId: variant.baseUnit.id,
                                unitName: variant.baseUnit.name,
                                operationValue: 1,
                                isBaseUnit: true,
                                suggestedRetailPrice: retailBasePrice,
                                suggestedWholesalePrice: wholesaleBasePrice,
                            });
                        }

                        for (const conv of conversions) {
                            if (Number(variant.baseUnitId) === Number(conv.toUnitId) && conv.fromUnit) {
                                const multiplier = Number(conv.multiplier ?? 1);

                                unitMap.set(conv.fromUnit.id, {
                                    unitId: conv.fromUnit.id,
                                    unitName: conv.fromUnit.name,
                                    operationValue: multiplier,
                                    isBaseUnit: false,
                                    suggestedRetailPrice: retailBasePrice * multiplier,
                                    suggestedWholesalePrice: wholesaleBasePrice * multiplier,
                                });
                            }

                            if (Number(variant.baseUnitId) === Number(conv.fromUnitId) && conv.toUnit) {
                                const multiplier = Number(conv.multiplier ?? 1);
                                const opValue = multiplier > 0 ? 1 / multiplier : 1;

                                unitMap.set(conv.toUnit.id, {
                                    unitId: conv.toUnit.id,
                                    unitName: conv.toUnit.name,
                                    operationValue: opValue,
                                    isBaseUnit: false,
                                    suggestedRetailPrice: retailBasePrice * opValue,
                                    suggestedWholesalePrice: wholesaleBasePrice * opValue,
                                });
                            }
                        }

                        const normalizedUnitOptions = Array.from(unitMap.values());

                        return {
                            ...detail,
                            unitOptions: normalizedUnitOptions,
                            unitName:
                            detail.unitName ||
                            normalizedUnitOptions.find((u) => Number(u.unitId) === Number(detail.unitId))?.unitName ||
                            variant.baseUnit?.name ||
                            null,
                            productvariants: {
                                ...variant,
                                unitOptions: normalizedUnitOptions,
                            },

                            trackingType: detail.productvariants?.trackingType ?? "NONE",
                            serialSelectionMode: detail.serialSelectionMode ?? "AUTO",
                            selectedTrackedItemIds: Array.isArray(detail.selectedAssetItems)
                                ? detail.selectedAssetItems.map((x: any) => Number(x.productAssetItemId))
                                : Array.isArray(detail.selectedTrackedItemIds)
                                ? detail.selectedTrackedItemIds.map(Number)
                                : [],
                            selectedTrackedItems: Array.isArray(detail.selectedAssetItems)
                                ? detail.selectedAssetItems.map((x: any) => ({
                                    id: x.productAssetItem?.id,
                                    branchId: x.productAssetItem?.branchId,
                                    serialNumber: x.productAssetItem?.serialNumber,
                                    assetCode: x.productAssetItem?.assetCode ?? null,
                                    macAddress: x.productAssetItem?.macAddress ?? null,
                                    status: x.productAssetItem?.status ?? null,
                                    soldOrderItemId: x.productAssetItem?.soldOrderItemId ?? null,
                                }))
                                : Array.isArray(detail.selectedTrackedItems)
                                ? detail.selectedTrackedItems
                                : [],
                            branchId: quotationData.branchId ?? null,
                        };
                    });

                    console.log("[DEBUG] hydratedDetails serialSelectionMode:", hydratedDetails.map((d: any) => ({ id: d.id, serialSelectionMode: d.serialSelectionMode })));

                    const savedTrackedSelections = readTrackedSelectionsFromStorage(
                        Number(id),
                        quotationData.ref
                    );

                    console.log("[DEBUG] savedTrackedSelections from localStorage:", savedTrackedSelections.map((s) => ({ serialSelectionMode: s.serialSelectionMode })));

                    const mergedHydratedDetails = hydratedDetails.map((detail, index) => {
                        const saved = findStoredTrackedSelection(savedTrackedSelections, detail, index);
                        if (!saved) return detail;

                        const detailHasBackendTrackedSelection =
                            detail.serialSelectionMode === "MANUAL" ||
                            (Array.isArray(detail.selectedTrackedItemIds) && detail.selectedTrackedItemIds.length > 0) ||
                            (Array.isArray(detail.selectedTrackedItems) && detail.selectedTrackedItems.length > 0);

                        if (detailHasBackendTrackedSelection) {
                            return detail;
                        }

                        return {
                            ...detail,
                            // Prefer MANUAL from either source; "AUTO" in localStorage must not override DB's "MANUAL"
                            serialSelectionMode: (detail.serialSelectionMode === "MANUAL" || saved.serialSelectionMode === "MANUAL") ? "MANUAL" : "AUTO",
                            selectedTrackedItemIds: Array.isArray(saved.selectedTrackedItemIds)
                                ? saved.selectedTrackedItemIds.map(Number)
                                : detail.selectedTrackedItemIds ?? [],
                            selectedTrackedItems: Array.isArray(saved.selectedTrackedItems)
                                ? saved.selectedTrackedItems
                                : detail.selectedTrackedItems ?? [],
                        };
                    });

                    console.log("[DEBUG] mergedHydratedDetails serialSelectionMode:", mergedHydratedDetails.map((d: any) => ({ id: d.id, serialSelectionMode: d.serialSelectionMode })));

                    await fetchBranches();
                    // await fetchSuppliers();
                    setValue("QuoteSaleType", quotationData.QuoteSaleType);
                    setValue("ref", quotationData.ref);
                    setValue("branchId", quotationData.branchId);
                    setValue("customerId", quotationData.customerId);
                    setValue("quotationDate", quotationData.quotationDate
                        ? new Date(quotationData.quotationDate).toISOString()
                        : null
                    );
                    setValue("taxRate", quotationData.taxRate);
                    setValue("shipping", quotationData.shipping);
                    setValue("discount", quotationData.discount);
                    setGrandTotal(quotationData.grandTotal);
                    setValue("status", quotationData.status);
                    setValue("note", quotationData.note);
                 
                    setQuotationDetails(mergedHydratedDetails);
                    setStatusValue(quotationData.status);
                }
            } catch (error) {
                console.error("Error fetching quotation:", error);
            } finally {
                setIsLoading(false);
            }
        }
    }, [id, setValue]);

    useEffect(() => {
        fetchBranches();
        fetchCustomers();
        fetchQuotation();
    }, [fetchBranches, fetchQuotation]);

    const branchId = watch("branchId");
    const quoteSaleType = watch("QuoteSaleType") // RETAIL || WHOLESALE;

    useEffect(() => {
        // Don't regenerate when editing invoice
        if (id) return;

        const run = async () => {
            // Determine branch based on role
            const effectiveBranchId = branchId;

            // No branch → no ref
            if (!effectiveBranchId) {
                setValue("ref", "");
                return;
            }

            getNextQuotationRef(Number(effectiveBranchId))
                .then((data) => {
                    const refValue = (data && typeof data === "object" && "ref" in data)
                        ? (data as any).ref
                        : String(data || "");
                    setValue("ref", refValue);
                })
                .catch(() => {
                    toast.error("Failed to generate quotation number");
                });
                
            if (quotationDetails.length > 0) {
                const ok = await ShowConfirmationMessage(
                    "change_branch"
                );

                if (!ok) {
                    // revert UI
                    setValue("QuoteSaleType", prevQuoteSaleType.current, {
                        shouldDirty: false,
                    });
                    return;
                }
                setQuotationDetails([]);

                setValue("shipping", null, { shouldDirty: false });
                setValue("discount", null, { shouldDirty: false });
                setValue("taxRate", null, { shouldDirty: false });

                setGrandTotal(0);
                setShipping(0);
                setDiscount(0);
                setTaxRate(0);
            }
            setSearchTerm("");
        };
        run();
    }, [branchId, id, setValue]);

    // Watch the "shipping" field
    const shippingValue = String(watch("shipping") || "0"); // Force it to be a string
    const discountValue = String(watch("discount") || "0");
    const taxValue = String(watch("taxRate") || "0");
    useEffect(() => {
        if (!watch("QuoteSaleType")) {
            setValue("QuoteSaleType", "RETAIL");
        }

        const sanitizeNumber = (value: string | number) => {
            return parseFloat(String(value).replace(/^0+/, "")) || 0;
        };
    
        const parsedShipping = sanitizeNumber(shippingValue);
        const parsedDiscount = sanitizeNumber(discountValue);
        const parsedTax = sanitizeNumber(taxValue);
    
        setShipping(parsedShipping);
        setDiscount(parsedDiscount);
        setTaxRate(parsedTax);
    
        const totalSum = sumTotal(quotationDetails);
        const sanitizedTotalSum = sanitizeNumber(totalSum); // Sanitize totalSum here
        const totalAfterDis = sanitizedTotalSum - parsedDiscount;
        // console.log("grandTotal:", (totalAfterDis + ((parsedTax / 100) * totalAfterDis)) + parsedShipping);
        setGrandTotal((totalAfterDis + ((parsedTax / 100) * totalAfterDis)) + parsedShipping);
    }, [shippingValue, discountValue, taxValue, quotationDetails]);

    const handleQuoteSaleTypeChange = async (
        value: "RETAIL" | "WHOLESALE"
    ) => {
        if (prevQuoteSaleType.current === value) return;

        if (quotationDetails.length > 0) {
            const ok = await ShowConfirmationMessage(
                "change"
            );

            if (!ok) {
                // revert UI
                setValue("QuoteSaleType", prevQuoteSaleType.current, {
                    shouldDirty: false,
                });
                return;
            }
            setQuotationDetails([]);

            setValue("shipping", null, { shouldDirty: false });
            setValue("discount", null, { shouldDirty: false });
            setValue("taxRate", null, { shouldDirty: false });

            setGrandTotal(0);
            setShipping(0);
            setDiscount(0);
            setTaxRate(0);
        }

        prevQuoteSaleType.current = value;
        setValue("QuoteSaleType", value);
    };

    // Fetch products as the user types
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
                autoClose: 4000
            });
            return;
        };

        try {
            const response = await searchProduct(term, selectedBranchId); // Fetch products first
            // Check for exact match
            // Check for exact match in fresh response
            const matches = response.filter(
                (p: ProductVariantType) => p.barcode === term || p.sku === term
            );

            if (matches.length === 0) {
                // No match → show suggestions
                setProductResults(response);
                setShowSuggestions(true);
            } else if (matches.length === 1) {
                // Only 1 match → auto add
                addToCartDirectly(matches[0], "PRODUCT");
                setSearchTerm("");
            } else {
                // Multiple matches → show modal to select New / SecondHand
                setProductResults(matches);
                setShowSuggestions(true); // You can also use a modal instead of dropdown
            }

            // setSearchTerm(""); // Clear input after handling
        } catch (error) {
            console.error("Error fetching products:", error);
        }
    };

    // Fetch service as the user types
    const handleSearchService = async (term: string) => {
        if (term.trim() === "") {
            setServiceResults([]);
            setShowSuggestionsService(false);
            return;
        }

        try {
            const response = await searchService(term); // Fetch products first
            // Check for exact match
            // Check for exact match in fresh response
            const exactMatch = response.find(
                (s: ServiceType) => s.serviceCode === term || s.name === term
            );

            if (exactMatch) {
                // Add to purchaseDetails directly
                addToCartDirectly(exactMatch, "SERVICE");
                setSearchTermService(""); // Clear search
                setShowSuggestionsService(false); // Hide suggestions
            } else {
                
                setServiceResults(response);
                setShowSuggestionsService(true);
            }
        } catch (error) {
            console.error("Error fetching products:", error);
        }
    };

    const effectiveBranchId = watch("branchId");

    const getVariantUnitOptions = (variant: any) => {
        return Array.isArray(variant?.unitOptions) ? variant.unitOptions : [];
    };

    const getSelectedUnitOption = (variant: any, unitId?: number | null) => {
        const unitOptions = getVariantUnitOptions(variant);
        return unitOptions.find((u: any) => Number(u.unitId) === Number(unitId));
    };

    const findMatchingQuotationLineIndex = (
        details: QuotationDetailType[],
        newDetail: QuotationDetailType
    ) => {
        if (newDetail.ItemType === "SERVICE") {
            return details.findIndex(
                (item) =>
                    item.ItemType === "SERVICE" &&
                    Number(item.serviceId) === Number(newDetail.serviceId) &&
                    Number(item.cost ?? 0) === Number(newDetail.cost ?? 0) &&
                    Number(item.taxNet ?? 0) === Number(newDetail.taxNet ?? 0) &&
                    Number(item.discount ?? 0) === Number(newDetail.discount ?? 0) &&
                    String(item.taxMethod ?? "Include") === String(newDetail.taxMethod ?? "Include") &&
                    String(item.discountMethod ?? "Fixed") === String(newDetail.discountMethod ?? "Fixed")
            );
        }

        return details.findIndex((item) => {
            if (
                item.ItemType !== "PRODUCT" ||
                Number(item.productVariantId) !== Number(newDetail.productVariantId) ||
                Number(item.unitId ?? 0) !== Number(newDetail.unitId ?? 0) ||
                Number(item.cost ?? 0) !== Number(newDetail.cost ?? 0) ||
                Number(item.taxNet ?? 0) !== Number(newDetail.taxNet ?? 0) ||
                Number(item.discount ?? 0) !== Number(newDetail.discount ?? 0) ||
                String(item.taxMethod ?? "Include") !== String(newDetail.taxMethod ?? "Include") ||
                String(item.discountMethod ?? "Fixed") !== String(newDetail.discountMethod ?? "Fixed")
            ) {
                return false;
            }

            const itemSerials = Array.isArray(item.selectedTrackedItemIds)
                ? [...item.selectedTrackedItemIds].map(Number).sort((a, b) => a - b)
                : [];

            const newSerials = Array.isArray(newDetail.selectedTrackedItemIds)
                ? [...newDetail.selectedTrackedItemIds].map(Number).sort((a, b) => a - b)
                : [];

            return JSON.stringify(itemSerials) === JSON.stringify(newSerials);
        });
    };

    const buildQuotationDraftFromVariant = (
        variant: ProductVariantType,
        saleType: "RETAIL" | "WHOLESALE"
    ): QuotationDetailType => {
        const defaultUnitId =
            saleType === "RETAIL"
                ? ((variant as any).defaultRetailUnitId ?? variant.baseUnitId ?? null)
                : ((variant as any).defaultWholesaleUnitId ?? variant.baseUnitId ?? null);

        const selectedUnit = getSelectedUnitOption(variant, defaultUnitId);
        const operationValue = Number(selectedUnit?.operationValue ?? 1);

        const suggestedPrice =
            saleType === "RETAIL"
                ? Number(selectedUnit?.suggestedRetailPrice ?? 0)
                : Number(selectedUnit?.suggestedWholesalePrice ?? 0);

        return {
            id: Date.now() + Math.floor(Math.random() * 1000),
            quotationId: 0,
            productId: variant.products?.id || 0,
            productVariantId: variant.id,
            products: variant.products || null,
            productvariants: variant,
            services: null,
            serviceId: 0,
            ItemType: "PRODUCT",

            unitId: defaultUnitId,
            unitQty: 1,
            baseQty: operationValue,
            unitName: selectedUnit?.unitName ?? null,
            unitOptions: getVariantUnitOptions(variant),

            quantity: 1,

            cost: suggestedPrice,
            costPerBaseUnit: operationValue > 0 ? suggestedPrice / operationValue : 0,

            taxNet: 0,
            taxMethod: "Include",
            discount: 0,
            discountMethod: "Fixed",

            total: 0,
            stocks: Number(
                Array.isArray(variant.stocks)
                    ? (variant.stocks[0]?.quantity ?? 0)
                    : ((variant as any).stocks?.quantity ?? 0)
            ) || 0,

            trackingType: ((variant as any).trackingType ?? "NONE"),
            serialSelectionMode: "AUTO",
            selectedTrackedItemIds: [],
            selectedTrackedItems: [],
            branchId: Number(watch("branchId") || 0),
        };
    };

    const addToCartDirectly = (variant: ProductVariantType | ServiceType, dataType: "PRODUCT" | "SERVICE") => {
        if (dataType === "SERVICE") {
            const serviceVariant = variant as ServiceType;

            const newDetail: QuotationDetailType = {
                id: Date.now() + Math.floor(Math.random() * 1000),
                quotationId: 0,
                serviceId: serviceVariant.id || 0,
                services: serviceVariant,
                ItemType: "SERVICE",
                quantity: 1,
                cost: Number(serviceVariant.price) || 0,
                costPerBaseUnit: 0,
                taxNet: 0,
                taxMethod: "Include",
                discount: 0,
                discountMethod: "Fixed",
                total: calculateTotal({
                    ItemType: "SERVICE",
                    cost: Number(serviceVariant.price) || 0,
                    quantity: 1,
                    taxNet: 0,
                    taxMethod: "Include",
                    discount: 0,
                    discountMethod: "Fixed",
                }),
            };

            const existingIndex = findMatchingQuotationLineIndex(quotationDetails, newDetail);

            if (existingIndex !== -1) {
                const updatedDetails = [...quotationDetails];
                const currentQty = Number(updatedDetails[existingIndex].quantity ?? 0);
                const nextQty = currentQty + 1;

                updatedDetails[existingIndex] = {
                    ...updatedDetails[existingIndex],
                    quantity: nextQty,
                    total: calculateTotal({
                        ...updatedDetails[existingIndex],
                        ItemType: "SERVICE",
                        quantity: nextQty,
                    }),
                };

                setQuotationDetails(updatedDetails);
                setGrandTotal(sumTotal(updatedDetails));
            } else {
                const updatedDetails = [...quotationDetails, newDetail];
                setQuotationDetails(updatedDetails);
                setGrandTotal(sumTotal(updatedDetails));
            }

            return;
        }

        const productVariant = variant as ProductVariantType;
        const newDetail = buildQuotationDraftFromVariant(productVariant, (quoteSaleType as "RETAIL" | "WHOLESALE") || "RETAIL");

        const existingIndex = findMatchingQuotationLineIndex(quotationDetails, newDetail);

        if (existingIndex !== -1) {
            const updatedDetails = [...quotationDetails];
            const currentQty = Number(updatedDetails[existingIndex].unitQty ?? 0);
            const nextQty = currentQty + 1;

            const selectedUnit = getSelectedUnitOption(
                updatedDetails[existingIndex].productvariants,
                updatedDetails[existingIndex].unitId
            );
            const operationValue = Number(selectedUnit?.operationValue ?? 1);

            updatedDetails[existingIndex] = {
                ...updatedDetails[existingIndex],
                unitQty: nextQty,
                quantity: nextQty,
                baseQty: nextQty * operationValue,
                total: calculateTotal({
                    ...updatedDetails[existingIndex],
                    ItemType: "PRODUCT",
                    unitQty: nextQty,
                    quantity: nextQty,
                }),
            };

            setQuotationDetails(updatedDetails);
            setGrandTotal(sumTotal(updatedDetails));
        } else {
            const updatedDetails = [...quotationDetails, newDetail];
            setQuotationDetails(updatedDetails);
            setGrandTotal(sumTotal(updatedDetails));
        }
    };

    const handleFocus = () => {
        // Clear suggestions when focusing on the input box
        setShowSuggestions(false);
      };

    // Handle typing in search bar broduct
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const term = e.target.value;
        setSearchTerm(term);
        handleSearch(term);
    };

    // Handle typing in search bar
    const handleInputChangeService = (e: React.ChangeEvent<HTMLInputElement>) => {
        const term = e.target.value;
        setSearchTermService(term);
        handleSearchService(term);
    };

    // Function to add or update a product detail
    const addOrUpdateQuotationDetail = async (newDetail: QuotationDetailType) => {
        setClickData({
            ...newDetail,
            branchId: effectiveBranchId ?? 0,
            trackingType: newDetail.trackingType ?? (newDetail.productvariants as any)?.trackingType ?? "NONE",
            serialSelectionMode: newDetail.serialSelectionMode ?? "AUTO",
            selectedTrackedItemIds: newDetail.selectedTrackedItemIds ?? [],
            selectedTrackedItems: newDetail.selectedTrackedItems ?? [],
        });

        setIsModalOpen(true);
        setSearchTerm("");
        setShowSuggestions(false);
    };

    // Function to add or update a service detail
    const addOrUpdateServiceDetail = async (newDetail: QuotationDetailType) => {
        // Find if the service already exists in the array
        const existingIndex = quotationDetails.findIndex(
            (item) => item.serviceId === newDetail.serviceId
        );
        if (existingIndex !== -1) {
            await ShowWarningMessage("Service already in cart ");
            return;
        }

        setClickData({
            ...newDetail,
            branchId: effectiveBranchId ?? 0,
        });

        setIsModalOpen(true);
        setSearchTermService(""); // Clear search
        setShowSuggestionsService(false); // Hide suggestions
    };

    const handleOnSubmit = async (QuotationDetailData: QuotationDetailType) => {
        try {
            const isProduct = QuotationDetailData.ItemType === "PRODUCT";

            const newDetail: QuotationDetailType = {
                id: QuotationDetailData.id ?? Date.now(),
                quotationId: QuotationDetailData.quotationId ?? 0,

                productId: QuotationDetailData.productId ?? 0,
                productVariantId: QuotationDetailData.productVariantId ?? 0,
                serviceId: QuotationDetailData.serviceId ?? 0,

                ItemType: QuotationDetailData.ItemType,

                unitId: isProduct ? (QuotationDetailData.unitId ?? null) : null,
                unitQty: isProduct ? Number(QuotationDetailData.unitQty ?? QuotationDetailData.quantity ?? 1) : null,
                baseQty: isProduct ? Number(QuotationDetailData.baseQty ?? 0) : null,
                unitName: isProduct ? (QuotationDetailData.unitName ?? null) : null,
                unitOptions: isProduct ? (QuotationDetailData.unitOptions ?? []) : [],

                quantity: isProduct
                    ? Number(QuotationDetailData.unitQty ?? QuotationDetailData.quantity ?? 1)
                    : Number(QuotationDetailData.quantity ?? 1),

                cost: Number(QuotationDetailData.cost) || 0,
                costPerBaseUnit: Number(QuotationDetailData.costPerBaseUnit) || 0,

                taxNet: Number(QuotationDetailData.taxNet) || 0,
                taxMethod: QuotationDetailData.taxMethod ?? "Include",

                discount: Number(QuotationDetailData.discount) || 0,
                discountMethod: QuotationDetailData.discountMethod ?? "Fixed",

                products: QuotationDetailData.products ?? null,
                productvariants: QuotationDetailData.productvariants ?? null,
                services: QuotationDetailData.services ?? null,

                total: calculateTotal({
                    ...QuotationDetailData,
                    ItemType: QuotationDetailData.ItemType,
                    quantity: isProduct
                        ? Number(QuotationDetailData.unitQty ?? QuotationDetailData.quantity ?? 1)
                        : Number(QuotationDetailData.quantity ?? 1),
                    unitQty: isProduct
                        ? Number(QuotationDetailData.unitQty ?? QuotationDetailData.quantity ?? 1)
                        : undefined,
                }),

                stocks: QuotationDetailData.stocks ?? 0,

                trackingType: QuotationDetailData.trackingType ?? "NONE",
                serialSelectionMode: QuotationDetailData.serialSelectionMode ?? "AUTO",
                selectedTrackedItemIds: QuotationDetailData.selectedTrackedItemIds ?? [],
                selectedTrackedItems: QuotationDetailData.selectedTrackedItems ?? [],
                branchId: QuotationDetailData.branchId ?? watch("branchId"),
            };

            const existingIndex = findMatchingQuotationLineIndex(quotationDetails, newDetail);

            const sameRowEditing = quotationDetails.findIndex((row) => row.id === newDetail.id);

            if (sameRowEditing !== -1) {
                const updatedDetails = [...quotationDetails];
                updatedDetails[sameRowEditing] = newDetail;
                setQuotationDetails(updatedDetails);
                setGrandTotal(sumTotal(updatedDetails));
                persistDraftTrackedSelections(updatedDetails);
                setIsModalOpen(false);
                return;
            }

            if (existingIndex !== -1) {
                const updatedDetails = [...quotationDetails];

                if (newDetail.ItemType === "PRODUCT") {
                    const currentQty = Number(updatedDetails[existingIndex].unitQty ?? 0);
                    const addQty = Number(newDetail.unitQty ?? 0);
                    const nextQty = currentQty + addQty;

                    const selectedUnit = getSelectedUnitOption(
                        updatedDetails[existingIndex].productvariants,
                        updatedDetails[existingIndex].unitId
                    );
                    const operationValue = Number(selectedUnit?.operationValue ?? 1);

                    updatedDetails[existingIndex] = {
                        ...updatedDetails[existingIndex],
                        unitQty: nextQty,
                        quantity: nextQty,
                        baseQty: nextQty * operationValue,
                        total: calculateTotal({
                            ...updatedDetails[existingIndex],
                            ItemType: "PRODUCT",
                            unitQty: nextQty,
                            quantity: nextQty,
                        }),
                    };
                } else {
                    const currentQty = Number(updatedDetails[existingIndex].quantity ?? 0);
                    const addQty = Number(newDetail.quantity ?? 0);
                    const nextQty = currentQty + addQty;

                    updatedDetails[existingIndex] = {
                        ...updatedDetails[existingIndex],
                        quantity: nextQty,
                        total: calculateTotal({
                            ...updatedDetails[existingIndex],
                            ItemType: "SERVICE",
                            quantity: nextQty,
                        }),
                    };
                }

                setQuotationDetails(updatedDetails);
                setGrandTotal(sumTotal(updatedDetails));
                persistDraftTrackedSelections(updatedDetails);
            } else {
                const updatedDetails = [...quotationDetails, newDetail];
                setQuotationDetails(updatedDetails);
                setGrandTotal(sumTotal(updatedDetails));
                persistDraftTrackedSelections(updatedDetails);
            }

            setIsModalOpen(false);
        } catch (error: any) {
            toast.error(error.message || "Error adding/editing quotation", {
                position: "top-right",
                autoClose: 2000
            });
        }
    };

    const increaseQuantity = (index: number) => {
        const updated = [...quotationDetails];
        const d = updated[index];

        if (d.ItemType === "PRODUCT") {
            const currentQty = Number(d.unitQty ?? d.quantity ?? 0);
            const nextQty = currentQty + 1;

            const selectedUnit = getSelectedUnitOption(d.productvariants, d.unitId);
            const operationValue = Number(selectedUnit?.operationValue ?? 1);

            updated[index] = {
                ...d,
                unitQty: nextQty,
                quantity: nextQty,
                baseQty: nextQty * operationValue,
                total: calculateTotal({
                    ...d,
                    ItemType: "PRODUCT",
                    unitQty: nextQty,
                    quantity: nextQty,
                }),
            };
        } else {
            const currentQty = Number(d.quantity ?? 0);
            const nextQty = currentQty + 1;

            updated[index] = {
                ...d,
                quantity: nextQty,
                total: calculateTotal({
                    ...d,
                    ItemType: "SERVICE",
                    quantity: nextQty,
                }),
            };
        }

        setQuotationDetails(updated);
    };

    const decreaseQuantity = (index: number) => {
        const updated = [...quotationDetails];
        const d = updated[index];

        if (d.ItemType === "PRODUCT") {
            const currentQty = Number(d.unitQty ?? d.quantity ?? 0);
            if (currentQty <= 1) return;

            const nextQty = currentQty - 1;
            const selectedUnit = getSelectedUnitOption(d.productvariants, d.unitId);
            const operationValue = Number(selectedUnit?.operationValue ?? 1);

            updated[index] = {
                ...d,
                unitQty: nextQty,
                quantity: nextQty,
                baseQty: nextQty * operationValue,
                total: calculateTotal({
                    ...d,
                    ItemType: "PRODUCT",
                    unitQty: nextQty,
                    quantity: nextQty,
                }),
            };
        } else {
            const currentQty = Number(d.quantity ?? 0);
            if (currentQty <= 1) return;

            const nextQty = currentQty - 1;

            updated[index] = {
                ...d,
                quantity: nextQty,
                total: calculateTotal({
                    ...d,
                    ItemType: "SERVICE",
                    quantity: nextQty,
                }),
            };
        }

        setQuotationDetails(updated);
    };
    
    // const calculateTotal = (detail: Partial<QuotationDetailType>): number => {
    //     const cost = Number(detail.cost) || 0; // Product cost
    //     const quantity = Number(detail.quantity) || 0; // Quantity
    //     const discount = Number(detail.discount) || 0; // discount value
    //     const taxNet = Number(detail.taxNet) || 0; // Tax value
      
    //     // Determine discount method (default to no discount if null)
    //     const discountedPrice = detail.discountMethod === "Percent"
    //       ? cost * ((100 - discount) / 100) // Apply percentage discount
    //       : detail.discountMethod === "Fixed"
    //       ? cost - discount // Apply flat discount
    //       : cost; // No discount applied
      
    //     // Determine tax method (default to no tax if null)
    //     let priceAfterTax = discountedPrice;
    //     if (detail.taxMethod === "Include") {
    //       // Tax is included in the cost, no additional tax is applied
    //       priceAfterTax = discountedPrice;
    //     } else if (detail.taxMethod === "Exclude") {
    //       // Tax is added to the discounted price
    //       priceAfterTax = discountedPrice + (discountedPrice * (taxNet / 100));
    //     }
      
    //     // Calculate total
    //     return quantity * priceAfterTax;
    // }; 

    const calculateTotal = (detail: Partial<QuotationDetailType>) => {
        const cost = Number(detail.cost) || 0;

        const qty =
            detail.ItemType === "PRODUCT"
                ? Number(detail.unitQty ?? detail.quantity ?? 0)
                : Number(detail.quantity ?? 0);

        const discount = Number(detail.discount) || 0;
        const taxRate = Number(detail.taxNet) || 0;

        let priceAfterDiscount = cost;

        if (detail.discountMethod === "Percent") {
            priceAfterDiscount = cost * (1 - discount / 100);
        } else if (detail.discountMethod === "Fixed") {
            priceAfterDiscount = cost - discount;
        }

        let taxAmount = 0;
        let unitTotal = priceAfterDiscount;

        if (detail.taxMethod === "Exclude") {
            taxAmount = (priceAfterDiscount * taxRate) / 100;
            unitTotal = priceAfterDiscount + taxAmount;
        }

        if (detail.taxMethod === "Include") {
            const priceWithoutTax = priceAfterDiscount / (1 + taxRate / 100);
            taxAmount = priceAfterDiscount - priceWithoutTax;
            unitTotal = priceAfterDiscount;
        }

        return unitTotal * qty;
    };
    
    const sumTotal = (details: QuotationDetailType[]) => {
        return details.reduce((sum, item) => {
            const sanitizedTotal = parseFloat(String(item.total).replace(/^0+/, "")) || 0;
            return sum + sanitizedTotal;
        }, 0);
    };

    const removeProductFromCart = (index: number) => {
        const updatedDetails = quotationDetails.filter((_, i) => i !== index);
        setQuotationDetails(updatedDetails);
    };

    const onSubmit: SubmitHandler<QuotationType> = async (formData) => {
        setIsLoading(true);
        try {
            await queryClient.invalidateQueries({ queryKey: ["validateToken"] });
            const quotationData: QuotationType = {
                id: id ? Number(id) : undefined,
                branchId: formData.branchId ?? user?.branchId,
                customerId: formData.customerId,
                branch: { id: formData.branchId ?? 0, name: "Default Branch", address: "Default Address"},
                customers: { id: formData.customerId ?? 0, name: "Default Customer", address: "Default Address"},
                ref: formData.ref,
                QuoteSaleType: formData.QuoteSaleType,
                quotationDate: formData.quotationDate,
                taxRate: formData.taxRate ? formData.taxRate : null,
                taxNet: formData.taxNet ? formData.taxNet : null,
                discount: formData.discount ? formData.discount : null,
                shipping: formData.shipping ? formData.shipping : null,
                grandTotal: grandTotal,
                status: formData.status,
                note: formData.note,
                delReason: "",
                quotationDetails: quotationDetails
            }
            const savedQuotation = await upsertQuotation(quotationData);
            writeTrackedSelectionsToStorage(
                quotationDetails,
                savedQuotation.quotationDetails,
                savedQuotation.id ?? (id ? Number(id) : undefined),
                quotationData.ref
            );
            toast.success(id ? "Quotation updated successfully" : "Quotation created successfully", {
                position: "top-right",
                autoClose: 2000
            });

            // Reset form data and purchaseDetails
            reset({
                id: undefined,
                ref: undefined,
                QuoteSaleType: undefined,
                quotationDate: undefined,
                branchId: undefined,
                customerId: undefined,
                taxRate: undefined,
                taxNet: undefined,
                discount: undefined,
                shipping: undefined,
                status: undefined,
                note: undefined,
                quotationDetails: [], // Clear quotationDetails
            });

            // Redirect to the specified URL
            navigate("/quotation");
        } catch (err: any) {
            if (err.message) {
                toast.error(err.message, {
                    position: 'top-right',
                    autoClose: 4000
                });
            } else {
                toast.error("Error adding/editing quotation", {
                    position: 'top-right',
                    autoClose: 4000
                });
            }
        } finally {
            setIsLoading(false);
        }
    }

    const updateData = (newDetail: QuotationDetailType) => {
        console.log("[DEBUG] updateData called, newDetail.serialSelectionMode:", newDetail.serialSelectionMode, "id:", newDetail.id);
        const detailIndex = quotationDetails.findIndex((row) => row.id === newDetail.id);
        const savedTrackedSelections = readTrackedSelectionsFromStorage(
            id ? Number(id) : undefined,
            watch("ref") ?? null
        );
        const savedSelection = findStoredTrackedSelection(
            savedTrackedSelections,
            newDetail,
            detailIndex >= 0 ? detailIndex : 0
        );
        const detailHasBackendTrackedSelection =
            newDetail.serialSelectionMode === "MANUAL" ||
            (Array.isArray(newDetail.selectedTrackedItemIds) && newDetail.selectedTrackedItemIds.length > 0) ||
            (Array.isArray(newDetail.selectedTrackedItems) && newDetail.selectedTrackedItems.length > 0);

        setClickData({
            id: newDetail.id,
            quotationId: newDetail.quotationId,
            productId: newDetail.products?.id || 0,
            productVariantId: newDetail.productVariantId,
            products: newDetail.products || null,
            productvariants: newDetail.productvariants || null,

            unitId: newDetail.unitId ?? (newDetail.productvariants as any)?.baseUnitId ?? null,
            unitQty: newDetail.unitQty ?? newDetail.quantity ?? 1,
            baseQty: newDetail.baseQty ?? null,
            unitName: newDetail.unitName ?? null,
            unitOptions: newDetail.unitOptions ?? (newDetail.productvariants as any)?.unitOptions ?? [],

            services: newDetail.services || null,
            serviceId: newDetail.serviceId || 0,
            ItemType: newDetail.ItemType,
            quantity: newDetail.quantity,
            cost: newDetail.cost,
            costPerBaseUnit: newDetail.costPerBaseUnit,
            taxNet: newDetail.taxNet,
            taxMethod: newDetail.taxMethod,
            discount: newDetail.discount,
            discountMethod: newDetail.discountMethod,
            total: newDetail.total,
            stocks: newDetail.stocks,

            trackingType: newDetail.trackingType ?? (newDetail.productvariants as any)?.trackingType ?? "NONE",
            serialSelectionMode:
                (
                    detailHasBackendTrackedSelection
                        ? (newDetail.serialSelectionMode ?? "AUTO")
                        : (savedSelection?.serialSelectionMode ?? newDetail.serialSelectionMode ?? "AUTO")
                ) as "AUTO" | "MANUAL",
            selectedTrackedItemIds:
                detailHasBackendTrackedSelection
                    ? (newDetail.selectedTrackedItemIds ?? [])
                    : Array.isArray(savedSelection?.selectedTrackedItemIds)
                    ? savedSelection.selectedTrackedItemIds.map(Number)
                    : (newDetail.selectedTrackedItemIds ?? []),
            selectedTrackedItems:
                detailHasBackendTrackedSelection
                    ? (newDetail.selectedTrackedItems ?? [])
                    : Array.isArray(savedSelection?.selectedTrackedItems)
                    ? savedSelection.selectedTrackedItems
                    : (newDetail.selectedTrackedItems ?? []),
            branchId: newDetail.branchId ?? watch("branchId"),
        });
        setIsModalOpen(true);
    }

    const wrapperStyle = {
        width: "100%",
    };

    return (
        <>
            <div className="panel">
                <div className="mb-5">
                    <h5 className="flex items-center text-lg font-semibold dark:text-white-light">
                        { id ? <FilePenLine /> : <Plus /> }
                        { id ? " Update Quotation" : " Add Quotation" }
                    </h5>
                </div>
                <div className="mb-5">
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <div className="mb-5">
                            <div className="mb-5">
                                <div className="flex flex-wrap">
                                    <label className="flex cursor-pointer items-center" style={{ marginRight: '20px'}}>
                                        <input
                                            className="form-radio"
                                            type="radio"
                                            checked={watch("QuoteSaleType") === "RETAIL"}
                                            onChange={() => handleQuoteSaleTypeChange("RETAIL")}
                                        />
                                        <span className="ml-2 text-white-dark">Retail Price</span>
                                    </label>

                                    <label className="flex cursor-pointer items-center">
                                        <input
                                            className="form-radio"
                                            type="radio"
                                            checked={watch("QuoteSaleType") === "WHOLESALE"}
                                            onChange={() => handleQuoteSaleTypeChange("WHOLESALE")}
                                        />
                                        <span className="ml-2 text-white-dark">Wholesale Price</span>
                                    </label>
                                </div>

                            </div>
                            {/* {user?.roleType === "USER" && !user?.branchId &&
                                <div className="mb-5">
                                    <label>Branch <span className="text-danger text-md">*</span></label>
                                    <select 
                                        id="branch" className="form-input" 
                                        {...register("branchId", { 
                                            required: "Branch is required"
                                        })} 
                                    >
                                        <option value="">Select a branch</option>
                                        {braches.map((option) => (
                                            <option key={option.id} value={option.id}>
                                                {option.name}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.branchId && <span className="error_validate">{errors.branchId.message}</span>}
                                </div>
                            } */}
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 mb-5">
                                <div>
                                    <label>Branch <span className="text-danger text-md">*</span></label>
                                    <select
                                        id="branch" className="form-input"
                                        disabled={!!id}
                                        {...register("branchId", {
                                            required: "Branch is required"
                                        })}
                                    >
                                        <option value="">Select a branch</option>
                                        {braches.map((option) => (
                                            <option key={option.id} value={option.id}>
                                                {option.name}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.branchId && <span className="error_validate">{errors.branchId.message}</span>}
                                </div>

                                <div>
                                    <label htmlFor="module">Quotation No <span className="text-danger text-md">*</span></label>
                                    <input 
                                        type="text" 
                                        placeholder="Enter quotation no" 
                                        className="form-input"
                                        {...register("ref", { required: "This quotation no is required" })} 
                                    />
                                </div>

                                <div style={wrapperStyle}>
                                    <label htmlFor="date-picker">Select a Date: <span className="text-danger text-md">*</span></label>
                                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                                        <Controller
                                            name="quotationDate"
                                            control={control}
                                            rules={{ required: "Quotation date is required" }}
                                            render={({ field }) => (
                                                <DatePicker
                                                    value={field.value ? new Date(field.value as string) : null}
                                                    onChange={(date) => field.onChange(date)}
                                                    minDate={new Date()}
                                                    slotProps={{
                                                        textField: {
                                                            fullWidth: true,
                                                            error: !!errors.quotationDate,
                                                        },
                                                    }}
                                                />
                                            )}
                                        />
                                    </LocalizationProvider>
                                    {errors.quotationDate && <span className="error_validate">{errors.quotationDate.message}</span>}
                                </div>
                                <div>
                                    <label>Customer</label>
                                    <div className="flex">
                                        <select 
                                            id="customerId" className="form-input ltr:rounded-r-none rtl:rounded-l-none ltr:border-r-0 rtl:border-l-0" 
                                            {...register("customerId")} 
                                        >
                                            <option value="">Select a customer...</option>
                                            {customers.map((option) => (
                                            <option key={option.id} value={option.id}>
                                                {option.name}
                                            </option>
                                            ))}
                                        </select>
                                        <button type="button" onClick={() => { setIsCustomerModalOpen(true) }} className="bg-secondary text-white flex justify-center items-center ltr:rounded-r-md rtl:rounded-l-md px-3 font-semibold border ltr:border-l-0 rtl:border-r-0 border-secondary">
                                            <FontAwesomeIcon icon={faCirclePlus} />
                                        </button>
                                    </div>
                                    {errors.customerId && <span className="error_validate">{errors.customerId.message}</span>}
                                </div>
                            </div>
                            <div className="mb-5">
                                <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 mb-5`}>
                                    <div>
                                        <label>Product <span className="text-danger text-md">*</span></label>
                                        <div className="relative">
                                            <input type="text" placeholder="Scan/Search Product by barcode, sku Or Name" className="peer form-input bg-gray-100 placeholder:tracking-widest ltr:pl-9 ltr:pr-9 rtl:pl-9 rtl:pr-9 sm:bg-transparent ltr:sm:pr-4 rtl:sm:pl-4" value={searchTerm} onChange={handleInputChange} onFocus={handleFocus} />
                                            <button type="button" className="absolute inset-0 h-9 w-9 appearance-none peer-focus:text-primary ltr:right-auto rtl:left-auto">
                                                <svg className="mx-auto" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <circle cx="11.5" cy="11.5" r="9.5" stroke="currentColor" strokeWidth="1.5" opacity="0.5"></circle>
                                                    <path d="M18.5 18.5L22 22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"></path>
                                                </svg>
                                            </button>
                                        </div>
                                        {/* Dropdown for suggestions */}
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
                                                    maxHeight: "200px",
                                                    overflowY: "auto",
                                                    width: "100%",
                                                }}
                                            >
                                                {productResults.map((variants) => (
                                                    <li
                                                        key={variants.id}
                                                        style={{
                                                            padding: "8px",
                                                            cursor: "pointer",
                                                            borderBottom: "1px solid #eee",
                                                        }}
                                                        onClick={() => addOrUpdateQuotationDetail(buildQuotationDraftFromVariant(variants, (quoteSaleType as "RETAIL" | "WHOLESALE") || "RETAIL"))}
                                                        // onClick={() => addOrUpdateQuotationDetail({
                                                        //     id: 0, // Assign a default or unique value
                                                        //     quotationId: 0, // Assign a default or unique value
                                                        //     productId: variants.products?.id || 0,
                                                        //     productVariantId: variants.id,
                                                        //     products: variants.products || null,
                                                        //     productvariants: variants,
                                                        //     ItemType: "PRODUCT",
                                                            
                                                        //     // ✅ UOM defaults
                                                        //     unitOptions: variants.unitOptions ?? [],
                                                        //     unitId: variants.baseUnitId ?? variants.baseUnit?.id ?? (variants.unitOptions?.[0]?.id ?? null),
                                                        //     unitQty: 1,
                                                        //     quantity: 1, // keep old field in sync

                                                        //     cost: quoteSaleType === "RETAIL" ? Number(variants.retailPrice) : Number(variants.wholeSalePrice) || 0, // Default cost
                                                        //     costPerBaseUnit: 0,
                                                        //     taxNet: 0, // Default taxNet
                                                        //     taxMethod: "Include", // Default tax method
                                                        //     discount: 0,
                                                        //     discountMethod: "Fixed",
                                                        //     total: 0,
                                                        //     stocks: Number(
                                                        //         Array.isArray(variants.stocks)
                                                        //             ? (variants.stocks[0]?.quantity ?? 0)
                                                        //             : (variants.stocks?.quantity ?? 0)
                                                        //     ) || 0,
                                                        // })}
                                                    >
                                                        {/* {variants.products?.name} - {variants.name+' - '+variants.barcode} */}
                                                        {variants.products?.name+' - '+variants.barcode} ({variants.productType})
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>

                                    <div>
                                        <label>Service <span className="text-danger text-md">*</span></label>
                                        <div className="relative">
                                            <input type="text" placeholder="Scan/Search Service by Code Or Name" className="peer form-input bg-gray-100 placeholder:tracking-widest ltr:pl-9 ltr:pr-9 rtl:pl-9 rtl:pr-9 sm:bg-transparent ltr:sm:pr-4 rtl:sm:pl-4" value={searchTermService} onChange={handleInputChangeService} />
                                            <button type="button" className="absolute inset-0 h-9 w-9 appearance-none peer-focus:text-primary ltr:right-auto rtl:left-auto">
                                                <svg className="mx-auto" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <circle cx="11.5" cy="11.5" r="9.5" stroke="currentColor" strokeWidth="1.5" opacity="0.5"></circle>
                                                    <path d="M18.5 18.5L22 22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"></path>
                                                </svg>
                                            </button>
                                        </div>
                                        {/* Dropdown for suggestions */}
                                        {showSuggestionsService && serviceResults.length > 0 && (
                                            <ul
                                                style={{
                                                    listStyle: "none",
                                                    border: "1px solid #ccc",
                                                    padding: 0,
                                                    margin: 0,
                                                    position: "absolute",
                                                    backgroundColor: "white",
                                                    zIndex: 10,
                                                    maxHeight: "200px",
                                                    overflowY: "auto",
                                                    width: "100%",
                                                }}
                                            >
                                                {serviceResults.map((service) => (
                                                    <li
                                                        key={service.id}
                                                        style={{
                                                            padding: "8px",
                                                            cursor: "pointer",
                                                            borderBottom: "1px solid #eee",
                                                        }}
                                                        onClick={() => addOrUpdateServiceDetail({
                                                            id: 0, // Assign a default or unique value
                                                            quotationId: 0, // Assign a default or unique value
                                                            serviceId: service.id || 0,
                                                            services: service,
                                                            ItemType: "SERVICE",
                                                            quantity: 1, // Default quantity for a new item
                                                            cost: Number(service.price) || 0, // Default cost
                                                            costPerBaseUnit: 0,
                                                            taxNet: 0, // Default taxNet
                                                            taxMethod: "Include", // Default tax method
                                                            discount: 0,
                                                            discountMethod: "Fixed",
                                                            total: calculateTotal({
                                                                cost: Number(service.price) || 0,
                                                                quantity: 1,
                                                                taxNet: 0,
                                                                taxMethod: "Include",
                                                                discount: 0,
                                                                discountMethod: "Fixed",
                                                            }),
                                                        })}
                                                    >
                                                        {service.name} - {service.serviceCode}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="dataTable-container">
                                <table id="myTable1" className="whitespace-nowrap dataTable-table">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Product</th>
                                            <th>Net Unit Cost</th>
                                            {/* <th>Stock</th> */}
                                            <th>Qty</th>
                                            {statusValue == "PENDING" && 
                                                <th>Qty On Hand</th>
                                            }
                                            <th>Discount</th>
                                            <th>Tax</th>
                                            <th>SubTotal</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {quotationDetails.map((detail, index) => (
                                            <tr key={index}>
                                                <td>{ index + 1 }</td>
                                                <td>
                                                    <p>
                                                        {detail.ItemType === "PRODUCT"
                                                            ? `${detail.products?.name} (${detail.productvariants?.productType})`
                                                            : `${detail.services?.name}`}
                                                    </p>

                                                    {detail.ItemType === "PRODUCT" && (
                                                        <>
                                                            <p className="text-xs text-gray-500 mt-1">
                                                                Quote Unit: {
                                                                    getSelectedUnitOption(detail.productvariants, detail.unitId)?.unitName ||
                                                                    detail.unitName ||
                                                                    detail.productvariants?.baseUnit?.name ||
                                                                    "-"
                                                                }
                                                            </p>
                                                            <p className="text-xs text-gray-500">
                                                                Base Qty: {Number(detail.baseQty ?? 0).toFixed(4)} {detail.productvariants?.baseUnit?.name || ""}
                                                            </p>
                                                        </>
                                                    )}

                                                    <p className="text-center">
                                                        <span className="badge badge-outline-primary rounded-full">
                                                            {detail.ItemType === "PRODUCT"
                                                                ? detail.productvariants?.barcode
                                                                : detail.services?.serviceCode}
                                                        </span>
                                                        <button type="button" onClick={() => updateData(detail)} className="hover:text-warning ml-2" style={{display: "ruby"}} title="Edit">
                                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5 text-success">
                                                                <path d="M15.2869 3.15178L14.3601 4.07866L5.83882 12.5999L5.83881 12.5999C5.26166 13.1771 4.97308 13.4656 4.7249 13.7838C4.43213 14.1592 4.18114 14.5653 3.97634 14.995C3.80273 15.3593 3.67368 15.7465 3.41556 16.5208L2.32181 19.8021L2.05445 20.6042C1.92743 20.9852 2.0266 21.4053 2.31063 21.6894C2.59466 21.9734 3.01478 22.0726 3.39584 21.9456L4.19792 21.6782L7.47918 20.5844L7.47919 20.5844C8.25353 20.3263 8.6407 20.1973 9.00498 20.0237C9.43469 19.8189 9.84082 19.5679 10.2162 19.2751C10.5344 19.0269 10.8229 18.7383 11.4001 18.1612L11.4001 18.1612L19.9213 9.63993L20.8482 8.71306C22.3839 7.17735 22.3839 4.68748 20.8482 3.15178C19.3125 1.61607 16.8226 1.61607 15.2869 3.15178Z" stroke="currentColor" strokeWidth="1.5"></path>
                                                                <path opacity="0.5" d="M14.36 4.07812C14.36 4.07812 14.4759 6.04774 16.2138 7.78564C17.9517 9.52354 19.9213 9.6394 19.9213 9.6394M4.19789 21.6777L2.32178 19.8015" stroke="currentColor" strokeWidth="1.5"></path>
                                                            </svg>
                                                        </button>
                                                    </p>
                                                </td>
                                                <td>$&nbsp;
                                                    {
                                                        detail.discountMethod === "Fixed" 
                                                            ? Number(detail.cost - detail.discount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                                                            : Number(detail.cost * ((100 - detail.discount) / 100)).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                                                    }
                                                </td>
                                                {/* <td>5</td> */}
                                                <td>
                                                    <div className="inline-flex" style={{width: '40%'}}>
                                                        <button type="button" onClick={() => decreaseQuantity(index)} className="flex items-center justify-center border border-r-0 border-danger bg-danger px-3 font-semibold text-white ltr:rounded-l-md rtl:rounded-r-md">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                                                                <line x1="5" y1="12" x2="19" y2="12"></line>
                                                            </svg>
                                                        </button>
                                                            <input type="text" value={detail.quantity} className="form-input rounded-none text-center" min="0" max="25" readOnly />
                                                        <button type="button" onClick={() => increaseQuantity(index)} className="flex items-center justify-center border border-l-0 border-warning bg-warning px-3 font-semibold text-white ltr:rounded-r-md rtl:rounded-l-md">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                                                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                                                <line x1="5" y1="12" x2="19" y2="12"></line>
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </td>
                                                {statusValue == "PENDING" && 
                                                    <td>{ detail.stocks }</td>
                                                }
                                                <td>$ {
                                                        detail.discount <= 0 
                                                            ? 0
                                                            : detail.discountMethod === "Fixed" 
                                                                ? Number(detail.discount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                                                                : Number(detail.cost - (detail.cost * ((100 - detail.discount) / 100))).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                                                      }
                                                </td>
                                                <td>
                                                    {(() => {
                                                        const cost = Number(detail.cost) || 0;

                                                        const qty =
                                                        detail.ItemType === "PRODUCT"
                                                            ? Number(detail.unitQty ?? detail.quantity ?? 0)
                                                            : Number(detail.quantity ?? 0);

                                                        const discount = Number(detail.discount) || 0;
                                                        const taxRate = Number(detail.taxNet) || 0;

                                                        let priceAfterDiscount = cost;

                                                        if (detail.discountMethod === "Percent") {
                                                            priceAfterDiscount = cost * (1 - discount / 100);
                                                        } else {
                                                            priceAfterDiscount = cost - discount;
                                                        }

                                                        let tax = 0;

                                                        if (detail.taxMethod === "Exclude") {
                                                            tax = (priceAfterDiscount * taxRate) / 100;
                                                        } else if (detail.taxMethod === "Include") {
                                                            const priceWithoutTax = priceAfterDiscount / (1 + taxRate / 100);
                                                            tax = priceAfterDiscount - priceWithoutTax;
                                                        }

                                                        return (tax * qty).toFixed(2);
                                                    })()}
                                                    <br />
                                                    <span className="text-xs">({detail.taxMethod})</span>
                                                </td>
                                                <td>$ { Number(detail.total).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',') }</td>
                                                <td>
                                                    <button type="button" onClick={() => removeProductFromCart(index)} className="hover:text-danger" title="Delete">
                                                        <Trash2 color="red" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="mt-5">
                                        <tr>
                                            <td colSpan={statusValue == "PENDING" ? 7 : 6}></td>
                                            <td style={{padding: "8px 5px"}}>Order Tax</td>
                                            <td>{ taxRate }%</td>
                                        </tr>
                                        <tr>
                                            <td colSpan={statusValue == "PENDING" ? 7 : 6}></td>
                                            <td style={{padding: "8px 5px", background: "#fff"}}>Discount</td>
                                            <td style={{background: "#fff"}}>$ { Number(discount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',') }</td>
                                        </tr>
                                        {/* <tr>
                                            <td colSpan={statusValue == "PENDING" ? 7 : 6}></td>
                                            <td style={{padding: "8px 5px"}}>Shipping</td>
                                            <td>$ { Number(shipping).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',') }</td>
                                        </tr> */}
                                        <tr>
                                            <td colSpan={statusValue == "PENDING" ? 7 : 6}></td>
                                            <td style={{padding: "8px 5px", background: "#fff"}}><b>Grand Total</b></td>
                                            <td style={{background: "#fff"}}><b>$ { Number(grandTotal).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',') }</b></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-5">
                                <div>
                                    <label>Order Tax</label>
                                    <input type="text" className="form-input" 
                                        placeholder="0"
                                        {...register("taxRate")}/>
                                </div>
                                <div>
                                    <label>discount</label>
                                    <input type="text" className="form-input" 
                                        placeholder="0"
                                        {...register("discount")}/>
                                </div>
                                {/* <div>
                                    <label>Shipping</label>
                                    <input type="text" className="form-input" 
                                        placeholder="0"
                                        {...register("shipping")}/>
                                </div> */}
                                <div>
                                    <label>Status <span className="text-danger text-md">*</span></label>
                                    <select 
                                        id="status" className="form-input" 
                                        {...register("status", { 
                                            required: "Status is required"
                                        })} 
                                    >
                                        <option value="">Select a status...</option>
                                        <option value="PENDING">Pending</option>

                                        <option
                                            value="SENT"
                                            disabled={!hasPermission("Quotation-Sent") && statusValue === "PENDING"}
                                        >
                                            Sent
                                        </option>

                                        <option
                                            value="INVOICED"
                                            disabled={statusValue !== "COMPLETED" && statusValue !== "SENT" && statusValue !== "CANCELLED" && statusValue !== "INVOICED"}
                                        >
                                            Invoiced
                                        </option>
                                        
                                        <option
                                            value="COMPLETED"
                                            disabled={statusValue !== "COMPLETED" && statusValue !== "SENT" && statusValue !== "CANCELLED" && statusValue !== "INVOICED"}
                                        >
                                            Completed
                                        </option>
                                        
                                        <option
                                            value="CANCELLED"
                                            disabled={statusValue !== "CANCELLED" && statusValue !== "SENT" && statusValue !== "COMPLETED" && statusValue !== "INVOICED"}
                                        >
                                            Cancelled
                                        </option>

                                    </select>
                                    {errors.status && <span className="error_validate">{errors.status.message}</span>}
                                </div>
                            </div>
                            <div className="mb-5">
                                <label>Note</label>
                                <textarea {...register("note")} className="form-input" rows={3}></textarea>
                            </div>
                        </div>
                        <div className="flex justify-end items-center mt-8">
                            <NavLink to="/quotation" type="button" className="btn btn-outline-warning">
                                <FontAwesomeIcon icon={faArrowLeft} className='mr-1' />
                                Go Back
                            </NavLink>
                            {statusValue === 'PENDING' &&
                                (hasPermission('Quotation-Create') || hasPermission('Quotation-Edit')) && (
                                <button type="submit" className="btn btn-primary ltr:ml-4 rtl:mr-4" disabled={isLoading}>
                                    <FontAwesomeIcon icon={faSave} className='mr-1' />
                                    {isLoading ? 'Saving...' : 'Save'}
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </div>

            <Modal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleOnSubmit}
                clickData={clickData}
                quoteSaleType={(quoteSaleType as "RETAIL" | "WHOLESALE") || "RETAIL"}
            />

            <CustomerModal 
                isOpen={isCustomerModalOpen}
                onClose={() => setIsCustomerModalOpen(false)}
                onSubmit={handleAddorEditCustomer}
            />
        </>
    );
};

export default QuotationForm;
