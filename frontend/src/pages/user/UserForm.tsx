import React, { useEffect, useMemo, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faSave, faShield } from "@fortawesome/free-solid-svg-icons";
import { NavLink, useNavigate, useParams } from "react-router-dom";
import { getAllBranches } from "../../api/branch";
import { getAllRoles } from "../../api/role";
import { createUser, getUserById, updateUser, getUserPermissions, updateUserPermissions } from "../../api/user";
import { getAllModules } from "../../api/module_permission";
import { SubmitHandler, useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { useAppContext } from "../../hooks/useAppContext";
import { BranchType, RoleType, UserType } from "../../data_types/types";
import { ModulePermissionData, PermissionData } from "../role/RoleForm";

interface RoleWithPermissions extends RoleType {
    permissions?: Array<{ permissionId: number }>;
}

// Indeterminate checkbox helper
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
        <input ref={ref} type="checkbox" checked={checked} onChange={onChange} className="form-checkbox" />
    );
};

const UserForm: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [isLoading, setIsLoading] = useState(false);
    const [branches, setBranches] = useState<BranchType[]>([]);
    const [roleData, setRoleData] = useState<RoleWithPermissions[]>([]);
    const [selectRoles, setSelectRoles] = useState<number[]>([]);
    const [userData, setUserData] = useState<UserType | null>(null);

    const [modules, setModules] = useState<ModulePermissionData[]>([]);
    const [selectPermissions, setSelectPermissions] = useState<number[]>([]);

    const { user, hasPermission } = useAppContext();
    const navigate = useNavigate();
    const { register, watch, handleSubmit, setValue, formState: { errors } } = useForm<UserType>();
    const showAndHideRoleDiv = watch("roleType", "USER");

    // Compute the set of permission IDs granted by currently selected roles
    const rolePermissionIds = useMemo<Set<number>>(() => {
        const ids = new Set<number>();
        selectRoles.forEach(roleId => {
            const role = roleData.find(r => Number(r.id) === roleId);
            role?.permissions?.forEach(p => ids.add(p.permissionId));
        });
        return ids;
    }, [selectRoles, roleData]);

    useEffect(() => {
        const fetchAll = async () => {
            setIsLoading(true);
            try {
                const [branchData, roleList, moduleList] = await Promise.all([
                    getAllBranches(),
                    getAllRoles(),
                    getAllModules(),
                ]);
                setBranches(branchData as BranchType[]);
                setRoleData(roleList as RoleWithPermissions[]);
                setModules(moduleList);

                if (id) {
                    const [userResult, permIds] = await Promise.all([
                        getUserById(parseInt(id, 10)),
                        getUserPermissions(parseInt(id, 10)),
                    ]);
                    setSelectRoles(userResult.roles.map((role: any) => role.roleId));
                    setUserData(userResult);
                    setSelectPermissions(permIds);
                }
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAll();
    }, [id]);

    useEffect(() => {
        if (!watch("roleType")) setValue("roleType", "USER");
        if (userData) {
            setValue("branchId", userData.branchId);
            setValue("email", userData.email);
            setValue("firstName", userData.firstName);
            setValue("lastName", userData.lastName);
            setValue("phoneNumber", userData.phoneNumber);
            setValue("roleType", userData.roleType);
            setValue("roles", userData.roles || []);
        }
    }, [watch, setValue, userData]);

    const handleRoleChange = (roleId: number, isChecked: boolean) => {
        const updated = isChecked ? [...selectRoles, roleId] : selectRoles.filter(r => r !== roleId);
        setSelectRoles(updated);
        setValue("roles", roleData.filter(r => updated.includes(Number(r.id))), { shouldValidate: true });
    };

    // Direct permission helpers
    const handlePermissionChange = (permissionId: number, isChecked: boolean) => {
        setSelectPermissions(prev =>
            isChecked ? [...prev, permissionId] : prev.filter(p => p !== permissionId)
        );
    };

    const handleModuleSelectAll = (module: ModulePermissionData, selectAll: boolean) => {
        // Only toggles DIRECT permissions (role permissions are read-only indicators)
        const ids = module.permissions.map(p => p.id!);
        setSelectPermissions(prev =>
            selectAll
                ? Array.from(new Set([...prev, ...ids]))
                : prev.filter(id => !ids.includes(id))
        );
    };

    const handleGlobalSelectAll = () => {
        const allIds = modules.flatMap(m => m.permissions.map(p => p.id!));
        const allDirectSelected = allIds.every(id => selectPermissions.includes(id));
        setSelectPermissions(allDirectSelected ? [] : allIds);
    };

    const isModuleAllSelected = (m: ModulePermissionData) =>
        m.permissions.length > 0 && m.permissions.every(p => selectPermissions.includes(p.id!));

    const isModuleSomeSelected = (m: ModulePermissionData) =>
        m.permissions.some(p => selectPermissions.includes(p.id!)) && !isModuleAllSelected(m);

    const totalPermissions = modules.reduce((acc, m) => acc + m.permissions.length, 0);
    const allIds = modules.flatMap(m => m.permissions.map(p => p.id!));
    const allGlobalSelected = allIds.length > 0 && allIds.every(id => selectPermissions.includes(id));

    const onSubmit: SubmitHandler<UserType> = async (formData) => {
        setIsLoading(true);
        try {
            const branchIdToSend = formData.branchId || user?.branchId || null;
            const dataToSend = { ...formData, branchId: branchIdToSend, roleIds: selectRoles };

            if (id) {
                await updateUser(parseInt(id, 10), dataToSend);
                await updateUserPermissions(parseInt(id, 10), selectPermissions);
                toast.success("User updated successfully", { position: "top-right", autoClose: 2500 });
            } else {
                const created: any = await createUser(dataToSend);
                if (selectPermissions.length > 0) {
                    await updateUserPermissions(created.id, selectPermissions);
                }
                toast.success("User created successfully", { position: "top-right", autoClose: 2500 });
            }
            navigate("/user");
        } catch (err: any) {
            toast.error(err.message || "Error saving user", { position: "top-right", autoClose: 2000 });
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
                        {id ? "Edit User" : "Add New User"}
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        Configure user information, assign roles, and set direct permissions
                    </p>
                </div>
                {showAndHideRoleDiv === "USER" && (
                    <div className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-semibold">
                        <FontAwesomeIcon icon={faShield} className="text-xs" />
                        {selectPermissions.length} direct + {rolePermissionIds.size} via roles
                    </div>
                )}
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
                {/* User Info Card */}
                <div className="panel mb-5">
                    <div className="flex items-center gap-2 mb-5">
                        <span className="w-1 h-5 bg-primary rounded-full inline-block"></span>
                        <h2 className="font-semibold text-gray-700 dark:text-white-light">User Information</h2>
                    </div>

                    {user?.roleType === "ADMIN" && (
                        <div className="mb-5">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type</label>
                            <div className="flex gap-6">
                                <label className="flex cursor-pointer items-center gap-2">
                                    <input type="radio" value="ADMIN" className="form-radio"
                                        {...register("roleType", { required: "Role type is required" })} />
                                    <span className="text-white-dark">SUPER ADMIN</span>
                                </label>
                                <label className="flex cursor-pointer items-center gap-2">
                                    <input type="radio" value="USER" className="form-radio"
                                        {...register("roleType", { required: "Role type is required" })} />
                                    <span className="text-white-dark">USER</span>
                                </label>
                            </div>
                            {errors.roleType && <p className="text-danger text-xs mt-1">{errors.roleType.message}</p>}
                        </div>
                    )}

                    {showAndHideRoleDiv === "USER" && !user?.branchId && (
                        <div className="mb-5 max-w-sm">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Branch <span className="text-danger">*</span>
                            </label>
                            <select className="form-select"
                                {...register("branchId", { required: "Branch is required" })}>
                                <option value="">Select a branch</option>
                                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                            {errors.branchId && <p className="text-danger text-xs mt-1">{errors.branchId.message}</p>}
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Last Name <span className="text-danger">*</span>
                            </label>
                            <input type="text" placeholder="Last Name" className="form-input"
                                {...register("lastName", { required: "Last Name is required" })} />
                            {errors.lastName && <p className="text-danger text-xs mt-1">{errors.lastName.message}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                First Name <span className="text-danger">*</span>
                            </label>
                            <input type="text" placeholder="First Name" className="form-input"
                                {...register("firstName", { required: "First Name is required" })} />
                            {errors.firstName && <p className="text-danger text-xs mt-1">{errors.firstName.message}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Email <span className="text-danger">*</span>
                            </label>
                            <input type="email" placeholder="Email" className="form-input"
                                {...register("email", { required: "Email is required" })} />
                            {errors.email && <p className="text-danger text-xs mt-1">{errors.email.message}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Phone Number <span className="text-danger">*</span>
                            </label>
                            <input type="text" placeholder="Phone Number" className="form-input"
                                {...register("phoneNumber", { required: "Phone Number is required" })} />
                            {errors.phoneNumber && <p className="text-danger text-xs mt-1">{errors.phoneNumber.message}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Password {!id && <span className="text-danger">*</span>}
                            </label>
                            <input type="password" className="form-input"
                                {...register("password", {
                                    required: !id ? "Password is required" : false,
                                    minLength: { value: 6, message: "Password must be at least 6 characters" }
                                })} />
                            {errors.password && <p className="text-danger text-xs mt-1">{errors.password.message}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Confirm Password
                            </label>
                            <input type="password" className="form-input"
                                {...register("confirmPassword", {
                                    validate: (val) => {
                                        if (watch("password") && !val) return "Confirm Password is required";
                                        if (watch("password") && watch("password") !== val) return "Passwords do not match";
                                        return true;
                                    }
                                })} />
                            {errors.confirmPassword && <p className="text-danger text-xs mt-1">{errors.confirmPassword.message}</p>}
                        </div>
                    </div>
                </div>

                {/* Roles Card */}
                {showAndHideRoleDiv === "USER" && (
                    <div className="panel mb-5">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="w-1 h-5 bg-primary rounded-full inline-block"></span>
                            <h2 className="font-semibold text-gray-700 dark:text-white-light">Assign Roles</h2>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {roleData.map(role => (
                                <label key={role.id}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition-all ${
                                        selectRoles.includes(Number(role.id))
                                            ? 'border-primary bg-primary/10 text-primary font-medium'
                                            : 'border-gray-200 dark:border-gray-600 hover:border-primary/40'
                                    }`}>
                                    <input
                                        type="checkbox"
                                        className="form-checkbox"
                                        value={role.id}
                                        checked={selectRoles.includes(Number(role.id))}
                                        onChange={e => handleRoleChange(Number(role.id), e.target.checked)}
                                    />
                                    <span className="text-sm">{role.name}</span>
                                    {(role.permissions?.length ?? 0) > 0 && (
                                        <span className="text-xs opacity-60">
                                            ({role.permissions!.length})
                                        </span>
                                    )}
                                </label>
                            ))}
                        </div>
                        {selectRoles.length > 0 && (
                            <p className="text-xs text-gray-400 mt-3">
                                Selected roles grant <span className="text-primary font-semibold">{rolePermissionIds.size}</span> permission{rolePermissionIds.size !== 1 ? 's' : ''} automatically — shown as <span className="inline-flex items-center gap-0.5 bg-primary/10 text-primary text-xs px-1.5 py-0.5 rounded">via role</span> below.
                            </p>
                        )}
                    </div>
                )}

                {/* Direct Permissions Card */}
                {showAndHideRoleDiv === "USER" && (
                    <div className="panel mb-5">
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-2">
                                <span className="w-1 h-5 bg-warning rounded-full inline-block"></span>
                                <div>
                                    <h2 className="font-semibold text-gray-700 dark:text-white-light">
                                        Direct Permissions
                                    </h2>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        Extra permissions added directly to this user, on top of role permissions
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {/* Legend */}
                                <div className="hidden sm:flex items-center gap-3 text-xs text-gray-400">
                                    <span className="flex items-center gap-1">
                                        <span className="inline-block w-3 h-3 rounded-sm bg-primary/20 border border-primary/40"></span>
                                        via role
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <span className="inline-block w-3 h-3 rounded-sm bg-warning/30 border border-warning/60"></span>
                                        direct
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleGlobalSelectAll}
                                    className={`text-xs font-medium px-3 py-1.5 rounded border transition-colors ${
                                        allGlobalSelected
                                            ? 'border-danger text-danger hover:bg-danger/10'
                                            : 'border-warning text-warning hover:bg-warning/10'
                                    }`}
                                >
                                    {allGlobalSelected ? 'Deselect All' : 'Select All'}
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {modules.map(module => {
                                const allSelected = isModuleAllSelected(module);
                                const someSelected = isModuleSomeSelected(module);
                                const moduleHasRolePerms = module.permissions.some(p => rolePermissionIds.has(p.id!));
                                return (
                                    <div key={module.id}
                                        className={`rounded-xl border-2 transition-all duration-200 overflow-hidden ${
                                            allSelected
                                                ? 'border-warning shadow-md shadow-warning/10'
                                                : someSelected
                                                ? 'border-warning/40'
                                                : moduleHasRolePerms
                                                ? 'border-primary/20'
                                                : 'border-gray-100 dark:border-[#1b2e4b]'
                                        }`}
                                    >
                                        {/* Module Header */}
                                        <div className={`flex items-center justify-between px-4 py-2.5 ${
                                            allSelected
                                                ? 'bg-warning text-white'
                                                : someSelected
                                                ? 'bg-warning/10 text-gray-700 dark:text-white'
                                                : moduleHasRolePerms
                                                ? 'bg-primary/5 text-gray-700 dark:text-white'
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
                                            {module.permissions.map((perm: PermissionData) => {
                                                const isDirect = selectPermissions.includes(perm.id!);
                                                const isViaRole = rolePermissionIds.has(perm.id!);
                                                const label = perm.name.replace(new RegExp(`^${module.name}-`, 'i'), '');

                                                if (isViaRole && !isDirect) {
                                                    // Read-only: granted via role
                                                    return (
                                                        <div key={perm.id}
                                                            className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg bg-primary/5">
                                                            <div className="flex items-center gap-2">
                                                                <input type="checkbox" checked disabled className="form-checkbox opacity-50" />
                                                                <span className="text-sm text-primary/70">{label}</span>
                                                            </div>
                                                            <span className="text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded font-medium shrink-0">
                                                                via role
                                                            </span>
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <label key={perm.id}
                                                        className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
                                                            isDirect
                                                                ? 'bg-warning/10 text-warning'
                                                                : 'hover:bg-gray-50 dark:hover:bg-[#253069] text-gray-600 dark:text-gray-300'
                                                        }`}>
                                                        <input
                                                            type="checkbox"
                                                            value={perm.id!}
                                                            checked={isDirect}
                                                            onChange={e => handlePermissionChange(perm.id!, e.target.checked)}
                                                            className="form-checkbox"
                                                        />
                                                        <span className={`text-sm ${isDirect ? 'font-medium' : ''}`}>
                                                            {label}
                                                        </span>
                                                    </label>
                                                );
                                            })}
                                        </div>

                                        {/* Module footer */}
                                        <div className="px-4 py-1.5 bg-gray-50 dark:bg-[#0e1726] border-t border-gray-100 dark:border-[#1b2e4b] flex items-center justify-between">
                                            <span className="text-xs text-gray-400">
                                                {module.permissions.filter(p => selectPermissions.includes(p.id!)).length} / {module.permissions.length} direct
                                            </span>
                                            {module.permissions.some(p => rolePermissionIds.has(p.id!)) && (
                                                <span className="text-xs text-primary/60">
                                                    {module.permissions.filter(p => rolePermissionIds.has(p.id!)).length} via role
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Footer Actions */}
                <div className="flex justify-end items-center gap-3">
                    <NavLink to="/user" className="btn btn-outline-warning">
                        <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
                        Go Back
                    </NavLink>
                    {hasPermission('User-Create') && (
                        <button type="submit" className="btn btn-primary" disabled={isLoading}>
                            <FontAwesomeIcon icon={faSave} className="mr-2" />
                            {isLoading ? 'Saving...' : 'Save User'}
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
};

export default UserForm;
