import React, { useEffect, useState } from "react"
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faClose } from '@fortawesome/free-solid-svg-icons';
import { useForm } from "react-hook-form";
import { useAppContext } from "../../hooks/useAppContext";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (id: number | null, amount: number) => void;
    exchangeRate?: { id: number | undefined, amount: number } | null;
}

export interface FormData {
    amount: number
};

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, onSubmit, exchangeRate }) => {
    const [isLoading, setIsLoading] = useState(false);
    const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<FormData>();

    const { hasPermission } = useAppContext();

    useEffect(() => {
        if (exchangeRate) {
            setValue('amount', exchangeRate.amount);
            reset({
                amount: exchangeRate.amount
            });
        } else {
            reset({
                amount: undefined
            });
        }
    }, [exchangeRate, setValue, reset]);

    const handleFormSubmit = async (data: FormData) => {
        setIsLoading(true);
        try {
            // Call the onSubmit function, making sure it receives the correct format
            await onSubmit(exchangeRate?.id || null, data.amount);
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
                        <h5 className="font-bold text-lg">{exchangeRate ? "Edit Exchange Rate" : "Add New Exchange Rate"}</h5>
                        <button type="button" className="text-white-dark hover:text-dark" onClick={onClose}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    <form onSubmit={handleSubmit(handleFormSubmit)}>
                        <div className="p-5">
                            <div className="dark:text-white-dark/70 text-base font-medium text-[#1f2937]">
                                <label htmlFor="module">Amount <span className="text-danger text-md">*</span></label>
                                <input 
                                    type="text" 
                                    placeholder="Enter Amount" 
                                    className="form-input"
                                    {...register("amount", { required: "This field is required" })} 
                                />
                                {errors.amount && <p className='error_validate'>{errors.amount.message}</p>}
                            </div>
                            
                            <div className="flex justify-end items-center mt-8">
                                <button type="button" className="btn btn-outline-danger" onClick={onClose}>
                                    <FontAwesomeIcon icon={faClose} className='mr-1' />
                                    Discard
                                </button>
                                {hasPermission('Exchange-Rate-Edit') &&
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