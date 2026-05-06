import React, { useCallback, useEffect, useRef, useState } from "react";
import CustomerSearchInput from "@/components/CustomerSearchInput";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faSave, faCirclePlus } from "@fortawesome/free-solid-svg-icons";
import { NavLink, useNavigate, useParams } from "react-router-dom";
import { BranchType, CustomerType, ProductVariantType, ProductType, ServiceType, InvoiceType, InvoiceDetailType } from "@/data_types/types";
import { getAllBranches } from "@/api/branch";
import { getAllCustomers } from "@/api/customer";
import { searchProduct } from "@/api/searchProduct";
import { searchService } from "@/api/searchService";
import { getNextInvoiceRef } from "@/api/invoice";
import { upsertInvoice, getInvoiceByid } from "@/api/invoice";
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
import Product from "../product/Product";
import { set } from "date-fns";

const InvoiceForm: React.FC = () => {
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
    const [invoiceDetails, setInvoiceDetails] = useState<InvoiceDetailType[]>([]);
    const [shipping, setShipping] = useState<number>(0);
    const [discount, setDiscount] = useState<number>(0);
    const [taxRate, setTaxRate] = useState<number>(0);
    const [grandTotal, setGrandTotal] = useState<number>(0);
    const [clickData, setClickData] = useState<InvoiceDetailType | null>(null);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [showSuggestionsService, setShowSuggestionsService] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [statusValue, setStatusValue] = useState<string>("PENDING");
    const prevOrderSaleType = useRef<"RETAIL" | "WHOLESALE">("RETAIL");

    const queryClient = useQueryClient();

    const { user, hasPermission } = useAppContext();

    const navigate = useNavigate(); // Initialize useNavigate

    // const navigate = useNavigate()

    const { control, register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<InvoiceType> ();

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

    const fetchInvoice = useCallback(async () => {
        if (id) { // Only fetch when 'id' is available and not already fetching
            setIsLoading(true);
            try {
                if (id) {
                    const invoiceData: InvoiceType = await getInvoiceByid(parseInt(id, 10));

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

                    const hydratedDetails = (invoiceData.items || []).map((detail: any, index: number) => {
                    const variant = detail.productvariants;
                    const product = detail.products;

                    if (detail.ItemType !== "PRODUCT" || !variant || !product) {
                        return {
                        ...detail,
                        id: Number(detail.id),
                        orderItemId: Number(detail.id),
                        selectedTrackedItemIds: Array.isArray(detail.selectedAssetItems)
                            ? detail.selectedAssetItems.map((x: any) => Number(x.productAssetItemId))
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
                            : [],
                        serialSelectionMode: detail.serialSelectionMode ?? "AUTO",
                        branchId: invoiceData.branchId ?? null,
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
                        id: Number(detail.id),
                        orderItemId: Number(detail.id),
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

                        selectedTrackedItemIds: Array.isArray(detail.selectedAssetItems)
                        ? detail.selectedAssetItems.map((x: any) => Number(x.productAssetItemId))
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
                        : [],

                        serialSelectionMode: detail.serialSelectionMode ?? "AUTO",
                        branchId: invoiceData.branchId ?? null,
                    };
                    });

                    await fetchBranches();
                    // await fetchSuppliers();
                    setValue("OrderSaleType", invoiceData.OrderSaleType);
                    setValue("branchId", invoiceData.branchId);
                    setValue("customerId", invoiceData.customerId);
                    setValue("ref", invoiceData.ref);
                    setValue("orderDate", invoiceData.orderDate
                        ? new Date(invoiceData.orderDate).toISOString()
                        : null
                    );
                    setValue("taxRate", invoiceData.taxRate);
                    setValue("shipping", invoiceData.shipping);
                    setValue("discount", invoiceData.discount);
                    setGrandTotal(invoiceData.totalAmount);
                    setValue("status", invoiceData.status);
                    setValue("note", invoiceData.note);
                 
                    setInvoiceDetails(hydratedDetails);
                    setStatusValue(invoiceData.status);
                }
            } catch (error) {
                console.error("Error fetching invoice:", error);
            } finally {
                setIsLoading(false);
            }
        }
    }, [id, setValue]);

    useEffect(() => {
        fetchBranches();
        fetchCustomers();
        fetchInvoice();
    }, [fetchBranches, fetchCustomers, fetchInvoice]);

    const branchId = watch("branchId");
    const OrderSaleType = watch("OrderSaleType") // RETAIL || WHOLESALE;

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

            getNextInvoiceRef(Number(effectiveBranchId))
                .then((data) => {
                    const refValue = (data && typeof data === "object" && "ref" in data)
                        ? (data as any).ref
                        : String(data || "");
                    setValue("ref", refValue);
                })
                .catch(() => {
                    toast.error("Failed to generate invoice number");
                });

            if (invoiceDetails.length > 0) {
                const ok = await ShowConfirmationMessage(
                    "change_branch"
                );

                if (!ok) {
                    // revert UI
                    setValue("OrderSaleType", prevOrderSaleType.current, {
                        shouldDirty: false,
                    });
                    return;
                }
                setInvoiceDetails([]);

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
    }, [branchId, user, id, setValue]);

    // Watch the "shipping" field
    const shippingValue = String(watch("shipping") || "0"); // Force it to be a string
    const discountValue = String(watch("discount") || "0");
    const taxValue = String(watch("taxRate") || "0");
    useEffect(() => {
        if (!watch("OrderSaleType")) {
            setValue("OrderSaleType", "RETAIL");
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
    
        const totalSum = sumTotal(invoiceDetails);
        const sanitizedTotalSum = sanitizeNumber(totalSum); // Sanitize totalSum here
        const totalAfterDis = sanitizedTotalSum - parsedDiscount;
        // console.log("grandTotal:", (totalAfterDis + ((parsedTax / 100) * totalAfterDis)) + parsedShipping);
        setGrandTotal((totalAfterDis + ((parsedTax / 100) * totalAfterDis)) + parsedShipping);
    }, [shippingValue, discountValue, taxValue, invoiceDetails]);

    const handleInvoiceSaleTypeChange = async (
        value: "RETAIL" | "WHOLESALE"
    ) => {
        if (prevOrderSaleType.current === value) return;

        if (invoiceDetails.length > 0) {
            const ok = await ShowConfirmationMessage(
                "change"
            );

            if (!ok) {
                // revert UI
                setValue("OrderSaleType", prevOrderSaleType.current, {
                    shouldDirty: false,
                });
                return;
            }
            setInvoiceDetails([]);

            setValue("shipping", null, { shouldDirty: false });
            setValue("discount", null, { shouldDirty: false });
            setValue("taxRate", null, { shouldDirty: false });

            setGrandTotal(0);
            setShipping(0);
            setDiscount(0);
            setTaxRate(0);
        }

        prevOrderSaleType.current = value;
        setValue("OrderSaleType", value);
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

    const getVariantUnitOptions = (variant: any) => {
        return Array.isArray(variant?.unitOptions) ? variant.unitOptions : [];
    };

    const getSelectedUnitOption = (variant: any, unitId?: number | null) => {
        const unitOptions = getVariantUnitOptions(variant);
        return unitOptions.find((u: any) => Number(u.unitId) === Number(unitId));
    };

    const findMatchingInvoiceLineIndex = (
        details: InvoiceDetailType[],
        newDetail: InvoiceDetailType
    ) => {
        if (newDetail.ItemType === "SERVICE") {
            return details.findIndex(
                (item) =>
                    item.ItemType === "SERVICE" &&
                    Number(item.serviceId) === Number(newDetail.serviceId) &&
                    Number(item.price ?? 0) === Number(newDetail.price ?? 0) &&
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
                Number(item.price ?? 0) !== Number(newDetail.price ?? 0) ||
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

    const buildSaleDraftFromVariant = (
        variant: ProductVariantType,
        saleType: "RETAIL" | "WHOLESALE"
    ): InvoiceDetailType => {
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
            orderItemId: null,
            orderId: 0,
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

            price: suggestedPrice,
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
        };
    };

    const addToCartDirectly = (variant: ProductVariantType | ServiceType, dataType: "PRODUCT" | "SERVICE") => {
        if (dataType === "SERVICE") {
            const serviceVariant = variant as ServiceType;

            const newDetail: InvoiceDetailType = {
                id: Date.now() + Math.floor(Math.random() * 1000),
                orderItemId: null,
                orderId: 0,
                serviceId: serviceVariant.id || 0,
                services: serviceVariant,
                ItemType: "SERVICE",
                quantity: 1,
                price: Number(serviceVariant.price) || 0,
                costPerBaseUnit: 0,
                taxNet: 0,
                taxMethod: "Include",
                discount: 0,
                discountMethod: "Fixed",
                total: calculateTotal({
                    ItemType: "SERVICE",
                    price: Number(serviceVariant.price) || 0,
                    quantity: 1,
                    taxNet: 0,
                    taxMethod: "Include",
                    discount: 0,
                    discountMethod: "Fixed",
                }),
            };

            const existingIndex = findMatchingInvoiceLineIndex(invoiceDetails, newDetail);

            if (existingIndex !== -1) {
                const updatedDetails = [...invoiceDetails];
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

                setInvoiceDetails(updatedDetails);
                setGrandTotal(sumTotal(updatedDetails));
            } else {
                const updatedDetails = [...invoiceDetails, newDetail];
                setInvoiceDetails(updatedDetails);
                setGrandTotal(sumTotal(updatedDetails));
            }

            return;
        }

        const productVariant = variant as ProductVariantType;
        const newDetail = buildSaleDraftFromVariant(productVariant, (OrderSaleType as "RETAIL" | "WHOLESALE") || "RETAIL");

        const existingIndex = findMatchingInvoiceLineIndex(invoiceDetails, newDetail);

        if (existingIndex !== -1) {
            const updatedDetails = [...invoiceDetails];
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

            setInvoiceDetails(updatedDetails);
            setGrandTotal(sumTotal(updatedDetails));
        } else {
            const updatedDetails = [...invoiceDetails, newDetail];
            setInvoiceDetails(updatedDetails);
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

    const effectiveBranchId = watch("branchId");

    // Function to add or update a product detail
    const addOrUpdateInvoiceDetail = async (newDetail: InvoiceDetailType) => {
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
    const addOrUpdateServiceDetail = async (newDetail: InvoiceDetailType) => {
        // Find if the service already exists in the array
        const existingIndex = invoiceDetails.findIndex(
            (item) => item.serviceId === newDetail.serviceId
        );
        if (existingIndex !== -1) {
            await ShowWarningMessage("Service already in cart ");
            return;
        }
        // console.log("ddfd:", newDetail);

        setClickData({
            ...newDetail,
            branchId: effectiveBranchId ?? 0,
        });
  
        setIsModalOpen(true);
        setSearchTermService(""); // Clear search
        setShowSuggestionsService(false); // Hide suggestions
    };

    const handleOnSubmit = async (InvoiceDetailData: InvoiceDetailType) => {
        try {
            const isProduct = InvoiceDetailData.ItemType === "PRODUCT";

            const newDetail: InvoiceDetailType = {
                id: InvoiceDetailData.id || Date.now(),
                orderId: InvoiceDetailData.orderId ?? 0,

                productId: InvoiceDetailData.productId ?? 0,
                productVariantId: InvoiceDetailData.productVariantId ?? 0,
                serviceId: InvoiceDetailData.serviceId ?? 0,

                ItemType: InvoiceDetailData.ItemType,

                unitId: isProduct ? (InvoiceDetailData.unitId ?? null) : null,
                unitQty: isProduct ? Number(InvoiceDetailData.unitQty ?? InvoiceDetailData.quantity ?? 1) : null,
                baseQty: isProduct ? Number(InvoiceDetailData.baseQty ?? 0) : null,
                unitName: isProduct ? (InvoiceDetailData.unitName ?? null) : null,
                unitOptions: isProduct ? (InvoiceDetailData.unitOptions ?? []) : [],

                quantity: isProduct
                    ? Number(InvoiceDetailData.unitQty ?? InvoiceDetailData.quantity ?? 1)
                    : Number(InvoiceDetailData.quantity ?? 1),

                price: Number(InvoiceDetailData.price) || 0,
                costPerBaseUnit: Number(InvoiceDetailData.costPerBaseUnit) || 0,

                taxNet: Number(InvoiceDetailData.taxNet) || 0,
                taxMethod: InvoiceDetailData.taxMethod ?? "Include",

                discount: Number(InvoiceDetailData.discount) || 0,
                discountMethod: InvoiceDetailData.discountMethod ?? "Fixed",

                products: InvoiceDetailData.products ?? null,
                productvariants: InvoiceDetailData.productvariants ?? null,
                services: InvoiceDetailData.services ?? null,

                total: calculateTotal({
                    ...InvoiceDetailData,
                    ItemType: InvoiceDetailData.ItemType,
                    quantity: isProduct
                        ? Number(InvoiceDetailData.unitQty ?? InvoiceDetailData.quantity ?? 1)
                        : Number(InvoiceDetailData.quantity ?? 1),
                    unitQty: isProduct
                        ? Number(InvoiceDetailData.unitQty ?? InvoiceDetailData.quantity ?? 1)
                        : undefined,
                }),

                stocks: InvoiceDetailData.stocks ?? 0,

                trackingType: InvoiceDetailData.trackingType ?? "NONE",
                serialSelectionMode: InvoiceDetailData.serialSelectionMode ?? "AUTO",
                selectedTrackedItemIds: InvoiceDetailData.selectedTrackedItemIds ?? [],
                selectedTrackedItems: InvoiceDetailData.selectedTrackedItems ?? [],
                branchId: InvoiceDetailData.branchId ?? watch("branchId"),
            };

            const existingIndex = findMatchingInvoiceLineIndex(invoiceDetails, newDetail);

            const sameRowEditing = invoiceDetails.findIndex((row) => row.id === newDetail.id);

            if (sameRowEditing !== -1) {
                const updatedDetails = [...invoiceDetails];
                updatedDetails[sameRowEditing] = newDetail;
                setInvoiceDetails(updatedDetails);
                setGrandTotal(sumTotal(updatedDetails));
                setIsModalOpen(false);
                return;
            }

            if (existingIndex !== -1) {
                const updatedDetails = [...invoiceDetails];

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

                setInvoiceDetails(updatedDetails);
                setGrandTotal(sumTotal(updatedDetails));
            } else {
                const updatedDetails = [...invoiceDetails, newDetail];
                setInvoiceDetails(updatedDetails);
                setGrandTotal(sumTotal(updatedDetails));
            }

            setIsModalOpen(false);
        } catch (error: any) {
            toast.error(error.message || "Error adding/editing sale", {
                position: "top-right",
                autoClose: 2000
            });
        }
    };

    const increaseQuantity = (index: number) => {
        const updated = [...invoiceDetails];
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

        setInvoiceDetails(updated);
    };

    const decreaseQuantity = (index: number) => {
        const updated = [...invoiceDetails];
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

        setInvoiceDetails(updated);
    };
    
    const calculateTotal = (detail: Partial<InvoiceDetailType>) => {
        const cost = Number(detail.price) || 0;

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
    
    const sumTotal = (details: InvoiceDetailType[]) => {
        return details.reduce((sum, item) => {
            const sanitizedTotal = parseFloat(String(item.total).replace(/^0+/, "")) || 0;
            return sum + sanitizedTotal;
        }, 0);
    };

    const removeProductFromCart = (index: number) => {
        const updatedDetails = invoiceDetails.filter((_, i) => i !== index);
        setInvoiceDetails(updatedDetails);
    };

    const onSubmit: SubmitHandler<InvoiceType> = async (formData) => {
        setIsLoading(true);
        try {
            await queryClient.invalidateQueries({ queryKey: ["validateToken"] });
            const invoiceData: InvoiceType = {
                id: id ? Number(id) : undefined,
                branchId: formData.branchId ?? user?.branchId,
                customerId: formData.customerId,
                branch: { id: formData.branchId ?? 0, name: "Default Branch", address: "Default Address"},
                customers: { id: formData.customerId ?? 0, name: "Default Customer", address: "Default Address"},
                ref: formData.ref ? formData.ref : "",
                OrderSaleType: formData.OrderSaleType,
                orderDate: formData.orderDate,
                taxRate: formData.taxRate ? formData.taxRate : null,
                taxNet: formData.taxNet ? formData.taxNet : null,
                discount: formData.discount ? formData.discount : null,
                shipping: formData.shipping ? formData.shipping : null,
                totalAmount: grandTotal,
                paidAmount: 0,
                status: formData.status,
                note: formData.note,
                delReason: "",
                items: invoiceDetails
            }
            await upsertInvoice(invoiceData);
            toast.success(id ? "Sale updated successfully" : "Sale created successfully", {
                position: "top-right",
                autoClose: 4000
            });

            // Reset form data and purchaseDetails
            reset({
                id: undefined,
                OrderSaleType: undefined,
                orderDate: undefined,
                branchId: undefined,
                ref: undefined,
                customerId: undefined, 
                taxRate: undefined,
                taxNet: undefined,
                discount: undefined,
                shipping: undefined,
                status: undefined,
                note: undefined,
                items: [], // Clear invoiceDetails
            });

            // Redirect to the specified URL
            navigate("/sale");
        } catch (err: any) {
            if (err.message) {
                toast.error(err.message, {
                    position: 'top-right',
                    autoClose: 4000
                });
            } else {
                toast.error("Error adding/editing sale", {
                    position: 'top-right',
                    autoClose: 4000
                });
            }
        } finally {
            setIsLoading(false);
        }
    }

    const updateData = (newDetail: InvoiceDetailType) => {
        setClickData({
            id: newDetail.id,
            orderItemId: newDetail.orderItemId ?? newDetail.id ?? null,
            orderId: newDetail.orderId,
            productId: newDetail.products?.id || 0,
            productVariantId: newDetail.productVariantId,
            products: newDetail.products || null,
            productvariants: newDetail.productvariants || null,

            // ✅ remember unit fields
            unitId: newDetail.unitId ?? (newDetail.productvariants as any)?.baseUnitId ?? null,
            unitQty: newDetail.unitQty ?? newDetail.quantity ?? 1,
            baseQty: newDetail.baseQty ?? null,

            services: newDetail.services || null,
            serviceId: newDetail.serviceId || 0,
            ItemType: newDetail.ItemType,
            quantity: newDetail.quantity,
            price: newDetail.price,
            costPerBaseUnit: newDetail.costPerBaseUnit,
            taxNet: newDetail.taxNet,
            taxMethod: newDetail.taxMethod,
            discount: newDetail.discount,
            discountMethod: newDetail.discountMethod,
            total: newDetail.total,
            stocks: newDetail.stocks,
            
            trackingType: newDetail.trackingType ?? (newDetail.productvariants as any)?.trackingType ?? "NONE",
            serialSelectionMode: newDetail.serialSelectionMode ?? "AUTO",
            selectedTrackedItemIds: newDetail.selectedTrackedItemIds ?? [],
            selectedTrackedItems: newDetail.selectedTrackedItems ?? [],
            branchId: newDetail.branchId ?? (user?.roleType === "USER" ? user.branchId : watch("branchId")),
        });
        setIsModalOpen(true);
    }

    const wrapperStyle = {
        width: "100%",
    };

    const isApproved = statusValue === "APPROVED";

    return (
        <>
            <div className="panel">
                <div className="mb-5">
                    <h5 className="flex items-center text-lg font-semibold dark:text-white-light">
                        { id ? <FilePenLine /> : <Plus /> }
                        { id ? " Update Sale" : " Add Sale" }
                    </h5>
                    {isApproved && (
                        <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                            <span className="font-semibold shrink-0">⚠ Approved invoice</span>
                            <span>— you can only edit <b>customer</b>, <b>note</b>, and <b>date</b>. Everything else is locked.</span>
                        </div>
                    )}
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
                                            disabled={isApproved}
                                            checked={watch("OrderSaleType") === "RETAIL"}
                                            onChange={() => handleInvoiceSaleTypeChange("RETAIL")}
                                        />
                                        <span className="ml-2 text-white-dark">Retail Price</span>
                                    </label>

                                    <label className="flex cursor-pointer items-center">
                                        <input
                                            className="form-radio"
                                            type="radio"
                                            disabled={isApproved}
                                            checked={watch("OrderSaleType") === "WHOLESALE"}
                                            onChange={() => handleInvoiceSaleTypeChange("WHOLESALE")}
                                        />
                                        <span className="ml-2 text-white-dark">Wholesale Price</span>
                                    </label>
                                </div>

                            </div>
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
                                    <label htmlFor="module">Invoice No <span className="text-danger text-md">*</span></label>
                                    <input 
                                        type="text" 
                                        placeholder="Enter invoice no" 
                                        className="form-input"
                                        {...register("ref", { required: "This invoice no is required" })} 
                                    />
                                </div>
                                <div style={wrapperStyle}>
                                    <label htmlFor="date-picker">Select a Date: <span className="text-danger text-md">*</span></label>
                                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                                        <Controller
                                            name="orderDate"
                                            control={control}
                                            rules={{ required: "Order date is required" }}
                                            render={({ field }) => (
                                                <DatePicker
                                                    value={field.value ? new Date(field.value as string) : null}
                                                    onChange={(date) => field.onChange(date)}
                                                    minDate={new Date()}
                                                    slotProps={{
                                                        textField: {
                                                            fullWidth: true,
                                                            error: !!errors.orderDate,
                                                        },
                                                    }}
                                                />
                                            )}
                                        />
                                    </LocalizationProvider>
                                    {errors.orderDate && <span className="error_validate">{errors.orderDate.message}</span>}
                                </div>
                                <div>
                                    <label>Customer</label>
                                    <div className="flex">
                                        <CustomerSearchInput
                                            customers={customers}
                                            value={watch("customerId") ?? undefined}
                                            onChange={(id) => setValue("customerId", id ? Number(id) : 0)}
                                            className="flex-1"
                                        />
                                        <button type="button" onClick={() => { setIsCustomerModalOpen(true) }} className="bg-secondary text-white flex justify-center items-center ltr:rounded-r-md rtl:rounded-l-md px-3 font-semibold border ltr:border-l-0 rtl:border-r-0 border-secondary">
                                            <FontAwesomeIcon icon={faCirclePlus} />
                                        </button>
                                    </div>
                                    {errors.customerId && <span className="error_validate">{errors.customerId.message}</span>}
                                </div>
                            </div>
                            {!isApproved && <div className="mb-5">
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
                                                        onClick={() => addOrUpdateInvoiceDetail(buildSaleDraftFromVariant(variants, (OrderSaleType as "RETAIL" | "WHOLESALE") || "RETAIL"))}

                                                        // onClick={() => addOrUpdateInvoiceDetail({
                                                        //     id: 0, // Assign a default or unique value
                                                        //     orderId: 0, // Assign a default or unique value
                                                        //     productId: variants.products?.id || 0,
                                                        //     productVariantId: variants.id,
                                                        //     products: variants.products || null,
                                                        //     productvariants: variants,
                                                        //     ItemType: "PRODUCT",
                                                        //     quantity: 1, // Default quantity for a new item
                                                        //     price: OrderSaleType === "RETAIL" ? Number(variants.retailPrice) : Number(variants.wholeSalePrice) || 0, // Default cost
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
                                                            orderId: 0, // Assign a default or unique value
                                                            serviceId: service.id || 0,
                                                            services: service,
                                                            ItemType: "SERVICE",
                                                            quantity: 1, // Default quantity for a new item
                                                            price: Number(service.price) || 0, // Default cost
                                                            costPerBaseUnit: 0,
                                                            taxNet: 0, // Default taxNet
                                                            taxMethod: "Include", // Default tax method
                                                            discount: 0,
                                                            discountMethod: "Fixed",
                                                            total: calculateTotal({
                                                                price: Number(service.price) || 0,
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
                            </div>}
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
                                        {invoiceDetails.map((detail, index) => (
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
                                                                Sale Unit: {getSelectedUnitOption(detail.productvariants, detail.unitId)?.unitName || "-"}
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
                                                            ? Number(detail.price - detail.discount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                                                            : Number(detail.price * ((100 - detail.discount) / 100)).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                                                    }
                                                </td>
                                                {/* <td>5</td> */}
                                                <td>
                                                    <div className="inline-flex" style={{width: '40%'}}>
                                                        {!isApproved && <button type="button" onClick={() => decreaseQuantity(index)} className="flex items-center justify-center border border-r-0 border-danger bg-danger px-3 font-semibold text-white ltr:rounded-l-md rtl:rounded-r-md">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                                                                <line x1="5" y1="12" x2="19" y2="12"></line>
                                                            </svg>
                                                        </button>}
                                                            <input type="text" value={detail.quantity} className={`form-input text-center ${isApproved ? "rounded-md bg-gray-100" : "rounded-none"}`} min="0" max="25" readOnly />
                                                        {!isApproved && <button type="button" onClick={() => increaseQuantity(index)} className="flex items-center justify-center border border-l-0 border-warning bg-warning px-3 font-semibold text-white ltr:rounded-r-md rtl:rounded-l-md">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                                                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                                                <line x1="5" y1="12" x2="19" y2="12"></line>
                                                            </svg>
                                                        </button>}
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
                                                                : Number(detail.price - (detail.price * ((100 - detail.discount) / 100))).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                                                      }
                                                </td>
                                                <td>
                                                    {(() => {
                                                        const cost = Number(detail.price) || 0;

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
                                                {!isApproved && (
                                                <td>
                                                    <button type="button" onClick={() => removeProductFromCart(index)} className="hover:text-danger" title="Delete">
                                                        <Trash2 color="red" />
                                                    </button>
                                                </td>
                                                )}
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
                                    <label>Discount</label>
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
                                        disabled={isApproved}
                                        {...register("status", {
                                            required: "Status is required"
                                        })}
                                    >
                                        <option value="">Select a status...</option>
                                        <option value="PENDING">Pending</option>

                                        <option
                                            value="APPROVED"
                                            disabled={!hasPermission("Sale-Approve") && statusValue === "PENDING"}
                                        >
                                            Approved
                                        </option>
                                        
                                        <option
                                            value="COMPLETED"
                                            disabled={statusValue !== "COMPLETED" && statusValue !== "CANCELLED" && statusValue !== "APPROVED"}
                                        >
                                            Completed
                                        </option>
                                        
                                        <option
                                            value="CANCELLED"
                                            disabled={statusValue !== "CANCELLED" && statusValue !== "COMPLETED" && statusValue !== "APPROVED"}
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
                            <NavLink to="/sale" type="button" className="btn btn-outline-warning">
                                <FontAwesomeIcon icon={faArrowLeft} className='mr-1' />
                                Go Back
                            </NavLink>
                            {(statusValue === 'PENDING' || isApproved) &&
                                (hasPermission('Sale-Create') || hasPermission('Sale-Edit')) && (
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
            />

            <CustomerModal 
                isOpen={isCustomerModalOpen}
                onClose={() => setIsCustomerModalOpen(false)}
                onSubmit={handleAddorEditCustomer}
            />
        </>
    );
};

export default InvoiceForm;