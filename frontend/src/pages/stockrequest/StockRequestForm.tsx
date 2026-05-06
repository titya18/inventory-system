import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faSave } from "@fortawesome/free-solid-svg-icons";
import { NavLink, useNavigate, useParams } from "react-router-dom";
import {
    BranchType,
    ProductVariantType,
    StockRequestType,
    StockRequestDetailType,
} from "@/data_types/types";
import { getAllBranches } from "@/api/branch";
import { searchProduct } from "@/api/searchProduct";
import { upsertRequest, getStockRequestById } from "@/api/stockRequest";
import { searchOrders, getAvailableAssetItems } from "@/api/customerEquipment";
import { getInvoiceByid, getAvailableTrackedItems } from "@/api/invoice";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { useAppContext } from "@/hooks/useAppContext";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, FilePenLine, Plus, Trash2 } from "lucide-react";
import ShowWarningMessage from "../components/ShowWarningMessage";
import TrackedItemsPickerModal from "@/components/TrackedItemsPickerModal";

type RawUnitRow = {
    unitId?: number;
    id?: number;
    unitName?: string;
    name?: string;
    operationValue?: number | string;
    operator?: string;
    isBaseUnit?: boolean;
    isBase?: boolean;
    Units?: { id?: number; name?: string };
    unit?: { id?: number; name?: string };
};

type VariantUnitType = {
    unitId: number;
    unitName: string;
    operationValue: number;
    operator?: string;
    isBaseUnit?: boolean;
};

type ProductVariantWithUnits = ProductVariantType & {
    unitOptions?: {
        unitId: number;
        unitName: string;
        operationValue: number;
        isBaseUnit?: boolean;
        operator?: string;
    }[];
    units?: RawUnitRow[];
    productUnitRelations?: RawUnitRow[];
    products?: any;
};

