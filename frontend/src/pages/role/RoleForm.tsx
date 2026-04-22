import React, { useEffect, useRef, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faArrowLeft, faShield } from '@fortawesome/free-solid-svg-icons';
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
    permissions: PermissionData[];
}

interface RoleData {
    id?: number;
    branchId: number;
    name: string;
    permissions: number[];
}

const socket = io(`${import.meta.env.VITE_API_URL}`, {
    transports: ['websocket'],
});

// Indeterminate checkbox that updates on every render
const IndeterminateCheckbox: React.FC<{
    checked: boolean;
    indeterminate: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ checked, indeterminate, onChange }) => {
    const ref = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (ref.current) ref.current.indeterminate = indeterminate;
    }, [indeterminate]);
    return (
        <input
            ref={ref}
            type="checkbox"
            checked={checked}
            onChange={onChange}
            className="form-checkbox"
        />
    );
};

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
                    const permissionIds = roleData.permissions.map((perm: { permissionId: number }) => perm.permissionId);
                    setSelectPermissions(permissionIds);
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
        const updated = isChecked
            ? [...selectPermissions, permissionId]
            : selectPermissions.filter(p => p !== permissionId);
        setSelectPermissions(updated);
        setValue("permissions", updated, { shouldValidate: true });
    };

    const handleModuleSelectAll = (module: ModulePermissionData, selectAll: boolean) => {
        const moduleIds = module.permissions.map(p => p.id!);
        const updated = selectAll
            ? Array.from(new Set([...selectPermissions, ...moduleIds]))
            : selectPermissions.filter(id => !moduleIds.includes(id));
        setSelectPermissions(updated);
        setValue("permissions", updated, { shouldValidate: true });
    };

    const handleGlobalSelectAll = () => {
        const allIds = permissions.flatMap(m => m.permissions.map(p => p.id!));
        const allSelected = allIds.every(id => selectPermissions.includes(id));
        const updated = allSelected ? [] : allIds;
        setSelectPermissions(updated);
        setValue("permissions", updated, { shouldValidate: true });
    };

    const isModuleAllSelected = (module: ModulePermissionData) =>
        module.permissions.length > 0 && module.permissions.every(p => selectPermissions.includes(p.id!));

    const isModuleSomeSelected = (module: ModulePermissionData) =>
        module.permissions.some(p => selectPermissions.includes(p.id!)) && !isModuleAllSelected(module);

    const totalPermissions = permissions.reduce((acc, m) => acc + m.permissions.length, 0);
    const allIds = permissions.flatMap(m => m.permissions.map(p => p.id!));
    const allGlobalSelected = allIds.length > 0 && allIds.every(id => selectPermissions.includes(id));

    const onSubmit: SubmitHandler<RoleData> = async (roleData) => {
        if (selectPermissions.length === 0) {
            toast.error("At least one permission must be selected.", { position: "top-right", autoClose: 3000 });
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
            socket.emit('upsertRole', { id: id ? parseInt(id, 10) : null, permissions: selectPermissions });
            toast.success("Role saved successfully.", { position: "top-right", autoClose: 2000 });
            navigate("/role");
        } catch (error: any) {
            toast.error(error.message || "Error saving role", { position: 'top-right', autoClose: 2000 });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            {/* Page Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white-light">
                        {id ? 'Edit Role' : 'Add New Role'}
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        Configure role name and assign module permissions
                    </p>
                </div>
                <div className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-semibold">
                    <FontAwesomeIcon icon={faShield} className="text-xs" />
                    {selectPermissions.length} / {totalPermissions} selected
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
                {/* Role Info Card */}
                <div className="panel mb-5">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="w-1 h-5 bg-primary rounded-full inline-block"></span>
                        <h2 className="font-semibold text-gray-700 dark:text-white-light">Role Information</h2>
                    </div>
                    <div className="max-w-sm">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Role Name <span className="text-danger">*</span>
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. Sales Manager, Warehouse Staff..."
                            {...register("name", { required: "Role name is required" })}
                            className="form-input"
                        />
                        {errors.name && (
                            <p className="text-danger text-xs mt-1">{errors.name.message}</p>
                        )}
                    </div>
                </div>

                {/* Permissions Card */}
                <div className="panel mb-5">
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2">
                            <span className="w-1 h-5 bg-primary rounded-full inline-block"></span>
                            <h2 className="font-semibold text-gray-700 dark:text-white-light">
                                Permissions <span className="text-danger">*</span>
                            </h2>
                        </div>
                        <button
                            type="button"
                            onClick={handleGlobalSelectAll}
                            className={`text-xs font-medium px-3 py-1.5 rounded border transition-colors ${
                                allGlobalSelected
                                    ? 'border-danger text-danger hover:bg-danger/10'
                                    : 'border-primary text-primary hover:bg-primary/10'
                            }`}
                        >
                            {allGlobalSelected ? 'Deselect All' : 'Select All'}
                        </button>
                    </div>

                    {isLoading ? (
                        <div className="text-center py-10 text-gray-400">Loading permissions...</div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {permissions.map(module => {
                                const allSelected = isModuleAllSelected(module);
                                const someSelected = isModuleSomeSelected(module);
                                return (
                                    <div
                                        key={module.id}
                                        className={`rounded-xl border-2 transition-all duration-200 overflow-hidden ${
                                            allSelected
                                                ? 'border-primary shadow-md shadow-primary/10'
                                                : someSelected
                                                ? 'border-primary/40'
                                                : 'border-gray-100 dark:border-[#1b2e4b]'
                                        }`}
                                    >
                                        {/* Module Header */}
                                        <div className={`flex items-center justify-between px-4 py-2.5 ${
                                            allSelected
                                                ? 'bg-primary text-white'
                                                : someSelected
                                                ? 'bg-primary/10 text-gray-700 dark:text-white'
                                                : 'bg-[#f9fafb] dark:bg-[#121c2c] text-gray-700 dark:text-white'
                                        }`}>
                                            <span className="font-semibold text-sm">{module.name}</span>
                                            <label className="flex items-center gap-1.5 cursor-pointer">
                                                <IndeterminateCheckbox
                                                    checked={allSelected}
                                                    indeterminate={someSelected}
                                                    onChange={e => handleModuleSelectAll(module, e.target.checked)}
                                                />
                                                <span className={`text-xs ${allSelected ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
                                                    All
                                                </span>
                                            </label>
                                        </div>

                                        {/* Permission Items */}
                                        <div className="px-3 py-2 space-y-0.5 bg-white dark:bg-[#191e3a]">
                                            {module.permissions.map(perm => {
                                                const isChecked = selectPermissions.includes(perm.id!);
                                                const label = perm.name.replace(new RegExp(`^${module.name}-`, 'i'), '');
                                                return (
                                                    <label
                                                        key={perm.id}
                                                        className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
                                                            isChecked
                                                                ? 'bg-primary/8 text-primary'
                                                                : 'hover:bg-gray-50 dark:hover:bg-[#253069] text-gray-600 dark:text-gray-300'
                                                        }`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            value={perm.id!}
                                                            checked={isChecked}
                                                            onChange={e => handlePermissionChange(perm.id!, e.target.checked)}
                                                            className="form-checkbox"
                                                        />
                                                        <span className={`text-sm ${isChecked ? 'font-medium text-primary' : ''}`}>
                                                            {label}
                                                        </span>
                                                    </label>
                                                );
                                            })}
                                        </div>

                                        {/* Module footer count */}
                                        <div className="px-4 py-1.5 bg-gray-50 dark:bg-[#0e1726] border-t border-gray-100 dark:border-[#1b2e4b]">
                                            <span className="text-xs text-gray-400">
                                                {module.permissions.filter(p => selectPermissions.includes(p.id!)).length} / {module.permissions.length} selected
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="flex justify-end items-center gap-3">
                    <NavLink to="/role" className="btn btn-outline-warning">
                        <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
                        Go Back
                    </NavLink>
                    {hasPermission('Role-Create') && (
                        <button type="submit" className="btn btn-primary" disabled={isLoading}>
                            <FontAwesomeIcon icon={faSave} className="mr-2" />
                            {isLoading ? 'Saving...' : 'Save Role'}
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
};

export default RoleForm;
