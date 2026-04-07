import React, { useEffect, useState } from "react"
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faClose } from '@fortawesome/free-solid-svg-icons';
import { useFieldArray, useForm } from "react-hook-form";
import { useAppContext } from "../../hooks/useAppContext";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (id: number | null, name: string, permissions: string[] | null) => void;
    modulePermission?: { id: number | undefined, name: string, permissions: string[] | null } | null;
}

interface PermissionName {
    name: string;
}

export interface FormData {
    name: string,
    permissions: PermissionName[]
};

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, onSubmit, modulePermission }) => {
    const [isLoading, setIsLoading] = useState(false);
    const { register, handleSubmit, setValue, reset, control, formState: { errors } } = useForm<FormData>();

    const { hasPermission } = useAppContext();
    
    const { fields, append, remove } = useFieldArray({
        control,
        name: 'permissions'
    });

    useEffect(() => {
        if (modulePermission) {
            setValue('name', modulePermission.name);
            reset({
                name: modulePermission.name,
                permissions: modulePermission.permissions ? modulePermission.permissions.map(name => ({ name })) : []
            });
        } else {
            reset({
                name: '',
                permissions: []
            });
        }
    }, [modulePermission, setValue, reset]);

    const handleFormSubmit = async (data: FormData) => {
        setIsLoading(true);
        try {
            // Extract permission names from form data
            const names = data.permissions.map(p => p.name);

            // Call the onSubmit function, making sure it receives the correct format
            await onSubmit(modulePermission?.id || null, data.name, names);
            reset();
            onClose();
        } catch (error) {
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
                        <h5 className="font-bold text-lg">{modulePermission ? "Edit Module Permission" : "Add New Module Permission"}</h5>
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
                                <label htmlFor="module">Module's Name</label>
                                <input 
                                    type="text" 
                                    placeholder="Enter Module's name" 
                                    className="form-input"
                                    {...register("name", { required: "This field is required" })} 
                                />
                                {errors.name && <p className='error_validate'>{errors.name.message}</p>}
                            </div>
                            <div className="mt-4">
                                <label htmlFor="permissionNames">Permissions</label>
                                {fields.map((field, index) => (
                                    <div key={field.id} className="flex items-center mb-2">
                                        <input
                                            type="text"
                                            placeholder="Enter permission name"
                                            className="form-input"
                                            {...register(`permissions.${index}.name` as const, { required: "This field is required" })}
                                            defaultValue={field.name}
                                        />
                                        <button type="button" onClick={() => remove(index)} className="ml-2 text-danger">
                                            <FontAwesomeIcon icon={faClose} />
                                        </button>
                                    </div>
                                ))}
                                <button type="button" onClick={() => append({ name: '' })} className="mt-2 btn btn-outline-primary">
                                    Add Permission
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