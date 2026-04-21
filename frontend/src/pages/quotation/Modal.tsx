import React, { useEffect, useMemo, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSave, faClose } from "@fortawesome/free-solid-svg-icons";
import { useForm } from "react-hook-form";
import { getAvailableTrackedItems } from "@/api/invoice";
import { QuotationDetailType, ProductTrackedItemType } from "@/data_types/types";
import { truncateNumber } from "@/helper/numberFormat";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: QuotationDetailType) => Promise<void> | void;
  clickData?: Partial<QuotationDetailType> | null;
  quoteSaleType: "RETAIL" | "WHOLESALE";
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  clickData,
  quoteSaleType,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const prevUnitIdRef = useRef<number | null>(null);
  const isUserEditedPriceRef = useRef(false);

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
  } = useForm<QuotationDetailType>();

  const isProduct = clickData?.ItemType === "PRODUCT";

  const trackingType = ((clickData as any)?.trackingType ??
    (clickData as any)?.productvariants?.trackingType ??
    "NONE") as "NONE" | "ASSET_ONLY" | "MAC_ONLY" | "ASSET_AND_MAC";

  const isTrackedProduct = isProduct && trackingType !== "NONE";
  const currentBranchId = Number((clickData as any)?.branchId ?? 0);

  const baseUnit = (clickData as any)?.productvariants?.baseUnit || null;
  const baseUnitName = baseUnit?.name ?? "Base";

  const unitOptions = useMemo(() => {
    const raw = (clickData as any)?.productvariants?.unitOptions;
    if (!Array.isArray(raw)) return [];

    return raw.map((u: any) => ({
      id: Number(u.unitId ?? u.id),
      unitId: Number(u.unitId ?? u.id),
      name: u.unitName ?? u.name,
      unitName: u.unitName ?? u.name,
      operationValue: Number(u.operationValue ?? 1),
      suggestedRetailPrice: Number(u.suggestedRetailPrice ?? 0),
      suggestedWholesalePrice: Number(u.suggestedWholesalePrice ?? 0),
      isBaseUnit: !!u.isBaseUnit,
    }));
  }, [clickData]);

  const getSelectedUnit = (unitId: number) => {
    return unitOptions.find((u: any) => Number(u.unitId) === Number(unitId));
  };

  const mergedTrackedItems = useMemo(() => {
    const merged = new Map<number, ProductTrackedItemType>();

    for (const item of availableTrackedItems) {
      if (item.id != null) {
        merged.set(Number(item.id), item);
      }
    }

    const savedItems = Array.isArray((clickData as any)?.selectedTrackedItems)
      ? ((clickData as any).selectedTrackedItems as ProductTrackedItemType[])
      : [];

    for (const item of savedItems) {
      if (item?.id != null && !merged.has(Number(item.id))) {
        merged.set(Number(item.id), item);
      }
    }

    return Array.from(merged.values()).sort((a, b) => Number(a.id ?? 0) - Number(b.id ?? 0));
  }, [availableTrackedItems, clickData]);

  const getSuggestedUnitPrice = (unitId: number) => {
    const selectedUnit = getSelectedUnit(unitId);
    if (!selectedUnit) return 0;

    return quoteSaleType === "WHOLESALE"
      ? Number(selectedUnit.suggestedWholesalePrice ?? 0)
      : Number(selectedUnit.suggestedRetailPrice ?? 0);
  };

  const computeBaseQtyLocal = (unitId: number, unitQty: number) => {
    const selectedUnit = getSelectedUnit(unitId);
    const operationValue = Number(selectedUnit?.operationValue ?? 1);
    return Number(unitQty || 0) * operationValue;
  };

  useEffect(() => {
    if (!isOpen) return;

    isUserEditedPriceRef.current = false;

    if (!clickData) {
      reset();
      prevUnitIdRef.current = null;
      setSelectedTrackedIds([]);
      setSerialSelectionMode("AUTO");
      return;
    }

    console.log("[DEBUG Modal] useEffect: clickData.serialSelectionMode =", (clickData as any)?.serialSelectionMode, "| clickData.id =", clickData?.id);
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
            unitOptions?.[0]?.unitId ??
            0
        ) || 0;

      const initialQty = Number(
        (clickData as any)?.unitQty ?? clickData.quantity ?? 1
      ) || 1;

      reset({
        ...(clickData as QuotationDetailType),
        ItemType: clickData.ItemType ?? "PRODUCT",
        cost: truncateNumber(Number(clickData.cost ?? 0), 4),
        taxMethod: (clickData.taxMethod as any) ?? "Include",
        taxNet: Number(clickData.taxNet ?? 0),
        discountMethod: (clickData.discountMethod as any) ?? "Fixed",
        discount: Number(clickData.discount ?? 0),
        unitId: initialUnitId as any,
        unitQty: initialQty as any,
        quantity: initialQty as any,
      });

      prevUnitIdRef.current = initialUnitId;
    } else {
      reset({
        ...(clickData as QuotationDetailType),
        ItemType: clickData.ItemType ?? "SERVICE",
        cost: truncateNumber(Number(clickData.cost ?? 0), 4),
        taxMethod: (clickData.taxMethod as any) ?? "Include",
        taxNet: Number(clickData.taxNet ?? 0),
        discountMethod: (clickData.discountMethod as any) ?? "Fixed",
        discount: Number(clickData.discount ?? 0),
        quantity: Number(clickData.quantity ?? 1),
      });
      prevUnitIdRef.current = null;
    }
  }, [isOpen, clickData, reset, unitOptions]);

  useEffect(() => {
    if (!isOpen) {
      prevUnitIdRef.current = null;
      isUserEditedPriceRef.current = false;
      reset();
    }
  }, [isOpen, reset]);

  // Fetch available tracked items when modal opens for a tracked product
  useEffect(() => {
    const run = async () => {
      if (!isOpen || !isTrackedProduct) {
        setAvailableTrackedItems([]);
        return;
      }

      const variantId = Number(clickData?.productVariantId ?? 0);
      if (!variantId || !currentBranchId) return;

      setIsLoadingTracked(true);
      try {
        const rows = await getAvailableTrackedItems(variantId, currentBranchId, null);
        setAvailableTrackedItems(rows);
      } catch (error) {
        console.error(error);
        setAvailableTrackedItems([]);
      } finally {
        setIsLoadingTracked(false);
      }
    };

    run();
  }, [isOpen, isTrackedProduct, clickData?.productVariantId, currentBranchId]);

  const selectedUnitId = Number(watch("unitId") ?? 0);
  const unitQtyValue = Number((watch("unitQty") as any) ?? watch("quantity") ?? 0);
  const costValue = Number(watch("cost") ?? 0);
  const taxValue = Number(watch("taxNet") ?? 0);
  const discountValue = Number(watch("discount") ?? 0);
  const taxMethod = watch("taxMethod") ?? "Include";
  const discountMethod = watch("discountMethod") ?? "Fixed";

  // MANUAL mode: qty follows selection count
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

    const prevUnitId = prevUnitIdRef.current;

    if (prevUnitId == null) {
      prevUnitIdRef.current = selectedUnitId;
      return;
    }

    if (prevUnitId !== selectedUnitId) {
      const newPrice = getSuggestedUnitPrice(selectedUnitId);

      if (!isUserEditedPriceRef.current) {
        setValue("cost", truncateNumber(Number(newPrice ?? 0), 4), {
          shouldDirty: true,
          shouldValidate: true,
        });
      }

      prevUnitIdRef.current = selectedUnitId;
    }
  }, [isOpen, isProduct, selectedUnitId, quoteSaleType, setValue]);

  const baseQtyPreview = useMemo(() => {
    if (!isProduct) return 0;
    return computeBaseQtyLocal(selectedUnitId, unitQtyValue);
  }, [isProduct, selectedUnitId, unitQtyValue]);

  const lineTotalPreview = useMemo(() => {
    const qty = isProduct ? unitQtyValue : Number(watch("quantity") ?? 0);

    let priceAfterDiscount = costValue;

    if (discountMethod === "Percent") {
      priceAfterDiscount = costValue * (1 - discountValue / 100);
    } else {
      priceAfterDiscount = costValue - discountValue;
    }

    let unitTotal = priceAfterDiscount;

    if (taxMethod === "Exclude") {
      unitTotal = priceAfterDiscount + (priceAfterDiscount * taxValue) / 100;
    }

    if (taxMethod === "Include") {
      unitTotal = priceAfterDiscount;
    }

    return unitTotal * qty;
  }, [isProduct, unitQtyValue, watch, costValue, discountMethod, discountValue, taxMethod, taxValue]);

  const toggleTrackedItem = (id: number) => {
    setSelectedTrackedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleFormSubmit = async (data: QuotationDetailType) => {
    setIsLoading(true);
    try {
      const isProductLine = clickData?.ItemType === "PRODUCT";

      const cost = Number(String(data.cost ?? 0).replace(/,/g, ""));
      const taxNet = Number(String(data.taxNet ?? 0).replace(/,/g, ""));
      const discount = Number(String(data.discount ?? 0).replace(/,/g, ""));

      const unitId = isProductLine ? Number((data as any).unitId ?? 0) : null;
      const unitQty = isProductLine ? Number((data as any).unitQty ?? 1) : null;
      const baseQty =
        isProductLine && unitId ? computeBaseQtyLocal(unitId, unitQty ?? 1) : null;

      const selectedUnit = isProductLine && unitId ? getSelectedUnit(unitId) : null;

      const selectedTrackedItems = mergedTrackedItems.filter((x) =>
        selectedTrackedIds.includes(Number(x.id))
      );

      if (isTrackedProduct && serialSelectionMode === "MANUAL" && selectedTrackedIds.length === 0) {
        throw new Error("Please select at least one serial number.");
      }

      const payload: QuotationDetailType = {
        id: clickData?.id ?? Date.now(),
        quotationId: clickData?.quotationId ?? 0,

        productId: isProductLine ? (clickData?.productId ?? 0) : 0,
        productVariantId: isProductLine ? (clickData?.productVariantId ?? 0) : 0,
        serviceId: !isProductLine ? (clickData?.serviceId ?? 0) : 0,

        ItemType: clickData?.ItemType ?? "PRODUCT",

        unitId: isProductLine ? unitId : null,
        unitQty: isProductLine ? unitQty : null,
        baseQty: isProductLine ? baseQty : null,
        unitName: isProductLine
          ? (selectedUnit?.unitName ?? selectedUnit?.name ?? null)
          : null,
        unitOptions: isProductLine ? (unitOptions as any) : [],

        quantity: isProductLine ? (unitQty ?? 1) : Number(data.quantity ?? 1),

        cost,
        costPerBaseUnit:
          isProductLine && baseQty && baseQty > 0
            ? cost / baseQty
            : 0,

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

            <button
              type="button"
              className="text-white-dark hover:text-dark"
              onClick={onClose}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24px"
                height="24px"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-6 w-6"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit(handleFormSubmit)}>
            <div className="p-5">
              <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                {isProduct
                  ? "Enter the quoted price for 1 selected quote unit. When you change unit, the suggested price updates automatically."
                  : "Enter service quoted price and quantity."}
              </div>

              <div className={`grid grid-cols-1 gap-4 mb-5 sm:grid-cols-2`}>
                <div>
                  <label>
                    {isProduct ? "Quoted Price per Selected Unit" : "Service Price"}{" "}
                    <span className="text-danger text-md">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input w-full"
                    {...register("cost", { required: "Cost is required" })}
                    onChange={() => {
                      isUserEditedPriceRef.current = true;
                    }}
                    onInput={(e: React.FormEvent<HTMLInputElement>) => {
                      const target = e.currentTarget;
                      target.value = target.value.replace(/[^0-9.]/g, "");
                      const parts = target.value.split(".");
                      if (parts.length > 2) {
                        target.value = parts[0] + "." + parts.slice(1).join("");
                      }
                    }}
                  />
                  {errors.cost && (
                    <p className="error_validate">{String(errors.cost.message)}</p>
                  )}
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
                          ? `${availableTrackedItems.filter((i: any) => i.status === "IN_STOCK").length} ${baseUnitName}`
                          : `${Number(clickData?.stocks ?? 0).toFixed(4)} ${baseUnitName}`
                      }
                    />
                  </div>
                ) : (
                  <div>
                    <label>
                      Quantity <span className="text-danger text-md">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-input w-full"
                      {...register("quantity", { required: "Quantity is required" })}
                      onInput={(e: React.FormEvent<HTMLInputElement>) => {
                        const target = e.currentTarget;
                        target.value = target.value.replace(/[^0-9.]/g, "");
                        const parts = target.value.split(".");
                        if (parts.length > 2) {
                          target.value = parts[0] + "." + parts.slice(1).join("");
                        }
                      }}
                    />
                    {errors.quantity && (
                      <p className="error_validate">{String(errors.quantity.message)}</p>
                    )}
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
                    AUTO: enter quantity only, serials auto-assigned.&nbsp;
                    MANUAL: choose exact serial numbers, quantity follows selection.
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
                  ) : mergedTrackedItems.length === 0 ? (
                    <p className="text-sm text-red-500">No serials available in this branch.</p>
                  ) : (
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {mergedTrackedItems.map((item) => {
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
                      <label>
                        Quote Unit <span className="text-danger text-md">*</span>
                      </label>
                      <select
                        className="form-input"
                        {...register("unitId", { required: "Unit is required" })}
                      >
                        {unitOptions.map((u: any) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </select>
                      {errors.unitId && (
                        <p className="error_validate">
                          {String((errors as any).unitId?.message)}
                        </p>
                      )}
                    </div>

                    <div>
                      <label>
                        Quantity <span className="text-danger text-md">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.0001"
                        className="form-input"
                        disabled={isTrackedProduct && serialSelectionMode === "MANUAL"}
                        {...register("unitQty", { required: "Qty is required" } as any)}
                      />
                      {errors.unitQty && (
                        <p className="error_validate">
                          {String((errors as any).unitQty?.message)}
                        </p>
                      )}
                    </div>

                    <div>
                      <label>Base Qty ({baseUnitName})</label>
                      <input
                        className="form-input"
                        disabled
                        value={Number(baseQtyPreview).toFixed(4)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-5">
                    <div className="rounded-md border border-gray-200 p-3 bg-gray-50">
                      <p className="text-sm font-semibold text-gray-700">Selected Unit</p>
                      <p className="text-lg font-bold text-primary mt-1">
                        {getSelectedUnit(selectedUnitId)?.unitName ||
                          getSelectedUnit(selectedUnitId)?.name ||
                          "-"}
                      </p>
                    </div>

                    <div className="rounded-md border border-gray-200 p-3 bg-gray-50">
                      <p className="text-sm font-semibold text-gray-700">Base Qty Preview</p>
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
                      if (parts.length > 2) {
                        target.value = parts[0] + "." + parts.slice(1).join("");
                      }
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
                      if (parts.length > 2) {
                        target.value = parts[0] + "." + parts.slice(1).join("");
                      }
                    }}
                  />
                </div>
              </div>

              <div className="mt-5 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                Line Total Preview: <strong>${Number(lineTotalPreview).toFixed(4)}</strong>
              </div>

              <div className="flex justify-end items-center mt-8">
                <button
                  type="button"
                  className="btn btn-outline-danger"
                  onClick={onClose}
                >
                  <FontAwesomeIcon icon={faClose} className="mr-1" />
                  Discard
                </button>

                <button
                  type="submit"
                  className="btn btn-primary ltr:ml-4 rtl:mr-4"
                  disabled={isLoading}
                >
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
