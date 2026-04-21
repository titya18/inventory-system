import React, { useEffect, useMemo, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSave, faClose, faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";
import { useForm } from "react-hook-form";
import { ProductTrackedItemType, PurchaseDetailType } from "@/data_types/types";
import { getAvailableTrackedItems } from "@/api/invoice";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: PurchaseDetailType) => Promise<void> | void;
  clickData?: ({ id: number | undefined } & Partial<PurchaseDetailType>) | null;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  clickData,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [trackedRows, setTrackedRows] = useState<ProductTrackedItemType[]>([]);
  const [trackedRowErrors, setTrackedRowErrors] = useState<Record<number, { serialNumber?: string }>>({});
  const [trackedFormError, setTrackedFormError] = useState<string>("");
  const [existingTrackedItems, setExistingTrackedItems] = useState<ProductTrackedItemType[]>([]);
  const [isLoadingExistingTracked, setIsLoadingExistingTracked] = useState(false);
  const [selectedExistingTrackedId, setSelectedExistingTrackedId] = useState<string>("");
  const prevUnitIdRef = useRef<number | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PurchaseDetailType>();

  const topLevelTrackingType = (clickData as any)?.trackingType as
    | "NONE"
    | "ASSET_ONLY"
    | "MAC_ONLY"
    | "ASSET_AND_MAC"
    | undefined;
  const variantTrackingType = (clickData as any)?.productvariants?.trackingType as
    | "NONE"
    | "ASSET_ONLY"
    | "MAC_ONLY"
    | "ASSET_AND_MAC"
    | undefined;
  const trackingType = ((topLevelTrackingType && topLevelTrackingType !== "NONE")
    ? topLevelTrackingType
    : (variantTrackingType ?? topLevelTrackingType ?? "NONE")) as
    | "NONE"
    | "ASSET_ONLY"
    | "MAC_ONLY"
    | "ASSET_AND_MAC";

  const isTrackedProduct = trackingType !== "NONE";
  const showAssetField =
    trackingType === "ASSET_ONLY" || trackingType === "ASSET_AND_MAC";
  const showMacField =
    trackingType === "MAC_ONLY" || trackingType === "ASSET_AND_MAC";
  const currentBranchId = Number((clickData as any)?.branchId ?? 0);

  const baseUnit = (clickData as any)?.productvariants?.baseUnit || null;
  const baseUnitId = baseUnit?.id ?? null;
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
      suggestedPurchaseCost: Number(u.suggestedPurchaseCost ?? 0),
      isBaseUnit: !!u.isBaseUnit,
    }));
  }, [clickData]);

  const getSelectedUnit = (unitId: number) => {
    return unitOptions.find((u: any) => Number(u.unitId) === Number(unitId));
  };

  const toNumber = (value: any) => {
    const parsed = Number(String(value ?? "").replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const normalizeMac = (value?: string | null) => {
    if (!value) return "";
    return value.replace(/[^A-Fa-f0-9]/g, "").toUpperCase();
  };

  const computeBaseQtyLocal = (unitId: number, unitQty: number) => {
    const selectedUnit = getSelectedUnit(unitId);
    const operationValue = Number(selectedUnit?.operationValue ?? 1);
    return Number(unitQty || 0) * operationValue;
  };

  const computeCostPerBaseUnitLocal = (unitId: number, cost: number) => {
    const selectedUnit = getSelectedUnit(unitId);
    const operationValue = Number(selectedUnit?.operationValue ?? 1);
    return operationValue > 0 ? Number(cost || 0) / operationValue : 0;
  };

  useEffect(() => {
    if (!isOpen) return;

    const initialUnitId = Number(
      (clickData as any)?.unitId ??
        (clickData as any)?.productvariants?.defaultPurchaseUnitId ??
        (clickData as any)?.productvariants?.purchasePriceUnitId ??
        baseUnitId ??
        unitOptions?.[0]?.unitId ??
        0
    );

    const initialCost =
      Number(clickData?.cost ?? 0) ||
      Number(getSelectedUnit(initialUnitId)?.suggestedPurchaseCost ?? 0);
    const initialUnitQty =
      Number((clickData as any)?.unitQty ?? clickData?.quantity ?? 1) || 1;
    const initialBaseQty = computeBaseQtyLocal(initialUnitId, initialUnitQty);
    const initialTrackedRows = Array.isArray((clickData as any)?.selectedTrackedItems)
      ? (clickData as any).selectedTrackedItems.map((item: ProductTrackedItemType) => ({
          branchId: currentBranchId,
          assetCode: item.assetCode ?? "",
          macAddress: item.macAddress ?? "",
          serialNumber: item.serialNumber ?? "",
        }))
      : [];

    reset({
      unitId: initialUnitId,
      unitQty: initialUnitQty,
      cost: initialCost,
      taxMethod: clickData?.taxMethod ?? "Include",
      taxNet: Number(clickData?.taxNet ?? 0),
      discountMethod: clickData?.discountMethod ?? "Fixed",
      discount: Number(clickData?.discount ?? 0),
    });

    setTrackedRows(
      isTrackedProduct
        ? initialTrackedRows.length > 0
          ? initialTrackedRows
          : Array.from({ length: Math.max(0, Math.round(initialBaseQty)) }, () => ({
              branchId: currentBranchId,
              assetCode: "",
              macAddress: "",
              serialNumber: "",
            }))
        : []
    );
    setTrackedRowErrors({});
    setTrackedFormError("");

    prevUnitIdRef.current = initialUnitId;
  }, [isOpen, clickData, reset, baseUnitId, unitOptions, currentBranchId, isTrackedProduct]);

  useEffect(() => {
    if (!isOpen) {
      prevUnitIdRef.current = null;
      setTrackedRows([]);
      setTrackedRowErrors({});
      setTrackedFormError("");
      setExistingTrackedItems([]);
      setSelectedExistingTrackedId("");
    }
  }, [isOpen]);

  const wUnitId = Number(watch("unitId") || 0);
  const wUnitQty = Number(watch("unitQty") || 0);
  const wCost = toNumber(watch("cost"));
  const wTaxNet = toNumber(watch("taxNet"));
  const wDiscount = toNumber(watch("discount"));
  const wTaxMethod = watch("taxMethod") || "Include";
  const wDiscountMethod = watch("discountMethod") || "Fixed";

  useEffect(() => {
    if (!isOpen) return;
    if (!wUnitId) return;

    if (prevUnitIdRef.current !== null && prevUnitIdRef.current !== wUnitId) {
      const selectedUnit = getSelectedUnit(wUnitId);
      if (!selectedUnit) return;

      const operationValue = Number(selectedUnit.operationValue ?? 1);

      const variant: any = (clickData as any)?.productvariants;
      const allUnitOptions: any[] = variant?.unitOptions ?? [];

      const purchaseUnitId = Number(
        variant?.purchasePriceUnitId ??
        variant?.defaultPurchaseUnitId ??
        baseUnitId ??
        0
      );

      const purchaseUnit = allUnitOptions.find(
        (u) => Number(u.unitId) === purchaseUnitId
      );

      const purchaseUnitOperationValue = Number(
        purchaseUnit?.operationValue ?? 1
      );

      const purchasePrice = Number(variant?.purchasePrice ?? 0);

      const exactBaseCost =
        purchaseUnitOperationValue > 0
          ? purchasePrice / purchaseUnitOperationValue
          : 0;

      const newCost = exactBaseCost * operationValue;

      setValue("cost", Number(newCost.toFixed(4)));
    }

    prevUnitIdRef.current = wUnitId;
  }, [wUnitId, isOpen, clickData, setValue, baseUnitId]);

  const selectedUnit = getSelectedUnit(wUnitId);
  const selectedUnitName = selectedUnit?.name || "-";
  const selectedOperationValue = Number(selectedUnit?.operationValue ?? 1);

  const baseQtyPreview = useMemo(() => {
    return isTrackedProduct ? trackedRows.length : computeBaseQtyLocal(wUnitId, wUnitQty);
  }, [isTrackedProduct, trackedRows.length, wUnitId, wUnitQty]);

  useEffect(() => {
    if (!isOpen || !isTrackedProduct || !wUnitId) return;

    const nextBaseQty = trackedRows.length;
    const nextUnitQty =
      selectedOperationValue > 0 ? Number((nextBaseQty / selectedOperationValue).toFixed(4)) : 0;

    setValue("unitQty", nextUnitQty, { shouldDirty: true, shouldValidate: true });
    setValue("quantity", nextUnitQty as any, { shouldDirty: true, shouldValidate: true });
    setValue("baseQty", nextBaseQty as any, { shouldDirty: true, shouldValidate: true });
  }, [isOpen, isTrackedProduct, wUnitId, trackedRows.length, selectedOperationValue, setValue]);

  useEffect(() => {
    const run = async () => {
      if (!isOpen || !isTrackedProduct) {
        setExistingTrackedItems([]);
        return;
      }

      const variantId = Number(clickData?.productVariantId ?? 0);
      if (!variantId || !currentBranchId) {
        setExistingTrackedItems([]);
        return;
      }

      setIsLoadingExistingTracked(true);
      try {
        const rows = await getAvailableTrackedItems(variantId, currentBranchId, null);
        setExistingTrackedItems(rows);
      } catch (error) {
        console.error(error);
        setExistingTrackedItems([]);
      } finally {
        setIsLoadingExistingTracked(false);
      }
    };

    run();
  }, [isOpen, isTrackedProduct, clickData?.productVariantId, currentBranchId]);

  useEffect(() => {
    if (existingTrackedItems.length === 0) {
      setSelectedExistingTrackedId("");
      return;
    }

    const stillExists = existingTrackedItems.some(
      (item) => String(item.id ?? "") === selectedExistingTrackedId
    );

    if (!stillExists) {
      setSelectedExistingTrackedId(String(existingTrackedItems[0]?.id ?? ""));
    }
  }, [existingTrackedItems, selectedExistingTrackedId]);

  const costPerBaseUnitPreview = useMemo(() => {
    return computeCostPerBaseUnitLocal(wUnitId, wCost);
  }, [wUnitId, wCost]);

  const selectedExistingTrackedItem = useMemo(
    () =>
      existingTrackedItems.find(
        (item) => String(item.id ?? "") === selectedExistingTrackedId
      ) ?? null,
    [existingTrackedItems, selectedExistingTrackedId]
  );

  const lineTotalPreview = useMemo(() => {
    let priceAfterDiscount = wCost;

    if (wDiscountMethod === "Percent") {
      priceAfterDiscount = wCost * (1 - wDiscount / 100);
    } else if (wDiscountMethod === "Fixed") {
      priceAfterDiscount = wCost - wDiscount;
    }

    let unitTotal = priceAfterDiscount;

    if (wTaxMethod === "Exclude") {
      unitTotal = priceAfterDiscount + (priceAfterDiscount * wTaxNet) / 100;
    }

    if (wTaxMethod === "Include") {
      unitTotal = priceAfterDiscount;
    }

    return unitTotal * wUnitQty;
  }, [wCost, wDiscountMethod, wDiscount, wTaxMethod, wTaxNet, wUnitQty]);

  const updateTrackedRow = (
    index: number,
    field: keyof ProductTrackedItemType,
    value: string
  ) => {
    setTrackedFormError("");
    if (field === "serialNumber") {
      setTrackedRowErrors((prev) => {
        const next = { ...prev };
        if (next[index]?.serialNumber) {
          next[index] = { ...next[index], serialNumber: undefined };
          if (!next[index].serialNumber) {
            delete next[index];
          }
        }
        return next;
      });
    }

    setTrackedRows((prev) =>
      prev.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              branchId: currentBranchId,
              [field]: field === "macAddress" ? normalizeMac(value) : value,
            }
          : row
      )
    );
  };

  const addTrackedRow = () => {
    setTrackedFormError("");
    setTrackedRows((prev) => [
      ...prev,
      { branchId: currentBranchId, assetCode: "", macAddress: "", serialNumber: "" },
    ]);
  };

  const removeTrackedRow = (index: number) => {
    setTrackedFormError("");
    setTrackedRowErrors((prev) => {
      const next: Record<number, { serialNumber?: string }> = {};
      Object.entries(prev).forEach(([key, value]) => {
        const rowIndex = Number(key);
        if (rowIndex < index) next[rowIndex] = value;
        if (rowIndex > index) next[rowIndex - 1] = value;
      });
      return next;
    });
    setTrackedRows((prev) => prev.filter((_, rowIndex) => rowIndex !== index));
  };

  const handleFormSubmit = async (data: PurchaseDetailType) => {
    setIsLoading(true);
    setTrackedFormError("");
    setTrackedRowErrors({});

    try {
      const unitId = Number((data as any).unitId ?? 0);
      const cost = toNumber(data.cost);
      const taxNet = toNumber(data.taxNet);
      const discount = toNumber(data.discount);
      const baseQty = isTrackedProduct ? trackedRows.length : computeBaseQtyLocal(unitId, Number((data as any).unitQty ?? 0));
      const unitQty = isTrackedProduct
        ? (selectedOperationValue > 0 ? Number((trackedRows.length / selectedOperationValue).toFixed(4)) : 0)
        : Number((data as any).unitQty ?? 0);
      const costPerBaseUnit = computeCostPerBaseUnitLocal(unitId, cost);

      if (isTrackedProduct) {
        if (trackedRows.length <= 0) {
          setTrackedFormError("Tracked products need at least one serial row.");
          return;
        }

        const nextTrackedRowErrors: Record<number, { serialNumber?: string }> = {};

        trackedRows.forEach((item, index) => {
          if (!item.serialNumber?.trim()) {
            nextTrackedRowErrors[index] = {
              serialNumber: `Row ${index + 1}: Serial Number is required.`,
            };
          }
        });

        if (Object.keys(nextTrackedRowErrors).length > 0) {
          setTrackedRowErrors(nextTrackedRowErrors);
          setTrackedFormError("Please complete the required serial number fields.");
          return;
        }
      }

      const payload: PurchaseDetailType = {
        id: clickData?.id ?? 0,
        productId: (clickData as any)?.productId ?? 0,
        productVariantId: (clickData as any)?.productVariantId ?? 0,

        unitId,
        unitQty,
        baseQty,

        quantity: unitQty,

        cost,
        costPerBaseUnit,
        taxNet,
        taxMethod: data.taxMethod ?? "Include",
        discount,
        discountMethod: data.discountMethod ?? "Fixed",
        total: lineTotalPreview,

        products: (clickData as any)?.products ?? null,
        productvariants: (clickData as any)?.productvariants ?? null,
        stocks: (clickData as any)?.stocks ?? 0,
        trackingType,
        selectedTrackedItems: isTrackedProduct
          ? trackedRows.map((item) => ({
              branchId: currentBranchId,
              assetCode: item.assetCode?.trim() || null,
              macAddress: normalizeMac(item.macAddress) || null,
              serialNumber: item.serialNumber?.trim() || null,
            }))
          : [],
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
        <div className="panel border-0 p-0 rounded-lg overflow-hidden w-full max-w-3xl my-8">
          <div className="flex bg-[#fbfbfb] dark:bg-[#121c2c] items-center justify-between px-5 py-3">
            <div>
              <h5 className="font-bold text-lg">
                {(clickData as any)?.products?.name}
              </h5>
              <p className="text-xs text-gray-500 mt-1">
                Base Unit: {baseUnitName}
              </p>
            </div>

            <button type="button" className="text-white-dark hover:text-dark" onClick={onClose}>
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
                Enter the cost for <strong>1 selected purchase unit</strong>. The system will auto-convert quantity and cost into base unit for stock and FIFO.
              </div>

              <div className="grid grid-cols-1 gap-4 mb-5 sm:grid-cols-2">
                <div>
                  <label>
                    Purchase Cost per Selected Unit <span className="text-danger text-md">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input w-full"
                    {...register("cost", { required: "Cost is required" })}
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

                <div>
                  <label>Stock On Hand</label>
                  <input
                    type="text"
                    className="form-input w-full"
                    disabled
                    value={`${Number(clickData?.stocks ?? 0).toFixed(4)} ${baseUnitName}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-5">
                <div>
                  <label>
                    Purchase Unit <span className="text-danger text-md">*</span>
                  </label>
                  <select
                    className="form-input"
                    {...register("unitId", { required: true, valueAsNumber: true })}
                  >
                    {unitOptions.map((u: any) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>
                    Quantity <span className="text-danger text-md">*</span>
                  </label>
                  <input
                    type="number"
                    step={isTrackedProduct ? "1" : "0.0001"}
                    className="form-input"
                    disabled={isTrackedProduct}
                    {...register("unitQty", { required: true, valueAsNumber: true })}
                  />
                  {isTrackedProduct && (
                    <p className="text-xs text-gray-500 mt-1">
                      Qty is auto-calculated from tracked serial rows.
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
                  <p className="text-lg font-bold text-primary mt-1">{selectedUnitName}</p>
                </div>

                <div className="rounded-md border border-gray-200 p-3 bg-gray-50">
                  <p className="text-sm font-semibold text-gray-700">
                    Cost per Base Unit ({baseUnitName})
                  </p>
                  <p className="text-lg font-bold text-success mt-1">
                    {Number(costPerBaseUnitPreview).toFixed(4)}
                  </p>
                </div>
              </div>

              {isTrackedProduct && (
                <div className="mb-5 rounded-md border border-indigo-200 bg-indigo-50 px-3 py-3">
                  <label className="font-semibold block mb-2">Tracked Receive Details</label>
                  <p className="text-xs text-gray-600">
                    This product is tracked. Add one row for each received serial item. Qty and base qty will update automatically from these rows.
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Required field: serial number. Asset code and MAC address can be filled when available.
                  </p>
                </div>
              )}

              {isTrackedProduct && (
                <div className="mb-5 rounded-md border border-indigo-200 bg-indigo-50 px-3 py-3">
                  <label className="font-semibold block mb-3">
                    Receive {trackedRows.length} Tracked Item{trackedRows.length === 1 ? "" : "s"}
                  </label>

                  {trackedRows.length === 0 && (
                    <p className="text-sm text-gray-500 mb-3">
                      Add one row per actual device/item being received.
                    </p>
                  )}

                  {trackedFormError && (
                    <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {trackedFormError}
                    </div>
                  )}

                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1 mb-3">
                    {trackedRows.map((row, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-1 sm:grid-cols-12 gap-2 border rounded-md p-3 bg-white border-gray-200"
                      >
                        <div className="sm:col-span-1 flex items-start">
                          <span className="text-xs font-semibold text-gray-500 mt-2">#{index + 1}</span>
                        </div>

                        <div
                          className={
                            trackingType === "ASSET_AND_MAC"
                              ? "sm:col-span-10 grid grid-cols-1 gap-3 sm:grid-cols-3"
                              : "sm:col-span-10 grid grid-cols-1 gap-3 sm:grid-cols-2"
                          }
                        >
                          <div>
                            <label>Serial Number <span className="text-danger text-md">*</span></label>
                            <input
                              type="text"
                              className={`form-input ${trackedRowErrors[index]?.serialNumber ? "border-red-500 focus:border-red-500" : ""}`}
                              value={row.serialNumber ?? ""}
                              onChange={(e) => updateTrackedRow(index, "serialNumber", e.target.value)}
                            />
                            {trackedRowErrors[index]?.serialNumber && (
                              <p className="error_validate mt-1">
                                {trackedRowErrors[index].serialNumber}
                              </p>
                            )}
                          </div>

                          {showAssetField && (
                            <div>
                              <label>Asset Code</label>
                              <input
                                type="text"
                                className="form-input"
                                value={row.assetCode ?? ""}
                                onChange={(e) => updateTrackedRow(index, "assetCode", e.target.value)}
                              />
                            </div>
                          )}

                          {showMacField && (
                            <div>
                              <label>MAC Address</label>
                              <input
                                type="text"
                                className="form-input"
                                value={row.macAddress ?? ""}
                                onChange={(e) => updateTrackedRow(index, "macAddress", e.target.value)}
                              />
                            </div>
                          )}
                        </div>

                        <div className="sm:col-span-1 flex justify-end items-start">
                          <button
                            type="button"
                            className="btn btn-outline-danger"
                            onClick={() => removeTrackedRow(index)}
                            title="Remove"
                          >
                            <FontAwesomeIcon icon={faTrash} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline-primary"
                    onClick={addTrackedRow}
                  >
                    <FontAwesomeIcon icon={faPlus} className="mr-1" />
                    Add Item
                  </button>
                </div>
              )}

              {isTrackedProduct && (
                <div className="mb-5 rounded-md border border-green-200 bg-green-50 px-3 py-3">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="font-semibold block mb-2">Existing In-Stock Serials</label>
                      <p className="text-xs text-gray-600 mb-3">
                        Reference only. Purchase still creates new tracked items for newly received stock.
                      </p>

                      {isLoadingExistingTracked ? (
                        <p className="text-sm text-gray-500">Loading existing serials...</p>
                      ) : existingTrackedItems.length === 0 ? (
                        <p className="text-sm text-gray-500">No old serials currently in stock.</p>
                      ) : (
                        <>
                          <select
                            className="form-input"
                            value={selectedExistingTrackedId}
                            onChange={(e) => setSelectedExistingTrackedId(e.target.value)}
                          >
                            <option value="">Select in-stock serial...</option>
                            {existingTrackedItems.map((item) => (
                              <option key={item.id} value={String(item.id ?? "")}>
                                {item.serialNumber || "No Serial"}
                                {showAssetField && item.assetCode ? ` | ${item.assetCode}` : ""}
                                {showMacField && item.macAddress ? ` | ${item.macAddress}` : ""}
                              </option>
                            ))}
                          </select>

                          <p className="text-xs text-gray-500 mt-2">
                            Showing serials already available in this branch for the same product.
                          </p>
                        </>
                      )}
                    </div>

                    <div className="rounded-md border border-green-100 bg-white p-3">
                      <p className="text-sm font-semibold text-gray-700">Selected Old Serial</p>

                      {selectedExistingTrackedItem ? (
                        <div className="mt-2 space-y-2 text-sm">
                          <div>
                            <span className="text-gray-500">Serial:</span>{" "}
                            <span className="font-medium text-gray-800">
                              {selectedExistingTrackedItem.serialNumber || "No Serial"}
                            </span>
                          </div>

                          {showAssetField && (
                            <div>
                              <span className="text-gray-500">Asset:</span>{" "}
                              <span className="font-medium text-gray-800">
                                {selectedExistingTrackedItem.assetCode || "N/A"}
                              </span>
                            </div>
                          )}

                          {showMacField && (
                            <div>
                              <span className="text-gray-500">MAC:</span>{" "}
                              <span className="font-medium text-gray-800">
                                {selectedExistingTrackedItem.macAddress || "N/A"}
                              </span>
                            </div>
                          )}

                          <div>
                            <span className="text-gray-500">Status:</span>{" "}
                            <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                              {selectedExistingTrackedItem.status ?? "IN_STOCK"}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-gray-500">
                          Select an old in-stock serial to preview its details.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
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