const StockRequestForm: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user, hasPermission } = useAppContext();
    const { settings } = useCompanySettings();

    const [isLoading, setIsLoading] = useState(false);
    const [printData, setPrintData] = useState<StockRequestType | null>(null);
    const [branches, setBranches] = useState<BranchType[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [productResults, setProductResults] = useState<ProductVariantWithUnits[]>([]);
    const [requestDetails, setRequestDetails] = useState<StockRequestDetailType[]>([]);
    const [trackedModalIndex, setTrackedModalIndex] = useState<number | null>(null);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [branchInitialized, setBranchInitialized] = useState(false);
    const [initialDbStatus, setInitialDbStatus] = useState<string>("PENDING");

    // Inline serial panels — keyed by row index
    const [serialPanels, setSerialPanels] = useState<Record<number, { open: boolean; items: any[]; loading: boolean }>>({});

    const openSerialPanel = async (index: number, variantId: number, branchIdVal: number) => {
        setSerialPanels(prev => ({ ...prev, [index]: { open: true, items: prev[index]?.items ?? [], loading: true } }));
        try {
            const items = await getAvailableAssetItems(variantId, branchIdVal, undefined, undefined);
            // When invoice linked: show SOLD (invoice) + IN_STOCK; else only IN_STOCK
            const filtered = linkedOrderId
                ? items.filter((r: any) => {
                    if (r.status === "SOLD") {
                        const soldOrderId = r.orderItemLinks?.[0]?.orderItem?.order?.id;
                        return soldOrderId === Number(linkedOrderId);
                    }
                    return false;
                })
                : items.filter((r: any) => r.status === "IN_STOCK");
            setSerialPanels(prev => ({ ...prev, [index]: { open: true, items: filtered, loading: false } }));
            // Auto-select invoice serials if nothing selected yet
            if (linkedOrderId) {
                const invoiceIds = filtered.filter((r: any) => r.status === "SOLD").map((r: any) => Number(r.id));
                if (invoiceIds.length > 0 && !(requestDetails[index]?.selectedTrackedItemIds?.length)) {
                    setRequestDetails(prev => prev.map((d, i) =>
                        i === index ? { ...d, serialSelectionMode: "MANUAL", selectedTrackedItemIds: invoiceIds } : d
                    ));
                }
            }
        } catch {
            setSerialPanels(prev => ({ ...prev, [index]: { open: true, items: [], loading: false } }));
        }
    };

    const toggleSerialPanel = async (index: number, variantId: number, branchIdVal: number) => {
        const current = serialPanels[index];
        if (current?.open) {
            setSerialPanels(prev => ({ ...prev, [index]: { ...prev[index], open: false } }));
        } else {
            await openSerialPanel(index, variantId, branchIdVal);
        }
    };

    const toggleSerial = (index: number, itemId: number) => {
        setRequestDetails(prev => prev.map((d, i) => {
            if (i !== index) return d;
            const ids = d.selectedTrackedItemIds ?? [];
            const newIds = ids.includes(itemId) ? ids.filter(x => x !== itemId) : [...ids, itemId];
            return { ...d, serialSelectionMode: "MANUAL", selectedTrackedItemIds: newIds };
        }));
    };

    const {
        control,
        register,
        handleSubmit,
        setValue,
        watch,
        reset,
        formState: { errors },
    } = useForm<StockRequestType>({
        defaultValues: { StatusType: "PENDING" },
    });

    const wrapperStyle = useMemo(() => ({ width: "100%" }), []);
    const branchId = watch("branchId");
    const watchedStatus = watch("StatusType") || "PENDING";

    // Invoice / Order link (optional — when linked, approval skips stock cut)
    const [linkedOrderId, setLinkedOrderId]     = useState<number | "">("");
    const [linkedOrderRef, setLinkedOrderRef]   = useState("");
    const [orderSearch, setOrderSearch]         = useState("");
    const [orderResults, setOrderResults]       = useState<{ id: number; ref: string; customer?: { name: string } | null; linkedStockRequest?: { id: number; ref: string } | null }[]>([]);
    const [showOrderSugg, setShowOrderSugg]     = useState(false);

    const handleOrderSearch = async (term: string) => {
        setOrderSearch(term); setLinkedOrderRef(""); setLinkedOrderId("");
        if (!term.trim() || !branchId) { setOrderResults([]); setShowOrderSugg(false); return; }
        try {
            const res = await searchOrders(Number(branchId), term);
            setOrderResults(res); setShowOrderSugg(true);
        } catch { setOrderResults([]); }
    };

    const selectOrder = async (o: { id: number; ref: string; customer?: { name: string } | null }) => {
        setLinkedOrderId(o.id); setLinkedOrderRef(o.ref); setOrderSearch(o.ref); setShowOrderSugg(false);
        try {
            const invoice = await getInvoiceByid(o.id);
            const productItems = (invoice.items ?? []).filter(
                (item) => item.ItemType === "PRODUCT" && item.productVariantId
            );
            const newDetails: StockRequestDetailType[] = productItems.map((item) => ({
                id: 0,
                productId: item.products?.id || 0,
                productVariantId: item.productVariantId!,
                products: item.products || null,
                productvariants: item.productvariants || null,
                quantity: Number(item.baseQty) || 0,
                stocks: 0,
                unitId: item.unitId || null,
                unitQty: item.unitQty || 1,
                baseQty: item.baseQty || 0,
                branchId: Number(branchId) || 0,
                trackingType: (item.productvariants?.trackingType as any) ?? undefined,
                serialSelectionMode: "MANUAL",
                selectedTrackedItemIds: [],
                selectedTrackedItems: [],
            }));
            setRequestDetails(newDetails);
        } catch {
            toast.error("Failed to load invoice items");
        }
    };

    const clearOrder = () => {
        setLinkedOrderId(""); setLinkedOrderRef(""); setOrderSearch(""); setOrderResults([]);
        setRequestDetails([]);
    };

    const handlePrint = () => {
        const statusColors: Record<string, string> = { PENDING: "#f59e0b", APPROVED: "#10b981", CANCELLED: "#ef4444" };
        const statusColor = statusColors[watch("StatusType")] ?? "#6366f1";
        const rawDate = watch("requestDate");
        const formattedDate = rawDate
            ? new Date(rawDate as string).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })
            : "—";
        const branchName = printData?.branch?.name
            ?? branches.find((b) => b.id === Number(watch("branchId")))?.name
            ?? "—";
        const req = (printData as any)?.requester;
        const requesterName = req ? `${req.firstName ?? ""} ${req.lastName ?? ""}`.trim() : "—";

        const itemRows = requestDetails.map((detail, i) => {
            const units = getVariantUnits(detail.productvariants);
            const selUnit = units.find((u) => Number(u.unitId) === Number(detail.unitId ?? 0)) || null;
            const unitName = selUnit?.unitName ?? (detail.productvariants as any)?.baseUnit?.name ?? "pcs";
            const serials = (detail.selectedTrackedItems ?? []).map((s: any) => s.serialNumber).filter(Boolean);
            const serialHtml = serials.length > 0
                ? serials.map((sn: string) => `<span style="background:#ede9fe;color:#5b21b6;border-radius:4px;padding:1px 6px;font-family:monospace;font-size:11px;margin:2px;display:inline-block">${sn}</span>`).join("")
                : `<span style="color:#bbb;font-size:11px">—</span>`;
            return `<tr style="background:${i % 2 === 0 ? "#fff" : "#f9f9ff"};border-bottom:1px solid #e8e8f0">
                <td style="padding:7px 10px;color:#888">${i + 1}</td>
                <td style="padding:7px 10px"><div style="font-weight:600">${detail.products?.name ?? "—"}</div><div style="font-size:11px;color:#888">${detail.productvariants?.productType ?? ""}</div></td>
                <td style="padding:7px 10px;font-family:monospace;font-size:11px;color:#555">${detail.productvariants?.barcode ?? "—"}</td>
                <td style="padding:7px 10px;text-align:center">${unitName}</td>
                <td style="padding:7px 10px;text-align:right;font-weight:600">${Number(detail.unitQty ?? 0)}</td>
                <td style="padding:7px 10px;text-align:right">${Number(detail.baseQty ?? 0)}</td>
                <td style="padding:7px 10px">${serialHtml}</td>
            </tr>`;
        }).join("");

        const invoiceCard = linkedOrderRef
            ? `<div style="flex:1;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:10px 14px">
                <div style="font-weight:700;margin-bottom:4px;color:#10b981">Linked Invoice</div>
                <div style="font-family:monospace;font-weight:700">${linkedOrderRef}</div>
               </div>` : "";

        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Stock Request ${printData?.ref ?? id}</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;padding:20px 30px;background:#fff}@media print{@page{size:A4;margin:10mm}body{padding:0}.no-print{display:none!important}}</style>
</head><body>
<div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #6366f1;padding-bottom:12px;margin-bottom:16px">
  <div>
    ${settings.companyNameEn ? `<div style="font-weight:700;font-size:14px">${settings.companyNameEn}</div>` : ""}
    ${settings.addressEn ? `<div style="font-size:12px;color:#555">${settings.addressEn}</div>` : ""}
    ${settings.phone ? `<div style="font-size:12px;color:#555">Tel: ${settings.phone}</div>` : ""}
  </div>
  <div style="text-align:right">
    <div style="font-size:20px;font-weight:800;color:#6366f1;letter-spacing:1px;margin-bottom:6px">STOCK REQUEST</div>
    <table style="font-size:12px;margin-left:auto;border-collapse:collapse">
      <tr><td style="padding-right:8px;color:#888">Ref No.</td><td><strong>${printData?.ref ?? "—"}</strong></td></tr>
      <tr><td style="padding-right:8px;color:#888">Date</td><td>${formattedDate}</td></tr>
      <tr><td style="padding-right:8px;color:#888">Status</td><td><span style="background:${statusColor};color:#fff;border-radius:4px;padding:1px 8px;font-size:11px;font-weight:700">${watch("StatusType")}</span></td></tr>
    </table>
  </div>
</div>
<div style="display:flex;gap:16px;margin-bottom:16px;font-size:13px">
  <div style="flex:1;background:#f8f8ff;border:1px solid #e0e0ff;border-radius:6px;padding:10px 14px"><div style="font-weight:700;margin-bottom:4px;color:#6366f1">Request Branch</div><div>${branchName}</div></div>
  <div style="flex:1;background:#f8f8ff;border:1px solid #e0e0ff;border-radius:6px;padding:10px 14px"><div style="font-weight:700;margin-bottom:4px;color:#6366f1">Requested By</div><div>${requesterName}</div></div>
  ${invoiceCard}
