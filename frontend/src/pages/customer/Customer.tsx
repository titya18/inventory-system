import React, { useEffect, useState } from "react";
import * as apiClient from "../../api/customer";
import { useAppContext } from "../../hooks/useAppContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import Modal from "./Modal";
import { upsertCustomerAction } from "@/utils/customerActions";
import Pagination from "../components/Pagination";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUpZA, faArrowDownAZ } from '@fortawesome/free-solid-svg-icons';
import { CustomerType } from "@/data_types/types";
import { useSearchParams } from "react-router-dom";
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
    "No",
    "Customer's Name",
    "Phone",
    "Email",
    "Address",
    "Created At",
    "Created By",
    "Updated At",
    "Updated By",
    "Actions"
];

const sortFields: Record<string, string> = {
    "No": "id",
    "Customer's Name": "name",
    "Phone": "phone",
    "Email": "email",
    "Address": "address",
    "Created At": "createdAt",
    "Created By": "createdBy",
    "Updated At": "updatedAt",
    "Updated By": "updatedBy"
};

export const Customer = () => {
// const Customer: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [customers, setCustomers] = useState<CustomerType[]>([]);
    const [selectCustomer, setSelectCustomer] = useState<CustomerType | null>(null);
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

    const fetchCustomers = async () => {
        setIsLoading(true);
        try {
            const { data, total } = await apiClient.getAllCustomersWithPagination(
                sortField,
                sortOrder,
                page,
                search,
                pageSize
            );
            setCustomers(data || []);
            setTotal(total || 0);
            setSelected([]);
        } catch (error) {
            console.error("Error fetching customer:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
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

    const exportData = customers.map((customer, index) => ({
        "No": (page - 1) * pageSize + index + 1,
        "Customer's Name": customer.name,
        "Phone": customer.phone,
        "Email": customer.email,
        "Address": customer.address,
        "Created At": customer.createdAt ? dayjs.tz(customer.createdAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss") : '',
        "Created By": `${customer.creator?.lastName || ''} ${customer.creator?.firstName || ''}`,
        "Updated At": customer.updatedAt ? dayjs.tz(customer.updatedAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss") : '',
        "Updated By": `${customer.updater?.lastName || ''} ${customer.updater?.firstName || ''}`,
    }));

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const queryClient = useQueryClient();
    const handleAddorEditCustomer = (payload: { data: CustomerType }) => {
        return upsertCustomerAction(
            payload,
            () => queryClient.invalidateQueries({ queryKey: ["validateToken"] }),
            fetchCustomers,
            () => setIsModalOpen(false)
        );
    };

    const handleEditClick = (customerData: CustomerType) => {
        setSelectCustomer(customerData);
        setIsModalOpen(true);
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
                                        {hasPermission('Customer-Create') &&
                                            <button className="btn btn-primary gap-2" onClick={() => { setIsModalOpen(true); setSelectCustomer(null) }}>
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
                                    <ExportDropdown data={exportData} prefix="Customer" />
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
                                            {customers && customers.length > 0 ? (
                                                    customers.map((rows, index) => (
                                                        <tr key={index}>
                                                            {visibleCols.includes("No") && (
                                                                <td>{(page - 1) * pageSize + index + 1}</td>
                                                            )}
                                                            {visibleCols.includes("Customer's Name") && (
                                                                <td>{rows.name}</td>
                                                            )}
                                                            {visibleCols.includes("Phone") && (
                                                                <td>{rows.phone}</td>
                                                            )}
                                                            {visibleCols.includes("Email") && (
                                                                <td>{rows.email}</td>
                                                            )}
                                                            {visibleCols.includes("Address") && (
                                                                <td>{rows.address}</td>
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
                                                                        {hasPermission('Customer-Edit') &&
                                                                            <button type="button" className="hover:text-warning" onClick={() => handleEditClick(rows)} title="Edit">
                                                                                <Pencil color="green" />
                                                                            </button>
                                                                        }
                                                                        {/* {hasPermission('Category-Delete') &&
                                                                            <button type="button" className="hover:text-danger" onClick={() => rows.id && handleDeleteCategory(rows.id)} title="Delete">
                                                                                <Trash2 color="red" />
                                                                            </button>
                                                                        } */}
                                                                    </div>
                                                                </td>
                                                            )}
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan={3}>No Category Found!</td>
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
                onSubmit={handleAddorEditCustomer}
                customer={selectCustomer}
            />
        </>
    );
};

// export default Customer;