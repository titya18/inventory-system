import React, { useEffect, useState } from "react";
import { ProductVariantType } from "../../data_types/types";
import * as apiClient from "../../api/productVariant";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUpZA, faArrowDownAZ, faCheck, faXmark } from '@fortawesome/free-solid-svg-icons';
import { useAppContext } from "../../hooks/useAppContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import Pagination from "../components/Pagination";
import Modal from "./Modal";
import { NavLink, useParams, useSearchParams } from "react-router-dom";
import VisibleColumnsSelector from "@/components/VisibleColumnsSelector";
import ExportDropdown from "@/components/ExportDropdown";
import { Pencil, Trash2 } from "lucide-react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

// Extend Day.js with plugins
dayjs.extend(utc);
dayjs.extend(timezone);

const columns = [
    "Image",
    "Barcode",
    "SKU",
    "Product's Name",
    "Variant's Name",
    "Purchase Price",
    "Retail Price",
    "Whole Sale Price",
    "Unit",
    "Status",
    "Created At",
    "Created By",
    "Updated At",
    "Updated By",
    "Actions"
];

const DEFAULT_VISIBLE_COLUMNS = [
    "Image",
    "Barcode",
    "SKU",
    "Product's Name",
    "Variant's Name",
    "Purchase Price",
    "Retail Price",
    "Whole Sale Price",
    "Unit",
    "Status",
    "Actions"
];

const sortFields: Record<string, string> = {
    "Barcode": "barcode",
    "SKU": "sku",
    "Product's Name": "products.name",
    "Variant's Name": "name",
    "Purchase Price": "purchasePrice",
    "Retail Price": "retailPrice",
    "Whole Sale Price": "wholeSalePrice",
    "Product": "productId",
    "Unit": "unitId",
    "Status": "isActive",
    "Created At": "createdAt",
    "Created By": "createdBy",
    "Updated At": "updatedAt",
    "Updated By": "updatedBy"
};

