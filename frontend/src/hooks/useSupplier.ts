import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import * as apiClient from "../api/supplier";
import ShowDeleteConfirmation from "../pages/components/ShowDeleteConfirmation";
import { SupplierType } from "../data_types/types";
import { useSearchParams } from "react-router-dom";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

// Extend Day.js with plugins
dayjs.extend(utc);
dayjs.extend(timezone);

const columns = [
    "No",
    "Name",
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
    "Name": "name",
    "Phone": "phone",
    "Email": "email",
    "Address": "address",
    "Created At": "createdAt",
    "Created By": "createdBy",
    "Updated At": "updatedAt",
    "Updated By": "updatedBy"
};

export const useSuppliers = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [suppliers, setSuppliers] = useState<SupplierType[]>([]);
    const [allSuppliers, setAllSuppliers] = useState<SupplierType[]>([]);
    const [selectedSupplier, setSelectedSupplier] = useState<SupplierType | null>(null);
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
    
    const queryClient = useQueryClient();

    const handleAddOrEditSupplier = async (supplierData: SupplierType) => {
        try {
            await queryClient.invalidateQueries({ queryKey: ["validateToken"] });

            await apiClient.upsertSupplier(supplierData);
            toast.success(supplierData.id ? "Supplier updated successfully" : "Supplier created successfully", {
                position: "top-right",
                autoClose: 2000
            });

            fetchSuppliers();
            fetchAllSuppliers();
            setIsModalOpen(false);
        } catch (error: any) {
            toast.error(error.message || "Error adding/editing supplier", {
                position: "top-right",
                autoClose: 2000
            });
            throw error;
        }
    };

    const fetchSuppliers = async () => {
        setIsLoading(true);
        try {
            const { data, total } = await apiClient.getAllSuppliersWithPagination(
                sortField,
                sortOrder,
                page,
                search,
                pageSize
            );
            setSuppliers(data || []);
            setTotal(total || 0);
            setSelected([]);
        } catch (error) {
            console.error("Error fetching suppliers:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchAllSuppliers = async () => {
        setIsLoading(true);
        try {
            const data  = await apiClient.getAllSuppliers();
            setAllSuppliers(data);
        } catch (error) {
            console.error("Error fetching suppliers:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSuppliers();
        fetchAllSuppliers();
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

    const exportData = suppliers.map((supplier, index) => ({
        "No": (page - 1) * pageSize + index + 1,
        "Name": supplier.name,
        "Phone": supplier.phone,
        "Email": supplier.email,
        "Address": supplier.address,
        "Created At": supplier.createdAt ? dayjs.tz(supplier.createdAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss") : '',
        "Created By": `${supplier.creator?.lastName || ''} ${supplier.creator?.firstName || ''}`,
        "Updated At": supplier.updatedAt ? dayjs.tz(supplier.updatedAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss") : '',
        "Updated By": `${supplier.updater?.lastName || ''} ${supplier.updater?.firstName || ''}`,
    }));
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const handleEditClick = (supplier: SupplierType) => {
        setSelectedSupplier(supplier);
        setIsModalOpen(true);
    };

    const handleDeleteSupplier = async (id: number) => {
        const confirmed = await ShowDeleteConfirmation();
        if (!confirmed) return;

        try {
            await queryClient.invalidateQueries({ queryKey: ["validateToken"] });
            await apiClient.deleteSupplier(id);
            toast.success("Supplier deleted successfully", { position: 'top-right', autoClose: 2000 });

            fetchSuppliers();
            setIsModalOpen(false);
            setSelectedSupplier(null);
        } catch (err: any) {
            toast.error(err.message || "Error deleting supplier", { position: 'top-right', autoClose: 2000 });
        }
    };

    return {
        suppliers,
        allSuppliers,
        isLoading,
        totalPages,
        sortField,
        sortFields,
        page,
        pageSize,
        sortOrder,
        isModalOpen,
        selectedSupplier,
        columns,
        visibleCols,
        selected,
        search,
        total,
        updateParams,
        toggleCol,
        toggleSelectRow,
        handleSort,
        exportData,
        fetchAllSuppliers,
        handleAddOrEditSupplier,
        handleEditClick,
        handleDeleteSupplier,
        setIsModalOpen,
        setSelectedSupplier
    };
};
