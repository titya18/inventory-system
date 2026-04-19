import React, { useEffect, useState } from "react";
import * as apiClient from "../../api/product";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUpZA, faArrowDownAZ, faCheck, faXmark } from '@fortawesome/free-solid-svg-icons';
import { useAppContext } from "../../hooks/useAppContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import Pagination from "../components/Pagination";
import ShowDeleteConfirmation from "../components/ShowDeleteConfirmation";
import Modal from "./Modal";
import { NavLink, useSearchParams } from "react-router-dom";
import { ProductTrackedItemType, ProductType, TrackingType, VariantValueType } from "@/data_types/types";
import VisibleColumnsSelector from "@/components/VisibleColumnsSelector";
import ExportDropdown from "@/components/ExportDropdown";
import { Pencil, Settings, Trash2 } from "lucide-react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

// Extend Day.js with plugins
dayjs.extend(utc);
dayjs.extend(timezone);

const columns = [
    "Image",
    "Product",
    "Type",
    "SKU",
    "Barcode",
    "Category",
    "Brand",
    "Status",
    "Note",
    "Created At",
    "Created By",
    "Updated At",
    "Updated By",
    "Actions"
];

const sortFields: Record<string, string> = {
    "Product": "name",
    "Category": "categoryId",
    "Brand": "brandId",
    "Status": "status",
    "Note": "note",
    "Created At": "createdAt",
    "Created By": "createdBy",
    "Updated At": "updatedAt",
    "Updated By": "updatedBy"
};

type ProductStock = {
    branchId: number;
    quantity: number;
};

