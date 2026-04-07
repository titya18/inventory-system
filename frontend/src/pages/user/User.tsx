// src/components/MainCategory.tsx
import React, { useState, useEffect } from "react";
import * as apiClient from "../../api/user";
import Pagination from "../components/Pagination"; // Import the Pagination component
import ShowDeleteConfirmation from "../components/ShowDeleteConfirmation";
import { useQueryClient } from "@tanstack/react-query";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUpZA, faArrowDownAZ, faCheck, faXmark } from '@fortawesome/free-solid-svg-icons';
import { NavLink, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useAppContext } from "../../hooks/useAppContext";
import { UserType, RoleType } from "@/data_types/types";
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
    "Email",
    "Branch",
    "Role",
    "Show Password",
    "Status",
    "Created At",
    "Created By",
    "Updated At",
    "Updated By",
    "Actions"
];

const sortFields: Record<string, string> = {
    "No": "id",
    "Name": "name",
    "Email": "email",
    "Branch": "branchId",
    "Role": "roleType",
    "Show Password": "showPassword",
    "Status": "status",
    "Created At": "createdAt",
    "Created By": "createdBy",
    "Updated At": "updatedAt",
    "Updated By": "updatedBy"
};

const User: React.FC = () => {
    const [userData, setUserData] = useState<UserType[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const [searchParams, setSearchParams] = useSearchParams();
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
    const sortField = searchParams.get("sortField") || "firstName";
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

    const { hasPermission, user } = useAppContext();

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const { data, total } = await apiClient.getAllUsers(
                sortField,
                sortOrder,
                page,
                search,
                pageSize
            );
            setUserData(data || []);
            setTotal(total || 0);
            setSelected([]);
        } catch (error) {
            console.error("Error fetching user:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
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

    const exportData = userData.map((user, index) => ({
        "No": (page - 1) * pageSize + index + 1,
        "Name": user.lastName + ' ' + user.firstName,
        "Email": user.email,
        "Branch": user.branch ? user.branch.name : "",
        "Role": user.roleType === 'ADMIN' ? 'Super Admin' : user.roles.map((role: RoleType) => role.name).join(', '),
        "Status": user.status === '1' ? 'Actived' : 'DisActived',
        "Created At": user.createdAt ? dayjs.tz(user.createdAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss") : '',
        "Created By": `${user.creator?.lastName || ''} ${user.creator?.firstName || ''}`,
        "Updated At": user.updatedAt ? dayjs.tz(user.updatedAt, "Asia/Phnom_Penh").format("DD / MMM / YYYY HH:mm:ss") : '',
        "Updated By": `${user.updater?.lastName || ''} ${user.updater?.firstName || ''}`,
    }));

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const queryClient = useQueryClient();
    const handleDeleteUser = async (id: number) => {
        const confirmed = await ShowDeleteConfirmation();
        if (!confirmed) {
            return;
        }

        try {
            await queryClient.invalidateQueries({ queryKey: ["validateToken"] });
            await apiClient.deleteUser(id);
            toast.success("User deleted successfully", {
                position: "top-right",
                autoClose: 2500
            })

            fetchUsers();
        } catch (err: any) {
            console.error("Error deleting user:", err);
            toast.error(err.message || "Error deleting user", {
                position: 'top-right',
                autoClose: 2000
            });
        }
    };

    const handleStatusChange = async (id: number) => {
        try {
            await queryClient.invalidateQueries({ queryKey: ["validateToken"] });
            await apiClient.statusUser(id);

            toast.success("Status changed successfully", {
                position: "top-right",
                autoClose: 2500
            })
            fetchUsers();
        } catch (err: any) {
            console.error("Error update status:", err);
            toast.error(err.message || "Error update status", {
                position: 'top-right',
                autoClose: 2000
            });
        }
    }

    const filteredVisibleCols = visibleCols.filter((col) => {
        if (col === "Show Password") {
            return user?.roleType === "ADMIN";
        }

        if (col === "Actions") {
            return user?.roleType === "ADMIN";
        }

        return true;
    });


    return (
        <>
            <div className="pt-0">
                <div className="space-y-6">
                    <div className="panel">
                        <div className="relative">
                            <div className="px-0">
                                <div className="md:absolute md:top-0 ltr:md:left-0 rtl:md:right-0">
                                    <div className="mb-5 flex items-center gap-2">
                                        {hasPermission('User-Create') &&
                                            <NavLink to="/adduser" className="btn btn-primary gap-2" >
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
                                            </NavLink>
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
                                    <ExportDropdown data={exportData} prefix="users" />
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
                                                        filteredVisibleCols.includes(col) && (
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
                                            {userData && userData.length > 0 ? (
                                                    userData.map((rows, index) => (
                                                        <tr key={index}>
                                                            {visibleCols.includes("No") && (
                                                                <td>{(page - 1) * pageSize + index + 1}</td>
                                                            )}
                                                            {visibleCols.includes("Name") && (
                                                                <td>{rows.lastName+' '+rows.firstName}</td>
                                                            )}
                                                            {visibleCols.includes("Email") && (
                                                                <td>{rows.email}</td>
                                                            )}
                                                            {visibleCols.includes("Branch") && (
                                                                <td>{rows.branch ? rows.branch.name : ""}</td>
                                                            )}
                                                            {visibleCols.includes("Role") && ( 
                                                                <td>
                                                                    {rows.roleType === 'ADMIN' 
                                                                        ? <span className="badge bg-primary">Super Admin</span>
                                                                        : rows.roles?.map((role, i) => (
                                                                            <span key={i} className="badge bg-secondary mr-3">
                                                                                {role.name}
                                                                            </span>
                                                                        ))}
                                                                </td>
                                                            )}
                                                            {filteredVisibleCols.includes("Show Password") && (
                                                                <td>
                                                                    {rows.show_pass}
                                                                </td>
                                                            )}
                                                            {visibleCols.includes("Status") && (
                                                                <td>
                                                                    {user?.roleType === 'ADMIN' ? (
                                                                        <button onClick={() => rows.id && handleStatusChange(rows.id)}>
                                                                            {rows.status == '1' 
                                                                                ? <span className="badge badge-outline-success"><FontAwesomeIcon icon={faCheck} /> Actived</span>
                                                                                : <span className="badge badge-outline-danger"><FontAwesomeIcon icon={faXmark} /> DisActived</span>
                                                                            }
                                                                        </button>
                                                                    ) : (
                                                                        <>
                                                                            {rows.status == '1'
                                                                                ? <span className="badge badge-outline-success"><FontAwesomeIcon icon={faCheck} /> Actived</span>
                                                                                : <span className="badge badge-outline-danger"><FontAwesomeIcon icon={faXmark} /> DisActived</span>
                                                                            }
                                                                        </>
                                                                    )}
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
                                                            {filteredVisibleCols.includes("Actions") && (
                                                                <td className="text-center">
                                                                    <div className="flex items-center justify-center gap-2">
                                                                        {hasPermission('User-Edit') && (user?.roleType === 'ADMIN') &&
                                                                            <NavLink to={`/edituser/${rows.id}`} className="hover:text-warning" title="Edit">
                                                                                <Pencil color="green" />
                                                                            </NavLink>
                                                                        }
                                                                        {/* {hasPermission('User-Delete') && (user?.roleType === 'ADMIN') &&
                                                                            <button type="button" className="hover:text-danger" onClick={() => rows.id && handleDeleteUser(rows.id)} title="Delete">
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
                                                        <td colSpan={3}>No User Found!</td>
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
        </>
    );
};

export default User;
