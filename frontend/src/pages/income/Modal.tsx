import React, { useEffect, useState, useCallback } from "react"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faClose } from '@fortawesome/free-solid-svg-icons';
import { Controller, useForm } from "react-hook-form";
import { useAppContext } from "../../hooks/useAppContext";
import { IncomeType, BranchType } from "@/data_types/types";
import { getAllBranches } from "@/api/branch";
import { el } from "date-fns/locale";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (payload: {
        id: number | null;
        data: IncomeType;
    }) => Promise<void>;
    income?: { id: number } & Partial<IncomeType> | null;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, onSubmit, income }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [braches, setBranches] = useState<BranchType[]>([]);
    const { control, register, handleSubmit, setValue, reset, formState: { errors } } = useForm<IncomeType>();

    const { user, hasPermission } = useAppContext();

    const fetchBranches = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getAllBranches();
            setBranches(data as BranchType[]);
        } catch (error) {
            console.error("Error fetching branch:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBranches();
    }, [fetchBranches]);

    useEffect(() => {
        if (income) {
            setValue('id', income.id ?? 0);
            setValue("incomeDate", income.incomeDate
                        ? new Date(income.incomeDate).toISOString()
                        : ''
                    );
            setValue('branchId', income.branchId ?? 0);
            setValue('name', income.name ?? '');
            setValue('description', income.description ?? '');
            setValue('amount', income.amount ?? 0);
            setValue('delReason', income.delReason ?? '');
        } else {
            reset({
                id: 0,
                incomeDate: '',
                branchId: undefined,
                name: '',
                description: '',
                amount: undefined,
            });
        }
    }, [income, setValue, reset]);

    const handleFormSubmit = async (data: IncomeType) => {
        setIsLoading(true);
        try {
            // Call the onSubmit function, making sure it receives the correct format
            await onSubmit({
                id: income?.id || null,
                data: {
                    ...data
                }
            });
            reset();
            onClose();
        } catch (error) {
            console.log("Error submitting from:", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-[black]/60 z-[999] overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4">
                <div className="panel border-0 p-0 rounded-lg overflow-hidden w-full max-w-lg my-8">
                    <div className="flex bg-[#fbfbfb] dark:bg-[#121c2c] items-center justify-between px-5 py-3">
                        <h5 className="font-bold text-lg">{income ? "Edit Income" : "Add New Income"}</h5>
                        <button type="button" className="text-white-dark hover:text-dark" onClick={onClose}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    <form onSubmit={handleSubmit(handleFormSubmit)}>
                        <div className="p-5">
                            <div className={`grid grid-cols-1 gap-4 ${ user?.roleType === "ADMIN" ? 'sm:grid-cols-2' : 'sm:grid-cols-1' } mb-5`}>
                                {user?.roleType === "ADMIN" &&
                                    <div>
                                        <label>Branch <span className="text-danger text-md">*</span></label>
                                        <select 
                                            id="branch" className="form-input" 
                                            {...register("branchId", { 
                                                required: "Branch is required"
                                            })} 
                                        >
                                            <option value="">Select a branch</option>
                                            {braches.map((option) => (
                                                <option key={option.id} value={option.id}>
                                                    {option.name}
                                                </option>
                                            ))}
                                        </select>
                                        {errors.branchId && <span className="error_validate">{errors.branchId.message}</span>}
                                    </div>
                                }
                                
                                <div>
                                    <label htmlFor="date-picker">Select a Date: <span className="text-danger text-md">*</span></label>
                                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                                        <Controller
                                            name="incomeDate"
                                            control={control}
                                            rules={{ required: "Income date is required" }}
                                            render={({ field }) => (
                                                <DatePicker
                                                    value={field.value ? new Date(field.value as string) : null}
                                                    onChange={(date) => field.onChange(date)}
                                                    minDate={new Date()}
                                                    slotProps={{
                                                        textField: {
                                                            fullWidth: true,
                                                            error: !!errors.incomeDate,
                                                        },
                                                    }}
                                                />
                                            )}
                                        />
                                    </LocalizationProvider>
                                    {errors.incomeDate && <span className="error_validate">{errors.incomeDate.message}</span>}
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-5">
                                <div>
                                    <label htmlFor="module">Income's name <span className="text-danger text-md">*</span></label>
                                    <input 
                                        type="text" 
                                        placeholder="Enter income's name" 
                                        className="form-input"
                                        {...register("name", { required: "This income's name is required" })} 
                                    />
                                    {errors.name && <p className='error_validate'>{errors.name.message}</p>}
                                </div>
                                
                                <div>
                                    <label htmlFor="module">Amount <span className="text-danger text-md">*</span></label>
                                    <input
                                        type="text"
                                        placeholder="Enter amount to paid"
                                        className="form-input w-full"
                                        {...register("amount", {
                                            required: "Amount is required",
                                        })}
                                        onInput={(e: React.FormEvent<HTMLInputElement>) => {
                                            const target = e.currentTarget;

                                            // Allow numbers + decimal
                                            target.value = target.value.replace(/[^0-9.]/g, "");

                                            // Prevent multiple dots
                                            const parts = target.value.split(".");
                                            if (parts.length > 2) {
                                                target.value = parts[0] + "." + parts.slice(1).join("");
                                            }
                                        }}
                                    />
                                    {errors.amount && <p className='error_validate'>{errors.amount.message}</p>}
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-1 mb-5">

                                <div>
                                    <label htmlFor="module">Description</label>
                                    <input 
                                        type="text" 
                                        placeholder="Enter description" 
                                        className="form-input"
                                        {...register("description")} 
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end items-center mt-8">
                                <button type="button" className="btn btn-outline-danger" onClick={onClose}>
                                    <FontAwesomeIcon icon={faClose} className='mr-1' />
                                    Discard
                                </button>
                                {hasPermission('Income-Create') &&
                                    <button type="submit" className="btn btn-primary ltr:ml-4 rtl:mr-4" disabled={isLoading}>
                                        <FontAwesomeIcon icon={faSave} className='mr-1' />
                                        {isLoading ? 'Saving...' : 'Save'}
                                    </button>
                                }
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Modal;