const Product: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [products, setProducts] = useState<ProductType[]>([]);
    const [selectProduct, setSelectProduct] = useState<{ 
        id: number | undefined, 
        categoryId: number | null, 
        brandId: number | null, 
        name: string, 
        note: string, 
        isActive: string, 
        image: File[] | null, 
        productType: string | 'New',
        unitId: number | null, 
        barcode: string | null, 
        sku: string, 
        stockAlert: number | null, 
        purchasePrice: number | string,
        purchasePriceUnitId?: number | null,
        retailPrice: number | string,
        retailPriceUnitId: number | null,
        wholeSalePrice: number | string, 
        wholeSalePriceUnitId: number | null,
        variantAttributeIds?: number[], 
        variantValueIds?: number[],
        updateStock?: boolean,
        stocks?: ProductStock[],

        // ✅ NEW (UOM)
        baseUnitId?: number | null,
        unitConversions?: { fromUnitId: number; toUnitId: number; multiplier: number }[],
        trackingType?: TrackingType;
        trackedItems?: ProductTrackedItemType[];
    } | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [secondHandVariant, setSecondHandVariant] = useState<{
        id: number;
        name: string;
        sku: string;
        barcode: string | null;
        stockAlert: number | null;
        purchasePrice: number | string;
        purchasePriceUnitId: number | null;
        retailPrice: number | string;
        retailPriceUnitId: number | null;
        wholeSalePrice: number | string;
        wholeSalePriceUnitId: number | null;
        baseUnitId: number | null;
        trackingType: TrackingType;
        variantAttributeIds: number[];
        variantValueIds: number[];
        stocks: { branchId: number; quantity: number }[];
        unitConversions: { fromUnitId: number; toUnitId: number; multiplier: number }[];
        trackedItems: ProductTrackedItemType[];
    } | null>(null);

    const [searchParams, setSearchParams] = useSearchParams();
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
    const sortField = searchParams.get("sortField") || "name";
    const rawSortOrder = searchParams.get("sortOrder");
    const sortOrder: "asc" | "desc" = rawSortOrder === "desc" ? "desc" : "asc";
    const [total, setTotal] = useState(0);
    const [selected, setSelected] = useState<number[]>([]);
    const [visibleCols, setVisibleCols] = useState(columns);

    const updateParams = (params: Record<string, unknown>) => {
        const newParams = new URLSearchParams(searchParams.toString());
        Object.entries(params).forEach(([key, value]) => {
            newParams.set(key, String(value));
        });
        setSearchParams(newParams);
    };

    const { hasPermission } = useAppContext();

    const fetchProduct = async () => {
        setIsLoading(true);
        try {
            const { data, total } = await apiClient.getAllProducts(
                sortField,
                sortOrder,
                page,
                search,
                pageSize
            );
            setProducts(data || []);
            setTotal(total || 0);
            setSelected([]);
        } catch (error) {
            console.error("Error fetching prduct:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchProduct();
    }, [search, page, sortField, sortOrder, pageSize]);

    const toggleCol = (col: string) => {
        setVisibleCols((prev) =>
            prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
        );
    };

    const toggleSelectRow = (index: number) => {
        setSelected((prev) =>
            prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
        );
    };

    const handleSort = (col: string) => {
        const field = sortFields[col];
        if (!field) return;

        if (sortField === field) {
            updateParams({ sortOrder: sortOrder === "asc" ? "desc" : "asc" });
        } else {
            updateParams({ sortField: field, sortOrder: "asc" });
        }
    };

    const exportData = products.map((product, index) => ({
        "No": (page - 1) * pageSize + index + 1,
        "Product": product.name,
        "Type": (product as any).productvariants?.map((v: any) => v.productType).join(" / ") || "",
        "SKU": (product as any).productvariants?.map((v: any) => v.sku).join(" / ") || "",
        "Barcode": (product as any).productvariants?.map((v: any) => v.barcode || "").join(" / ") || "",
        "Category": product.categoryId ? product.categories?.name : "",
        "Brand": product.brands ? product.brands.en_name : "",
        "Status": product.isActive === 1 ? "Active" : "Inactive",
        "Note": product.note,
        "Created At": product.createdAt ? dayjs.tz(product.createdAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss") : '',
        "Created By": `${product.creator?.lastName || ''} ${product.creator?.firstName || ''}`,
        "Updated At": product.updatedAt ? dayjs.tz(product.updatedAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss") : '',
        "Updated By": `${product.updater?.lastName || ''} ${product.updater?.firstName || ''}`,
    }));

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const queryClient = useQueryClient();

    const handleAddorEditProduct = async (
        id: number | null, 
        categoryId: number | null, 
        brandId: number | null, 
        name: string, 
        note: string, 
        isActive: string, 
        image: File[] | null, 
        imagesToDelete: string[],
        unitId: number | null,
        barcode: string | null,
        productType: string | 'New',
        sku: string,
        stockAlert: number | null,
        purchasePrice: number | string,
        purchasePriceUnitId: number | null,
        retailPrice: number | string,
        retailPriceUnitId: number | null,
        wholeSalePrice: number | string,
        wholeSalePriceUnitId?: number | null,
        variantAttributeIds?: number[] | null,     
        variantValueIds?: number[],
        stocks?: ProductStock[],
        
        // ✅ NEW (UOM)
        baseUnitId?: number | null,
        unitConversions?: { fromUnitId: number; toUnitId: number; multiplier: number }[],
        updateStock?: boolean,

        trackingType?: TrackingType,
        trackedItems?: ProductTrackedItemType[],
        variantId?: number | null,
    ) => {
        try {
            await queryClient.invalidateQueries({ queryKey: ["validateToken"] });
            const productData: ProductType = {
                id: id ? id : undefined,
                categoryId: categoryId ?? 0, // Fallback to 0 if null
                brandId: brandId ?? 0, // Fallback to 0 if null
                categories: { id: categoryId ?? 0, code: "0001", name: "Default Category" }, // Provide default values
                brands: { id: brandId ?? 0, en_name: "Default Brand", kh_name: "Default Brand", description: "Default Brand Description", image: "brand/default_brand.png" }, // Provide default values
                name,
                note,
                isActive: 1,
                image,
                imagesToDelete,

                productType: productType,
                unitId: unitId ?? 0, // Fallback to 0 if null
                barcode: barcode ?? '',
                sku,
                stockAlert: stockAlert ?? 0,
                purchasePrice,
                purchasePriceUnitId: purchasePriceUnitId ?? null,
                retailPrice,
                retailPriceUnitId: retailPriceUnitId ?? null,
                wholeSalePrice,
                wholeSalePriceUnitId: wholeSalePriceUnitId ?? null,
                variantAttributeIds: variantAttributeIds ?? undefined,
                variantValueIds: variantValueIds ?? [],

                updateStock: updateStock ?? false,
                stocks: stocks ?? [],

                // ✅ NEW (UOM)
                baseUnitId: baseUnitId ?? null,
                unitConversions: unitConversions ?? [],

                trackingType: trackingType ?? "NONE",
                trackedItems: trackedItems ?? [],
                ...(variantId ? { variantId } : {}),
            } as any;

            await apiClient.upsertProduct(productData);
            toast.success(id ? "Product updated successfully" : "Product created successfully", {
                position: "top-right",
                autoClose: 4000
            });
            fetchProduct();
            setIsModalOpen(false);
        } catch (error: any) {
            // Re-throw so Modal.tsx keeps the form open and shows the error
            throw error;
        }
    };

    // Old for not yet merge product variant with product
    // const handleEditClick = (productData: ProductType) => {
    //     setSelectProduct({
    //         id: productData.id,
    //         categoryId: productData.categoryId,
    //         brandId: productData.brandId,
    //         name: productData.name,
    //         note: productData.note,
    //         isActive: String(productData.isActive),
    //         image: productData.image,

    //         unitId: productData.unitId ?? null,
    //         barcode: productData.barcode ?? null,
    //         sku: productData.sku ?? '',
    //         purchasePrice: productData.purchasePrice ?? 0,
    //         retailPrice: productData.retailPrice ?? 0,
    //         wholeSalePrice: productData.wholeSalePrice ?? 0,
    //         variantAttributeIds: productData.variantAttributeIds ?? undefined,
    //         variantValueIds: productData.variantValueIds ?? [],
    //     });
    //     console.log("Selected product for editing:", productData);
    //     setIsModalOpen(true);
    // };

    const handleEditClick = async(productData: ProductType) => {
        if (productData.id === undefined) {
            toast.error("Product ID is missing", {
                position: "top-right",
                autoClose: 2000
            });
            return;
        }
        const getProduct = await apiClient.getProductById(productData.id);
        // Use the New variant as primary; detect SecondHand variant
        const variant = getProduct.productvariants?.find((v: any) => v.productType === "New") ?? getProduct.productvariants?.[0];
        const shVariant = getProduct.productvariants?.find((v: any) => v.productType === "SecondHand") ?? null;
        setSecondHandVariant(shVariant ? {
            id: shVariant.id,
            name: shVariant.name ?? "",
            sku: shVariant.sku ?? "",
            barcode: shVariant.barcode ?? null,
            stockAlert: shVariant.stockAlert ?? 0,
            purchasePrice: Number(shVariant.purchasePrice) || 0,
            purchasePriceUnitId: (shVariant as any).purchasePriceUnitId ?? shVariant.baseUnitId ?? null,
            retailPrice: Number(shVariant.retailPrice) || 0,
            retailPriceUnitId: shVariant.retailPriceUnitId ?? shVariant.baseUnitId ?? null,
            wholeSalePrice: Number(shVariant.wholeSalePrice) || 0,
            wholeSalePriceUnitId: shVariant.wholeSalePriceUnitId ?? shVariant.baseUnitId ?? null,
            baseUnitId: shVariant.baseUnitId ?? null,
            trackingType: (shVariant as any).trackingType ?? "NONE",
            variantAttributeIds: shVariant.productVariantValues
                ?.map((v: any) => v.variantValue?.variantAttributeId)
                .filter((id: any): id is number => typeof id === "number") ?? [],
            variantValueIds: shVariant.productVariantValues?.map((v: any) => v.variantValueId) ?? [],
            stocks: Array.isArray(shVariant.stocks)
                ? shVariant.stocks.map((s: any) => ({ branchId: s.branchId, quantity: Number(s.quantity) }))
                : [],
            unitConversions: Array.isArray(getProduct.unitConversions)
                ? getProduct.unitConversions.map((c: any) => ({ fromUnitId: Number(c.fromUnitId), toUnitId: Number(c.toUnitId), multiplier: Number(c.multiplier) }))
                : [],
            trackedItems: Array.isArray((shVariant as any).productAssetItems)
                ? (shVariant as any).productAssetItems
                    .filter((x: any) => x.status === "IN_STOCK")
                    .map((x: any) => ({ id: x.id, branchId: x.branchId, assetCode: x.assetCode ?? "", macAddress: x.macAddress ?? "", serialNumber: x.serialNumber ?? "" }))
                : [],
        } : null);

        const variantAttributeIds =
            variant?.productVariantValues
                ?.map(v => v.variantValue?.variantAttributeId)
                .filter((id): id is number => typeof id === "number") ?? [];

        const variantValueIds =
            variant?.productVariantValues
                ?.map(v => v.variantValueId) ?? [];
        setSelectProduct({
            id: getProduct.id,
            categoryId: getProduct.categoryId,
            brandId: getProduct.brandId,
            name: getProduct.name,
            note: getProduct.note,
            isActive: String(getProduct.isActive),
            image: getProduct.image,

            productType: getProduct.productvariants && getProduct.productvariants.length > 0 ? (getProduct.productvariants[0].productType ?? 'New') : 'New',
            unitId: getProduct.productvariants && getProduct.productvariants.length > 0 ? getProduct.productvariants[0].unitId : null,
            barcode: getProduct.productvariants && getProduct.productvariants.length > 0 ? getProduct.productvariants[0].barcode : null,
            sku: getProduct.productvariants && getProduct.productvariants.length > 0 ? getProduct.productvariants[0].sku : '',
            stockAlert: getProduct.productvariants && getProduct.productvariants.length > 0 ? getProduct.productvariants[0].stockAlert ?? 0 : 0,
            purchasePrice: getProduct.productvariants && getProduct.productvariants.length > 0 ? getProduct.productvariants[0].purchasePrice ?? 0 : 0,
            purchasePriceUnitId:
            getProduct.productvariants && getProduct.productvariants.length > 0
                ? ((getProduct.productvariants[0] as any).purchasePriceUnitId ?? getProduct.productvariants[0].baseUnitId ?? null)
                : null,
            retailPrice: getProduct.productvariants && getProduct.productvariants.length > 0 ? getProduct.productvariants[0].retailPrice ?? 0 : 0,
            retailPriceUnitId: getProduct.productvariants?.[0]?.retailPriceUnitId ?? getProduct.productvariants?.[0]?.baseUnitId ?? null,
            wholeSalePrice: getProduct.productvariants && getProduct.productvariants.length > 0 ? getProduct.productvariants[0].wholeSalePrice ?? 0 : 0,
            wholeSalePriceUnitId: getProduct.productvariants?.[0]?.wholeSalePriceUnitId ?? getProduct.productvariants?.[0]?.baseUnitId ?? null,
            
            variantAttributeIds,
            variantValueIds,

            stocks: Array.isArray(variant?.stocks) ? variant.stocks.map((s: any) => ({
                branchId: s.branchId,
                quantity: Number(s.quantity)
            })) : [],

            updateStock: false,

            // NEW (UOM)
            baseUnitId: getProduct.productvariants && getProduct.productvariants.length > 0 ? getProduct.productvariants[0].baseUnitId : null,
            unitConversions: Array.isArray(getProduct.unitConversions)
                ? getProduct.unitConversions.map((c: any) => ({
                    fromUnitId: Number(c.fromUnitId),
                    toUnitId: Number(c.toUnitId),
                    multiplier: Number(c.multiplier),
                }))
                : [],
            
            trackingType: (variant as any)?.trackingType ?? "NONE",
            trackedItems: Array.isArray((variant as any)?.productAssetItems)
            ? (variant as any).productAssetItems
                .filter((x: any) => x.status === "IN_STOCK")
                .map((x: any) => ({
                    id: x.id,
                    branchId: x.branchId,
                    assetCode: x.assetCode ?? "",
                    macAddress: x.macAddress ?? "",
                    serialNumber: x.serialNumber ?? "",
                }))
            : [],
        });
        setIsModalOpen(true);
    };
    
    const handleDeleteProduct = async (id: number) => {
        const confirmed = await ShowDeleteConfirmation();
        if (!confirmed) {
            return;
        }

        try {
            await queryClient.invalidateQueries({ queryKey: ["validateToken"] });
            await apiClient.deleteProduct(id);
            toast.success("Product deleted successfully", {
                position: "top-right",
                autoClose: 2000
            });

            fetchProduct();
        } catch (error: any) {
            console.error("Error deleting product:", error);
            toast.error(error.message || "Error deleting product", {
                position: "top-right",
                autoClose: 2000
            });
        }
    };

    const handleStatusChange = async (id: number) => {
        try {
            await queryClient.invalidateQueries({ queryKey: ["validateToken"] });
            await apiClient.statusProduct(id);
            toast.success("Status changed successfully", {
                position: "top-right",
                autoClose: 2000
            });
            fetchProduct();
        } catch (error: any) {
            console.error("Error update status:", error);
            toast.error(error.message || "Error update status", {
                position: "top-right",
                autoClose: 2000
            });
        }
    }

    const API_BASE_URL = import.meta.env.VITE_API_URL || "";

    return (
        <>
            <div className="pt-0">
                <div className="space-y-6">
                    <div className="panel">
                        <div className="relative">
                            <div className="px-0">
                                <div className="md:absolute md:top-0 ltr:md:left-0 rtl:md:right-0">
                                    <div className="mb-5 flex items-center gap-2">
                                        {hasPermission('Product-Create') &&
                                            <button className="btn btn-primary gap-2" onClick={() => { setIsModalOpen(true); setSelectProduct(null) }}>
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
                                                Add New
                                            </button>
                                        }
                                    </div>
                                </div>
                            </div>

                            <div className="dataTable-wrapper dataTable-loading no-footer sortable searchable">
                                <div className="dataTable-top">
                                    <div className="dataTable-search">
                                        <input
                                            className="dataTable-input"
                                            type="text"
                                            placeholder="Search..."
                                            value={search}
                                            onChange={(e) => updateParams({ search: e.target.value, page: 1 })}
                                        />
                                    </div>
                                    <VisibleColumnsSelector
                                        allColumns={columns}
                                        visibleColumns={visibleCols}
                                        onToggleColumn={toggleCol}
                                    />
                                    <ExportDropdown data={exportData} prefix="Product" />
                                </div>
                                <div className="dataTable-container">
                                    {isLoading ? (
                                        <p>Loading...</p>
                                    ) : (
                                        <table id="myTable1" className="whitespace-nowrap dataTable-table">
                                            <thead>
                                                <tr>
                                                    {columns.map(
                                                        (col) =>
                                                        visibleCols.includes(col) && (
                                                            <th
                                                                key={col}
                                                                className="px-4 py-2 font-medium cursor-pointer select-none whitespace-normal break-words max-w-xs"
                                                                onClick={() => handleSort(col)}
                                                            >
                                                                <div className="flex items-center gap-1">
                                                                    {col}
                                                                    {sortField === sortFields[col] ? (
                                                                        sortOrder === "asc" ? (
                                                                            <FontAwesomeIcon icon={faArrowDownAZ} />
                                                                        ) : (
                                                                            <FontAwesomeIcon icon={faArrowUpZA} />
                                                                        )
                                                                    ) : (
                                                                        <FontAwesomeIcon icon={faArrowDownAZ} />
                                                                    )}
                                                                </div>
                                                            </th>
                                                        )
                                                    )}
                                                </tr>
                                            </thead>
                                            <tbody>
                                            {products && products.length > 0 ? (
                                                    products.map((rows, index) => {
                                                        return (
                                                            <tr key={index}>
                                                                {visibleCols.includes("Image") && (
                                                                    <td>
                                                                        <img
                                                                            src={`${API_BASE_URL}/${(Array.isArray(rows.image) ? rows.image[0] : rows.image) || 'images/products/noimage.png'}`}
                                                                            alt={rows.name}
                                                                            width="50"
                                                                            onError={(e) => { (e.target as HTMLImageElement).src = `${API_BASE_URL}/images/products/noimage.png`; }}
                                                                        />
                                                                    </td>
                                                                )}
                                                                {visibleCols.includes("Product") && (
                                                                    <td>{rows.name}</td>
                                                                )}
                                                                {visibleCols.includes("Type") && (
                                                                    <td>
                                                                        <div className="flex flex-col gap-1">
                                                                            {(rows as any).productvariants?.map((v: any, i: number) => (
                                                                                <span key={i} className={`badge ${v.productType === "SecondHand" ? "badge-outline-warning" : "badge-outline-primary"} text-xs`}>
                                                                                    {v.productType === "SecondHand" ? "SecondHand" : "New"}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    </td>
                                                                )}
                                                                {visibleCols.includes("SKU") && (
                                                                    <td>
                                                                        <div className="flex flex-col gap-1">
                                                                            {(rows as any).productvariants?.map((v: any, i: number) => (
                                                                                <span key={i} className="text-sm">{v.sku || "-"}</span>
                                                                            ))}
                                                                        </div>
                                                                    </td>
                                                                )}
                                                                {visibleCols.includes("Barcode") && (
                                                                    <td>
                                                                        <div className="flex flex-col gap-1">
                                                                            {(rows as any).productvariants?.map((v: any, i: number) => (
                                                                                <span key={i} className="text-sm">{v.barcode || "-"}</span>
                                                                            ))}
                                                                        </div>
                                                                    </td>
                                                                )}
                                                                {visibleCols.includes("Category") && (
                                                                    <td>{rows.category ? rows.category.name : ""}</td>
                                                                )}
                                                                {visibleCols.includes("Brand") && (
                                                                    <td>{rows.brand ? rows.brand.en_name : ""}</td>
                                                                )}
                                                                {visibleCols.includes("Status") && (
                                                                    <td>
                                                                        <button onClick={() => rows.id && handleStatusChange(rows.id)}>
                                                                            {rows.isActive == 1
                                                                                ? <span className="badge badge-outline-success"><FontAwesomeIcon icon={faCheck} /> Actived</span>
                                                                                : <span className="badge badge-outline-danger"><FontAwesomeIcon icon={faXmark} /> DisActived</span> 
                                                                            }
                                                                        </button>
                                                                    </td>
                                                                )}
                                                                {visibleCols.includes("Note") && (
                                                                    <td>{rows.note}</td>
                                                                )}
                                                                {visibleCols.includes("Created At") && (
                                                                    <td>{dayjs.tz(rows.createdAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss")}</td>
                                                                )}
                                                                {visibleCols.includes("Created By") && (
                                                                    <td>{rows.creator?.lastName} {rows.creator?.firstName}</td>
                                                                )}
                                                                {visibleCols.includes("Updated At") && (
                                                                    <td>{dayjs.tz(rows.updatedAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss")}</td>
                                                                )}
                                                                {visibleCols.includes("Updated By") && (
                                                                    <td>{rows.updater?.lastName} {rows.updater?.firstName}</td>
                                                                )}
                                                                {visibleCols.includes("Actions") && (
                                                                    <td>
                                                                        <div className="flex gap-2">
                                                                            {/* {hasPermission('Product-Variant-View') &&
                                                                                <NavLink to={`/productvariant/${rows.id}`} title="Product Variants">
                                                                                    <Settings color="blue" />
                                                                                </NavLink>
                                                                            } */}
                                                                            {hasPermission('Product-Edit') &&
                                                                                <button type="button" className="hover:text-warning" onClick={() => handleEditClick(rows)} title="Edit">
                                                                                    <Pencil color="green" />
                                                                                </button>
                                                                            }
                                                                            {hasPermission('Product-Delete') &&
                                                                                <button type="button" className="hover:text-danger" onClick={() => rows.id && handleDeleteProduct(rows.id)} title="Delete">
                                                                                    <Trash2 color="red" />
                                                                                </button>
                                                                            }
                                                                        </div>
                                                                    </td>
                                                                )}
                                                            </tr>
                                                        );
                                                    })
                                                ) : (
                                                    <tr>
                                                        <td colSpan={3}>No Product Found!</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                                <Pagination
                                    page={page}
                                    pageSize={pageSize}
                                    total={total}
                                    onPageChange={(newPage) => updateParams({ page: newPage })}
                                    onPageSizeChange={(newSize) => updateParams({ pageSize: newSize, page: 1 })}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setSecondHandVariant(null); }}
                onSubmit={handleAddorEditProduct}
                product={selectProduct}
                secondHandFullData={secondHandVariant}
            />
        </>
    );
};

export default Product;