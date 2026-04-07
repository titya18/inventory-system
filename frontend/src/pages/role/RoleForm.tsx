import React, { useEffect, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { NavLink, useParams, useNavigate } from "react-router-dom";
import { getRoleById, upsertRole } from "../../api/role";
import { getAllModules } from "../../api/module_permission";
import { toast } from "react-toastify";
import io from 'socket.io-client';
import { useAppContext } from "../../hooks/useAppContext";

export interface PermissionData {
    id?: number;
    name: string;
}

export interface ModulePermissionData {
    id?: number;
    name: string;
    permissions: PermissionData[]; // Array of objects
}

interface RoleData {
    id?: number;
    branchId: number;
    name: string;
    permissions: number[];
}

// Initialize the socket connection
const socket = io(`${import.meta.env.VITE_API_URL}`, {
    transports: ['websocket'],
});

const RoleForm: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [selectPermissions, setSelectPermissions] = useState<number[]>([]);
    const [permissions, setPermissions] = useState<ModulePermissionData[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const navigate = useNavigate();

    const { register, handleSubmit, setValue, formState: { errors } } = useForm<RoleData>();

    const { hasPermission, user } = useAppContext();

    useEffect(() => {
        const fetchPermission = async () => {
            setIsLoading(true);
            try {
                const data = await getAllModules();
                setPermissions(data);
            } catch (error) {
                console.error("Error fetching permissions:", error);
            } finally {
                setIsLoading(false);
            }
        };

        const fetchRole = async () => {
            if (id) {
                setIsLoading(true);
                try {
                    const roleData: any = await getRoleById(parseInt(id, 10));
                    setValue("name", roleData.name);
                    // Transform roleData.permissions to just the permission IDs
                    const permissionIds = roleData.permissions.map((perm: { permissionId: number }) => perm.permissionId);
                    setSelectPermissions(permissionIds);
                    // setValue("permissions", permissionIds); // Update this to match expected type if necessary
                } catch (error) {
                    console.error("Error fetching role:", error);
                } finally {
                    setIsLoading(false);
                }
            }
        };

        fetchPermission();
        fetchRole();
    }, [id, setValue]);

    const handlePermissionChange = (permissionId: number, isChecked: boolean) => {
        const updatedPermissions = isChecked
            ? [...selectPermissions, permissionId]
            : selectPermissions.filter(p => p !== permissionId);

        setSelectPermissions(updatedPermissions);
        setValue("permissions", updatedPermissions, { shouldValidate: true });
    };

    const onSubmit: SubmitHandler<RoleData> = async (roleData) => {
        // Manual validation for permissions
        if (selectPermissions.length === 0) {
            toast.error("At least one permission must be selected.", {
                position: "top-right",
                autoClose: 3000
            });
            return;
        }

        setIsLoading(true);
        try {
            const rolePayload = { ...roleData, branchId: roleData.branchId ?? user?.branchId, permissions: selectPermissions };
            if (id) {
                await upsertRole({ id: parseInt(id, 10), ...rolePayload });
            } else {
                await upsertRole(rolePayload);
            }

            // Emit WebSocket event with role and permissions data
            socket.emit('upsertRole', { id: id ? parseInt(id, 10) : null, permissions: selectPermissions });

            toast.success("Role saved successfully.", {
                position: "top-right",
                autoClose: 2000
            });
            navigate("/role");
        } catch (error: any) {
            // Check if err.message is set by your API function
            if (error.message) {
                toast.error(error.message, {
                    position: 'top-right',
                    autoClose: 2000
                });
            } else {
                toast.error("Error adding/editing role", {
                    position: 'top-right',
                    autoClose: 2000
                });
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="panel">
            <div className="mb-5">
                <h5 className="flex items-center text-lg font-semibold dark:text-white-light">
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
                    </svg>Add Role</h5>
            </div>
            <div className="mb-5">
                <form onSubmit={handleSubmit(onSubmit)}>
                    <div>
                        <label>Role's Name <span className="text-danger text-md">*</span></label>
                        <input
                            type="text"
                            placeholder="Role's Name"
                            {...register("name", { required: "Role name is required" })}
                            className="form-input"
                        />
                        {errors.name && <span className="error_validate">{errors.name.message}</span>}
                    </div>
                    <div className="mt-5">
                        <label className="font-semibold text-underline" style={{ fontSize: '18px', textDecoration: "underline" }}>Permission <span className="text-danger text-md">*</span></label>
                        <div className="flex flex-wrap space-x-2">
                            {permissions.map(permission => (
                                <div className="w-full max-w-[22rem] rounded border border-[#e0e6ed] bg-white shadow-[4px_6px_10px_-3px_#bfc9d4] dark:border-[#1b2e4b] dark:bg-[#191e3a] dark:shadow-none mb-5" key={permission.id}>
                                    <div className="bg-[#fbfbfb] dark:bg-[#121c2c] px-5 py-3">
                                        <h5 className="text-xl font-semibold text-[#3b3f5c] dark:text-white-light">{permission.name}</h5>
                                    </div>
                                    <div className="px-6 py-3">
                                        <div className="flex flex-wrap justify-between">
                                            {permission.permissions?.map((perm: PermissionData) => (
                                                <div key={perm.id}>
                                                    <label className="flex items-center cursor-pointer mb-5">
                                                        <input 
                                                            type="checkbox" 
                                                            id={`permission${perm.id}`} 
                                                            value={perm.id!} 
                                                            checked={selectPermissions.includes(perm.id!)}  
                                                            onChange={e => handlePermissionChange(perm.id!, e.target.checked)} 
                                                            className="form-checkbox" 
                                                        />
                                                        <span className="text-white-dark">{perm.name}</span>
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-end items-center mt-8">
                        <NavLink to="/role" type="button" className="btn btn-outline-warning">
                            <FontAwesomeIcon icon={faArrowLeft} className='mr-1' />
                            Go Back
                        </NavLink>
                        {hasPermission('Role-Create') &&
                            <button type="submit" className="btn btn-primary ltr:ml-4 rtl:mr-4" disabled={isLoading}>
                                <FontAwesomeIcon icon={faSave} className='mr-1' />
                                {isLoading ? 'Saving...' : 'Save'}
                            </button>
                        }
                    </div>
                </form>
            </div>
        </div>
    );
}

export default RoleForm;
