// ✅ Modal.tsx (FULL UPDATED FILE) — works with UOM (Base Unit + unitConversions)
// Stock input is ALWAYS in Base Unit (recommended)

import React, { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSave, faClose, faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";
import { useAppContext } from "../../hooks/useAppContext";
import { useForm, useFieldArray, FormProvider } from "react-hook-form";
import { getAllCategories } from "../../api/category";
import { getAllBrands } from "../../api/brand";
import { FileRejection, useDropzone } from "react-dropzone";

import { UnitData, VarientAttributeType, BranchType, TrackingType, ProductTrackedItemType } from "../../data_types/types";
import { getAllBranches } from "@/api/branch";
import { getAllUnits } from "../../api/unit";
import { getAllVarientAttributes } from "../../api/varientAttribute";
import MultiSelectVariant from "./MultiSelectVariant";
import Select from "react-select";
import { truncateNumber } from "@/helper/numberFormat";
import { toast } from "react-toastify";

type ProductStock = {
  branchId: number;
  quantity: number;
};

type ConversionRow = {
  fromUnitId: number | null;
  toUnitId: number | null;
  multiplier: number | string;
};

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;

  // ✅ UPDATED: add baseUnitId + unitConversions at the end
  onSubmit: (
    id: number | null,
    categoryId: number | null,
    brandId: number | null,
    name: string,
    note: string,
    isActive: string,
    image: File[] | null,
    imagesToDelete: string[],

    unitId: number | null,
    barcode: string | null,
    productType: string | "New",
    sku: string,
    stockAlert: number | null,

    purchasePrice: number | string,
    purchasePriceUnitId: number | null,

    retailPrice: number | string,
    retailPriceUnitId: number | null,
    wholeSalePrice: number | string,
    wholeSalePriceUnitId: number | null,
    variantAttributeIds?: number[] | null,
    variantValueIds?: number[],

    stocks?: ProductStock[],

    baseUnitId?: number | null,
    unitConversions?: { fromUnitId: number; toUnitId: number; multiplier: number }[],
    updateStock?: boolean,

    trackingType?: TrackingType,
    trackedItems?: ProductTrackedItemType[],
  ) => void;

  product?: {
    id: number | undefined;
    categoryId: number | null;
    brandId: number | null;
    name: string;
    note: string;
    isActive: string;
    image: File | File[] | string | null;

    unitId: number | null;
    barcode: string | null;
    sku: string;
    stockAlert: number | null;
    purchasePrice: number | string;
    purchasePriceUnitId?: number | null;
    retailPrice: number | string;
    retailPriceUnitId: number | null,
    wholeSalePrice: number | string;
    wholeSalePriceUnitId: number | null,
    productType: string | "New";

    variantAttributeId?: number | null;
    variantAttributeIds?: number[];
    variantValueIds?: number[];
    branchId?: number | null;
    stocks?: Array<{ branchId: number; quantity: string | number }> | null;
    updateStock?: boolean;
    // NEW (UOM)
    baseUnitId?: number | null;
    unitConversions?: { fromUnitId: number; toUnitId: number; multiplier: number }[];

    trackingType?: TrackingType;
    trackedItems?: ProductTrackedItemType[];
  } | null;
}

export interface ProductFormData {
  categoryId: number | null;
  brandId: number | null;
  name: string;
  note: string;
  isActive: string;
  image: File | File[] | string | null;

  productType: string | "New";
  unitId: number | null;
  barcode?: string | null;
  sku?: string;
  stockAlert?: number | null;
  purchasePrice?: number | string;
  purchasePriceUnitId?: number | null;
  retailPrice?: number | string;
  retailPriceUnitId: number | null,
  wholeSalePrice?: number | string;
  wholeSalePriceUnitId?: number | null;
  variantAttributeId?: number | null;
  variantAttributeIds?: number[];
  variantValueIds?: number[];

  // ✅ NEW (UOM)
  baseUnitId: number | null;
  unitConversions: ConversionRow[];

  branchId?: number | null;
  stocks?: Array<{ branchId: number; quantity: string | number }> | null;
  updateStock: boolean;

  trackingType: TrackingType;
  trackedItems: ProductTrackedItemType[];
}

export interface CategoryData {
  id: number;
  name: string;
}

