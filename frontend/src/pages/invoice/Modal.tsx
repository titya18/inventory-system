import React, { useEffect, useMemo, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSave, faClose } from "@fortawesome/free-solid-svg-icons";
import { useForm } from "react-hook-form";
import { getAvailableTrackedItems } from "@/api/invoice";
import { InvoiceDetailType, ProductTrackedItemType } from "@/data_types/types";
import { truncateNumber } from "@/helper/numberFormat";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: InvoiceDetailType) => Promise<void> | void;
  clickData?: Partial<InvoiceDetailType> | null;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, onSubmit, clickData }) => {
  const [isLoading, setIsLoading] = useState(false);
  const prevUnitIdRef = useRef<number | null>(null);

  const [availableTrackedItems, setAvailableTrackedItems] = useState<ProductTrackedItemType[]>([]);
  const [selectedTrackedIds, setSelectedTrackedIds] = useState<number[]>([]);
  const [serialSelectionMode, setSerialSelectionMode] = useState<"AUTO" | "MANUAL">("AUTO");
  const [isLoadingTracked, setIsLoadingTracked] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<InvoiceDetailType>();

  const isProduct = clickData?.ItemType === "PRODUCT";

  const trackingType = ((clickData as any)?.trackingType ??
    (clickData as any)?.productvariants?.trackingType ??
    "NONE") as "NONE" | "ASSET_ONLY" | "MAC_ONLY" | "ASSET_AND_MAC";

  const isTrackedProduct = isProduct && trackingType !== "NONE";
  const currentBranchId = Number((clickData as any)?.branchId ?? 0);

  const baseUnit =
    (clickData as any)?.productvariants?.baseUnit || null;

  const baseUnitId = baseUnit?.id ?? null;
  const baseUnitName = baseUnit?.name ?? "Base";

  const unitOptions = useMemo(() => {
    return Array.isArray((clickData as any)?.productvariants?.unitOptions)
      ? (clickData as any).productvariants.unitOptions.map((u: any) => ({
          id: Number(u.unitId),
          name: u.unitName,
          operationValue: Number(u.operationValue ?? 1),
          suggestedRetailPrice: Number(u.suggestedRetailPrice ?? 0),
          suggestedWholesalePrice: Number(u.suggestedWholesalePrice ?? 0),
          isBaseUnit: !!u.isBaseUnit,
        }))
      : [];
  }, [clickData]);

  const getSelectedUnit = (unitId: number) => {
    return unitOptions.find((u: any) => Number(u.id) === Number(unitId));
  };

  const computeBaseQtyLocal = (unitId: number, unitQty: number) => {
    const selectedUnit = getSelectedUnit(unitId);
    const operationValue = Number(selectedUnit?.operationValue ?? 1);
    return Number(unitQty || 0) * operationValue;
  };

  useEffect(() => {
    if (!clickData) {
      reset();
      return;
    }

    setValue("ItemType", clickData.ItemType ?? "PRODUCT");
    setValue("price", truncateNumber(Number(clickData.price ?? 0), 4));
    setValue("taxMethod", (clickData.taxMethod as any) ?? "Include");
    setValue("taxNet", Number(clickData.taxNet ?? 0));
    setValue("discountMethod", (clickData.discountMethod as any) ?? "Fixed");
    setValue("discount", Number(clickData.discount ?? 0));

    setSerialSelectionMode(
      ((clickData as any)?.serialSelectionMode ?? "AUTO") as "AUTO" | "MANUAL"
    );

    setSelectedTrackedIds(
      Array.isArray((clickData as any)?.selectedTrackedItemIds)
        ? (clickData as any).selectedTrackedItemIds.map(Number)
        : []
    );

    if (clickData.ItemType === "PRODUCT") {
      const initialUnitId =
        Number(
          (clickData as any)?.unitId ??
          (clickData as any)?.productvariants?.defaultRetailUnitId ??
          (clickData as any)?.productvariants?.baseUnitId ??
          unitOptions?.[0]?.id ??
          0
        ) || 0;

      setValue("unitId", initialUnitId as any);
      setValue("unitQty", Number((clickData as any)?.unitQty ?? clickData.quantity ?? 1) as any);
      setValue("quantity", Number((clickData as any)?.unitQty ?? clickData.quantity ?? 1) as any);

      prevUnitIdRef.current = initialUnitId;
    } else {
      setValue("quantity", Number(clickData.quantity ?? 1));
    }
  }, [clickData, reset, setValue, unitOptions]);

  const selectedUnitId = Number(watch("unitId") ?? 0);
  const unitQtyValue = Number((watch("unitQty") as any) ?? watch("quantity") ?? 0);
  const priceValue = Number(watch("price") ?? 0);
  const taxValue = Number(watch("taxNet") ?? 0);
  const discountValue = Number(watch("discount") ?? 0);
  const taxMethod = watch("taxMethod") ?? "Include";
  const discountMethod = watch("discountMethod") ?? "Fixed";

  useEffect(() => {
    const run = async () => {
      if (!isOpen || !isTrackedProduct) {
        setAvailableTrackedItems([]);
        return;
      }

      const variantId = Number(clickData?.productVariantId ?? 0);
      const orderItemId = Number(clickData?.orderItemId ?? 0);

      if (!variantId || !currentBranchId) return;

      setIsLoadingTracked(true);
      try {
        const rows = await getAvailableTrackedItems(
          variantId,
          currentBranchId,
          orderItemId || null
        );
        setAvailableTrackedItems(rows);
      } catch (error) {
        console.error(error);
        setAvailableTrackedItems([]);
      } finally {
        setIsLoadingTracked(false);
      }
    };

    run();
  }, [isOpen, isTrackedProduct, clickData?.productVariantId, clickData?.orderItemId, currentBranchId]);

  useEffect(() => {
    if (!isTrackedProduct) return;
    if (serialSelectionMode !== "MANUAL") return;

    const nextQty = selectedTrackedIds.length;

    setValue("unitQty", nextQty as any, { shouldDirty: true, shouldValidate: true });
    setValue("quantity", nextQty as any, { shouldDirty: true, shouldValidate: true });

    if (selectedUnitId) {
      const nextBaseQty = computeBaseQtyLocal(selectedUnitId, nextQty);
      setValue("baseQty", nextBaseQty as any, { shouldDirty: true, shouldValidate: true });
    }
  }, [selectedTrackedIds, serialSelectionMode, isTrackedProduct, selectedUnitId, setValue]);

  useEffect(() => {
    if (!isOpen || !isProduct) return;
    if (!selectedUnitId) return;

    if (prevUnitIdRef.current !== null && prevUnitIdRef.current !== selectedUnitId) {
      const selectedUnit = getSelectedUnit(selectedUnitId);
      if (selectedUnit) {
        const nextPrice =
          Number((clickData as any)?.productvariants?.retailPriceUnitId ?? 0) ||
          Number((clickData as any)?.productvariants?.wholeSalePriceUnitId ?? 0)
            ? Number(clickData?.price ?? 0)
            : Number(clickData?.price ?? 0);

        const fallbackRetail = Number(selectedUnit.suggestedRetailPrice ?? 0);
        const fallbackWholesale = Number(selectedUnit.suggestedWholesalePrice ?? 0);

        const useWholesale =
          Number((clickData as any)?.productvariants?.wholeSalePrice ?? 0) > 0 &&
          Number(clickData?.price ?? 0) === Number((clickData as any)?.productvariants?.wholeSalePrice ?? -999999);

        const price = useWholesale
          ? (fallbackWholesale ?? nextPrice)
          : (fallbackRetail ?? nextPrice);

        setValue(
          "price",
          truncateNumber(Number(price || 0), 4),
          { shouldDirty: true, shouldValidate: true }
        );
      }
    }

    prevUnitIdRef.current = selectedUnitId;
  }, [selectedUnitId, isOpen, isProduct, clickData, setValue]);

  const baseQtyPreview = useMemo(() => {
    if (!isProduct) return 0;
    return computeBaseQtyLocal(selectedUnitId, unitQtyValue);
  }, [isProduct, selectedUnitId, unitQtyValue]);

  const lineTotalPreview = useMemo(() => {
    const qty = isProduct ? unitQtyValue : Number(watch("quantity") ?? 0);
    let priceAfterDiscount = priceValue;

    if (discountMethod === "Percent") {
      priceAfterDiscount = priceValue * (1 - discountValue / 100);
    } else {
      priceAfterDiscount = priceValue - discountValue;
    }

    let unitTotal = priceAfterDiscount;

    if (taxMethod === "Exclude") {
      unitTotal = priceAfterDiscount + (priceAfterDiscount * taxValue) / 100;
    }

    if (taxMethod === "Include") {
      unitTotal = priceAfterDiscount;
    }

    return unitTotal * qty;
  }, [isProduct, unitQtyValue, watch, priceValue, discountMethod, discountValue, taxMethod, taxValue]);

  const toggleTrackedItem = (id: number) => {
    setSelectedTrackedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleFormSubmit = async (data: InvoiceDetailType) => {
    setIsLoading(true);
    try {
      const isProductLine = clickData?.ItemType === "PRODUCT";

      const price = Number(String(data.price ?? 0).replace(/,/g, ""));
      const taxNet = Number(String(data.taxNet ?? 0).replace(/,/g, ""));
      const discount = Number(String(data.discount ?? 0).replace(/,/g, ""));

      const unitId = isProductLine ? Number((data as any).unitId ?? 0) : null;
      const unitQty = isProductLine ? Number((data as any).unitQty ?? 1) : null;
      const baseQty = isProductLine && unitId ? computeBaseQtyLocal(unitId, unitQty ?? 1) : null;

      const selectedTrackedItems = availableTrackedItems.filter((x) =>
        selectedTrackedIds.includes(Number(x.id))
      );

      if (isTrackedProduct && serialSelectionMode === "MANUAL") {
        if (selectedTrackedIds.length === 0) {
          throw new Error("Please select at least one serial number.");
        }
      }

      const payload: InvoiceDetailType = {
        id: clickData?.id ?? Date.now(),
        orderItemId: clickData?.orderItemId ?? null,
        orderId: clickData?.orderId ?? 0,

        productId: isProductLine ? (clickData?.productId ?? 0) : 0,
        productVariantId: isProductLine ? (clickData?.productVariantId ?? 0) : 0,
        serviceId: !isProductLine ? (clickData?.serviceId ?? 0) : 0,

        ItemType: clickData?.ItemType ?? "PRODUCT",

        unitId: isProductLine ? unitId : null,
        unitQty: isProductLine ? unitQty : null,
        baseQty: isProductLine ? baseQty : null,
        unitName: isProductLine ? (getSelectedUnit(unitId ?? 0)?.name ?? null) : null,
        unitOptions: isProductLine ? unitOptions : [],

        quantity: isProductLine ? (unitQty ?? 1) : Number(data.quantity ?? 1),

        price,
        costPerBaseUnit: isProductLine && baseQty && baseQty > 0 ? price / baseQty : 0,

        taxNet,
        taxMethod: (data.taxMethod as any) ?? "Include",

        discount,
        discountMethod: (data.discountMethod as any) ?? "Fixed",

        total: lineTotalPreview,

        products: clickData?.products ?? null,
        productvariants: clickData?.productvariants ?? null,
        services: clickData?.services ?? null,
        stocks: clickData?.stocks ?? 0,

        trackingType,
        serialSelectionMode,
        selectedTrackedItemIds: selectedTrackedIds,
        selectedTrackedItems: selectedTrackedItems.map((x) => ({
          id: x.id,
          branchId: x.branchId,
          serialNumber: x.serialNumber,
          assetCode: x.assetCode ?? null,
          macAddress: x.macAddress ?? null,
          status: x.status ?? null,
          soldOrderItemId: x.soldOrderItemId ?? null,
        })),
        branchId: currentBranchId,
      };

      await onSubmit(payload);
      reset();
      onClose();
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
            <div>
              <h5 className="font-bold text-lg">
                {clickData?.ItemType === "PRODUCT"
                  ? `${clickData?.products?.name ?? ""}`
                  : clickData?.services?.name}
              </h5>
              {isProduct && (
                <p className="text-xs text-gray-500 mt-1">
                  Base Unit: {baseUnitName}
                </p>
              )}
            </div>
            <button type="button" className="text-white-dark hover:text-dark" onClick={onClose}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit(handleFormSubmit)}>
            <div className="p-5">
              <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                {isProduct
                  ? "Enter the selling price for 1 selected sale unit. The system will auto-convert sold quantity into base unit for stock and FIFO."
                  : "Enter service selling price and quantity."}
              </div>

              <div className={`grid grid-cols-1 gap-4 mb-5 ${isProduct ? "sm:grid-cols-2" : "sm:grid-cols-2"}`}>
                <div>
                  <label>
                    {isProduct ? "Sale Price per Selected Unit" : "Service Price"} <span className="text-danger text-md">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input w-full"
                    {...register("price", { required: "Price is required" })}
                    onInput={(e: React.FormEvent<HTMLInputElement>) => {
                      const target = e.currentTarget;
                      target.value = target.value.replace(/[^0-9.]/g, "");
                      const parts = target.value.split(".");
                      if (parts.length > 2) target.value = parts[0] + "." + parts.slice(1).join("");
                    }}
                  />
                  {errors.price && <p className="error_validate">{String(errors.price.message)}</p>}
                </div>

                {isProduct ? (
                  <div>
                    <label>Stock On Hand</label>
                    <input
                      type="text"
                      className="form-input w-full"
                      disabled
                      value={
                        isTrackedProduct
                          ? `${availableTrackedItems.filter(i => i.status === "IN_STOCK").length} ${baseUnitName}`
                          : `${Number(clickData?.stocks ?? 0).toFixed(4)} ${baseUnitName}`
                      }
                    />
                  </div>
                ) : (
                  <div>
                    <label>Quantity <span className="text-danger text-md">*</span></label>
                    <input
                      type="text"
                      className="form-input w-full"
                      {...register("quantity", { required: "Quantity is required" })}
                      onInput={(e: React.FormEvent<HTMLInputElement>) => {
                        const target = e.currentTarget;
                        target.value = target.value.replace(/[^0-9.]/g, "");
                        const parts = target.value.split(".");
                        if (parts.length > 2) target.value = parts[0] + "." + parts.slice(1).join("");
                      }}
                    />
                    {errors.quantity && <p className="error_validate">{String(errors.quantity.message)}</p>}
                  </div>
                )}
              </div>

              {isTrackedProduct && (
                <div className="mb-5 rounded-md border border-indigo-200 bg-indigo-50 px-3 py-3">
                  <label className="font-semibold block mb-2">Serial Selection</label>

                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={serialSelectionMode === "AUTO"}
                        onChange={() => setSerialSelectionMode("AUTO")}
                      />
                      <span>Auto take available serial(s)</span>
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={serialSelectionMode === "MANUAL"}
                        onChange={() => setSerialSelectionMode("MANUAL")}
                      />
                      <span>Choose exact serial(s)</span>
                    </label>
                  </div>

                  <p className="text-xs text-gray-600 mt-2">
                    AUTO: seller enters quantity only, it will auto-assigns serial numbers.  
                    MANUAL: seller chooses exact serial numbers, quantity follows selection.
                  </p>
                </div>
              )}

              {isTrackedProduct && serialSelectionMode === "MANUAL" && (
                <div className="mb-5 rounded-md border border-indigo-200 bg-indigo-50 px-3 py-3">
                  <label className="font-semibold block mb-2">
                    Choose Exact Serial Number(s)
                  </label>

                  {isLoadingTracked ? (
                    <p className="text-sm text-gray-500">Loading serials...</p>
                  ) : availableTrackedItems.length === 0 ? (
                    <p className="text-sm text-red-500">No serials available in this branch.</p>
                  ) : (
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {availableTrackedItems.map((item) => {
                        const checked = selectedTrackedIds.includes(Number(item.id));

                        return (
                          <label
                            key={item.id}
                            className={`flex items-start gap-3 p-3 rounded border cursor-pointer ${
                              checked ? "bg-indigo-100 border-indigo-400" : "bg-white border-gray-200"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleTrackedItem(Number(item.id))}
                              className="mt-1"
                            />

                            <div className="text-sm">
                              <div><strong>Serial:</strong> {item.serialNumber}</div>
                              {item.assetCode && <div><strong>Asset:</strong> {item.assetCode}</div>}
                              {item.macAddress && <div><strong>MAC:</strong> {item.macAddress}</div>}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {isProduct && (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-5">
                    <div>
                      <label>Sale Unit <span className="text-danger text-md">*</span></label>
                      <select className="form-input" {...register("unitId", { required: "Unit is required" })}>
                        {unitOptions.map((u: any) => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                      {errors.unitId && <p className="error_validate">{String((errors as any).unitId?.message)}</p>}
                    </div>

                    <div>
                      <label>Quantity <span className="text-danger text-md">*</span></label>
                      <input
                        type="number"
                        step="0.0001"
                        className="form-input"
                        disabled={isTrackedProduct && serialSelectionMode === "MANUAL"}
                        {...register("unitQty", { required: "Qty is required" } as any)}
                      />
                      {errors.unitQty && <p className="error_validate">{String((errors as any).unitQty?.message)}</p>}
                    </div>

                    <div>
                      <label>Base Qty ({baseUnitName})</label>
                      <input className="form-input" disabled value={Number(baseQtyPreview).toFixed(4)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-5">
                    <div className="rounded-md border border-gray-200 p-3 bg-gray-50">
                      <p className="text-sm font-semibold text-gray-700">Selected Unit</p>
                      <p className="text-lg font-bold text-primary mt-1">
                        {getSelectedUnit(selectedUnitId)?.name || "-"}
                      </p>
                    </div>

                    <div className="rounded-md border border-gray-200 p-3 bg-gray-50">
                      <p className="text-sm font-semibold text-gray-700">
                        Base Qty Preview
                      </p>
                      <p className="text-lg font-bold text-success mt-1">
                        {Number(baseQtyPreview).toFixed(4)} {baseUnitName}
                      </p>
                    </div>
                  </div>
                </>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label>Tax Type</label>
                  <select className="form-input" {...register("taxMethod")}>
                    <option value="Include">Include</option>
                    <option value="Exclude">Exclude</option>
                  </select>
                </div>

                <div>
                  <label>Order Tax</label>
                  <input
                    type="text"
                    className="form-input w-full"
                    {...register("taxNet")}
                    onInput={(e: React.FormEvent<HTMLInputElement>) => {
                      const target = e.currentTarget;
                      target.value = target.value.replace(/[^0-9.]/g, "");
                      const parts = target.value.split(".");
                      if (parts.length > 2) target.value = parts[0] + "." + parts.slice(1).join("");
                    }}
                  />
                </div>

                <div>
                  <label>Discount Type</label>
                  <select className="form-input" {...register("discountMethod")}>
                    <option value="Fixed">Fixed</option>
                    <option value="Percent">%</option>
                  </select>
                </div>

                <div>
                  <label>Discount</label>
                  <input
                    type="text"
                    className="form-input w-full"
                    {...register("discount")}
                    onInput={(e: React.FormEvent<HTMLInputElement>) => {
                      const target = e.currentTarget;
                      target.value = target.value.replace(/[^0-9.]/g, "");
                      const parts = target.value.split(".");
                      if (parts.length > 2) target.value = parts[0] + "." + parts.slice(1).join("");
                    }}
                  />
                </div>
              </div>

              <div className="mt-5 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                Line Total Preview: <strong>${Number(lineTotalPreview).toFixed(4)}</strong>
              </div>

              <div className="flex justify-end items-center mt-8">
                <button type="button" className="btn btn-outline-danger" onClick={onClose}>
                  <FontAwesomeIcon icon={faClose} className="mr-1" />
                  Discard
                </button>
                <button type="submit" className="btn btn-primary ltr:ml-4 rtl:mr-4" disabled={isLoading}>
                  <FontAwesomeIcon icon={faSave} className="mr-1" />
                  {isLoading ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Modal;