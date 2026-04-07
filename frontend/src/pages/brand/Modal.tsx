import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faClose } from '@fortawesome/free-solid-svg-icons';
import { useAppContext } from "../../hooks/useAppContext";
import { useForm } from "react-hook-form";
import { BrandType } from "@/data_types/types";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (payload: {
        id: number | null;
        data: BrandType;
    }) => Promise<void>;
    brand?: BrandType | null;
};

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, onSubmit, brand }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<BrandType>();

    const { hasPermission } = useAppContext();
    const API_BASE_URL = import.meta.env.VITE_API_URL || "";

    useEffect(() => {
        if (brand) {
            setValue("id", brand.id ?? 0);
            setValue('en_name', brand.en_name ?? "");
            // setValue('kh_name', brand.kh_name);
            setValue("description", brand.description ?? "");
    
            // If there is an image, convert it to a preview URL or set it to null
            if (brand.image) {
                // Assuming brand.image is a File object or a URL string
                if (brand.image instanceof File) {
                    setImagePreview(URL.createObjectURL(brand.image));
                } else {
                    setImagePreview(`${API_BASE_URL}/${brand.image}`); // If it's already a URL, set it directly
                }
            } else {
                setImagePreview(null);
            }
    
            reset({ id: brand.id, en_name: brand.en_name, kh_name: brand.kh_name, description: brand.description, image: brand.image });
        } else {
            reset({ en_name: "", kh_name: "", description: "", image: null });
            setImagePreview(null); // Clear the image preview when creating a new brand
        }
    }, [brand, setValue, reset]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files?.[0];
            setImagePreview(URL.createObjectURL(file));
            setValue("image", file); // Update react-hook-form state
        }
    };

    const handleFormSubmit = async(data: BrandType) => {
        setIsLoading(true);
        try {
            // // Prepare form data
            // const formData = new FormData();
            // formData.append("name", data.name);
            // formData.append("description", data.description);
            // if (data.image) formData.append("image", data.image); // Append image file if it exists

            await onSubmit({
                id: brand?.id || null,
                data: {
                    ...data,
                },
            });

            setImagePreview(null); 
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
                        <h5 className="font-bold text-lg">{brand ? "Edit Brand" : "Add New Brand"}</h5>
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
                                <label htmlFor="module">Brand's Name(EN) <span className="text-danger text-md">*</span></label>
                                <input 
                                    type="text" 
                                    placeholder="Enter Brand's name(EN)" 
                                    className="form-input"
                                    {...register("en_name", { required: "This field is required" })} 
                                />
                                {errors.en_name && <p className='error_validate'>{errors.en_name.message}</p>}
                            </div>

                            {/* <div className="dark:text-white-dark/70 text-base font-medium text-[#1f2937]">
                                <label htmlFor="module">Brand's Name(KH) <span className="text-danger text-md">*</span></label>
                                <input 
                                    type="text" 
                                    placeholder="Enter Brand's name(KH)" 
                                    className="form-input"
                                    {...register("kh_name", { required: "This field is required" })} 
                                />
                                {errors.kh_name && <p className='error_validate'>{errors.kh_name.message}</p>}
                            </div> */}

                            <div className="dark:text-white-dark/70 text-base font-medium text-[#1f2937] mt-5">
                                <label htmlFor="module">Description</label>
                                <input 
                                    type="text" 
                                    placeholder="Enter Description" 
                                    className="form-input"
                                    {...register("description")} 
                                />
                            </div>

                            <div className="dark:text-white-dark/70 text-base font-medium text-[#1f2937] mt-5">
                                <label htmlFor="module">Brand's Image</label>
                                <input type="file" name="image" accept="image/*" onChange={handleImageChange} />
                                {imagePreview && <img src={imagePreview} alt="Preview" className="mt-2 max-h-24" />}
                            </div>
                            
                            <div className="flex justify-end items-center mt-8">
                                <button type="button" className="btn btn-outline-danger" onClick={onClose}>
                                    <FontAwesomeIcon icon={faClose} className='mr-1' />
                                    Discard
                                </button>
                                {hasPermission(brand?.id ? 'Brand-Edit' : 'Brand-Create') &&
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