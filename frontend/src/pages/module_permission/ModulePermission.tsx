import React, { useEffect, useState } from "react";
import * as apiClient from "../../api/module_permission";
import Pagination from "../components/Pagination";
import ShowDeleteConfirmation from "../components/ShowDeleteConfirmation";
import { useQueryClient } from "@tanstack/react-query";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUpZA, faArrowDownAZ } from '@fortawesome/free-solid-svg-icons';
import Modal from "./Modal";
import { toast } from "react-toastify";
import { useAppContext } from "../../hooks/useAppContext";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { useSearchParams } from "react-router-dom";
import { permission } from "process";
import VisibleColumnsSelector from "@/components/VisibleColumnsSelector";
import ExportDropdown from "@/components/ExportDropdown";
import { Pencil, Trash2 } from "lucide-react";

// Extend Day.js with plugins
dayjs.extend(utc);
dayjs.extend(timezone);

export interface PermissionData {
    name: string;
}

export interface ModulePermissionData {
    id?: number;
    name: string;
    permissions: PermissionData[]; // Array of objects
}

const columns = [
    "No",
    "Module's name",
    "Actions"
];

const sortFields: Record<string, string> = {
    "No": "id",
    "Module's name": "name",
};

const ModulePermission: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [modulePermission, setModulePermission] = useState<ModulePermissionData[]>([]);
    const [selectModulePermission, setSelectModulePermission] = useState<{ id: number | undefined; name: string; permissions: string[]; } | null>(null);
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
    const [visibleCols, setVisibleCols] = useState(columns);

    const updateParams = (params: Record<string, unknown>) => {
        const newParams = new URLSearchParams(searchParams.toString());
        Object.entries(params).forEach(([key, value]) => {
            newParams.set(key, String(value));
        });
        setSearchParams(newParams);
    };

    const { hasPermission } = useAppContext();

    const fetchModulePermission = async () => {
        setIsLoading(true);
        try {
            const { data, total } = await apiClient.getAllModulesWithPagination(
                sortField,
                sortOrder,
                page,
                search,
                pageSize
            );
            setModulePermission(data || []);
            setTotal(total || 0);
            setSelected([]);
        } catch (error) {
            console.error("Error fetching module permission:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchModulePermission();
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

    const exportData = modulePermission.map((module, index) => ({
        "No": (page - 1) * pageSize + index + 1,
        "Name": module.name,
    }));

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const queryClient = useQueryClient();

    const handleAddorEditModulePermission = async (id: number | null, name: string, permissions: string[] | null) => {
        try {
            await queryClient.invalidateQueries({ queryKey: ["validateToken"] });
            const modulePermissionData: ModulePermissionData = {
                id: id ? id : undefined,
                name,
                permissions: permissions ? permissions.map((permission) => ({ name: permission })) : [] // Map string[] to PermissionData[]
            };

            await apiClient.upsertModule(modulePermissionData);
            if (id) {
                toast.success("Module Permission updated successfully", {
                    position: 'top-right',
                    autoClose: 2000
                });
            } else {
                toast.success("Module Permission created successfully",{
                    position: 'top-right',
                    autoClose: 2000
                });
            }
            fetchModulePermission();
            setIsModalOpen(false);
        } catch (error: any) {
            // Check if err.message is set by your API function
            if (error.message) {
                toast.error(error.message, {
                    position: 'top-right',
                    autoClose: 2000
                });
            } else {
                toast.error("Error adding/editing module permission", {
                    position: 'top-right',
                    autoClose: 2000
                });
            }
            
            if (id && selectModulePermission) {
                setSelectModulePermission({ ...selectModulePermission, name, permissions: permissions ?? [] }); // Handle null here as well
            }
        }
    };

    const handleEditClick = (modulePermission: ModulePermissionData) => {
        setSelectModulePermission({
            id: modulePermission.id,
            name: modulePermission.name,
            permissions: modulePermission.permissions.map((p) => p.name), // Extract permission names
        });
        setIsModalOpen(true);
    };
    const handleDeletePermission = async (id: number) => {
        const confirmed = await ShowDeleteConfirmation();
        if (!confirmed) {
            return;
        }

        try {
            await queryClient.invalidateQueries({ queryKey: ["validateToken"] });
            await apiClient.deleteModule(id);
            toast.success("Module deleted successfully", {
                position: 'top-right',
                autoClose: 2000
            });
        
            fetchModulePermission();
            setIsModalOpen(false);
            setSelectModulePermission(null);
        } catch (err: any) {
            console.error("Error deleting permission:", err);
        
            toast.error(err.message || "Error deleting permission", {
                position: 'top-right',
                autoClose: 2000
            });
        }
    }

    return (
        <>
            <div className="pt-0">
                <div className="space-y-6">
                    <div className="panel">
                        <div className="relative">
                            <div className="px-0">
                                <div className="md:absolute md:top-0 ltr:md:left-0 rtl:md:right-0">
                                    <div className="mb-5 flex items-center gap-2">
                                        {hasPermission('Permission-Create') &&
                                            <button className="btn btn-primary gap-2" onClick={() => { setIsModalOpen(true); setSelectModulePermission(null); }}>
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
                                    <ExportDropdown data={exportData} prefix="modules" />
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
                                                {modulePermission && modulePermission.length > 0 ? (
                                                    modulePermission.map((row, index) => (
                                                        <tr key={index}>
                                                            {visibleCols.includes("No") && (
                                                                <td>{(page - 1) * pageSize + index + 1}</td>
                                                            )}
                                                            {/* <td>
                                                                {row.permissions.map((p) => (
                                                                    p.name
                                                                ))}
                                                            </td> */}
                                                            {visibleCols.includes("Module's name") && (
                                                                <td>{row.name}</td>
                                                            )}
                                                            {visibleCols.includes("Actions") && (
                                                            <td className="text-center">
                                                                <div className="flex items-center justify-center gap-2">
                                                                    {hasPermission('Permission-Edit') &&
                                                                        <button type="button" className="hover:text-warning" onClick={() => handleEditClick(row)} title="Edit">
                                                                            <Pencil color="green" />
                                                                        </button>
                                                                    }
                                                                    {hasPermission('Permission-Delete') &&
                                                                        <button type="button" className="hover:text-danger" onClick={() => row.id && handleDeletePermission(row.id)} title="Delete">
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
                onSubmit={handleAddorEditModulePermission}
                modulePermission={selectModulePermission}
            />
        </>
    );
}

export default ModulePermission;  