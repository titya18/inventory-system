import React, { useEffect, useState } from "react"
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faClose } from '@fortawesome/free-solid-svg-icons';
import { useFieldArray, useForm } from "react-hook-form";
import { useAppContext } from "../../hooks/useAppContext";
import { VarientAttributeType } from "../../data_types/types";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (id: number | null, name: string, values: string[] | null) => void;
    varientAttributeData?: { id: number | undefined, name: string, values: string[] | null } | null;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, onSubmit, varientAttributeData }) => {
    const [isLoading, setIsLoading] = useState(false);
    const { register, handleSubmit, setValue, reset, control, formState: { errors } } = useForm<VarientAttributeType>();

    const { hasPermission } = useAppContext();
    
    const { fields, append, remove } = useFieldArray<VarientAttributeType, 'values', 'id'>({
        control,
        name: 'values'
    });

    useEffect(() => {
        if (varientAttributeData) {
            setValue('name', varientAttributeData.name);
            reset({
                name: varientAttributeData.name,
                values: varientAttributeData.values ? varientAttributeData.values.map(value => ({ value })) : []
            });
        } else {
            setTimeout(() => {
                    reset({
                        name: '',
                        values: []
                    });
                }, 0);
        }
    }, [varientAttributeData, setValue, reset]);

    const handleFormSubmit = async (data: VarientAttributeType) => {
        setIsLoading(true);
        try {
            // Extract values varient from form data
            const values = data.values.map(v => v.value);

            // Call the onSubmit function with a single VarientAttributeData argument
            await onSubmit(varientAttributeData?.id || null, data.name, values);
            reset();
            onClose();
        } catch (error) {
            console.log("Error submitting from:", error);
        } finally {
            setIsLoading(false);
        }
    }

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-[black]/60 z-[999] overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4">
                <div className="panel border-0 p-0 rounded-lg overflow-hidden w-full max-w-lg my-8">
                    <div className="flex bg-[#fbfbfb] dark:bg-[#121c2c] items-center justify-between px-5 py-3">
                        <h5 className="font-bold text-lg">{varientAttributeData ? "Edit Varient Attribute" : "Add New Varient Attribute"}</h5>
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
                                <label htmlFor="module">Varient Attribute's Name</label>
                                <input 
                                    type="text" 
                                    placeholder="Enter Module's name" 
                                    className="form-input"
                                    {...register("name", { required: "This field is required" })} 
                                />
                                {errors.name && <p className='error_validate'>{errors.name.message}</p>}
                            </div>
                            <div className="mt-4">
                                <label htmlFor="permissionNames">Varient Value</label>
                                {fields.map((field, index) => (
                                    <div key={field.id} className="flex items-center mb-2">
                                        <input
                                            type="text"
                                            placeholder="Enter value"
                                            className="form-input"
                                            {...register(`values.${index}.value` as const, { required: "This field is required" })}
                                            defaultValue={field.value}
                                        />
                                        <button type="button" onClick={() => remove(index)} className="ml-2 text-danger">
                                            <FontAwesomeIcon icon={faClose} />
                                        </button>
                                    </div>
                                ))}
                                <button type="button" onClick={() => append({ value: '' })} className="mt-2 btn btn-outline-primary">
                                    Add Value
                                </button>
                            </div>
                            <div className="flex justify-end items-center mt-8">
                                <button type="button" className="btn btn-outline-danger" onClick={onClose}>
                                    <FontAwesomeIcon icon={faClose} className='mr-1' />
                                    Discard
                                </button>
                                {hasPermission('Permission-Create') &&
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