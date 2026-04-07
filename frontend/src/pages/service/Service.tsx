import React, { useEffect, useState } from "react";
import * as apiClient from "../../api/service";
import { useAppContext } from "../../hooks/useAppContext";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUpZA, faArrowDownAZ } from '@fortawesome/free-solid-svg-icons';
import Pagination from "../components/Pagination";
import Modal from "./Modal";
import { ServiceType  } from "@/data_types/types";
import { toast } from "react-toastify";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import VisibleColumnsSelector from "@/components/VisibleColumnsSelector";
import ExportDropdown from "@/components/ExportDropdown";
import { Pencil, Trash2 } from "lucide-react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import ShowDeleteConfirmation from "../components/ShowDeleteConfirmation";

// Extend Day.js with plugins
dayjs.extend(utc);
dayjs.extend(timezone);

const columns = [
    "No",
    "Service Code",
    "Service Name",
    "Price",
    "Description",
    "Created At",
    "Created By",
    "Updated At",
    "Updated By",
    "Actions"
];

const sortFields: Record<string, string> = {
    "No": "id",
    "Service Code": "serviceCode",
    "Service Name": "serviceName",
    "Price": "price",
    "Description": "description",
    "Created At": "createdAt",
    "Created By": "createdBy",
    "Updated At": "updatedAt",
    "Updated By": "updatedBy"
};

const Service: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [services, setServices] = useState<ServiceType[]>([]);
    const [selectService, setSelectService] = useState<{ id: number | undefined; serviceCode: string; name: string; description: string, price: number } | null>(null);
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

    const fetchServices = async () => {
        setIsLoading(true);
        try {
            const { data, total } = await apiClient.getAllServicesWithPagination(
                sortField,
                sortOrder,
                page,
                search,
                pageSize
            );
            setServices(data || []);
            setTotal(total || 0);
            setSelected([]);
        } catch (error) {
            console.error("Error fetch service:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchServices();
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

    const exportData = services.map((service, index) => ({
        "No": (page - 1) * pageSize + index + 1,
        "Service Code": service.serviceCode,
        "Service Name": service.name,
        "Price": `$ ${service.price}`,
        "Description": service.description,
        "Created At": service.createdAt ? dayjs.tz(service.createdAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss") : '',
        "Created By": `${service.creator?.lastName || ''} ${service.creator?.firstName || ''}`,
        "Updated At": service.updatedAt ? dayjs.tz(service.updatedAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss") : '',
        "Updated By": `${service.updater?.lastName || ''} ${service.updater?.firstName || ''}`,
    }));

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const queryClient = useQueryClient();

    const handleAddorEditService = async (id: number | null, serviceCode: string, name: string, description: string, price: number) => {
        try {
            await queryClient.invalidateQueries({ queryKey: ["validateToken"] });
            const serviceData: ServiceType = {
                id: id ? id : undefined,
                serviceCode,
                name,
                description,
                price
            };

            await apiClient.upsertService(serviceData);
            if (id) {
                toast.success("Service updated successfully", {
                    position: "top-right",
                    autoClose: 3000
                });
            } else {
                toast.success("Service created successfully", {
                    position: "top-right",
                    autoClose: 5000
                });
            }
            fetchServices();
            setIsModalOpen(false);
        } catch (error: any) {
            // Check if error.message is set by your API function
            if (error.message) {
                toast.error(error.message, {
                    position: "top-right",
                    autoClose: 5000
                });
            } else {
                toast.error("Error adding/editting service", {
                    position: "top-right",
                    autoClose: 5000
                });
            }
        }
    }

    const handleEditClick = (serviceData: ServiceType) => {
        setSelectService({
            id: serviceData.id,
            serviceCode: serviceData.serviceCode,
            name: serviceData.name,
            description: serviceData.description,
            price: serviceData.price
        });
        setIsModalOpen(true);
    };

    const handleDeleteService = async (id: number) => {
        const confirmed = await ShowDeleteConfirmation();
        if (!confirmed) {
            return;
        }

        try {
            await queryClient.invalidateQueries({ queryKey: ["validateToken"] });
            await apiClient.deleteService(id);
            toast.success("Service deleted successfully", {
                position: "top-right",
                autoClose: 3000
            });
            fetchServices();
            setIsModalOpen(false);
            setSelectService(null);
        } catch (error: any) {
            console.error("Error deleting brand:", error);

            toast.error(error.message || "Error deleting brand", {
                position: "top-right",
                autoClose: 5000
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
                                        {hasPermission('Service-Create') &&
                                            <button className="btn btn-primary gap-2" onClick={() => { setIsModalOpen(true); setSelectService(null) }}>
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
                                    <ExportDropdown data={exportData} prefix="Service" />
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
                                            {services && services.length > 0 ? (
                                                    services.map((rows, index) => (
                                                        <tr key={index}>
                                                            {visibleCols.includes("No") && (
                                                                <td>{(page - 1) * pageSize + index + 1}</td>
                                                            )}
                                                            {visibleCols.includes("Service Code") && (
                                                                <td>{rows.serviceCode}</td>
                                                            )}
                                                            {visibleCols.includes("Service Name") && (
                                                                <td>{rows.name}</td>
                                                            )}
                                                            {visibleCols.includes("Price") && (
                                                                <td>$ {rows.price}</td>
                                                            )}
                                                            {visibleCols.includes("Description") && (
                                                                <td>{rows.description}</td>
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
                                                                        {hasPermission('Service-Edit') &&
                                                                            <button type="button" className="hover:text-warning" onClick={() => handleEditClick(rows)} title="Edit">
                                                                                <Pencil color="green" />
                                                                            </button>
                                                                        }
                                                                        {hasPermission('Service-Delete') &&
                                                                            <button type="button" className="hover:text-danger" onClick={() => rows.id && handleDeleteService(rows.id)} title="Delete">
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
                                                        <td colSpan={3}>No Branch Found!</td>
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
                onSubmit={handleAddorEditService}
                service={selectService}
            />
        </>
    );
};

export default Service;