import React, { useState, useRef, useEffect } from "react";
import { useFormContext, Controller } from "react-hook-form";
import { ProductVariantType } from "../../data_types/types";
import { FaChevronDown, FaTimes } from "react-icons/fa";

interface VariantValue {
  id: number;
  value: string;
}

interface Props {
  variantValues: VariantValue[];
}

const MultiSelectVariant: React.FC<Props> = ({ variantValues }) => {
  const { control, formState: { errors } } = useFormContext<ProductVariantType>();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  const handleClickOutside = (event: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="mb-4 relative mt-7" ref={dropdownRef}>
      <label className="absolute -top-3 left-3 bg-white dark:bg-gray-800 px-1 text-gray-500 text-sm font-medium pointer-events-none">
        Variant Values <span className="text-red-500">*</span>
      </label>

      <Controller
        control={control}
        name="variantValueIds"
        rules={{ required: "Please select at least one variant value" }}
        render={({ field }) => {
          const selectedIds: number[] = field.value || []; // default to empty array
          const { onChange } = field;

          const toggleValue = (id: number) => {
            if (selectedIds.includes(id)) {
              onChange(selectedIds.filter((v) => v !== id));
            } else {
              onChange([...selectedIds, id]);
            }
          };

          return (
            <>
              {/* Dropdown Input */}
              <div
                className={`flex flex-wrap items-center gap-2 min-h-[44px] border rounded-md p-2 bg-white dark:bg-gray-800 cursor-pointer transition-all focus-within:ring-2 focus-within:ring-indigo-500 ${
                  errors.variantValueIds ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                }`}
                onClick={() => setIsOpen(!isOpen)}
              >
                {selectedIds.length === 0 && (
                  <span className="text-gray-400 dark:text-gray-400">Select variant values...</span>
                )}

                {selectedIds.map((id) => {
                  const value = variantValues.find((v) => v.id === id)?.value;
                  return (
                    <span
                      key={id}
                      className="flex items-center gap-1 bg-indigo-100 dark:bg-indigo-600 text-indigo-800 dark:text-white px-2 py-1 rounded-full text-sm transition-all hover:bg-indigo-200 dark:hover:bg-indigo-500"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {value}
                      <FaTimes
                        className="cursor-pointer hover:text-indigo-900 dark:hover:text-indigo-200"
                        onClick={() => toggleValue(id)}
                      />
                    </span>
                  );
                })}

                <FaChevronDown className="ml-auto text-gray-500" />
              </div>

              {/* Dropdown List */}
              {isOpen && (
                <div className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 shadow-lg">
                  {variantValues.map((v) => (
                    <label
                      key={v.id}
                      className={`flex items-center gap-2 px-4 py-2 cursor-pointer transition-colors rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
                        selectedIds.includes(v.id) ? "bg-indigo-50 dark:bg-indigo-600" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="accent-indigo-500 w-4 h-4"
                        checked={selectedIds.includes(v.id)}
                        onChange={() => toggleValue(v.id)}
                      />
                      <span className="text-gray-800 dark:text-white">{v.value}</span>
                    </label>
                  ))}
                </div>
              )}

              {errors.variantValueIds && <p className='error_validate'>{errors.variantValueIds.message}</p>}
            </>
          );
        }}
      />
    </div>
  );
};

export default MultiSelectVariant;
