import React, { useEffect, useState } from "react"
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faClose } from '@fortawesome/free-solid-svg-icons';
import { useForm } from "react-hook-form";
import { useAppContext } from "../../hooks/useAppContext";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (id: number | null, serviceCode: string, name: string, description: string, price: number) => void;
    service?: { id: number | undefined, serviceCode: string, name: string, description: string, price: number } | null;
}

export interface FormData {
    serviceCode: string,
    name: string,
    description: string,
    price: number
};

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, onSubmit, service }) => {
    const [isLoading, setIsLoading] = useState(false);
    const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<FormData>();

    const { hasPermission } = useAppContext();

    useEffect(() => {
        if (service) {
            setValue('serviceCode', service.serviceCode);
            setValue('name', service.name);
            setValue('description', service.description);
            setValue('price', service.price);
        
            reset({
                serviceCode: service.serviceCode,
                name: service.name,
                description: service.description,
                price: service.price
            });
        } else {
            reset({
                serviceCode: '',
                name: '',
                description: '',
                price: undefined
            });
        }
    }, [service, setValue, reset]);

    const handleFormSubmit = async (data: FormData) => {
        setIsLoading(true);
        try {
            // Call the onSubmit function, making sure it receives the correct format
            await onSubmit(service?.id || null, data.serviceCode, data.name, data.description, data.price);
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
                        <h5 className="font-bold text-lg">{service ? "Edit Service" : "Add New Service"}</h5>
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
                                    <label htmlFor="module">Service Code <span className="text-danger text-md">*</span></label>
                                    <input 
                                        type="text" 
                                        placeholder="Enter service code" 
                                        className="form-input"
                                        {...register("serviceCode", { required: "This service code is required" })} 
                                    />
                                </div>

                                <div>
                                    <label htmlFor="module">Service's Name <span className="text-danger text-md">*</span></label>
                                    <input 
                                        type="text" 
                                        placeholder="Enter Service's name" 
                                        className="form-input"
                                        {...register("name", { required: "This service name is required" })} 
                                    />
                                    {errors.name && <p className='error_validate'>{errors.name.message}</p>}
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-5">
                                <div>
                                    <label htmlFor="module">Price <span className="text-danger text-md">*</span></label>
                                    <input 
                                        type="text" 
                                        placeholder="Enter price" 
                                        className="form-input"
                                        {...register("price", { required: "This price is required" })} 
                                    />
                                    {errors.price && <p className='error_validate'>{errors.price.message}</p>}
                                </div>

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
                                {hasPermission(service?.id ? 'Service-Edit' : 'Service-Create') &&
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