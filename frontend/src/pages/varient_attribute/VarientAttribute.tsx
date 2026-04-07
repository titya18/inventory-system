import React, { useEffect, useState } from "react";
import { useAppContext } from "../../hooks/useAppContext";
import { useQueryClient } from "@tanstack/react-query";
import * as apiClient from "../../api/varientAttribute";
import { VarientAttributeType } from "../../data_types/types";
import { toast } from "react-toastify";
import Pagination from "../components/Pagination";
import ShowDeleteConfirmation from "../components/ShowDeleteConfirmation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowUpZA, faArrowDownAZ } from "@fortawesome/free-solid-svg-icons";
import Modal from "./Modal";
import { useSearchParams } from "react-router-dom";
import { Pencil, Trash2 } from "lucide-react";
import VisibleColumnsSelector from "@/components/VisibleColumnsSelector";
import ExportDropdown from "@/components/ExportDropdown";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

// Extend Day.js with plugins
dayjs.extend(utc);
dayjs.extend(timezone);

const columns = [
    "No",
    "Varient Attribute's Name",
    "Created At",
    "Created By",
    "Updated At",
    "Updated By",
    "Actions"
];

const sortFields: Record<string, string> = {
    "No": "id",
    "Varient Attribute's Name": "name",
    "Created At": "createdAt",
    "Created By": "creatorName",
    "Updated At": "updatedAt",
    "Updated By": "updaterName"
};

const VarientAttribute: React.FC = () => {
    const queryClient = useQueryClient();
    const [varientAttributes, setVarientAttributes] = useState<VarientAttributeType[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedVarientAttribute, setSelectedVarientAttribute] = useState<{ id: number | undefined; name: string; values: string[]; } | null>(null);
    const { hasPermission } = useAppContext();

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

    // Fetch varient attributes
    const fetchVarientAttributes = async () => {
        try {
            setIsLoading(true);
            const { data, total } = await apiClient.getAllVarientAttributesWithPagination(
                sortField,
                sortOrder,
                page,
                search,
                pageSize
            );
            setVarientAttributes(data || []);
            setTotal(total || 0);
            setSelected([]);
        } catch (error) {
            toast.error("Error fetching varient attributes");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchVarientAttributes();
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

    const exportData = varientAttributes.map((variant, index) => ({
        "No": (page - 1) * pageSize + index + 1,
        "Varient Attribute's Name": variant.name,
        "Created At": variant.createdAt ? dayjs.tz(variant.createdAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss") : '',
        "Created By": `${variant.creator?.lastName || ''} ${variant.creator?.firstName || ''}`,
        "Updated At": variant.updatedAt ? dayjs.tz(variant.updatedAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss") : '',
        "Updated By": `${variant.updater?.lastName || ''} ${variant.updater?.firstName || ''}`,
    }));
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const QueryClient = useQueryClient();
    const handleAddorEditVarientAttribute = async (id: number | null, name: string, values: string[] | null) => {
        try {
            await QueryClient.invalidateQueries({ queryKey: ["validateToken"] });
            const varientAttributeData: VarientAttributeType = {
                id: id ? id : undefined,
                name,
                values: values ? values.map((value) => ({ value: value })) : [] // Map string[] to VarientAttributeValueType[]
            };

            await apiClient.upsertVarientAttribute(varientAttributeData);
            if (id) {
                toast.success("Varient Attribute updated successfully", {
                    position: "top-right",
                    autoClose: 2000
                });
            } else {
                toast.success("Varient Attribute created successfully", {
                    position: "top-right",
                    autoClose: 2000
                });
            }
            fetchVarientAttributes();
            setIsModalOpen(false);
        } catch (error: any) {
            // Check if error.message is set by your API function
            if (error.message) {
                toast.error(error.message, {
                    position: "top-right",
                    autoClose: 4000
                });
            } else {
                toast.error("Error adding/editting unit", {
                    position: "top-right",
                    autoClose: 4000
                })
            }
        }
    };

    const handleEditClick = (varientAttributeData: VarientAttributeType) => {
        const safeValues = Array.isArray(varientAttributeData.values)
            ? varientAttributeData.values
            : [];
        setSelectedVarientAttribute({
            id: varientAttributeData.id,
            name: varientAttributeData.name,
            values: safeValues.map(v => v.value)
        });

        setIsModalOpen(true);
    };

    const handleDeleteVarientAttribute = async (id: number) => {
        const confirmed = await ShowDeleteConfirmation();
        if (!confirmed) {
            return;
        }

        try {
            await queryClient.invalidateQueries({ queryKey: ["validateToken"] });
            await apiClient.deleteVarientAttribute(id);
            toast.success("Varient Attribute deleted successfully", {
                position: 'top-right',
                autoClose: 2000
            });
        
            fetchVarientAttributes();
            setIsModalOpen(false);
            setSelectedVarientAttribute(null);
        } catch (err: any) {
            console.error("Error deleting varient attribute:", err);
        
            toast.error(err.message || "Error deleting varient attribute", {
                position: 'top-right',
                autoClose: 4000
            });
        }
    };

    return (
        <>
            <div className="pt-0">
                <div className="space-y-6">
                    <div className="panel">
                        <div className="relative">
                            <div className="px-0">
                                <div className="md:absolute md:top-0 ltr:md:left-0 rtl:md:right-0">
                                    <div className="mb-5 flex items-center gap-2">
                                        {hasPermission('Varient-Attribute-Create') &&
                                            <button className="btn btn-primary gap-2" onClick={() => { setIsModalOpen(true); setSelectedVarientAttribute(null); }}>
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
                                    <ExportDropdown data={exportData} prefix="VarientAttribute" />
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
                                                {varientAttributes && varientAttributes.length > 0 ? (
                                                    varientAttributes.map((row, index) => (
                                                        <tr key={index}>
                                                            {visibleCols.includes("No") && (
                                                                <td>{(page - 1) * pageSize + index + 1}</td>
                                                            )}
                                                            {visibleCols.includes("Varient Attribute's Name") && (
                                                                <td>{row.name}</td>
                                                            )}
                                                            {visibleCols.includes("Created At") && (
                                                                <td>{dayjs.tz(row.createdAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss")}</td>
                                                            )}
                                                            {visibleCols.includes("Created By") && (
                                                                <td>{row.creator?.lastName} {row.creator?.firstName}</td>
                                                            )}
                                                            {visibleCols.includes("Updated At") && (
                                                                <td>{dayjs.tz(row.updatedAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss")}</td>
                                                            )}
                                                            {visibleCols.includes("Updated By") && (
                                                                <td>{row.updater?.lastName} {row.updater?.firstName}</td>
                                                            )}
                                                            {visibleCols.includes("Actions") && (
                                                                <td className="text-center">
                                                                    <div className="flex gap-2">
                                                                        {hasPermission('Varient-Attribute-Edit') &&
                                                                            <button type="button" className="hover:text-warning" onClick={() => handleEditClick(row)} title="Edit">
                                                                                <Pencil color="green" />
                                                                            </button>
                                                                        }
                                                                        {hasPermission('Varient-Attribute-Delete') &&
                                                                            <button type="button" className="hover:text-danger" onClick={() => row.id && handleDeleteVarientAttribute(row.id)} title="Delete">
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
                                                        <td colSpan={3}>No Module Permission Found!</td>
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
                onSubmit={handleAddorEditVarientAttribute}
                varientAttributeData={selectedVarientAttribute}
            />
        </>
    );
};

export default VarientAttribute;

