import React, { use, useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faSave } from "@fortawesome/free-solid-svg-icons";
import { NavLink, useNavigate, useParams } from "react-router-dom";
import { getAllBranches } from "../../api/branch";
import { getAllRoles } from "../../api/role";
import { createUser, getUserById, updateUser } from "../../api/user";
import { SubmitHandler, useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { useAppContext } from '../../hooks/useAppContext';
import { BranchType, RoleType, UserType } from "../../data_types/types";

const UserForm: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [isLoading, setIsLoading] = useState(false);
    const [branches, setBranches] = useState<BranchType[]>([]);
    const [roleData, setRoleData] = useState<RoleType[]>([]);
    const [selectRoles, setSelectRoles] = useState<number[]>([]);
    const [userData, setUserData] = useState<UserType | null>(null);
    // const [userRoleType, setUserRoleType] = useState<string>();

    const { user, hasPermission } = useAppContext();

    const navigate = useNavigate()

    const { register, watch, handleSubmit, setValue, formState: { errors } } = useForm<UserType> ();

    const fetchBranches = async () => {
        setIsLoading(true);
        try {
            const data = await getAllBranches();
            setBranches(data as BranchType[]);
        } catch (error) {
            console.error("Error fetching branch:", error);
        } finally {
            setIsLoading(false);
        }
    }

    const fetchRole = async () => {
        setIsLoading(true);
        try {
            const data = await getAllRoles();
            setRoleData(data as RoleType[]);
        } catch (error) {
            console.error("Error fetching role:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchUser = async () => {
        setIsLoading(true);
        try {
            if (id) {
                const userResult = await getUserById(parseInt(id, 10));
                const roleIds = userResult.roles.map((role: any) => role.roleId);
                setSelectRoles(roleIds);
                setUserData(userResult);
            }
        } catch (error) {
            console.error("Error fetching user:", error);
        } finally {
            setIsLoading(false);
        }
    };


    // Watch the value of "roleType"
    const showAndHideRoleDiv = watch("roleType", "USER"); // Default to "ADMIN"
    useEffect(() => {
        fetchBranches();
        fetchUser();
        fetchRole();
    }, [id]);

    useEffect(() => {
        if (!watch("roleType")) {
            setValue("roleType", "USER");
        }
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
        const updateRoles = isChecked
            ? [...selectRoles, roleId]
            : selectRoles.filter(r => r !== roleId);
    
        setSelectRoles(updateRoles);
    
        // Transform the number[] (role IDs) to RoleData[]
        const updatedRoleData = roleData.filter(role => updateRoles.includes(Number(role.id)));
    
        setValue("roles", updatedRoleData, { shouldValidate: true }); // Setting RoleData[] here
    };

    const onSubmit: SubmitHandler<UserType> = async (userData) => {
        setIsLoading(true);
        try {
            // Check if userData.branchId is empty or undefined, or if user?.branchId is undefined
            const branchIdToSend = userData.branchId || user?.branchId || null; // If not selected or user?.branchId is undefined, set to null

            // Transform role IDs into RoleType[] format
            const rolesToSend = selectRoles.map(roleId => roleId);

            // Prepare data to send to API
            const dataToSend = {
                ...userData,
                branchId: branchIdToSend, // Ensure branchId is always included
                roleIds: rolesToSend, // Add roleIds to data
            };
            if (id) {
                await updateUser(parseInt(id, 10), dataToSend);
                toast.success("User updated successfully", {
                    position: "top-right",
                    autoClose: 2500
                });
            } else {
                await createUser(dataToSend);
                toast.success("User created successfully", {
                    position: "top-right",
                    autoClose: 2500
                });
            }
            navigate("/user");
        } catch (err: any) {
            if (err.message) {
                toast.error(err.message, {
                    position: 'top-right',
                    autoClose: 2000
                });
            } else {
                toast.error("Error adding/editing user", {
                    position: 'top-right',
                    autoClose: 2000
                });
            }
        } finally {
            setIsLoading(false);
        }
    }

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
                    </svg>{ id ? "Update User" : "Add User" }
                </h5>
            </div>
            <div className="mb-5">
                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="mb-5">
                        {user?.roleType === "ADMIN" &&
                            <div className="mb-5">
                                <label>Type</label>
                                <div className="flex flex-wrap">
                                    <label className="flex cursor-pointer items-center" style={{ marginRight: '20px'}}>
                                        <input type="radio" value="ADMIN" className="form-radio"
                                            {...register("roleType", { required: "Role type is required" })} />
                                        <span className="text-white-dark">SUPER ADMIN</span>
                                    </label>
                                    <label className="flex cursor-pointer items-center">
                                        <input type="radio" value="USER" className="form-radio" 
                                            {...register("roleType", { required: "Role type is required" })} />
                                        <span className="text-white-dark">USER</span>
                                    </label>
                                </div>
                                {errors.roleType && <span className="error_validate">{errors.roleType.message}</span>}
                            </div>
                        }

                        {showAndHideRoleDiv === "USER" && !user?.branchId &&
                            <div className="mb-5">
                                <label>Branch <span className="text-danger text-md">*</span></label>
                                <select 
                                    id="branch" className="form-input" 
                                    {...register("branchId", { 
                                        required: "Branch is required"
                                    })} 
                                >
                                    <option value="">Select a branch</option>
                                    {branches.map((option) => (
                                        <option key={option.id} value={option.id}>
                                            {option.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.branchId && <span className="error_validate">{errors.branchId.message}</span>}
                            </div>
                        }
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-5">
                            <div>
                                <label>Last Name <span className="text-danger text-md">*</span></label>
                                <input type="text" placeholder="Last Name" className="form-input"
                                    {...register("lastName", {required: "Last Name is required"})} />
                                {errors.lastName && <span className="error_validate">{errors.lastName.message}</span>}
                            </div>
                            <div>
                                <label>First Name <span className="text-danger text-md">*</span></label>
                                <input type="text" placeholder="First Name" className="form-input" 
                                    {...register("firstName", {required: "First Name is required"})}/>
                                {errors.firstName && <span className="error_validate">{errors.firstName.message}</span>}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-5">
                            <div>
                                <label>Email <span className="text-danger text-md">*</span></label>
                                <input type="email" placeholder="Email" className="form-input" 
                                    {...register("email", {required: "Email is required"})}/>
                                {errors.email && <span className="error_validate">{errors.email.message}</span>}
                            </div>
                            <div>
                                <label>Phone Number <span className="text-danger text-md">*</span></label>
                                <input type="text" placeholder="Phone Number" className="form-input" 
                                    {...register("phoneNumber", {required: "Phone Number is required"})}/>
                                {errors.firstName && <span className="error_validate">{errors.firstName.message}</span>}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label>Password <span className="text-danger text-md">*</span></label>
                                <input type="password" className="form-input" 
                                    {...register("password", {
                                        required: !id ? "Password is required" : false,
                                        minLength: {
                                            value: 6,
                                            message: "Password must be at least 6 characters"
                                        }
                                })}/>
                                {errors.password && <span className="error_validate">{errors.password.message}</span>}
                            </div>
                            <div>
                                <label>Confirm Password</label>
                                <input type="password" className="form-input" 
                                    {...register("confirmPassword", {
                                        validate: (val) => {
                                            if (watch("password") && !val) {
                                                return "Confirm Password is required";
                                            } else if (watch("password") && watch("password") !== val) {
                                                return "Your password not match";
                                            }
                                            return true;
                                        }
                                    })}/>
                                {errors.confirmPassword && <span className='error_validate'>{errors.confirmPassword.message}</span>}
                            </div>
                        </div>
                    </div>
                    {showAndHideRoleDiv === "USER" &&
                        <div className="mt-5">
                            <label className="font-semibold text-underline" style={{ fontSize: '18px', textDecoration: "underline" }}>Give Role <span className="text-danger text-md">*</span></label>
                            <div className="flex flex-wrap space-x-4 mt-5">
                                {roleData.map(role_row => (
                                    <div key={role_row.id}>
                                        <label className="flex items-center cursor-pointer mb-5">
                                            <input 
                                                type="checkbox"
                                                className="form-checkbox"
                                                id={`${role_row.id}`}
                                                value={role_row.id}
                                                checked={selectRoles.includes(Number(role_row.id))}
                                                onChange={e => handleRoleChange(Number(role_row.id), e.target.checked)} 
                                            />
                                            <span className="text-white-dark">{role_row.name}</span>
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    }
                    <div className="flex justify-end items-center mt-8">
                        <NavLink to="/user" type="button" className="btn btn-outline-warning">
                            <FontAwesomeIcon icon={faArrowLeft} className='mr-1' />
                            Go Back
                        </NavLink>
                        {hasPermission('User-Create') &&
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
};

export default UserForm;