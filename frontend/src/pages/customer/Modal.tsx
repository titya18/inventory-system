import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faClose } from '@fortawesome/free-solid-svg-icons';
import { useForm } from "react-hook-form";
import { useAppContext } from "../../hooks/useAppContext";
import { CustomerType } from "@/data_types/types";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (payload: {
        id: number | null;
        data: CustomerType
    }) => Promise<void>;
    customer?: { id?: number } & Partial<CustomerType> | null;
};

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, onSubmit, customer }) => {
    const [isLoading, setIsLoading] = useState(false);
    const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<CustomerType>();

    const { hasPermission } = useAppContext();

    useEffect(() => {
        if (customer) {
            reset({
                id: customer?.id || 0,
                name: customer?.name || '',
                phone: customer?.phone || '',
                email: customer?.email || '',
                address: customer?.address || ''
            });
        } else {
            reset({
                id: 0,
                name: '',
                phone: '',
                email: '',
                address: ''
            });
        }
    }, [customer, setValue, reset]);

    const handleFormSubmit = async (data: CustomerType) => {
        setIsLoading(true);
        try {
            // Call the onSubmit function, making sure it recieve the correct format
            await onSubmit({
                id: customer ? customer.id || null : null,
                data: {
                    ...data
                }
            });
            reset();
            onClose(); 
        } catch (error) {
            console.error("Error submitting form:", error);
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
                        <h5 className="font-bold text-lg">{customer ? "Edit Customer" : "Add New Customer"}</h5>
                        <button type="button" className="text-white-dark hover:text-dark" onClick={onClose}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    <form onSubmit={handleSubmit(handleFormSubmit)}>
                        <div className="p-5">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-5">
                                <div>
                                    <label htmlFor="module">Customer's Name <span className="text-danger text-md">*</span></label>
                                    <input 
                                        type="text" 
                                        placeholder="Enter Customer's name" 
                                        className="form-input"
                                        {...register("name", { required: "This field is required" })} 
                                    />
                                    {errors.name && <p className='error_validate'>{errors.name.message}</p>}
                                </div>

                                <div>
                                    <label htmlFor="module">Phone <span className="text-danger text-md">*</span></label>
                                    <input 
                                        type="text" 
                                        placeholder="Enter Customer's phone" 
                                        className="form-input"
                                        {...register("phone", { required: "This field is required" })} 
                                    />
                                    {errors.phone && <p className='error_validate'>{errors.phone.message}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-5">
                                <div>
                                    <label htmlFor="module">Email </label>
                                    <input 
                                        type="text" 
                                        placeholder="Enter Customer's email" 
                                        className="form-input"
                                        {...register("email")} 
                                    />
                                </div>

                                <div>
                                    <label htmlFor="module">Address <span className="text-danger text-md">*</span></label>
                                    <input 
                                        type="text" 
                                        placeholder="Enter Customer's address" 
                                        className="form-input"
                                        {...register("address", { required: "This field is required" })} 
                                    />
                                    {errors.address && <p className='error_validate'>{errors.address.message}</p>}
                                </div>
                            </div>

                            <div className="flex justify-end items-center mt-8">
                                <button type="button" className="btn btn-outline-danger" onClick={onClose}>
                                    <FontAwesomeIcon icon={faClose} className='mr-1' />
                                    Discard
                                </button>
                                {hasPermission('Customer-Create') &&
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