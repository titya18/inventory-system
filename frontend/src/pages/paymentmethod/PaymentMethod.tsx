import React, { useEffect, useState } from "react";
import * as apiClient from "../../api/paymentMethod";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUpZA, faArrowDownAZ } from '@fortawesome/free-solid-svg-icons';
import Modal from "./Modal";
import { useAppContext } from "../../hooks/useAppContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import Pagination from "../components/Pagination";
import ShowDeleteConfirmation from "../components/ShowDeleteConfirmation";
import { PaymentMethodType } from "@/data_types/types";
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
    "Name",
    "Created At",
    "Created By",
    "Updated At",
    "Updated By",
    "Actions"
];

const sortFields: Record<string, string> = {
    "No": "id",
    "Name": "name",
    "Created At": "createdAt",
    "Created By": "createdBy",
    "Updated At": "updatedAt",
    "Updated By": "updatedBy",
};

const PaymentMethod: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethodType[]>([]);
    const [selectPaymentMethod, setSelectPaymentMethod] = useState<{ id: number | undefined, name: string} | null>(null);
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

    const fetchPaymentMethods = async () => {
        setIsLoading(true);
        try {
            const { data, total } = await apiClient.getAllPaymentMethodsWithPagination(
                sortField,
                sortOrder,
                page,
                search,
                pageSize
            );
            setPaymentMethods(data || []);
            setTotal(total || 0);
            setSelected([]);
        } catch (error) {
            console.error("Error fetching unit:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPaymentMethods();
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

    const exportData = paymentMethods.map((payment, index) => ({
        "No": (page - 1) * pageSize + index + 1,
        "Name": payment.name,
        "Created At": payment.createdAt ? dayjs.tz(payment.createdAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss") : '',
        "Created By": `${payment.creator?.lastName || ''} ${payment.creator?.firstName || ''}`,
        "Updated At": payment.updatedAt ? dayjs.tz(payment.updatedAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss") : '',
        "Updated By": `${payment.updater?.lastName || ''} ${payment.updater?.firstName || ''}`,
    }));

    const totalPages = Math.max(1, Math.ceil(total / pageSize));


    const QueryClient = useQueryClient();
    const handleAddorEditUnit = async (id: number | null, name: string) => {
        try {
            await QueryClient.invalidateQueries({ queryKey: ["validateToken"] });
            const paymentMethodData: PaymentMethodType = {
                id: id ? id : undefined,
                name
            };

            await apiClient.upsertPaymentMethod(paymentMethodData);
            if (id) {
                toast.success("Payment Method updated successfully", {
                    position: "top-right",
                    autoClose: 2000
                });
            } else {
                toast.success("Payment Method created successfully", {
                    position: "top-right",
                    autoClose: 2000
                });
            }
            fetchPaymentMethods();
            setIsModalOpen(false);
        } catch (error: any) {
            // Check if error.message is set by your API function
            if (error.message) {
                toast.error(error.message, {
                    position: "top-right",
                    autoClose: 2000
                });
            } else {
                toast.error("Error adding/editting unit", {
                    position: "top-right",
                    autoClose: 2000
                })
            }
        }
    };

    const handleEditClick = (unitData: PaymentMethodType) => {
        setSelectPaymentMethod({
            id: unitData.id,
            name: unitData.name
        });
        setIsModalOpen(true);
    };

    const handleDeleteUnit = async (id: number) => {
        const confirmed = await ShowDeleteConfirmation();
        if (!confirmed) {
            return;
        }

        try {
            await QueryClient.invalidateQueries({ queryKey: ["validateToken"] });
            await apiClient.deletePaymentMethod(id);
            toast.success("Payment Method deleted sucessfully", {
                position: "top-right",
                autoClose: 2000
            });
            fetchPaymentMethods();
            setIsModalOpen(false);
            setSelectPaymentMethod(null);
        } catch (err: any) {
            console.error("Error deleting payment method:", err)
            toast.error(err.message || "Error deleting payment method", {
                position: "top-right",
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
                                        {hasPermission('Payment-Method-Create') &&
                                            <button className="btn btn-primary gap-2" onClick={() => { setIsModalOpen(true); setSelectPaymentMethod(null) }}>
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
                                    <ExportDropdown data={exportData} prefix="Payment_Method" />
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
                                            {paymentMethods && paymentMethods.length > 0 ? (
                                                    paymentMethods.map((rows, index) => (
                                                        <tr key={index}>
                                                            {visibleCols.includes("No") && (
                                                                <td>{(page - 1) * pageSize + index + 1}</td>
                                                            )}
                                                            {visibleCols.includes("Name") && (
                                                                <td>{rows.name}</td>
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
                                                                        {hasPermission('Payment-Method-Edit') &&
                                                                            <button type="button" className="hover:text-warning" onClick={() => handleEditClick(rows)} title="Edit">
                                                                                <Pencil color="green" />
                                                                            </button>
                                                                        }
                                                                        {hasPermission('Payment-Method-Delete') &&
                                                                            <button type="button" className="hover:text-danger" onClick={() => rows.id && handleDeleteUnit(rows.id)} title="Delete">
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
                                                        <td colSpan={3}>No Unit Found!</td>
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
                onSubmit={handleAddorEditUnit}
                paymentMethod={selectPaymentMethod}
            />
        </>
    );
};

export default PaymentMethod;