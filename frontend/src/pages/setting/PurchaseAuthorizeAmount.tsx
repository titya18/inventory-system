import React, { useEffect, useState } from "react";
import { PurchaseAuthorizeAmountType } from "../../data_types/types";
import { getAmoutAuthorized, updateAmountAuthorized } from "../../api/purchase";
import { useAppContext } from "../../hooks/useAppContext";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUpZA, faArrowDownAZ } from '@fortawesome/free-solid-svg-icons';
import Pagination from "../components/Pagination";
import { toast } from "react-toastify";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Pencil } from "lucide-react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { useForm } from "react-hook-form";

// Extend Day.js with plugins
dayjs.extend(utc);
dayjs.extend(timezone);

const columns = [
    "No",
    "Amount",
    "Created At",
    "Created By",
    "Updated At",
    "Updated By",
    "Actions"
];

const sortFields: Record<string, string> = {
    "No": "id",
    "Amount": "amount",
    "Created At": "createdAt",
    "Created By": "createdBy",
    "Updated At": "updatedAt",
    "Updated By": "updatedBy"
};

const Branch: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [amountAuthorized, setAmountAuthorized] = useState<PurchaseAuthorizeAmountType | null>(null);
    const [selectAmount, setSelectAmount] = useState<{ id: number | undefined; amount: number} | null>(null);
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

    const fetchAmountAuthorized = async () => {
        setIsLoading(true);
        try {
            const data = await getAmoutAuthorized();
            setAmountAuthorized(data);

        } catch (error) {
            console.error("Error fetch amount authorized:", error);
        } finally {
            setIsLoading(false);
        }
    };


    useEffect(() => {
        fetchAmountAuthorized();
    }, []);
    

    const queryClient = useQueryClient();

    const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<PurchaseAuthorizeAmountType>();

    const handleEditClick = (row: PurchaseAuthorizeAmountType) => {
        setSelectAmount({
            id: row.id,
            amount: row.amount
        });

        reset({ amount: row.amount });
        setIsModalOpen(true);
    };

    const handleFormSubmit = async (form: PurchaseAuthorizeAmountType) => {
        if (!selectAmount) return;

        try {
            await queryClient.invalidateQueries({ queryKey: ["validateToken"] });

            await updateAmountAuthorized({
                id: selectAmount.id,
                amount: form.amount
            });

            toast.success("Amount updated successfully");
            setIsModalOpen(false);
            fetchAmountAuthorized();
        } catch (error: any) {
            toast.error(error?.message || "Update failed");
        }
    };

    return (
        <>
            <div className="pt-0">
                <div className="space-y-6">
                    <div className="panel">
                        <div className="relative">
                            <div className="dataTable-wrapper dataTable-loading no-footer sortable searchable">
                                <div className="dataTable-top">
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
                                                {amountAuthorized ? (
                                                        <tr>
                                                            {visibleCols.includes("No") && (
                                                                <td>1</td>
                                                            )}
                                                            {visibleCols.includes("Amount") && (
                                                                <td>{amountAuthorized.amount}</td>
                                                            )}
                                                            {visibleCols.includes("Created At") && (
                                                                <td>{dayjs.tz(amountAuthorized.createdAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss")}</td>
                                                            )}
                                                            {visibleCols.includes("Created By") && (
                                                                <td>{amountAuthorized.creator?.lastName} {amountAuthorized.creator?.firstName}</td>
                                                            )}
                                                            {visibleCols.includes("Updated At") && (
                                                                <td>{dayjs.tz(amountAuthorized.updatedAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss")}</td>
                                                            )}
                                                            {visibleCols.includes("Updated By") && (
                                                                <td>{amountAuthorized.updater?.lastName} {amountAuthorized.updater?.firstName}</td>
                                                            )}
                                                            {visibleCols.includes("Actions") && (
                                                                <td className="text-center">
                                                                    <div className="flex gap-2">
                                                                        {hasPermission('Amount-Purchase-Edit') &&
                                                                            <button type="button" className="hover:text-warning" onClick={() => handleEditClick(amountAuthorized)} title="Edit">
                                                                                <Pencil color="green" />
                                                                            </button>
                                                                        }
                                                                    </div>
                                                                </td>
                                                            )}
                                                        </tr>
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
            
            {/* MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center">
                    <div className="panel w-full max-w-md">
                        <h3 className="text-lg font-bold mb-4">Edit Amount</h3>

                        <form onSubmit={handleSubmit(handleFormSubmit)}>
                            <input
                                type="number"
                                step="0.01"
                                className="form-input"
                                {...register("amount", {
                                    required: "Amount is required",
                                    min: { value: 0, message: "Must be greater than 0" }
                                })}
                            />
                            {errors.amount && (
                                <p className="error_validate">{errors.amount.message}</p>
                            )}

                            <div className="flex justify-end mt-6 gap-2">
                                <button
                                    type="button"
                                    className="btn btn-outline-danger"
                                    onClick={() => setIsModalOpen(false)}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={isLoading}
                                >
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default Branch;