</div>
<table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px">
  <thead><tr style="background:#6366f1;color:#fff">
    <th style="padding:7px 10px;text-align:left;width:36px">#</th>
    <th style="padding:7px 10px;text-align:left">Product</th>
    <th style="padding:7px 10px;text-align:left">Barcode</th>
    <th style="padding:7px 10px;text-align:center">Unit</th>
    <th style="padding:7px 10px;text-align:right">Qty</th>
    <th style="padding:7px 10px;text-align:right">Base Qty</th>
    <th style="padding:7px 10px;text-align:left">Serials</th>
  </tr></thead>
  <tbody>${itemRows || `<tr><td colspan="7" style="padding:16px;text-align:center;color:#aaa">No items</td></tr>`}</tbody>
</table>
${watch("note") ? `<div style="margin-bottom:20px;font-size:13px"><span style="font-weight:700;color:#555">Note: </span>${watch("note")}</div>` : ""}
<div style="display:flex;justify-content:space-between;margin-top:40px;font-size:13px">
  ${["Requested By", "Approved By", "Received By"].map((l) => `<div style="text-align:center;width:28%"><div style="border-top:1px solid #999;padding-top:6px;margin-top:36px;color:#555">${l}</div></div>`).join("")}
</div>
<div style="margin-top:24px;border-top:1px solid #e0e0e0;padding-top:8px;font-size:11px;color:#aaa;text-align:center">
  Printed on ${new Date().toLocaleString("en-US", { timeZone: "Asia/Phnom_Penh", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}${settings.companyNameEn ? ` · ${settings.companyNameEn}` : ""}
</div>
<script>window.onload=function(){window.print();window.close();}</script>
</body></html>`;

        const blob = new Blob([html], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const win = window.open(url, "_blank", "width=960,height=760");
        if (!win) { alert("Please allow popups to print."); return; }
        setTimeout(() => URL.revokeObjectURL(url), 60000);
    };

    const normalizeUnit = (raw: RawUnitRow): VariantUnitType | null => {
        const unitId = Number(raw.unitId ?? raw.id ?? raw.unit?.id ?? raw.Units?.id ?? 0);
        const unitName = raw.unitName ?? raw.name ?? raw.unit?.name ?? raw.Units?.name ?? "";
        const operationValue = Number(raw.operationValue ?? 1) || 1;
        const isBaseUnit = Boolean(raw.isBaseUnit ?? raw.isBase ?? false);
        if (!unitId || !unitName) return null;
        return { unitId, unitName, operationValue, operator: raw.operator ?? "*", isBaseUnit };
    };

    const getVariantUnits = (variant: ProductVariantType | null | undefined): VariantUnitType[] => {
        const v = variant as ProductVariantWithUnits | null | undefined;
        if (!v) return [];

        if (Array.isArray(v.unitOptions) && v.unitOptions.length > 0) {
            return v.unitOptions.map((u) => ({
                unitId: Number(u.unitId),
                unitName: String(u.unitName),
                operationValue: Number(u.operationValue ?? 1),
                isBaseUnit: Boolean(u.isBaseUnit),
                operator: u.operator ?? "*",
            }));
        }

        const rawUnits: RawUnitRow[] = [
            ...(Array.isArray(v.units) ? v.units : []),
            ...(Array.isArray(v.productUnitRelations) ? v.productUnitRelations : []),
            ...(Array.isArray(v.products?.productUnitRelations) ? v.products.productUnitRelations : []),
            ...(Array.isArray(v.products?.units) ? v.products.units : []),
        ];

        const normalized = rawUnits.map(normalizeUnit).filter((u): u is VariantUnitType => u !== null);
        return normalized.filter((item, index, arr) => arr.findIndex((x) => x.unitId === item.unitId) === index);
    };

    const getDefaultUnitData = (variant: ProductVariantType | null | undefined) => {
        const units = getVariantUnits(variant);
        const defaultUnit = units.find((u) => u.isBaseUnit) || units[0] || null;
        return {
            unitId: defaultUnit?.unitId ?? null,
            unitName: defaultUnit?.unitName ?? "",
            operationValue: Number(defaultUnit?.operationValue ?? 1) || 1,
            operator: defaultUnit?.operator ?? "*",
        };
    };

    const calculateBaseQty = (
        unitQty: number | string | null | undefined,
        operationValue: number,
        operator: string = "*"
    ) => {
        const qty = Number(unitQty ?? 0);
        const opValue = Number(operationValue || 1);
        return operator === "/" ? (opValue === 0 ? 0 : qty / opValue) : qty * opValue;
    };

    const getSelectedUnit = (detail: StockRequestDetailType): VariantUnitType | null => {
        const units = getVariantUnits(detail.productvariants);
        return units.find((u) => Number(u.unitId) === Number(detail.unitId ?? 0)) || null;
    };

    const recalcDetail = (detail: StockRequestDetailType): StockRequestDetailType => {
        const selectedUnit = getSelectedUnit(detail);
        const operationValue = Number(selectedUnit?.operationValue ?? 1) || 1;
        const operator = selectedUnit?.operator ?? "*";
        const baseQty = calculateBaseQty(detail.unitQty, operationValue, operator);
        return { ...detail, baseQty, quantity: baseQty };
    };

    const getDisplayStockInSelectedUnit = (detail: StockRequestDetailType) => {
        const selectedUnit = getSelectedUnit(detail);
        const operationValue = Number(selectedUnit?.operationValue ?? 1) || 1;
        const operator = selectedUnit?.operator ?? "*";
        const stockBaseQty = Number(detail.stocks ?? 0);
        if (!operationValue) return 0;
        const result = operator === "/" ? stockBaseQty * operationValue : stockBaseQty / operationValue;
        return Number(result.toFixed(4));
    };

    const fetchBranches = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getAllBranches();
            setBranches(data as BranchType[]);
        } catch (error) {
            console.error("Error fetching branch:", error);
            toast.error("Failed to fetch branches");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchStockRequest = useCallback(async () => {
        if (!id) return;
        setIsLoading(true);
        try {
            const requestData: StockRequestType = await getStockRequestById(parseInt(id, 10));

            setPrintData(requestData);
            setValue("branchId", requestData.branchId);
            setValue("requestDate", requestData.requestDate ?? null);
            setValue("StatusType", requestData.StatusType || "PENDING");
            setValue("note", requestData.note || "");
            setInitialDbStatus(requestData.StatusType || "PENDING");
            if (requestData.order) {
                setLinkedOrderId(requestData.order.id);
                setLinkedOrderRef(requestData.order.ref);
                setOrderSearch(requestData.order.ref);
            }

            setRequestDetails(
                (requestData.requestDetails || []).map((detail) => {
                    let serialSelectionMode: "AUTO" | "MANUAL" = "AUTO";
                    let selectedTrackedItemIds: number[] = [];
                    if ((detail as any).trackedPayload) {
                        try {
                            const payload = JSON.parse((detail as any).trackedPayload);
                            serialSelectionMode = payload.mode ?? "AUTO";
                            selectedTrackedItemIds = payload.selectedIds ?? [];
                        } catch (_e) {}
                    }
                    return {
                        ...detail,
                        unitId: detail.unitId ?? null,
                        unitQty: detail.unitQty ?? 1,
                        baseQty: detail.baseQty ?? detail.quantity ?? 1,
                        quantity: detail.quantity ?? Number(detail.baseQty ?? 1),
                        trackingType: (detail.productvariants as any)?.trackingType ?? "NONE",
                        serialSelectionMode,
                        selectedTrackedItemIds,
                        selectedTrackedItems: [],
                        branchId: requestData.branchId,
                    };
                })
            );
        } catch (error) {
            console.error("Error fetching stock request:", error);
            toast.error("Failed to fetch stock request");
        } finally {
            setIsLoading(false);
        }
    }, [id, setValue]);

    useEffect(() => {
        fetchBranches();
    }, [fetchBranches]);

    useEffect(() => {
        fetchStockRequest();
    }, [fetchStockRequest]);

    useEffect(() => {
        if (!id && user?.branchId && branches.length > 0) {
            setValue("branchId", user.branchId, { shouldValidate: false });
        }
    }, [branches, id, user?.branchId, setValue]);

    useEffect(() => {
        if (!branchInitialized) {
            setBranchInitialized(true);
            return;
        }
        if (!id) {
            setRequestDetails([]);
            setSearchTerm("");
        }
    }, [branchId, id, branchInitialized]);

    const handleSearch = async (term: string) => {
        if (term.trim() === "") {
            setProductResults([]);
            setShowSuggestions(false);
            return;
        }

        const selectedBranchId = watch("branchId");
        if (!selectedBranchId) {
            toast.error("No branch selected", { position: "top-right", autoClose: 4000 });
            return;
        }

        try {
            const response = (await searchProduct(term, selectedBranchId)) as ProductVariantWithUnits[];
            const matches = response.filter((p) => p.barcode === term || p.sku === term);
            if (matches.length === 0) {
                setProductResults(response);
                setShowSuggestions(true);
            } else if (matches.length === 1) {
                addToCartDirectly(matches[0]);
                setSearchTerm("");
                setShowSuggestions(false);
            } else {
                setProductResults(matches);
                setShowSuggestions(true);
            }
        } catch (error) {
            console.error("Error fetching products:", error);
            toast.error("Failed to search product");
        }
    };

    const handleFocus = () => setShowSuggestions(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const term = e.target.value;
        setSearchTerm(term);
        handleSearch(term);
    };

    const addToCartDirectly = (variant: ProductVariantWithUnits) => {
        const stockQty = Number(
            Array.isArray(variant.stocks)
                ? (variant.stocks[0] as any)?.quantity ?? 0
                : (variant.stocks as any)?.quantity ?? 0
        ) || 0;

        if (requestDetails.findIndex((item) => item.productVariantId === variant.id) !== -1) {
            toast.warning("Product already added");
            return;
        }

        const defaultUnit = getDefaultUnitData(variant);
        const baseQty = calculateBaseQty(1, defaultUnit.operationValue, defaultUnit.operator);

        setRequestDetails((prev) => [
            ...prev,
            {
                id: 0,
                productId: variant.products?.id || 0,
                productVariantId: variant.id,
                products: variant.products || null,
                productvariants: variant,
                stocks: stockQty,
                unitId: defaultUnit.unitId,
                unitQty: 1,
                baseQty,
                quantity: baseQty,
                trackingType: (variant as any).trackingType ?? "NONE",
                serialSelectionMode: "AUTO",
                selectedTrackedItemIds: [],
                selectedTrackedItems: [],
                branchId: Number(watch("branchId") || 0),
            },
        ]);
    };

    const addOrUpdateRequestDetail = async (detail: StockRequestDetailType) => {
        if (requestDetails.find((item) => item.productVariantId === detail.productVariantId)) {
            await ShowWarningMessage("Product already in cart");
            return;
        }

        const defaultUnit = getDefaultUnitData(detail.productvariants);
        const baseQty = calculateBaseQty(1, defaultUnit.operationValue, defaultUnit.operator);

        setRequestDetails((prev) => [
            ...prev,
            {
                id: detail.id ?? 0,
                productId: detail.productId ?? 0,
                productVariantId: detail.productVariantId ?? 0,
                products: detail.products ?? null,
                productvariants: detail.productvariants ?? null,
                stocks: detail.stocks ?? 0,
                unitId: defaultUnit.unitId,
                unitQty: 1,
                baseQty,
                quantity: baseQty,
                trackingType: (detail.productvariants as any)?.trackingType ?? "NONE",
                serialSelectionMode: "AUTO",
                selectedTrackedItemIds: [],
                selectedTrackedItems: [],
                branchId: Number(watch("branchId") || 0),
            },
        ]);
        setSearchTerm("");
        setShowSuggestions(false);
    };

    const handleUnitChange = (index: number, unitId: number) => {
        setRequestDetails((prev) =>
            prev.map((detail, i) => (i !== index ? detail : recalcDetail({ ...detail, unitId })))
        );
    };

    const handleUnitQtyChange = (index: number, value: string) => {
        let cleaned = value.replace(/[^0-9.]/g, "");
        const parts = cleaned.split(".");
        if (parts.length > 2) cleaned = `${parts[0]}.${parts.slice(1).join("")}`;

        setRequestDetails((prev) =>
            prev.map((detail, i) => (i !== index ? detail : recalcDetail({ ...detail, unitQty: cleaned })))
        );
    };

    const increaseUnitQty = (index: number) => {
        setRequestDetails((prev) =>
            prev.map((detail, i) => {
                if (i !== index) return detail;
                return recalcDetail({ ...detail, unitQty: Number(detail.unitQty ?? 0) + 1 });
            })
        );
    };

    const decreaseUnitQty = (index: number) => {
        setRequestDetails((prev) =>
            prev.map((detail, i) => {
                if (i !== index) return detail;
                const nextQty = Number(detail.unitQty ?? 0) > 1 ? Number(detail.unitQty ?? 0) - 1 : 1;
                return recalcDetail({ ...detail, unitQty: nextQty });
            })
        );
    };

    const removeProductFromCart = (index: number) => {
        setRequestDetails((prev) => prev.filter((_, i) => i !== index));
    };

    const onSubmit: SubmitHandler<StockRequestType> = async (formData) => {
        setIsLoading(true);

        try {
            // Guard: user typed in the invoice field but never selected from dropdown
            if (orderSearch.trim() && !linkedOrderId) {
                toast.error("Invoice not linked — please select an invoice from the dropdown suggestions, or clear the Invoice / Order field.");
                setIsLoading(false);
                return;
            }

            if (requestDetails.length === 0) {
                toast.error("Please add at least one product");
                setIsLoading(false);
                return;
            }

            for (const row of requestDetails) {
                if (!row.unitId) {
                    toast.error(`Please select unit for product ${row.products?.name || ""}`);
                    setIsLoading(false);
                    return;
                }
                if (!row.unitQty || Number(row.unitQty) <= 0) {
                    toast.error(`Please enter valid quantity for product ${row.products?.name || ""}`);
                    setIsLoading(false);
                    return;
                }
                if (!row.baseQty || Number(row.baseQty) <= 0) {
                    toast.error(`Invalid base quantity for product ${row.products?.name || ""}`);
                    setIsLoading(false);
                    return;
                }
                if (
                    formData.StatusType === "APPROVED" &&
                    Number(row.baseQty) > Number(row.stocks ?? 0)
                ) {
                    toast.error(`Insufficient stock for ${row.products?.name || ""}`);
                    setIsLoading(false);
                    return;
                }

                // Serial tracking validation — MANUAL mode only, enforced on APPROVED
                if (
                    formData.StatusType === "APPROVED" &&
                    row.trackingType &&
                    row.trackingType !== "NONE" &&
                    row.serialSelectionMode === "MANUAL"
                ) {
                    const productName = row.products?.name || "unknown product";
                    const requiredQty = Math.round(Number(row.baseQty ?? 0));
                    const selected = row.selectedTrackedItemIds?.length ?? 0;

                    if (selected === 0) {
                        toast.error(`"${productName}": Please select serials before approving (or switch to Auto mode).`);
                        setIsLoading(false);
                        return;
                    }
                    if (selected !== requiredQty) {
                        toast.error(`"${productName}": Selected ${selected} serial(s) but quantity is ${requiredQty}. They must match.`);
                        setIsLoading(false);
                        return;
                    }

                    // Check if selected serials are still IN_STOCK
                    if (!linkedOrderId && (row.selectedTrackedItemIds?.length ?? 0) > 0) {
                        const branchIdVal = Number(row.branchId ?? watch("branchId") ?? 0);
                        const currentItems = await getAvailableTrackedItems(
                            row.productVariantId, branchIdVal, null, row.selectedTrackedItemIds
                        );
                        const stale = currentItems.filter(
                            (i: any) => (row.selectedTrackedItemIds ?? []).includes(Number(i.id)) && i.status !== "IN_STOCK"
                        );
                        if (stale.length > 0) {
                            const names = stale.map((i: any) => `${i.serialNumber} (${i.status})`).join(", ");
                            toast.error(`"${productName}": Serial(s) no longer available — ${names}. Open the serial picker to update your selection.`);
                            setIsLoading(false);
                            return;
                        }
                    }
                }
            }

            await queryClient.invalidateQueries({ queryKey: ["validateToken"] });

            const cleanedDetails: StockRequestDetailType[] = requestDetails.map((detail) => {
                let trackedPayload: string | null = null;
                if (detail.trackingType && detail.trackingType !== "NONE") {
                    const mode = detail.serialSelectionMode ?? "AUTO";
                    const selectedIds = mode === "MANUAL" ? (detail.selectedTrackedItemIds ?? []) : [];
                    trackedPayload = JSON.stringify({ mode, selectedIds });
                }
                return {
                    id: detail.id ?? 0,
                    productId: Number(detail.productId),
                    productVariantId: Number(detail.productVariantId),
                    unitId: detail.unitId ? Number(detail.unitId) : null,
                    unitQty: detail.unitQty != null ? Number(detail.unitQty) : 0,
                    baseQty: detail.baseQty != null ? Number(detail.baseQty) : 0,
                    quantity: detail.baseQty != null ? Number(detail.baseQty) : 0,
                    products: detail.products ?? null,
                    productvariants: detail.productvariants ?? null,
                    stocks: detail.stocks ?? 0,
                    trackedPayload,
                };
            });

            const normalizedRequestDate = formData.requestDate
                ? new Date(formData.requestDate as any).toISOString()
                : null;

            const requestData: StockRequestType = {
                id: id ? Number(id) : undefined,
                ref: "",
                branchId:   Number(formData.branchId ?? 0),
                requestBy:  Number(user?.id),
                branch:     { id: Number(formData.branchId ?? 0), name: "", address: "" },
                requestDate: normalizedRequestDate,
                StatusType: formData.StatusType,
                note:       formData.note,
                delReason:  "",
                orderId:    linkedOrderId ? Number(linkedOrderId) : null,
                requestDetails: cleanedDetails,
            };

            await upsertRequest(requestData);

            const statusLabel = formData.StatusType === "APPROVED" ? "approved" : "saved as pending";
            toast.success(
                id ? `Stock Request updated and ${statusLabel} successfully` : `Stock Request created and ${statusLabel} successfully`,
                { position: "top-right", autoClose: 2000 }
            );

            reset({ id: undefined, branchId: undefined, requestDate: undefined, StatusType: "PENDING", note: undefined, requestDetails: [] });
            setRequestDetails([]);
            setSearchTerm("");
            setShowSuggestions(false);
            navigate("/stockrequest");
        } catch (err: any) {
            toast.error(err.message || "Error adding/editing stock request", {
                position: "top-right",
                autoClose: 3000,
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="panel">
            <div className="mb-5">
                <h5 className="flex items-center text-lg font-semibold dark:text-white-light gap-2">
                    {id ? <FilePenLine /> : <Plus />}
                    {id ? "Update Stock Request" : "Add Stock Request"}
                </h5>
            </div>

            <div className="mb-5">
                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="mb-5">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-5">
                            <div>
                                <label>
                                    Branch <span className="text-danger text-md">*</span>
                                </label>
                                <select
                                    id="branch"
                                    className="form-input"
                                    disabled={!!id}
                                    {...register("branchId", { required: "Branch is required" })}
                                >
                                    <option value="">Select a branch</option>
                                    {branches.map((option) => (
                                        <option key={option.id} value={option.id}>
                                            {option.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.branchId && (
                                    <span className="error_validate">{errors.branchId.message}</span>
                                )}
                            </div>

                            <div style={wrapperStyle}>
                                <label htmlFor="date-picker">
                                    Select a Date: <span className="text-danger text-md">*</span>
                                </label>
                                <LocalizationProvider dateAdapter={AdapterDateFns}>
                                    <Controller
                                        name="requestDate"
                                        control={control}
                                        rules={{ required: "Request date is required" }}
                                        render={({ field }) => (
                                            <DatePicker
                                                value={field.value ? new Date(field.value as any) : null}
                                                onChange={(date) => field.onChange(date)}
                                                disablePast
                                                slotProps={{
                                                    textField: {
                                                        fullWidth: true,
                                                        error: !!errors.requestDate,
                                                    },
                                                }}
                                            />
                                        )}
                                    />
                                </LocalizationProvider>
                                {errors.requestDate && (
                                    <span className="error_validate">{errors.requestDate.message}</span>
                                )}
                            </div>
                        </div>

                        {/* Invoice / Order link — auto-populates items and locks qty/unit */}
                        <div className="mb-5 relative" style={{ maxWidth: 500 }}>
                            <label className="font-medium">Invoice / Order <span className="text-xs text-gray-400 font-normal ml-2">(optional — link invoice to auto-fill items)</span></label>
                            <div className="relative mt-1">
                                <input type="text"
                                    className={`form-input w-full pr-8 ${orderSearch.trim() && !linkedOrderId ? "border-orange-400 ring-1 ring-orange-300" : ""}`}
                                    placeholder="Search by invoice ref (e.g. ZM2026-00001)..."
                                    value={orderSearch}
                                    onChange={(e) => handleOrderSearch(e.target.value)}
                                    onFocus={() => orderResults.length > 0 && !linkedOrderId && setShowOrderSugg(true)}
                                    onBlur={() => setTimeout(() => setShowOrderSugg(false), 150)}
                                />
                                {linkedOrderId && <button type="button" onClick={clearOrder} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 text-lg leading-none">×</button>}
                            </div>
                            {linkedOrderId && <p className="text-xs text-green-600 mt-1">✓ Linked to <span className="font-mono font-bold">{linkedOrderRef}</span> — items auto-filled, qty &amp; unit locked, only invoice serials selectable</p>}
                            {orderSearch.trim() && !linkedOrderId && <p className="text-xs text-orange-500 mt-1">⚠ Not linked — please select an invoice from the list below, or clear this field.</p>}
                            {showOrderSugg && orderResults.length > 0 && !linkedOrderId && (
                                <ul className="absolute mt-1 bg-white dark:bg-[#1b2e4b] border border-gray-200 dark:border-gray-600 w-full max-h-52 overflow-y-auto rounded-lg shadow-2xl" style={{ zIndex: 9999 }}>
                                    {orderResults.map((o) => {
                                        const alreadyLinked = !!o.linkedStockRequest;
                                        return (
                                            <li
                                                key={o.id}
                                                className={`px-4 py-2.5 border-b border-gray-100 dark:border-gray-700 last:border-0 flex items-center gap-3 ${alreadyLinked ? "opacity-60 cursor-not-allowed bg-red-50" : "hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer"}`}
                                                onClick={() => !alreadyLinked && selectOrder(o)}
                                            >
                                                <span className={`font-mono font-semibold text-sm ${alreadyLinked ? "text-gray-400" : "text-blue-600 dark:text-blue-400"}`}>{o.ref}</span>
                                                {o.customer?.name && <span className="text-gray-400 text-xs">{o.customer.name}</span>}
                                                {alreadyLinked && (
                                                    <span className="ml-auto text-xs text-red-500 font-medium">Already linked to {o.linkedStockRequest!.ref}</span>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                            {showOrderSugg && orderResults.length === 0 && orderSearch.trim() && !linkedOrderId && (
                                <p className="text-xs text-orange-500 mt-1">No invoices found for this branch matching "{orderSearch}"</p>
                            )}
                        </div>

                        {!linkedOrderId && (
                        <div className="mb-5 relative">
                            <label>
                                Product <span className="text-danger text-md">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Scan/Search Product by Code Or Name"
                                    className="peer form-input bg-gray-100 placeholder:tracking-widest ltr:pl-9 ltr:pr-9 rtl:pl-9 rtl:pr-9 sm:bg-transparent ltr:sm:pr-4 rtl:sm:pl-4"
                                    value={searchTerm}
                                    onChange={handleInputChange}
                                    onFocus={handleFocus}
                                />
                                <button
                                    type="button"
                                    className="absolute inset-0 h-9 w-9 appearance-none peer-focus:text-primary ltr:right-auto rtl:left-auto"
                                >
                                    <svg className="mx-auto" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <circle cx="11.5" cy="11.5" r="9.5" stroke="currentColor" strokeWidth="1.5" opacity="0.5"></circle>
                                        <path d="M18.5 18.5L22 22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"></path>
                                    </svg>
                                </button>
                            </div>

                            {showSuggestions && productResults.length > 0 && (
                                <ul
                                    style={{
                                        listStyle: "none",
                                        border: "1px solid #ccc",
                                        padding: 0,
                                        margin: 0,
                                        position: "absolute",
                                        backgroundColor: "white",
                                        zIndex: 10,
                                        maxHeight: "250px",
                                        overflowY: "auto",
                                        width: "100%",
                                    }}
                                >
                                    {productResults.map((variant) => (
                                        <li
                                            key={variant.id}
                                            style={{ padding: "8px", cursor: "pointer", borderBottom: "1px solid #eee" }}
                                            onClick={() =>
                                                addOrUpdateRequestDetail({
                                                    id: 0,
                                                    productId: variant.products?.id || 0,
                                                    productVariantId: variant.id,
                                                    products: variant.products || null,
                                                    productvariants: variant,
                                                    quantity: 1,
                                                    stocks: Number(
                                                        Array.isArray(variant.stocks)
                                                            ? (variant.stocks[0] as any)?.quantity ?? 0
                                                            : (variant.stocks as any)?.quantity ?? 0
                                                    ) || 0,
                                                    unitId: null,
                                                    unitQty: 1,
                                                    baseQty: 1,
                                                })
                                            }
                                        >
                                            {variant.products?.name} - {variant.barcode} ({variant.productType})
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        )}

                        <div className="dataTable-container">
                            <table id="myTable1" className="whitespace-nowrap dataTable-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Product</th>
                                        <th>Unit</th>
                                        <th>Qty</th>
                                        <th>Base Qty</th>
                                        {watchedStatus === "PENDING" && <th>Qty On Hand</th>}
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {requestDetails.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="text-center py-4">
                                                No products added
                                            </td>
                                        </tr>
                                    ) : (
                                        requestDetails.map((detail, index) => {
                                            const units = getVariantUnits(detail.productvariants);
                                            const selectedUnit = getSelectedUnit(detail);
                                            const stockInSelectedUnit = getDisplayStockInSelectedUnit(detail);

                                            return (
                                                <React.Fragment key={index}>
                                                <tr>
                                                    <td>{index + 1}</td>

                                                    <td>
                                                        <p>{detail.products?.name} ({detail.productvariants?.productType})</p>
                                                        <p className="text-center">
                                                            <span className="badge badge-outline-primary rounded-full">
                                                                {detail.productvariants?.barcode}
                                                            </span>
                                                        </p>
                                                    </td>

                                                    <td style={{ minWidth: "160px" }}>
                                                        <select
                                                            className={`form-input ${linkedOrderId ? "bg-gray-100 cursor-not-allowed" : ""}`}
                                                            value={detail.unitId ?? ""}
                                                            onChange={(e) => handleUnitChange(index, Number(e.target.value))}
                                                            disabled={!!linkedOrderId}
                                                        >
                                                            <option value="">Select unit</option>
                                                            {units.map((unit) => (
                                                                <option key={unit.unitId} value={unit.unitId}>
                                                                    {unit.unitName}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </td>

                                                    <td style={{ minWidth: "220px" }}>
                                                        <div className="inline-flex w-full">
                                                            {!linkedOrderId && (
                                                            <button
                                                                type="button"
                                                                onClick={() => decreaseUnitQty(index)}
                                                                className="flex items-center justify-center border border-r-0 border-danger bg-danger px-3 font-semibold text-white ltr:rounded-l-md rtl:rounded-r-md"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                                                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                                                </svg>
                                                            </button>
                                                            )}
                                                            <input
                                                                type="text"
                                                                className={`form-input text-center ${linkedOrderId ? "rounded-md bg-gray-100" : "rounded-none"}`}
                                                                value={detail.unitQty ?? ""}
                                                                onChange={(e) => handleUnitQtyChange(index, e.target.value)}
                                                                placeholder="Qty"
                                                                readOnly={!!linkedOrderId}
                                                            />
                                                            {!linkedOrderId && (
                                                            <button
                                                                type="button"
                                                                onClick={() => increaseUnitQty(index)}
                                                                className="flex items-center justify-center border border-l-0 border-warning bg-warning px-3 font-semibold text-white ltr:rounded-r-md rtl:rounded-l-md"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                                                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                                                </svg>
                                                            </button>
                                                            )}
                                                        </div>
                                                    </td>

                                                    <td style={{ minWidth: "140px" }}>
                                                        <input
                                                            type="text"
                                                            className="form-input text-right bg-gray-100"
                                                            value={detail.baseQty ?? ""}
                                                            readOnly
                                                        />
                                                    </td>

                                                    {watchedStatus === "PENDING" && (
                                                        <td>
                                                            <div>{Number(detail.stocks ?? 0)}</div>
                                                            {selectedUnit && (
                                                                <small className="text-gray-500">
                                                                    {stockInSelectedUnit} {selectedUnit.unitName}
                                                                </small>
                                                            )}
                                                        </td>
                                                    )}

                                                    <td>
                                                        {detail.trackingType && detail.trackingType !== "NONE" && !linkedOrderId && (() => {
                                                            const count = detail.selectedTrackedItemIds?.length ?? 0;
                                                            const requiredQty = Math.round(Number(detail.baseQty ?? 0));
                                                            const isMatch = count === requiredQty && count > 0;
                                                            const isMismatch = count > 0 && count !== requiredQty;
                                                            return (
                                                                <div className="mb-1">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setTrackedModalIndex(index)}
                                                                        className={`btn btn-xs ${isMatch ? "btn-success" : isMismatch ? "btn-warning" : "btn-outline-primary"}`}
                                                                    >
                                                                        {count > 0 ? `${count} / ${requiredQty} Serial(s)` : "+ Select Serial"}
                                                                    </button>
                                                                </div>
                                                            );
                                                        })()}
                                                        {!linkedOrderId && (
                                                            <button
                                                                type="button"
                                                                onClick={() => removeProductFromCart(index)}
                                                                className="hover:text-danger block"
                                                                title="Delete"
                                                            >
                                                                <Trash2 color="red" />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                                {/* Serial toggle sub-row — invoice-linked tracked products */}
                                                {detail.trackingType && detail.trackingType !== "NONE" && linkedOrderId && (() => {
                                                    const count = detail.selectedTrackedItemIds?.length ?? 0;
                                                    const requiredQty = Math.round(Number(detail.baseQty ?? 0));
                                                    const branchIdVal = Number(detail.branchId ?? branchId ?? 0);
                                                    const isOpen = serialPanels[index]?.open ?? false;
                                                    const isMatch = count === requiredQty && count > 0;
                                                    return (
                                                        <tr>
                                                            <td colSpan={7} className="px-4 py-1.5 bg-gray-50/50">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleSerialPanel(index, detail.productVariantId, branchIdVal)}
                                                                    className={`flex items-center gap-1.5 text-sm font-medium ${isMatch ? "text-green-600" : "text-blue-600"}`}
                                                                >
                                                                    {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                                    {count === 0 ? "Select serial numbers" : `${count} / ${requiredQty} serial(s) selected`}
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })()}
                                                {/* Inline serial panel */}
                                                {detail.trackingType && detail.trackingType !== "NONE" && linkedOrderId && serialPanels[index]?.open && (
                                                    <tr>
                                                        <td colSpan={7} className="px-4 pb-3 pt-0">
                                                            <div className="border rounded-lg overflow-hidden bg-white">
                                                                <div className="bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b flex items-center justify-between">
                                                                    <span>Serial Selection</span>
                                                                    {linkedOrderId && <span className="text-green-600 font-medium">✓ Invoice linked — select serials to pick up</span>}
                                                                </div>
                                                                {serialPanels[index].loading ? (
                                                                    <div className="px-4 py-3 text-sm text-gray-400">Loading serials...</div>
                                                                ) : serialPanels[index].items.length === 0 ? (
                                                                    <div className="px-4 py-3 text-sm text-orange-500">No serials found for this product in this branch.</div>
                                                                ) : (
                                                                    <div className="divide-y max-h-48 overflow-y-auto">
                                                                        {serialPanels[index].items.map((item: any) => {
                                                                            const checked = (detail.selectedTrackedItemIds ?? []).includes(Number(item.id));
                                                                            const isInvoice = item.status === "SOLD";
                                                                            return (
                                                                                <div key={item.id}
                                                                                    onClick={() => toggleSerial(index, Number(item.id))}
                                                                                    className={`flex items-center gap-3 px-4 py-2 cursor-pointer text-sm transition-colors ${checked ? (isInvoice ? "bg-green-50" : "bg-blue-50") : "hover:bg-gray-50"}`}>
                                                                                    <input type="checkbox" className="form-checkbox shrink-0" checked={checked} readOnly />
                                                                                    <span className="font-mono font-medium text-blue-700">{item.serialNumber}</span>
                                                                                    {item.assetCode && <span className="text-gray-400 text-xs">Asset: {item.assetCode}</span>}
                                                                                    <span className="ml-auto">
                                                                                        {isInvoice
                                                                                            ? <span className="text-xs font-semibold px-2 py-0.5 rounded bg-green-100 text-green-700">✓ From invoice</span>
                                                                                            : <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-500">IN_STOCK</span>}
                                                                                    </span>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                                </React.Fragment>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-5 mt-5">
                            <div>
                                <label>
                                    Status <span className="text-danger text-md">*</span>
                                </label>
                                <select
                                    id="status"
                                    className="form-input"
                                    {...register("StatusType", { required: "Status is required" })}
                                >
                                    <option value="">Select a status...</option>
                                    <option value="PENDING">Pending</option>
                                    {hasPermission("Stock-Request-Approve") && (
                                        <option value="APPROVED">Approved</option>
                                    )}
                                </select>
                                {errors.StatusType && (
                                    <span className="error_validate">{errors.StatusType.message}</span>
                                )}
                            </div>
                        </div>

                        <div className="mb-5">
                            <label>Note</label>
                            <textarea {...register("note")} className="form-input" rows={3}></textarea>
                        </div>
                    </div>

                    <div className="flex justify-between items-center mt-8">
                        <NavLink to="/stockrequest" type="button" className="btn btn-outline-warning">
                            <FontAwesomeIcon icon={faArrowLeft} className="mr-1" />
                            Go Back
                        </NavLink>

                        <div className="flex items-center gap-3">
                            {id && (
                                <button
                                    type="button"
                                    onClick={handlePrint}
                                    className="btn btn-outline-info flex items-center gap-1"
                                >
                                    <FilePenLine size={15} />
                                    Print
                                </button>
                            )}
                            {initialDbStatus !== "APPROVED" &&
                                (hasPermission("Stock-Request-Create") ||
                                    hasPermission("Stock-Request-Edit") ||
                                    hasPermission("Stock-Request-Approve")) && (
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={isLoading}
                                >
                                    <FontAwesomeIcon icon={faSave} className="mr-1" />
                                    {isLoading ? "Saving..." : "Save"}
                                </button>
                            )}
                        </div>
                    </div>
                </form>
            </div>

            {trackedModalIndex !== null && (() => {
                const detail = requestDetails[trackedModalIndex];
                return detail ? (
                    <TrackedItemsPickerModal
                        isOpen={true}
                        onClose={() => setTrackedModalIndex(null)}
                        variantId={detail.productVariantId}
                        branchId={Number(detail.branchId ?? watch("branchId") ?? 0)}
                        existingItemId={detail.id || null}
                        mode={detail.serialSelectionMode ?? "AUTO"}
                        selectedIds={detail.selectedTrackedItemIds ?? []}
                        orderId={linkedOrderId ? Number(linkedOrderId) : null}
                        onSave={(mode, ids, items) => {
                            setRequestDetails((prev) =>
                                prev.map((d, i) =>
                                    i === trackedModalIndex
                                        ? { ...d, serialSelectionMode: mode, selectedTrackedItemIds: ids, selectedTrackedItems: items }
                                        : d
                                )
                            );
                        }}
                    />
                ) : null;
            })()}
        </div>
    );
};

export default StockRequestForm;
