import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faClose } from '@fortawesome/free-solid-svg-icons';
import { useForm } from "react-hook-form";
import { useAppContext } from "../../hooks/useAppContext";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (id: number | null, name: string, type: string) => void;
    unit?: { id: number | undefined, name: string, type: string } | null;
};

export interface FormData {
    name: string,
    type: string;
};

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, onSubmit, unit }) => {
    const [isLoading, setIsLoading] = useState(false);
    const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<FormData>();

    const { hasPermission } = useAppContext();

    useEffect(() => {
        if (unit) {
            setValue('name', unit.name);
            setValue('type', unit.type);
            reset({ name: unit.name, type: unit.type });
        } else {
            reset({ name: '', type: '' });
        }
    }, [unit, setValue, reset]);

    const handleFormSubmit = async (data: FormData) => {
        setIsLoading(true);
        try {
            // Call the onSubmit function, making sure it recieve the correct format
            await onSubmit(unit?.id || null, data.name, data.type);
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
                        <h5 className="font-bold text-lg">{unit ? "Edit Unit" : "Add New Unit"}</h5>
                        <button type="button" className="text-white-dark hover:text-dark" onClick={onClose}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    <form onSubmit={handleSubmit(handleFormSubmit)}>
                        <div className="p-5">
                            <div className="dark:text-white-dark/70 text-base font-medium text-[#1f2937] mb-4">

                                <label htmlFor="module">Unit's Type <span className="text-danger text-md">*</span></label>
                                <select 
                                    className="form-input"
                                    {...register("type", { required: "This field is required" })}
                                >
                                    <option value="">Select Type</option>
                                    <option value="WEIGHT">Weight (kg, g, mg)</option>
                                    <option value="LENGTH">Length (m, cm, mm)</option>
                                    <option value="QUANTITY">Quantity (pcs, box, bundle)</option>
                                    <option value="COLOR">Color (red, blue, black, white)</option>
                                    <option value="SIZE">Size (S, M, L, XL)</option>
                                    <option value="VOLUME">Volume (L, mL)</option>
                                    <option value="AREA">Area (m2, cm2, mm2)</option>
                                    <option value="CAPACITY">Capacity (GB, TB)</option>
                                </select>
                                {errors.type && <p className='error_validate'>{errors.type.message}</p>}
                            </div>

                            <div className="dark:text-white-dark/70 text-base font-medium text-[#1f2937]">
                                <label htmlFor="module">Unit's Name <span className="text-danger text-md">*</span></label>
                                <input 
                                    type="text" 
                                    placeholder="Enter Unit's name" 
                                    className="form-input"
                                    {...register("name", { required: "This field is required" })} 
                                />
                                {errors.name && <p className='error_validate'>{errors.name.message}</p>}
                            </div>
                            
                            <div className="flex justify-end items-center mt-8">
                                <button type="button" className="btn btn-outline-danger" onClick={onClose}>
                                    <FontAwesomeIcon icon={faClose} className='mr-1' />
                                    Discard
                                </button>
                                {hasPermission('Unit-Create') &&
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