const ProductVariant: React.FC = () => {
    const { id: productId } = useParams<{ id: string }>(); // Assuming `:id` in your route
    const [isLoading, setIsLoading] = useState(false);
    const [productVariant, setProductVariants] = useState<ProductVariantType[]>([]);
    const [selectProductVariant, setSelectProductVariant] = useState<ProductVariantType | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [searchParams, setSearchParams] = useSearchParams();
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
    const sortField = searchParams.get("sortField") || "name";
    const rawSortOrder = searchParams.get("sortOrder");
    const sortOrder: "asc" | "desc" = rawSortOrder === "desc" ? "desc" : "asc";
    const [total, setTotal] = useState(0);
    const [selected, setSelected] = useState<number[]>([]);
    const [visibleCols, setVisibleCols] = useState(DEFAULT_VISIBLE_COLUMNS);

    const updateParams = (params: Record<string, unknown>) => {
        const newParams = new URLSearchParams(searchParams.toString());
        Object.entries(params).forEach(([key, value]) => {
            newParams.set(key, String(value));
        });
        setSearchParams(newParams);
    };

    const { hasPermission } = useAppContext();

    const fetchProductVariant = async () => {
       
        if (!productId) {
            console.error("Product ID is missing from URL.");
            return;
        }
        
        setIsLoading(true);
        try {
            const { data, total } = await apiClient.getAllProductVariants(
                parseInt(productId, 10), 
                sortField,
                sortOrder,
                page,
                search,
                pageSize);
            // If the API return type doesn't exactly match ProductVariantType, cast via unknown first to acknowledge intentional conversion
            setProductVariants(data || []);
            setTotal(total || 0);
            setSelected([]);

            // setProductVariants(data as unknown as ProductVariantType[]);
            // setTotalItems(total);
            // setTotalPages(Math.ceil(total / itemsPerPage));
        } catch (error) {
            console.error("Error fetching prduct:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchProductVariant();
    }, [productId, search, page, sortField, sortOrder, pageSize]);

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

    const exportData = productVariant.map((pro_variant, index) => ({
        "Name": pro_variant.name,
        "Barcode": pro_variant.barcode,
        "SKU": pro_variant.sku,
        "Purchase Price": pro_variant.purchasePrice,
        "Retail Price": pro_variant.retailPrice,
        "Whole Sale Price": pro_variant.wholeSalePrice,
        "Product": pro_variant.productId,
        "Unit": pro_variant.unitId,
        "Status": pro_variant.isActive,
        "Created At": pro_variant.createdAt ? dayjs.tz(pro_variant.createdAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss") : '',
        "Created By": `${pro_variant.creator?.lastName || ''} ${pro_variant.creator?.firstName || ''}`,
        "Updated At": pro_variant.updatedAt ? dayjs.tz(pro_variant.updatedAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss") : '',
        "Updated By": `${pro_variant.updater?.lastName || ''} ${pro_variant.updater?.firstName || ''}`,
    }));

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const queryClient = useQueryClient();

    const handleAddorEditProductVariant = async (
        id: number | null, 
        productId: number, 
        unitId: number | null, 
        barcode: string | null, 
        sku: string,
        name: string, 
        purchasePrice: number | string, 
        retailPrice: number | string, 
        wholeSalePrice: number | string, 
        isActive: number, 
        image: File[] | null, 
        imagesToDelete: string[],
        variantAttributeIds?: number[] | null,     
        variantValueIds?: number[]             
    ) => {
            try {
                await queryClient.invalidateQueries({ queryKey: ["validateToken"] });
                const productVariantData: ProductVariantType = {
                    id: id ? id : 0,
                    productId: productId ?? 0, // Fallback to 0 if null
                    unitId: unitId ?? 0, // Fallback to 0 if null
                    barcode: barcode ?? '',
                    sku,
                    name,
                    purchasePrice,
                    retailPrice,
                    wholeSalePrice,
                    isActive,
                    image,
                    imagesToDelete,
                    variantAttributeIds: variantAttributeIds ?? undefined,
                    variantValueIds: variantValueIds ?? [],
                };

                // console.log("ImagesToDelete:",imagesToDelete);
                await apiClient.upsertProductVariant(productVariantData);
                toast.success(id ? "Variant updated successfully" : "Variant created successfully", {
                    position: "top-right",
                    autoClose: 2000
                });
                fetchProductVariant();
                setIsModalOpen(false);
            } catch (error: any) {
                throw error;
            }
    };

    const handleEditClick = (productVariantData: ProductVariantType) => {
        setSelectProductVariant({
            ...productVariantData,
            imagesToDelete: productVariantData.imagesToDelete ?? [],
            variantAttributeIds: productVariantData.variantAttributeIds ?? undefined,
            variantValueIds: productVariantData.variantValueIds ?? [],
        });

        setIsModalOpen(true);
    };

    const showDeleteConfirmation = async (): Promise<boolean> => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, delete it!'
        });
    
        return result.isConfirmed;
    };
    
    const handleDeleteProductVariant = async (id: number) => {
        const confirmed = await showDeleteConfirmation();
        if (!confirmed) {
            return;
        }

        try {
            await queryClient.invalidateQueries({ queryKey: ["validateToken"] });
            await apiClient.deleteProductVaraint(id);
            toast.success("Varaint deleted successfully", {
                position: "top-right",
                autoClose: 2000
            });

            fetchProductVariant();
        } catch (error: any) {
            console.error("Error deleting variant:", error);
            toast.error(error.message || "Error deleting variant", {
                position: "top-right",
                autoClose: 2000
            });
        }
    };

    const handleStatusChange = async (id: number) => {
        try {
            await queryClient.invalidateQueries({ queryKey: ["validateToken"] });
            await apiClient.statusProductVariant(id);
            toast.success("Status changed successfully", {
                position: "top-right",
                autoClose: 2000
            });
            fetchProductVariant();
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
                                        {hasPermission('Product-Variant-Create') &&
                                            <button className="btn btn-primary gap-2" onClick={() => { setIsModalOpen(true); setSelectProductVariant(null) }}>
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
                                        <NavLink to="/products">
                                            <button className="btn btn-warning gap-2">
                                                <svg 
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    width="24px"
                                                    height="24px"
                                                    viewBox="0 0 448 512"
                                                    fill="white"
                                                    stroke="currentColor"
                                                    strokeWidth="1.5"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    className="h-4 w-5"
                                                >
                                                    <path d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.2 288 416 288c17.7 0 32-14.3 32-32s-14.3-32-32-32l-306.7 0L214.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-160 160z"/>
                                                </svg>
                                                Back to product
                                            </button>
                                        </NavLink>
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
                                    <ExportDropdown data={exportData} prefix="Product_Variant" />
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
                                            {productVariant && productVariant.length > 0 ? (
                                                    productVariant.map((rows, index) => {
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
                                                                {visibleCols.includes("Barcode") && (
                                                                    <td>{rows.barcode}</td>
                                                                )}
                                                                {visibleCols.includes("SKU") && (
                                                                    <td>{rows.sku}</td>
                                                                )}
                                                                {visibleCols.includes("Product's Name") && (
                                                                    <td>{rows.products ? rows.products?.name : ""}</td>
                                                                )} 
                                                                {visibleCols.includes("Variant's Name") && (
                                                                    <td>{rows.name}</td>
                                                                )}
                                                                {visibleCols.includes("Purchase Price") && (
                                                                    <td>$ { Number(rows.purchasePrice).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',') }</td>
                                                                )}
                                                                {visibleCols.includes("Retail Price") && (
                                                                    <td>$ { Number(rows.retailPrice).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',') }</td>
                                                                )}
                                                                {visibleCols.includes("Whole Sale Price") && (
                                                                    <td>$ { Number(rows.wholeSalePrice).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',') }</td>
                                                                )}
                                                                {visibleCols.includes("Unit") && (
                                                                    <td>{rows.units ? rows.units.name : ""}</td>
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
                                                                    <td className="text-center">
                                                                        <div className="flex gap-2">
                                                                            {hasPermission('Product-Variant-Edit') &&
                                                                                <button type="button" className="hover:text-warning" onClick={() => handleEditClick(rows)} title="Edit">
                                                                                    <Pencil color="green" />
                                                                                </button>
                                                                            }
                                                                            {hasPermission('Product-Variant-Delete') &&
                                                                                <button type="button" className="hover:text-danger" onClick={() => rows.id && handleDeleteProductVariant(rows.id)} title="Delete">
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
                                                        <td colSpan={3}>No Product Varaint Found!</td>
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
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleAddorEditProductVariant}
                productVariant={selectProductVariant}
            />
        </>
    );
};

export default ProductVariant;