export interface BrandData {
  id: number;
  en_name: string;
  kh_name: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, onSubmit, product }) => {
  const [branches, setBranches] = useState<BranchType[]>([]);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [brands, setBrands] = useState<BrandData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [imagePreview, setImagePreview] = useState<string[] | null>(null);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);
  const [resetKey, setResetKey] = useState(0);

  const [variantValues, setVariantValues] = useState<any[]>([]);
  const [skuLocked, setSkuLocked] = useState(false);
  const [barcodeLocked, setBarcodeLocked] = useState(false);

  const [units, setUnits] = useState<UnitData[]>([]);
  const [variantAttributes, setVariantAttributes] = useState<VarientAttributeType[]>([]);

  const methods = useForm<ProductFormData>({
    defaultValues: {
      stocks: [],
      baseUnitId: null,
      unitConversions: [],
      purchasePriceUnitId: null,
      retailPriceUnitId: null,
      wholeSalePriceUnitId: null,
      updateStock: false,

      trackingType: "NONE",
      trackedItems: [],
    },
  });

  const {
    control,
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = methods;

  // stocks field array
  useFieldArray({
    control,
    name: "stocks",
  });

  // Tracked items field array
  const {
    fields: trackedItemFields,
    append: appendTrackedItem,
    remove: removeTrackedItem,
  } = useFieldArray({
    control,
    name: "trackedItems",
  });

  const trackingType = watch("trackingType");

  const normalizeMac = (value?: string | null) => {
    if (!value) return "";
    return value.replace(/[^A-Fa-f0-9]/g, "").toUpperCase();
  };

  const isTrackedRowValid = (item: ProductTrackedItemType) => {
    const branchId = Number(item.branchId || 0);
    const hasSerial = !!item.serialNumber?.trim();

    return !!branchId && hasSerial;
  };

  const countInvalidTrackedRows = (items: ProductTrackedItemType[]) => {
    return items.filter((item) => !isTrackedRowValid(item)).length;
  };

  const buildTrackedSummaryByBranch = (items: ProductTrackedItemType[]) => {
    const grouped: Record<number, number> = {};

    items.forEach((item) => {
      const branchId = Number(item.branchId || 0);
      if (!branchId) return;

      // count all rows with branch
      grouped[branchId] = (grouped[branchId] || 0) + 1;
    });

    return grouped;
  };

  const buildValidTrackedSummaryByBranch = (items: ProductTrackedItemType[]) => {
    const grouped: Record<number, number> = {};

    items.forEach((item) => {
      const branchId = Number(item.branchId || 0);
      if (!branchId) return;
      if (!isTrackedRowValid(item)) return;

      grouped[branchId] = (grouped[branchId] || 0) + 1;
    });

    return grouped;
  };

  const validateTrackedItems = (items: ProductTrackedItemType[]) => {
    const cleaned = items
      .map((item) => ({
        id: item.id,
        branchId: Number(item.branchId || 0),
        assetCode: item.assetCode?.trim() || "",
        macAddress: normalizeMac(item.macAddress),
        serialNumber: item.serialNumber?.trim() || "",
      }))
      .filter((item) => item.branchId);

    const assetSet = new Set<string>();
    const macSet = new Set<string>();
    const serialSet = new Set<string>();

    for (const item of cleaned) {
      // ✅ serial always required
      if (!item.serialNumber) {
        throw new Error("Every tracked row must have Serial Number.");
      }

      // ✅ serial always unique in form
      const serialKey = item.serialNumber.toUpperCase();
      if (serialSet.has(serialKey)) {
        throw new Error(`Duplicate Serial Number: ${item.serialNumber}`);
      }
      serialSet.add(serialKey);

      // ✅ asset optional, only check duplicate when filled
      if (item.assetCode) {
        const assetKey = item.assetCode.toUpperCase();
        if (assetSet.has(assetKey)) {
          throw new Error(`Duplicate Asset Code: ${item.assetCode}`);
        }
        assetSet.add(assetKey);
      }

      // ✅ mac optional, only check duplicate when filled
      if (item.macAddress) {
        if (macSet.has(item.macAddress)) {
          throw new Error(`Duplicate MAC Address: ${item.macAddress}`);
        }
        macSet.add(item.macAddress);
      }
    }

    return cleaned;
  };
  // End of tracked items logic

  // ✅ unitConversions field array
  const {
    fields: conversionFields,
    append: appendConversion,
    remove: removeConversion,
  } = useFieldArray({
    control,
    name: "unitConversions",
  });

  const { hasPermission } = useAppContext();
  const API_BASE_URL = import.meta.env.VITE_API_URL || "";

  const fetchBranches = async () => {
    setIsLoading(true);
    try {
      const data = await getAllBranches();
      setBranches(data as BranchType[]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const data = await getAllCategories();
      setCategories(data as CategoryData[]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBrands = async () => {
    setIsLoading(true);
    try {
      const data = await getAllBrands();
      setBrands(data as BrandData[]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUnits = async () => {
    setIsLoading(true);
    try {
      const data = await getAllUnits();
      setUnits(data as UnitData[]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchVariantAttributes = async () => {
    setIsLoading(true);
    try {
      const data = await getAllVarientAttributes();
      setVariantAttributes(data as VarientAttributeType[]);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ fetch when modal opens
  useEffect(() => {
    if (!isOpen) return;
    fetchBranches();
    fetchCategories();
    fetchBrands();
    fetchUnits();
    fetchVariantAttributes();
  }, [isOpen]);

  const updateStock = watch("updateStock");
  // ✅ base unit label
  const baseUnitId = watch("baseUnitId");
  const baseUnitName = units.find((u) => u.id === baseUnitId)?.name || "";

  const purchasePriceValue = watch("purchasePrice");
  const purchasePriceUnitId = watch("purchasePriceUnitId");

  const retailPriceValue = watch("retailPrice");
  const retailPriceUnitId = watch("retailPriceUnitId");

  const wholeSalePriceValue = watch("wholeSalePrice");
  const wholeSalePriceUnitId = watch("wholeSalePriceUnitId");
  const watchedConversions = watch("unitConversions") || [];

  // Track logic
  const watchedTrackedItems = watch("trackedItems") || [];
  const liveTrackedSummary = buildTrackedSummaryByBranch(watchedTrackedItems);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const validTrackedSummary = useMemo(() => buildValidTrackedSummaryByBranch(watchedTrackedItems), [JSON.stringify(watchedTrackedItems)]);
  const invalidTrackedCount = countInvalidTrackedRows(watchedTrackedItems);

  const hasTrackedValidationError =
    trackingType !== "NONE" &&
    updateStock &&
    watchedTrackedItems.length > 0 &&
    invalidTrackedCount > 0;

  const getUnitName = (unitId?: number | null) =>
    units.find((u) => u.id === unitId)?.name || "";

  const getMultiplier = (
    fromUnitId?: number | null,
    toUnitId?: number | null
  ): number | null => {
    if (!fromUnitId || !toUnitId) return null;
    const conv = watchedConversions.find(
      (c) =>
        Number(c.fromUnitId) === Number(fromUnitId) &&
        Number(c.toUnitId) === Number(toUnitId) &&
        Number(c.multiplier) > 0
    );
    return conv ? Number(conv.multiplier) : null;
  };

  const buildBasePricePreview = (
    value: number | string | undefined,
    fromUnitId?: number | null,
    toBaseUnitId?: number | null
  ) => {
    const num = Number(value ?? 0);
    if (!num || !fromUnitId || !toBaseUnitId) return "";

    if (Number(fromUnitId) === Number(toBaseUnitId)) {
      return `${num.toFixed(4)} per ${getUnitName(toBaseUnitId)}`;
    }

    const multiplier = getMultiplier(fromUnitId, toBaseUnitId);
    if (!multiplier) return "";

    const perBase = num / multiplier;
    return `${perBase.toFixed(5)} per ${getUnitName(toBaseUnitId)}`;
  };

  const buildConvertedPricePreview = (
    value: number | string | undefined,
    fromUnitId?: number | null,
    toUnitId?: number | null
  ) => {
    const num = Number(value ?? 0);
    if (!num || !fromUnitId || !toUnitId) return "";

    if (Number(fromUnitId) === Number(toUnitId)) {
      return `${num.toFixed(4)} per ${getUnitName(toUnitId)}`;
    }

    const multiplier = getMultiplier(fromUnitId, toUnitId);
    if (!multiplier) return "";

    const converted = num * multiplier;
    return `${converted.toFixed(4)} per ${getUnitName(toUnitId)}`;
  };

  const costPreviewText = buildBasePricePreview(
    purchasePriceValue,
    purchasePriceUnitId,
    baseUnitId
  );

  // preview from base to larger unit only if a conversion exists
  const retailBasePreviewText = buildBasePricePreview(
    retailPriceValue,
    retailPriceUnitId,
    baseUnitId
  );

  const wholesaleBasePreviewText = buildBasePricePreview(
    wholeSalePriceValue,
    wholeSalePriceUnitId,
    baseUnitId
  );

  const firstHigherConversion =
    watchedConversions.find(
      (c) => Number(c.toUnitId) === Number(baseUnitId) && Number(c.multiplier) > 0
    ) || null;

  const retailHigherPreviewText = firstHigherConversion
    ? buildConvertedPricePreview(
        retailPriceValue,
        retailPriceUnitId,
        firstHigherConversion.fromUnitId
      )
    : "";

  const wholesaleHigherPreviewText = firstHigherConversion
    ? buildConvertedPricePreview(
        wholeSalePriceValue,
        wholeSalePriceUnitId,
        firstHigherConversion.fromUnitId
      )
    : "";

  // Auto-build stock quantity from tracked items
  useEffect(() => {
    if (!updateStock) return;
    if (trackingType === "NONE") return;

    const autoStocks = branches.map((branch) => ({
      branchId: Number(branch.id ?? 0),
      quantity: validTrackedSummary[Number(branch.id ?? 0)] || 0,
    }));

    setValue("stocks", autoStocks, {
      shouldDirty: true,
      shouldValidate: false,
    });
  }, [updateStock, trackingType, branches, validTrackedSummary, setValue]);
  // End of auto stock logic

  useEffect(() => {
    // Only run after branches are fetched and modal is open
    if (!isOpen || branches.length === 0) return;

    if (product) {
      const stockData = branches.map((branch) => {
        const existing = product.stocks?.find((s) => s.branchId === branch.id);
        return {
          branchId: branch.id ?? 0,
          quantity: existing ? Number(existing.quantity) : 0,
        };
      });

      setSkuLocked(true);
      setBarcodeLocked(true);

      reset({
        categoryId: product.categoryId ?? null,
        brandId: product.brandId ?? null,
        name: product.name ?? "",
        note: product.note ?? "",
        image: product.image ?? null,

        productType: product.productType ?? "New",
        unitId: product.unitId ?? null,
        barcode: product.barcode ?? "",
        sku: product.sku ?? "",
        stockAlert: product.stockAlert ?? 0,
        purchasePrice: product.purchasePrice ?? "",
        purchasePriceUnitId: product.purchasePriceUnitId ?? product.baseUnitId ?? null,
        retailPrice: product.retailPrice ?? "",
        retailPriceUnitId: product.retailPriceUnitId ?? product.baseUnitId ?? null,
        wholeSalePrice: product.wholeSalePrice ?? "",
        wholeSalePriceUnitId: product.wholeSalePriceUnitId ?? product.baseUnitId ?? null,
        variantAttributeIds: product.variantAttributeIds ?? [],
        variantValueIds: product.variantValueIds ?? [],
        
        stocks: stockData,
        updateStock: false,

        // ✅ NEW UOM
        baseUnitId: product.baseUnitId ?? null,
        unitConversions: (product.unitConversions ?? []).map((c) => ({
          fromUnitId: c.fromUnitId,
          toUnitId: c.toUnitId,
          multiplier: c.multiplier,
        })),

        trackingType: product.trackingType ?? "NONE",
        trackedItems: product.trackedItems ?? [],
      });

      // images preview (your logic)
      if (product.image) {
        if (typeof product.image === "string") {
          setExistingImages([product.image]);
          setImagePreview([`${API_BASE_URL}/${product.image}`]);
        } else if (Array.isArray(product.image)) {
          const images = product.image.map((item) =>
            typeof item === "string" ? item : URL.createObjectURL(item)
          );
          setExistingImages(images as string[]);
          setImagePreview((product.image as any).map((img: any) => `${API_BASE_URL}/${img}`));
        } else if (product.image instanceof File) {
          const imageUrl = URL.createObjectURL(product.image);
          setExistingImages([imageUrl]);
          setImagePreview([imageUrl]);
        }
      } else {
        setImagePreview(null);
      }
    } else {
      setSkuLocked(false);
      setBarcodeLocked(false);

      const initialStocks = branches.map((branch) => ({
        branchId: branch.id ?? 0,
        quantity: 0,
      }));

      reset({
        categoryId: null,
        brandId: null,
        name: "",
        note: "",
        image: null,

        productType: "New",
        unitId: null,
        barcode: "",
        sku: "",
        stockAlert: 0,
        purchasePrice: "",
        purchasePriceUnitId: null,
        retailPrice: "",
        retailPriceUnitId: null,
        wholeSalePrice: "",
        wholeSalePriceUnitId: null,
        variantAttributeIds: [],
        variantValueIds: [],

        stocks: initialStocks,
        updateStock: true,

        // ✅ NEW UOM
        baseUnitId: null,
        unitConversions: [],
        trackingType: "NONE",
        trackedItems: [],
      });

      setVariantValues([]);
      setExistingImages([]);
      setImagePreview(null);
    }
  }, [product, reset, isOpen, branches.length, units.length]);

  const resetDropzoneOrFormData = () => {
    reset();
    setNewImages([]);
    setImagePreview([]);
    setResetKey((prev) => prev + 1);
  };

  const MAX_FILE_SIZE = 5 * 1024 * 1024;

  const onDrop = (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
    const validFiles = acceptedFiles.filter((file) => file.size <= MAX_FILE_SIZE);

    if (rejectedFiles.length > 0 || validFiles.length < acceptedFiles.length) {
      alert("Some files were too large or invalid. Maximum size is 5 MB.");
      resetDropzoneOrFormData();
      return;
    }

    const previews = acceptedFiles.map((file) => URL.createObjectURL(file));
    setNewImages((prev) => [...prev, ...acceptedFiles]);
    setImagePreview((prev) => (prev ? [...prev, ...previews] : previews));
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    multiple: true,
  });

  const removeImage = (index: number, type: "existing" | "new") => {
    if (type === "existing") {
      const removedImage = existingImages[index];
      setImagesToDelete((prev) => [...prev, removedImage]);

      setExistingImages((prev) => (prev ? prev.filter((_, i) => i !== index) : []));
      setImagePreview((prev) => (prev ? prev.filter((_, i) => i !== index) : []));
    } else {
      setNewImages((prev) => (prev ? prev.filter((_, i) => i !== index - (existingImages?.length || 0)) : []));
      setImagePreview((prev) => (prev ? prev.filter((_, i) => i !== index) : []));
    }
  };

  const convertExistingImagesPaths = async (): Promise<File[]> => {
    const imageFiles: File[] = [];
    for (const url of existingImages) {
      const filename = url.split("\\").pop() || "file";
      const cleanedPath = `./${filename}`;

      const response = await fetch(url);
      const blob = await response.blob();

      const file = new File([blob], filename, { type: "image/*" });

      Object.assign(file, {
        path: cleanedPath,
        relativePath: cleanedPath,
      });

      imageFiles.push(file);
    }
    return imageFiles;
  };

  // const handleFormSubmit = async (data: ProductFormData) => {
  //   setIsLoading(true);
  //   try {
  //     const convertedExistingImages = await convertExistingImagesPaths();
  //     const combinedImages = [...convertedExistingImages, ...newImages];

  //     const stocks: ProductStock[] = data.updateStock
  //     ? (data.stocks || []).map((s) => ({
  //         branchId: Number(s.branchId),
  //         quantity: Number(s.quantity) || 0,
  //       }))
  //     : [];

  //     // ✅ sanitize unitConversions
  //     const conversionsOut = (data.unitConversions || [])
  //       .filter(
  //         (c) =>
  //           c.fromUnitId &&
  //           c.toUnitId &&
  //           Number(c.multiplier) > 0 &&
  //           c.fromUnitId !== c.toUnitId
  //       )
  //       .map((c) => ({
  //         fromUnitId: Number(c.fromUnitId),
  //         toUnitId: Number(c.toUnitId),
  //         multiplier: Number(c.multiplier),
  //       }));

  //     await onSubmit(
  //       product?.id || null,
  //       data.categoryId,
  //       data.brandId,
  //       data.name,
  //       data.note,
  //       data.isActive,
  //       combinedImages,
  //       imagesToDelete,

  //       data.unitId,
  //       data.barcode || null,
  //       data.productType || "New",
  //       data.sku || "",
  //       data.stockAlert || 0,
  //       data.purchasePrice || "",
  //       data.purchasePriceUnitId ?? null,
  //       data.retailPrice || "",
  //       data.retailPriceUnitId ?? null,
  //       data.wholeSalePrice || "",
  //       data.wholeSalePriceUnitId ?? null,
  //       data.variantAttributeIds ?? null,
  //       data.variantValueIds,

  //       stocks,

  //       // NEW UOM
  //       data.baseUnitId,
  //       conversionsOut,
  //       data.updateStock
  //     );

  //     resetDropzoneOrFormData();
  //     onClose();
  //   } catch (error: any) {
  //     console.log("Error submitting form:", error);
  //     resetDropzoneOrFormData();
  //     document.querySelector("form")?.reset();
  //   } finally {
  //     resetDropzoneOrFormData();
  //     setIsLoading(false);
  //   }
  // };

  const handleFormSubmit = async (data: ProductFormData) => {
    setIsLoading(true);

    try {
      const convertedExistingImages = await convertExistingImagesPaths();
      const combinedImages = [...convertedExistingImages, ...newImages];

      let trackedItemsOut: ProductTrackedItemType[] = [];
      let stocks: ProductStock[] = [];

      if (data.updateStock) {
        if (data.trackingType === "NONE") {
          stocks = (data.stocks || []).map((s) => ({
            branchId: Number(s.branchId),
            quantity: Number(s.quantity) || 0,
          }));
        } else {
          trackedItemsOut = validateTrackedItems(data.trackedItems || []);

          const qtyMap: Record<number, number> = {};
          trackedItemsOut.forEach((item) => {
            qtyMap[item.branchId] = (qtyMap[item.branchId] || 0) + 1;
          });

          stocks = branches.map((branch) => ({
            branchId: Number(branch.id),
            quantity: qtyMap[Number(branch.id)] || 0,
          }));
        }
      }

      const conversionsOut = (data.unitConversions || [])
        .filter(
          (c) =>
            c.fromUnitId &&
            c.toUnitId &&
            Number(c.multiplier) > 0 &&
            c.fromUnitId !== c.toUnitId
        )
        .map((c) => ({
          fromUnitId: Number(c.fromUnitId),
          toUnitId: Number(c.toUnitId),
          multiplier: Number(c.multiplier),
        }));

      await onSubmit(
        product?.id || null,
        data.categoryId,
        data.brandId,
        data.name,
        data.note,
        data.isActive,
        combinedImages,
        imagesToDelete,

        data.unitId,
        data.barcode || null,
        data.productType || "New",
        data.sku || "",
        data.stockAlert || 0,

        data.purchasePrice || "",
        data.purchasePriceUnitId ?? null,

        data.retailPrice || "",
        data.retailPriceUnitId ?? null,
        data.wholeSalePrice || "",
        data.wholeSalePriceUnitId ?? null,
        data.variantAttributeIds ?? null,
        data.variantValueIds,

        stocks,

        data.baseUnitId,
        conversionsOut,
        data.updateStock,

        data.trackingType,
        trackedItemsOut
      );

      // ✅ only reset and close when submit success
      resetDropzoneOrFormData();
      onClose();
    } catch (error: any) {
      console.error("Error submitting form:", error);
      toast.error(error.message, {
          position: "top-right",
          autoClose: 4500
      });
      // ✅ do NOT close modal
      // ✅ do NOT reset form
      // let parent toast show backend error
    } finally {
      setIsLoading(false);
    }
  };

  // --- Auto generators ---
  const nameValue = watch("name") ?? "";

  const generateSKU = (name: string) => {
    if (!name.trim()) return "";
    const prefix = name
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0].toUpperCase())
      .join("");

    const random = Math.floor(1000 + Math.random() * 9000);
    return prefix + random;
  };

  const generateBarcode = () => {
    return Math.floor(100000000000 + Math.random() * 900000000000).toString();
  };

  const handleSkuChange = (value: string) => {
    setValue("sku", value);
    setSkuLocked(true);
  };

  const handleBarcodeChange = (value: string) => {
    setValue("barcode", value);
    setBarcodeLocked(true);
  };

  useEffect(() => {
    if (!nameValue.trim()) return;

    if (!skuLocked) setValue("sku", generateSKU(nameValue));
    if (!barcodeLocked) setValue("barcode", generateBarcode());
  }, [nameValue, skuLocked, barcodeLocked, setValue]);

  const selectedAttributeIds = watch("variantAttributeIds") || [];

  useEffect(() => {
    const allValues = variantAttributes
      .filter((attr) => attr.id != null && selectedAttributeIds.includes(attr.id))
      .flatMap((attr) => attr.values || []);

    setVariantValues(allValues);

    const currentSelectedValues: number[] = watch("variantValueIds") || [];
    const filteredSelectedValues = currentSelectedValues.filter((vId) =>
      allValues.some((val) => val.id === vId)
    );

    setValue("variantValueIds", filteredSelectedValues);
  }, [selectedAttributeIds.join(","), variantAttributes, setValue, watch]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[black]/60 z-[999] overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="panel border-0 p-0 rounded-lg overflow-hidden w-full max-w-lg my-8">
          <div className="flex bg-[#fbfbfb] dark:bg-[#121c2c] items-center justify-between px-5 py-3">
            <h5 className="font-bold text-lg">{product ? "Edit Product" : "Add New Product"}</h5>
            <button type="button" className="text-white-dark hover:text-dark" onClick={onClose}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <FormProvider {...methods}>
            <form onSubmit={handleSubmit(handleFormSubmit)} encType="multipart/form-data">
              <div className="p-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-5">
                  <div className="flex flex-wrap">
                    <label className="flex cursor-pointer items-center" style={{ marginRight: "20px" }}>
                      <input type="radio" value="New" className="form-radio" {...register("productType", { required: "Product type is required" })} />
                      <span className="text-white-dark">New</span>
                    </label>
                    <label className="flex cursor-pointer items-center">
                      <input type="radio" value="SecondHand" className="form-radio" {...register("productType", { required: "Product type is required" })} />
                      <span className="text-white-dark">Second Hand</span>
                    </label>
                  </div>
                  {errors.productType && <span className="error_validate">{errors.productType.message}</span>}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-5">
                  <div>
                    <label>
                      Category <span className="text-danger text-md">*</span>
                    </label>
                    <select id="categoryId" className="form-input" {...register("categoryId", { required: "Category is required", valueAsNumber: true })}>
                      <option value="">Select a category...</option>
                      {categories.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                    {errors.categoryId && <span className="error_validate">{errors.categoryId.message}</span>}
                  </div>

                  <div>
                    <label>
                      Brand <span className="text-danger text-md">*</span>
                    </label>
                    <select id="brandId" className="form-input" {...register("brandId", { required: "Brand is required", valueAsNumber: true })}>
                      <option value="">Select a brand...</option>
                      {brands.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.en_name}
                        </option>
                      ))}
                    </select>
                    {errors.brandId && <span className="error_validate">{errors.brandId.message}</span>}
                  </div>
                </div>

                <div className="dark:text-white-dark/70 text-base font-medium text-[#1f2937] mb-5">
                  <label htmlFor="module">
                    Product's Name <span className="text-danger text-md">*</span>
                  </label>
                  <input type="text" placeholder="Enter Product's name" className="form-input" {...register("name", { required: "This field is required" })} />
                  {errors.name && <p className="error_validate">{errors.name.message}</p>}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-4">
                  <div>
                    <label htmlFor="module">
                      SKU <span className="text-danger text-md">*</span>
                    </label>
                    <input type="text" placeholder="Enter sku's code" className="form-input" {...register("sku", { required: "This field is required" })} onChange={(e) => handleSkuChange(e.target.value)} />
                    {errors.sku && <p className="error_validate">{errors.sku.message}</p>}
                  </div>

                  <div>
                    <label htmlFor="module">
                      Barcode <span className="text-danger text-md">*</span>
                    </label>
                    <input type="text" placeholder="Enter Variant's barcode" className="form-input" {...register("barcode", { required: "This field is required" })} onChange={(e) => handleBarcodeChange(e.target.value)} />
                    {errors.barcode && <p className="error_validate">{errors.barcode.message}</p>}
                  </div>
                </div>

                {/* ✅ NEW UOM: Base Unit + Unit */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-4">
                  <div>
                    <label>
                      Base Unit (Internal Stock Unit) <span className="text-danger text-md">*</span>
                    </label>
                    <select
                      id="baseUnitId"
                      className="form-input"
                      {...register("baseUnitId", { required: "Base Unit is required", valueAsNumber: true })}
                    >
                      <option value="">Select Base Unit...</option>
                      {units.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                    {errors.baseUnitId && <span className="error_validate">{errors.baseUnitId.message as any}</span>}
                    <p className="text-xs text-gray-500 mt-1">
                      This is the stock unit used internally for inventory, FIFO costing, and reports.
                    </p>
                  </div>

                  <div>
                    <label>
                      Stock Alert {baseUnitName ? `(in ${baseUnitName})` : "(in Base Unit)"}{" "}
                      <span className="text-danger text-md">*</span>
                    </label>
                    <input type="text" placeholder="Enter Stock Alert" className="form-input" {...register("stockAlert", { required: "This field is required" })} /> 
                    {errors.unitId && <span className="error_validate">{errors.unitId.message}</span>}
                  </div>
                </div>

                {/* ✅ NEW UOM: unitConversions */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <label className="font-semibold">Unit Conversions (optional)</label>
                    <button
                      type="button"
                      className="btn btn-outline-primary"
                      onClick={() => appendConversion({ fromUnitId: null, toUnitId: null, multiplier: "" })}
                    >
                      <FontAwesomeIcon icon={faPlus} className="mr-1" />
                      Add
                    </button>
                  </div>

                  {conversionFields.length === 0 && (
                    <p className="text-sm text-gray-500">
                      Example: 1 roll = 305 meter → From=roll, To=meter, Multiplier=305
                    </p>
                  )}

                  <div className="space-y-3">
                    {conversionFields.map((row, idx) => (
                      <div key={row.id} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="sm:col-span-4">
                          <label className="text-sm">From Unit</label>
                          <select className="form-input" {...register(`unitConversions.${idx}.fromUnitId`, { valueAsNumber: true })}>
                            <option value="">Select...</option>
                            {units.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="sm:col-span-4">
                          <label className="text-sm">To Unit</label>
                          <select className="form-input" {...register(`unitConversions.${idx}.toUnitId`, { valueAsNumber: true })}>
                            <option value="">Select...</option>
                            {units.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="sm:col-span-4">
                          <label className="text-sm">Multiplier</label>
                          <input
                            type="number"
                            step="0.0001"
                            placeholder="e.g. 12"
                            className="form-input"
                            {...register(`unitConversions.${idx}.multiplier`)}
                          />
                        </div>

                        <div className="sm:col-span-3 flex justify-end">
                          <button type="button" className="btn btn-outline-danger" onClick={() => removeConversion(idx)} title="Remove">
                            <FontAwesomeIcon icon={faTrash} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Add tracking type */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-4">
                  <div>
                    <label>
                      Tracking Type <span className="text-danger text-md">*</span>
                    </label>
                    <select
                      className="form-input"
                      {...register("trackingType", { required: "Tracking Type is required" })}
                    >
                      <option value="NONE">None</option>
                      <option value="ASSET_ONLY">Asset Code Only</option>
                      <option value="MAC_ONLY">MAC Address Only</option>
                      <option value="ASSET_AND_MAC">Asset Code + MAC Address</option>
                    </select>
                  </div>

                  <div>
                    <label>Stock Mode</label>
                    <input
                      type="text"
                      disabled
                      className="form-input bg-gray-100"
                      value={trackingType === "NONE" ? "Manual Quantity" : "Auto from Tracked Items"}
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="form-checkbox"
                      {...register("updateStock")}
                    />
                    <span className="font-medium">
                      {product?.id ? "Update branch stock also" : "Set opening stock now"}
                    </span>
                  </label>

                  <p className="text-xs text-gray-500 mt-1">
                    {product?.id
                      ? "Check this only when you want this edit to change stock and create stock adjustment movements."
                      : "Check this to save opening stock when creating the product."}
                  </p>
                </div>

                {/* Stock in base unit */}
                {/* It isn't track product stock, opening and manual stock for each branch. */}
                {updateStock && trackingType === "NONE" && (
                  <div className="mb-4">
                    {product?.id && (
                      <div className="mb-3 rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
                        Editing stock here will create stock adjustment movements and affect FIFO costing.
                      </div>
                    )}

                    <label className="font-semibold mb-2 block">
                      Opening / Current Stock Per Branch (in {baseUnitName || "Base Unit"})
                    </label>

                    <div className="space-y-3">
                      {branches.map((branch, index) => (
                        <div key={branch.id} className="flex items-center gap-4">
                          <input
                            type="hidden"
                            value={branch.id}
                            {...register(`stocks.${index}.branchId`, { valueAsNumber: true })}
                          />

                          <div className="w-1/2">
                            <input type="text" value={branch.name} disabled className="form-input bg-gray-100" />
                          </div>

                          <div className="w-1/2 flex items-center gap-2">
                            <input
                              type="number"
                              step="0.0001"
                              {...register(`stocks.${index}.quantity`, { valueAsNumber: true })}
                              className="form-input"
                            />
                            {baseUnitName && (
                              <span className="text-sm text-gray-500 whitespace-nowrap">{baseUnitName}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* if it is track product stock, show tracked items table instead of stock input, and stock will be auto-calculated from valid tracked items */}
                {updateStock && trackingType !== "NONE" && (
                  <div className="mb-6 rounded-lg border border-indigo-200 bg-indigo-50 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h6 className="font-bold text-base">Tracked Items</h6>
                        <p className="text-xs text-gray-600 mt-1">
                          Quantity is auto-calculated from valid tracked rows.
                        </p>
                      </div>

                      <button
                        type="button"
                        className="btn btn-outline-primary"
                        onClick={() =>
                          appendTrackedItem({
                            branchId: branches[0]?.id ?? 0,
                            assetCode: "",
                            macAddress: "",
                            serialNumber: "",
                          })
                        }
                      >
                        <FontAwesomeIcon icon={faPlus} className="mr-1" />
                        Add Item
                      </button>
                    </div>

                    {trackedItemFields.length === 0 && (
                      <p className="text-sm text-gray-500">
                        Add one row per actual device/item in stock.
                      </p>
                    )}

                    <div className="space-y-3">
                      {trackedItemFields.map((field, index) => {
                        const currentRow = watchedTrackedItems[index] || {};
                        const rowValid = isTrackedRowValid(currentRow);

                        return (
                          <div
                            key={field.id}
                            className={`grid grid-cols-1 sm:grid-cols-12 gap-2 border rounded-md p-3 ${
                              rowValid
                                ? "bg-white border-gray-200"
                                : "bg-red-50 border-red-300"
                            }`}
                          >
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                              <div>
                                <label className="text-sm">Branch</label>
                                <select
                                  className="form-input"
                                  {...register(`trackedItems.${index}.branchId`, { valueAsNumber: true })}
                                >
                                  <option value="">Select Branch...</option>
                                  {branches.map((branch) => (
                                    <option key={branch.id} value={branch.id}>
                                      {branch.name}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="text-sm">Serial Number</label>
                                <input
                                  type="text"
                                  className="form-input"
                                  placeholder="SN"
                                  {...register(`trackedItems.${index}.serialNumber`, {
                                    required: "Serial Number is required",
                                  })}
                                />
                                {errors?.trackedItems?.[index]?.serialNumber && (
                                  <p className="text-red-500 text-xs">
                                    {errors.trackedItems[index]?.serialNumber?.message}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="sm:col-span-3" style={{marginTop: '-12px'}}>
                                {!rowValid && (
                                  <p className="error_validate">
                                    This row is invalid. Branch and Serial Number are required.
                                  </p>
                                )}
                            </div>
                            
                            {(trackingType === "ASSET_ONLY" || trackingType === "ASSET_AND_MAC") && (
                              <div className="sm:col-span-3">
                                <label className="text-sm">Asset Code</label>
                                <input
                                  type="text"
                                  className="form-input"
                                  placeholder="Enter asset code"
                                  {...register(`trackedItems.${index}.assetCode`)}
                                />
                              </div>
                            )}

                            {(trackingType === "MAC_ONLY" || trackingType === "ASSET_AND_MAC") && (
                              <div className="sm:col-span-3">
                                <label className="text-sm">MAC Address</label>
                                <input
                                  type="text"
                                  className="form-input"
                                  placeholder="AA:BB:CC:11:22:33"
                                  {...register(`trackedItems.${index}.macAddress`)}
                                />
                              </div>
                            )}

                            <div className="sm:col-span-3 flex justify-end">
                              <button type="button" className="btn btn-outline-danger" onClick={() => removeTrackedItem(index)} title="Remove">
                                <FontAwesomeIcon icon={faTrash} />
                              </button>
                            </div>
                          </div>
                        );                      
                      })}
                    </div>
                  </div>
                )}

                {/* auto stock summary from tracked items, only show when updateStock is checked and trackingType is not NONE, to give user a preview of how many stock will be after saving based on the tracked items they input */}
                {updateStock && trackingType !== "NONE" && (
                  <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-3">
                    <label className="font-semibold block mb-2">
                      Auto Stock Summary (from tracked rows)
                    </label>

                    <div className="space-y-2">
                      {branches.map((branch) => {
                        const totalRows = liveTrackedSummary[Number(branch.id)] || 0;
                        const validRows = validTrackedSummary[Number(branch.id)] || 0;

                        return (
                          <div key={branch.id} className="flex justify-between text-sm">
                            <span>{branch.name}</span>
                            <span className="font-semibold">
                              {/* {validRows} valid /  */}
                              {totalRows} total {baseUnitName || "unit"}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {invalidTrackedCount > 0 && (
                      <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {invalidTrackedCount} tracked row(s) are missing required data.
                        Only valid rows will affect stock.
                      </div>
                    )}
                  </div>
                )}

                {/* Variant Attributes */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-1 mb-4">
                  <div>
                    <label>
                      Variant Attribute
                    </label>

                    <Select
                      isMulti
                      options={variantAttributes.map((attr) => ({ value: attr.id, label: attr.name }))}
                      value={(watch("variantAttributeIds") || [])
                        .filter((id, index, arr) => arr.indexOf(id) === index)
                        .map((id) => {
                          const attr = variantAttributes.find((a) => a.id === id);
                          return attr ? { value: attr.id, label: attr.name } : null;
                        })
                        .filter(Boolean) as any}
                      onChange={(selectedOptions: any) => {
                        const ids = (selectedOptions || [])
                          .map((opt: any) => opt.value)
                          .filter((v: any): v is number => typeof v === "number");
                        setValue("variantAttributeIds", Array.from(new Set(ids)));
                      }}
                      placeholder="Select Variant Attributes..."
                      className="basic-multi-select"
                      classNamePrefix="select"
                    />

                    {errors.variantAttributeIds && (
                      <span className="error_validate">{errors.variantAttributeIds.message as any}</span>
                    )}
                  </div>
                </div>

                {variantValues.length > 0 && <MultiSelectVariant variantValues={variantValues} />}

                {/* Prices */}
                <div className="rounded-lg border border-gray-200 p-4 mb-5">
                  <h6 className="font-bold text-base mb-4">Cost & Selling Price</h6>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-5">
                    <div>
                      <label>
                        Opening Cost <span className="text-danger text-md">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Enter Opening Cost"
                        className="form-input w-full"
                        {...register("purchasePrice", { required: "This field is required" })}
                        onInput={(e: React.FormEvent<HTMLInputElement>) => {
                          const target = e.currentTarget;
                          target.value = target.value.replace(/[^0-9.]/g, "");
                          const parts = target.value.split(".");
                          if (parts.length > 2) target.value = parts[0] + "." + parts.slice(1).join("");
                        }}
                      />
                      {errors.purchasePrice && (
                        <p className="error_validate">{errors.purchasePrice.message as any}</p>
                      )}
                    </div>

                    <div>
                      <label>
                        Cost Unit <span className="text-danger text-md">*</span>
                      </label>
                      <select
                        className="form-input"
                        {...register("purchasePriceUnitId", {
                          required: "Cost Unit is required",
                          valueAsNumber: true,
                        })}
                      >
                        <option value="">Select Cost Unit...</option>
                        {units.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </select>
                      {errors.purchasePriceUnitId && (
                        <span className="error_validate">
                          {errors.purchasePriceUnitId.message as any}
                        </span>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Example: 10 per roll
                      </p>
                    </div>
                  </div>

                  {costPreviewText && (
                    <div className="mb-5 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                      Cost Preview: <strong>{truncateNumber(parseFloat(costPreviewText), 4).toFixed(4)}</strong>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-2">
                    <div>
                      <label>
                        Wholesale Price <span className="text-danger text-md">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Enter Wholesale Price"
                        className="form-input"
                        {...register("wholeSalePrice", { required: "This field is required" })}
                        onInput={(e: React.FormEvent<HTMLInputElement>) => {
                          const target = e.currentTarget;
                          target.value = target.value.replace(/[^0-9.]/g, "");
                          const parts = target.value.split(".");
                          if (parts.length > 2) target.value = parts[0] + "." + parts.slice(1).join("");
                        }}
                      />
                      {errors.wholeSalePrice && (
                        <p className="error_validate">{errors.wholeSalePrice.message as any}</p>
                      )}
                    </div>

                    <div>
                      <label>
                        Wholesale Unit <span className="text-danger text-md">*</span>
                      </label>
                      <select
                        className="form-input"
                        {...register("wholeSalePriceUnitId", {
                          required: "Wholesale Unit is required",
                          valueAsNumber: true,
                        })}
                      >
                        <option value="">Select Wholesale Unit...</option>
                        {units.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </select>
                      {errors.wholeSalePriceUnitId && (
                        <span className="error_validate">
                          {errors.wholeSalePriceUnitId.message as any}
                        </span>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Example: 0.06 per meter
                      </p>
                    </div>
                  </div>

                  {(wholesaleBasePreviewText || wholesaleHigherPreviewText) && (
                    <div className="mb-5 rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-800">
                      <div>
                        Wholesale Base Preview: <strong>{truncateNumber(parseFloat(wholesaleBasePreviewText), 4).toFixed(4) || "-"}</strong>
                      </div>
                      {wholesaleHigherPreviewText && firstHigherConversion && (
                        <div className="mt-1">
                          Approx in {getUnitName(firstHigherConversion.fromUnitId)}:{" "}
                          <strong>{truncateNumber(parseFloat(wholesaleHigherPreviewText), 4).toFixed(4) || "-"}</strong>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-2">
                    <div>
                      <label>
                        Retail Price <span className="text-danger text-md">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Enter Retail Price"
                        className="form-input"
                        {...register("retailPrice", { required: "This field is required" })}
                        onInput={(e: React.FormEvent<HTMLInputElement>) => {
                          const target = e.currentTarget;
                          target.value = target.value.replace(/[^0-9.]/g, "");
                          const parts = target.value.split(".");
                          if (parts.length > 2) target.value = parts[0] + "." + parts.slice(1).join("");
                        }}
                      />
                      {errors.retailPrice && (
                        <p className="error_validate">{errors.retailPrice.message as any}</p>
                      )}
                    </div>

                    <div>
                      <label>
                        Retail Unit <span className="text-danger text-md">*</span>
                      </label>
                      <select
                        className="form-input"
                        {...register("retailPriceUnitId", {
                          required: "Retail Unit is required",
                          valueAsNumber: true,
                        })}
                      >
                        <option value="">Select Retail Unit...</option>
                        {units.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </select>
                      {errors.retailPriceUnitId && (
                        <span className="error_validate">
                          {errors.retailPriceUnitId.message as any}
                        </span>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Example: 0.08 per meter
                      </p>
                    </div>
                  </div>

                  {(retailBasePreviewText || retailHigherPreviewText) && (
                    <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                      <div>
                        Retail Base Preview: <strong>{truncateNumber(parseFloat(retailBasePreviewText), 4).toFixed(4)|| "-"}</strong>
                      </div>
                      {retailHigherPreviewText && firstHigherConversion && (
                        <div className="mt-1">
                          Approx in {getUnitName(firstHigherConversion.fromUnitId)}:{" "}
                          <strong>{truncateNumber(parseFloat(retailHigherPreviewText), 4).toFixed(4) || "-"}</strong>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="dark:text-white-dark/70 text-base font-medium text-[#1f2937] mt-5">
                  <label htmlFor="module">Note</label>
                  <input type="text" placeholder="Enter Description" className="form-input" {...register("note")} />
                </div>

                {/* Images */}
                <div className="dark:text-white-dark/70 text-base font-medium text-[#1f2937] mt-5">
                  <label htmlFor="module">Product's Image</label>

                  <div
                    key={resetKey}
                    {...getRootProps()}
                    style={{
                      border: "2px dashed #ccc",
                      padding: "20px",
                      textAlign: "center",
                      margin: "20px 0",
                    }}
                  >
                    <input {...getInputProps()} />
                    <p>Drag & drop some files here, or click to select files</p>
                  </div>

                  <div className="flex gap-2 mt-3 flex-wrap">
                    {imagePreview?.map((img, index) => (
                      <div key={index} className="relative group">
                        <img src={img} alt={`preview-${index}`} className="h-16 w-16 rounded-md" />
                        <button
                          type="button"
                          className="absolute top-0 right-0 text-white py-0.5 px-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ background: "red", borderRadius: "15px" }}
                          onClick={() => removeImage(index, index < existingImages.length ? "existing" : "new")}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {hasTrackedValidationError && (
                  <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    Cannot save yet. Please fill Serial Number for all tracked rows.
                  </div>
                )}

                {/* Buttons */}
                <div className="flex justify-end items-center mt-8">
                  <button type="button" className="btn btn-outline-danger" onClick={onClose}>
                    <FontAwesomeIcon icon={faClose} className="mr-1" />
                    Discard
                  </button>

                  {hasPermission(product?.id ? "Product-Edit" : "Product-Create") && (
                    <button
                      type="submit"
                      disabled={hasTrackedValidationError || isLoading}
                      className={`btn btn-primary ltr:ml-4 rtl:mr-4 ${
                        hasTrackedValidationError || isLoading
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      }`}
                    >
                      <FontAwesomeIcon icon={faSave} className="mr-2" />
                      {isLoading ? "Saving..." : "Save"}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </FormProvider>
        </div>
      </div>
    </div>
  );
};

export default Modal;