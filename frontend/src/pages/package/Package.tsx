import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as apiClient from "@/api/package";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUpZA, faArrowDownAZ } from '@fortawesome/free-solid-svg-icons';
import { useAppContext } from "@/hooks/useAppContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import Pagination from "@/pages/components/Pagination";
import ShowDeleteConfirmation from "@/pages/components/ShowDeleteConfirmation";
import { PackageType } from "@/data_types/types";
import { useSearchParams } from "react-router-dom";
import VisibleColumnsSelector from "@/components/VisibleColumnsSelector";
import ExportDropdown from "@/components/ExportDropdown";
import { Pencil, Trash2, PackageSearch } from "lucide-react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const columns = [
    "No",
    "Name",
    "SKU",
    "Barcode",
    "Components",
    "Retail Price",
    "Wholesale Price",
    "Active",
    "Created At",
    "Created By",
    "Updated At",
    "Updated By",
    "Actions"
];

const sortFields: Record<string, string> = {
    "No": "id",
    "Name": "name",
    "SKU": "sku",
    "Barcode": "barcode",
    "Retail Price": "packageRetailPrice",
    "Created At": "createdAt",
    "Updated At": "updatedAt",
};

const Package: React.FC = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [packages, setPackages] = useState<PackageType[]>([]);

    const [searchParams, setSearchParams] = useSearchParams();
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
    const sortField = searchParams.get("sortField") || "name";
    const rawSortOrder = searchParams.get("sortOrder");
    const sortOrder: "asc" | "desc" = rawSortOrder === "desc" ? "desc" : "asc";
    const [total, setTotal] = useState(0);
    const [visibleCols, setVisibleCols] = useState(columns);

    const updateParams = (params: Record<string, unknown>) => {
        const newParams = new URLSearchParams(searchParams.toString());
        Object.entries(params).forEach(([key, value]) => {
            newParams.set(key, String(value));
        });
        setSearchParams(newParams);
    };

    const { hasPermission } = useAppContext();

    const fetchPackages = async () => {
        setIsLoading(true);
        try {
            const { data, total } = await apiClient.getAllPackagesWithPagination(
                sortField,
                sortOrder,
                page,
                search,
                pageSize
            );
            setPackages(data || []);
            setTotal(total || 0);
        } catch (error) {
            console.error("Error fetching packages:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPackages();
    }, [search, page, sortField, sortOrder, pageSize]);

    const toggleCol = (col: string) => {
        setVisibleCols((prev) =>
            prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
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

    const exportData = packages.map((pkg, index) => ({
        "No": (page - 1) * pageSize + index + 1,
        "Name": pkg.name,
        "SKU": pkg.sku || '',
        "Barcode": pkg.barcode || '',
        "Components": (pkg.items || []).length,
        "Retail Price": pkg.packageRetailPrice,
        "Wholesale Price": pkg.packageWholeSalePrice || '',
        "Active": pkg.isActive ? "Yes" : "No",
        "Created At": pkg.createdAt ? dayjs.tz(pkg.createdAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss") : '',
        "Created By": `${pkg.creator?.lastName || ''} ${pkg.creator?.firstName || ''}`,
        "Updated At": pkg.updatedAt ? dayjs.tz(pkg.updatedAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss") : '',
        "Updated By": `${pkg.updater?.lastName || ''} ${pkg.updater?.firstName || ''}`,
    }));

    const QueryClient = useQueryClient();

    const handleDeletePackage = async (id: number) => {
        const confirmed = await ShowDeleteConfirmation();
        if (!confirmed) return;

        try {
            await QueryClient.invalidateQueries({ queryKey: ["validateToken"] });
            await apiClient.deletePackage(id);
            toast.success("Package deleted successfully", { position: "top-right", autoClose: 2000 });
            fetchPackages();
        } catch (err: any) {
            console.error("Error deleting package:", err);
            toast.error(err.message || "Error deleting package", { position: "top-right", autoClose: 2000 });
        }
    };

    return (
        <div className="pt-0">
            <div className="space-y-6">
                <div className="panel">
                    <div className="relative">
                        <div className="px-0">
                            <div className="md:absolute md:top-0 ltr:md:left-0 rtl:md:right-0">
                                <div className="mb-5 flex items-center gap-2">
                                    {hasPermission('Package-Create') &&
                                        <button className="btn btn-primary gap-2" onClick={() => navigate('/packages/create')}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                                <line x1="5" y1="12" x2="19" y2="12"></line>
                                            </svg>
                                            Add New Package
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
                                <ExportDropdown data={exportData} prefix="packages" />
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
                                                                ) : sortFields[col] ? (
                                                                    <FontAwesomeIcon icon={faArrowDownAZ} />
                                                                ) : null}
                                                            </div>
                                                        </th>
                                                    )
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody>
                                        {packages && packages.length > 0 ? (
                                                packages.map((rows, index) => (
                                                    <tr key={rows.id ?? index}>
                                                        {visibleCols.includes("No") && (
                                                            <td>{(page - 1) * pageSize + index + 1}</td>
                                                        )}
                                                        {visibleCols.includes("Name") && (
                                                            <td>
                                                                <div className="flex items-center gap-2">
                                                                    <PackageSearch size={16} className="text-primary" />
                                                                    {rows.name}
                                                                </div>
                                                            </td>
                                                        )}
                                                        {visibleCols.includes("SKU") && (
                                                            <td>{rows.sku || '-'}</td>
                                                        )}
                                                        {visibleCols.includes("Barcode") && (
                                                            <td>{rows.barcode || '-'}</td>
                                                        )}
                                                        {visibleCols.includes("Components") && (
                                                            <td>
                                                                <span className="badge bg-primary/10 text-primary">
                                                                    {(rows.items || []).length} item(s)
                                                                </span>
                                                            </td>
                                                        )}
                                                        {visibleCols.includes("Retail Price") && (
                                                            <td>${Number(rows.packageRetailPrice).toFixed(2)}</td>
                                                        )}
                                                        {visibleCols.includes("Wholesale Price") && (
                                                            <td>{rows.packageWholeSalePrice ? `$${Number(rows.packageWholeSalePrice).toFixed(2)}` : '-'}</td>
                                                        )}
                                                        {visibleCols.includes("Active") && (
                                                            <td>
                                                                <span className={`badge ${rows.isActive ? 'bg-success' : 'bg-danger'}`}>
                                                                    {rows.isActive ? "Active" : "Inactive"}
                                                                </span>
                                                            </td>
                                                        )}
                                                        {visibleCols.includes("Created At") && (
                                                            <td>{rows.createdAt ? dayjs.tz(rows.createdAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss") : ''}</td>
                                                        )}
                                                        {visibleCols.includes("Created By") && (
                                                            <td>{rows.creator?.lastName} {rows.creator?.firstName}</td>
                                                        )}
                                                        {visibleCols.includes("Updated At") && (
                                                            <td>{rows.updatedAt ? dayjs.tz(rows.updatedAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss") : ''}</td>
                                                        )}
                                                        {visibleCols.includes("Updated By") && (
                                                            <td>{rows.updater?.lastName} {rows.updater?.firstName}</td>
                                                        )}
                                                        {visibleCols.includes("Actions") && (
                                                            <td className="text-center">
                                                                <div className="flex items-center justify-center gap-2">
                                                                    {hasPermission('Package-Edit') &&
                                                                        <button type="button" className="hover:text-warning" onClick={() => rows.id && navigate(`/packages/${rows.id}/edit`)} title="Edit">
                                                                            <Pencil color="green" />
                                                                        </button>
                                                                    }
                                                                    {hasPermission('Package-Delete') &&
                                                                        <button type="button" className="hover:text-danger" onClick={() => rows.id && handleDeletePackage(rows.id)} title="Delete">
                                                                            <Trash2 color="red" />
                                                                        </button>
                                                                    }
                                                                </div>
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={columns.length}>No Package Found!</td>
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
    );
};

export default Package;
