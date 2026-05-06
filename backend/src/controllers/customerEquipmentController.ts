import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";
import logger from "../utils/logger";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { getQueryNumber, getQueryString } from "../utils/request";
import { computeBaseQty } from "../utils/uom";

dayjs.extend(utc);
dayjs.extend(timezone);
const tz = "Asia/Phnom_Penh";

const nowDate = () => {
    const now = dayjs().tz(tz);
    return new Date(Date.UTC(now.year(), now.month(), now.date(), now.hour(), now.minute(), now.second()));
};

// Shared include for items with their product details
const itemInclude = {
    items: {
        include: {
            productAssetItem: {
                select: {
                    id: true, serialNumber: true, assetCode: true, macAddress: true, status: true,
                    productVariant: {
                        select: {
                            id: true, sku: true, barcode: true, productType: true, trackingType: true,
                            products: { select: { id: true, name: true } },
                        },
                    },
                },
            },
            productVariant: {
                select: {
                    id: true, sku: true, barcode: true, productType: true, trackingType: true,
                    products: { select: { id: true, name: true } },
                },
            },
            unit: { select: { id: true, name: true } },
        },
    },
};

// ── GET ALL (paginated + search) ────────────────────────────────────────────
export const getAllCustomerEquipments = async (req: Request, res: Response): Promise<void> => {
    try {
        const pageSize         = getQueryNumber(req.query.pageSize, 10)!;
        const pageNumber       = getQueryNumber(req.query.page, 1)!;
        const searchTerm       = getQueryString(req.query.searchTerm, "")!.trim();
        const statusFilter     = getQueryString(req.query.status, "")!;
        const branchIdFilter   = getQueryNumber(req.query.branchId, 0)!;
        const assignTypeFilter = getQueryString(req.query.assignType, "")!;
        const offset = (pageNumber - 1) * pageSize;

        const loggedInUser = req.user;
        if (!loggedInUser) { res.status(401).json({ message: "Unauthenticated." }); return; }

        const where: any = {};

        if (loggedInUser.roleType === "USER" && loggedInUser.branchId) {
            where.branchId = loggedInUser.branchId;
        } else if (branchIdFilter > 0) {
            where.branchId = branchIdFilter;
        }

        if (statusFilter === "ACTIVE")   where.returnedAt = null;
        if (statusFilter === "RETURNED") where.returnedAt = { not: null };
        if (assignTypeFilter)            where.assignType = assignTypeFilter as any;

        if (searchTerm) {
            where.OR = [
                { ref:      { contains: searchTerm, mode: "insensitive" } },
                { note:     { contains: searchTerm, mode: "insensitive" } },
                { customer: { name:  { contains: searchTerm, mode: "insensitive" } } },
                { customer: { phone: { contains: searchTerm, mode: "insensitive" } } },
                {
                    items: {
                        some: {
                            productAssetItem: {
                                OR: [
                                    { serialNumber: { contains: searchTerm, mode: "insensitive" } },
                                    { assetCode:    { contains: searchTerm, mode: "insensitive" } },
                                ],
                            },
                        },
                    },
                },
                {
                    items: {
                        some: {
                            productVariant: {
                                products: { name: { contains: searchTerm, mode: "insensitive" } },
                            },
                        },
                    },
                },
            ];
        }

        const [data, total] = await Promise.all([
            prisma.customerEquipment.findMany({
                where,
                skip: offset,
                take: pageSize,
                orderBy: { createdAt: "desc" },
                include: {
                    customer: { select: { id: true, name: true, phone: true } },
                    branch:   { select: { id: true, name: true } },
                    order:    { select: { id: true, ref: true } },
                    creator:  { select: { id: true, firstName: true, lastName: true } },
                    ...itemInclude,
                },
            }),
            prisma.customerEquipment.count({ where }),
        ]);

        res.status(200).json({ data, total });
    } catch (error) {
        logger.error("Error fetching customer equipments:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// ── GET BY ID ───────────────────────────────────────────────────────────────
export const getCustomerEquipmentById = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = Number(req.params.id);
        const record = await prisma.customerEquipment.findUnique({
            where: { id },
            include: {
                customer:     { select: { id: true, name: true, phone: true, email: true, address: true } },
                branch:       { select: { id: true, name: true } },
                order:        { select: { id: true, ref: true } },
                stockRequest: { select: { id: true, ref: true, StatusType: true } },
                creator:      { select: { id: true, firstName: true, lastName: true } },
                updater:      { select: { id: true, firstName: true, lastName: true } },
                ...itemInclude,
            },
        });
        if (!record) { res.status(404).json({ message: "Record not found." }); return; }

        // For returned + invoice-linked CEQ, enrich each non-tracked item with netReturnedQty —
        // the quantity actually restored to stock after deducting items already returned via Sale Return.
        let enrichedItems: any[] = record.items;
        if (record.returnedAt && record.orderId) {
            enrichedItems = await Promise.all(record.items.map(async (item: any) => {
                if (item.productAssetItemId || !item.productVariantId || !item.quantity) return item;

                const saleReturnedRows = await prisma.saleReturnItems.findMany({
                    where: {
                        productVariantId: item.productVariantId,
                        saleReturn: {
                            orderId: record.orderId!,
                            status: "APPROVED",
                            deletedAt: null,
                        },
                    },
                    select: { baseQty: true },
                });
                const saleReturnedBaseQty = saleReturnedRows.reduce(
                    (sum: number, r: any) => sum + Number(r.baseQty || 0), 0
                );
                if (saleReturnedBaseQty <= 0) return item;

                // Reverse-convert: netBaseQty → netUnitQty using stored unit multiplier
                const variant = await prisma.productVariants.findUnique({
                    where: { id: item.productVariantId },
                    select: { productId: true, baseUnitId: true },
                });
                let multiplier = 1;
                const baseUnitId = variant?.baseUnitId ?? null;
                if (variant && baseUnitId != null && item.unitId && item.unitId !== baseUnitId) {
                    const conv = await prisma.productUnitConversion.findFirst({
                        where: { productId: variant.productId, fromUnitId: item.unitId, toUnitId: baseUnitId },
                        select: { multiplier: true },
                    });
                    if (conv) multiplier = Number(conv.multiplier);
                }
                const ceqBaseQty  = Number(item.quantity) * multiplier;
                const netBaseQty  = Math.max(0, ceqBaseQty - saleReturnedBaseQty);
                const netUnitQty  = multiplier > 0 ? netBaseQty / multiplier : netBaseQty;

                return { ...item, netReturnedQty: netUnitQty };
            }));
        }

        res.status(200).json({ ...record, items: enrichedItems });
    } catch (error) {
        logger.error("Error fetching customer equipment by ID:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// ── GET HISTORY FOR A SERIAL ─────────────────────────────────────────────────
export const getSerialHistory = async (req: Request, res: Response): Promise<void> => {
    try {
        const productAssetItemId = Number(req.params.assetItemId);
        const ceqItems = await prisma.customerEquipmentItem.findMany({
            where: { productAssetItemId },
            include: {
                customerEquipment: {
                    include: {
                        customer: { select: { id: true, name: true, phone: true } },
                        branch:   { select: { id: true, name: true } },
                        order:    { select: { id: true, ref: true } },
                    },
                },
            },
            orderBy: { customerEquipment: { assignedAt: "desc" } },
        });
        const records = ceqItems.map((i) => ({ ...i.customerEquipment, _serialEntry: i }));
        res.status(200).json(records);
    } catch (error) {
        logger.error("Error fetching serial history:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// ── GET AVAILABLE ASSET ITEMS ────────────────────────────────────────────────
export const getAvailableAssetItems = async (req: Request, res: Response): Promise<void> => {
    try {
        const variantId      = getQueryNumber(req.query.variantId,      0)!;
        const branchId       = getQueryNumber(req.query.branchId,       0)!;
        const excludeCeqId   = getQueryNumber(req.query.excludeCeqId,   0) ?? 0;
        const stockRequestId = getQueryNumber(req.query.stockRequestId, 0) ?? 0;

        if (!variantId || !branchId) {
            res.status(400).json({ message: "variantId and branchId are required." });
            return;
        }

        // When a stock request is linked, collect the processed serial IDs from that request
        // so we can include TRANSFERRED serials (already cut by the request) in the results.
        let requestSerialIds: number[] = [];
        if (stockRequestId) {
            const details = await prisma.requestDetails.findMany({
                where: { requestId: stockRequestId, productVariantId: variantId },
                select: { trackedPayload: true },
            });
            for (const d of details) {
                if (d.trackedPayload) {
                    try {
                        const p = JSON.parse(d.trackedPayload);
                        if (Array.isArray(p.processedIds)) {
                            requestSerialIds.push(...p.processedIds.map(Number));
                        }
                    } catch { /* ignore */ }
                }
            }
        }

        // Find IDs of serials already actively assigned to another CEQ (not returned).
        const activelyAssigned = await prisma.customerEquipmentItem.findMany({
            where: {
                productAssetItemId: { not: null },
                customerEquipment: {
                    returnedAt: null,
                    ...(excludeCeqId ? { id: { not: excludeCeqId } } : {}),
                },
            },
            select: { productAssetItemId: true },
        });
        const assignedIds = activelyAssigned
            .map((r) => r.productAssetItemId)
            .filter((id): id is number => id !== null);

        // Include TRANSFERRED serials from the linked stock request alongside normal serials
        const items = await prisma.productAssetItem.findMany({
            where: {
                productVariantId: variantId,
                branchId,
                // Include TRANSFERRED serials that belong to this stock request
                ...(requestSerialIds.length > 0
                    ? { OR: [{ id: { in: requestSerialIds } }, { status: { not: "TRANSFERRED" } }] }
                    : {}),
            },
            orderBy: { id: "asc" },
            select: {
                id: true, serialNumber: true, assetCode: true, macAddress: true, status: true,
                orderItemLinks: {
                    select: {
                        orderItem: {
                            select: { order: { select: { id: true, ref: true, customer: { select: { name: true } } } } },
                        },
                    },
                    orderBy: { id: "desc" },
                    take: 1,
                },
            },
        });

        const result = items.map((item) => ({
            ...item,
            activeCeqAssigned: assignedIds.includes(item.id),
            fromStockRequest: requestSerialIds.includes(item.id),
        }));

        res.status(200).json(result);
    } catch (error) {
        logger.error("Error fetching asset items:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// ── SEARCH ORDERS BY REF + BRANCH ────────────────────────────────────────────
// Returns invoices belonging to the given branch matching the ref search term
export const searchOrders = async (req: Request, res: Response): Promise<void> => {
    try {
        const branchId  = getQueryNumber(req.query.branchId, 0)!;
        const rawSearch = getQueryString(req.query.ref, "")!.trim();

        if (!branchId) { res.status(400).json({ message: "branchId is required." }); return; }

        // Sanitise search term — only alphanumeric + hyphen allowed (ref format: ZM2026-00001)
        const searchRef = /^[a-zA-Z0-9\-]*$/.test(rawSearch) ? rawSearch : "";

        const orders = await prisma.order.findMany({
            where: {
                branchId,
                ...(searchRef ? { ref: { contains: searchRef, mode: "insensitive" } } : {}),
            },
            orderBy: { id: "desc" },
            take: 20,
            select: {
                id: true,
                ref: true,
                createdAt: true,
                customer: { select: { id: true, name: true } },
                stockRequests: {
                    where: { deletedAt: null },
                    select: { id: true, ref: true },
                    take: 1,
                },
                customerEquipments: {
                    orderBy: { id: "desc" },
                    select: { id: true, ref: true },
                    take: 1,
                },
            },
        });

        const result = orders.map((o) => ({
            id: o.id,
            ref: o.ref,
            createdAt: o.createdAt,
            customer: o.customer,
            linkedStockRequest: o.stockRequests[0] ?? null,
            linkedCeq: o.customerEquipments[0] ?? null,
        }));

        res.status(200).json(result);
    } catch (error) {
        logger.error("Error searching orders:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// ── GET UNITS FOR A VARIANT ──────────────────────────────────────────────────
// Returns base unit + all units in ProductUnitConversion for that product
export const getVariantUnits = async (req: Request, res: Response): Promise<void> => {
    try {
        const variantId = Number(req.params.variantId);
        const variant = await prisma.productVariants.findUnique({
            where: { id: variantId },
            select: { productId: true, baseUnitId: true },
        });
        if (!variant) { res.status(404).json({ message: "Variant not found." }); return; }

        const unitMap: Record<number, { id: number; name: string }> = {};

        // Base unit
        if (variant.baseUnitId) {
            const base = await prisma.units.findUnique({ where: { id: variant.baseUnitId }, select: { id: true, name: true } });
            if (base) unitMap[base.id] = base;
        }

        // All conversion units for this product
        const conversions = await prisma.productUnitConversion.findMany({
            where: { productId: variant.productId },
            select: {
                fromUnit: { select: { id: true, name: true } },
                toUnit:   { select: { id: true, name: true } },
            },
        });
        conversions.forEach((c) => {
            if (c.fromUnit) unitMap[c.fromUnit.id] = c.fromUnit;
            if (c.toUnit)   unitMap[c.toUnit.id]   = c.toUnit;
        });

        res.status(200).json(Object.values(unitMap));
    } catch (error) {
        logger.error("Error fetching variant units:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// ── SEARCH STOCK REQUESTS BY REF + BRANCH ───────────────────────────────────
export const searchStockRequests = async (req: Request, res: Response): Promise<void> => {
    try {
        const branchId  = getQueryNumber(req.query.branchId, 0)!;
        const rawSearch = getQueryString(req.query.ref, "")!.trim();
        if (!branchId) { res.status(400).json({ message: "branchId is required." }); return; }

        const requests = await prisma.stockRequests.findMany({
            where: {
                branchId,
                StatusType: "APPROVED",
                deletedAt:  null,
                ...(rawSearch ? { ref: { contains: rawSearch, mode: "insensitive" } } : {}),
            },
            orderBy: { id: "desc" },
            take: 10,
            select: {
                id: true,
                ref: true,
                requestDate: true,
                customerEquipments: {
                    orderBy: { id: "desc" },
                    select: { id: true, ref: true },
                    take: 1,
                },
            },
        });
        const result = requests.map((r) => ({
            id: r.id,
            ref: r.ref,
            requestDate: r.requestDate,
            linkedCeq: r.customerEquipments[0] ?? null,
        }));
        res.status(200).json(result);
    } catch (error) {
        logger.error("Error searching stock requests:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// ── CREATE ───────────────────────────────────────────────────────────────────
// ── Stock helpers ─────────────────────────────────────────────────────────────

// Determine serial status to set when assigning
function serialStatusForAssign(assignType: string): string {
    return assignType === "SOLD" ? "SOLD" : "RESERVED";
}

// Shared helper: update or create a Stocks row by delta
async function adjustStocks(
    tx: any,
    productVariantId: number,
    branchId: number,
    delta: number,
    userId: number,
    currentDate: Date
) {
    const existing = await tx.stocks.findUnique({
        where: { productVariantId_branchId: { productVariantId, branchId } },
    });
    if (existing) {
        await tx.stocks.update({
            where: { productVariantId_branchId: { productVariantId, branchId } },
            data:  { quantity: { increment: delta }, updatedAt: currentDate, updatedBy: userId },
        });
    } else {
        await tx.stocks.create({
            data: { productVariantId, branchId, quantity: delta, createdAt: currentDate, createdBy: userId, updatedAt: currentDate, updatedBy: userId },
        });
    }

    // When restoring stock (+): create a FIFO layer so future invoices can consume it.
    // Without this, Stocks and FIFO remainingQty get out of sync → invoice approval fails.
    if (delta > 0) {
        const lastLayer = await tx.stockMovements.findFirst({
            where: { productVariantId, branchId, status: "APPROVED", quantity: { gt: 0 } },
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            select: { unitCost: true },
        });
        const unitCost = lastLayer?.unitCost ?? 0;

        await tx.stockMovements.create({
            data: {
                productVariantId,
                branchId,
                type:           "ADJUSTMENT",
                AdjustMentType: "POSITIVE",
                status:         "APPROVED",
                quantity:       delta,
                unitCost,
                remainingQty:   delta,
                createdAt:      currentDate,
                createdBy:      userId,
                updatedAt:      currentDate,
                updatedBy:      userId,
            },
        });
    }

    // When consuming stock (-): decrement FIFO layers so future invoices see the correct
    // available qty. Without this, the same stock can be consumed twice (once by CEQ,
    // once by an invoice).
    if (delta < 0) {
        let remaining = new Decimal(-delta); // positive amount to consume

        const fifoBatches = await tx.stockMovements.findMany({
            where: {
                productVariantId,
                branchId,
                status:      "APPROVED",
                remainingQty: { gt: 0 },
                OR: [
                    { type: "PURCHASE" },
                    { type: "SALE_RETURN" },
                    { type: "ADJUSTMENT", AdjustMentType: "POSITIVE" },
                    { type: "TRANSFER",   quantity: { gt: 0 } },
                ],
            },
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            select: { id: true, remainingQty: true },
        });

        for (const batch of fifoBatches) {
            if (remaining.lte(0)) break;
            const available = new Decimal(batch.remainingQty ?? 0);
            if (available.lte(0)) continue;
            const consume = Decimal.min(available, remaining);
            await tx.stockMovements.update({
                where: { id: batch.id },
                data:  { remainingQty: available.minus(consume), updatedAt: currentDate, updatedBy: userId },
            });
            remaining = remaining.minus(consume);
        }
    }
}

// Apply or reverse stock effects for a set of DB items (CustomerEquipmentItem rows)
async function applyDbItemEffects(
    tx: any,
    items: Array<{ productAssetItemId: number | null; productVariantId: number | null; quantity: number | null; unitId: number | null }>,
    branchId: number,
    assignType: string,
    direction: "APPLY" | "REVERSE",
    userId: number,
    currentDate: Date
) {
    for (const item of items) {
        if (item.productAssetItemId) {
            // Tracked: get productVariantId, flip serial status, update Stocks (-1 / +1)
            const assetItem = await tx.productAssetItem.findUnique({
                where: { id: item.productAssetItemId },
                select: { productVariantId: true },
            });
            await tx.productAssetItem.update({
                where: { id: item.productAssetItemId },
                data:  direction === "APPLY"
                    ? { status: serialStatusForAssign(assignType) }
                    : { status: "IN_STOCK", soldOrderItemId: null },
            });
            if (assetItem) {
                const delta = direction === "APPLY" ? -1 : 1;
                logger.info(`CEQ applyDbItemEffects TRACKED [${direction}] assetId=${item.productAssetItemId} variantId=${assetItem.productVariantId} branchId=${branchId} delta=${delta}`);
                await adjustStocks(tx, assetItem.productVariantId, branchId, delta, userId, currentDate);
            }
        } else if (item.productVariantId && item.quantity) {
            // Non-tracked: convert to base units then adjust Stocks
            const { baseQty } = await computeBaseQty(tx, {
                productVariantId: item.productVariantId,
                quantity:         item.quantity,
                unitId:           item.unitId,
            });
            const delta = direction === "APPLY" ? -baseQty.toNumber() : baseQty.toNumber();
            logger.info(`CEQ applyDbItemEffects NON_TRACKED [${direction}] variantId=${item.productVariantId} branchId=${branchId} delta=${delta}`);
            await adjustStocks(tx, item.productVariantId, branchId, delta, userId, currentDate);
        }
    }
}

// Apply or reverse stock effects for a payload array (items from request body)
async function applyPayloadEffects(
    tx: any,
    items: any[],
    branchId: number,
    assignType: string,
    direction: "APPLY" | "REVERSE",
    userId: number,
    currentDate: Date
) {
    for (const item of items) {
        if (item.type === "TRACKED") {
            // Tracked: get productVariantId, flip serial status, update Stocks (-1 / +1)
            const assetItem = await tx.productAssetItem.findUnique({
                where: { id: Number(item.productAssetItemId) },
                select: { productVariantId: true },
            });
            await tx.productAssetItem.update({
                where: { id: Number(item.productAssetItemId) },
                data:  direction === "APPLY"
                    ? { status: serialStatusForAssign(assignType) }
                    : { status: "IN_STOCK", soldOrderItemId: null },
            });
            if (assetItem) {
                const delta = direction === "APPLY" ? -1 : 1;
                logger.info(`CEQ applyPayloadEffects TRACKED [${direction}] assetId=${item.productAssetItemId} variantId=${assetItem.productVariantId} branchId=${branchId} delta=${delta}`);
                await adjustStocks(tx, assetItem.productVariantId, branchId, delta, userId, currentDate);
            }
        } else if (item.type === "NON_TRACKED") {
            const pvId = Number(item.productVariantId);
            const { baseQty } = await computeBaseQty(tx, {
                productVariantId: pvId,
                quantity:         Number(item.quantity),
                unitId:           item.unitId ? Number(item.unitId) : null,
            });
            const delta = direction === "APPLY" ? -baseQty.toNumber() : baseQty.toNumber();
            logger.info(`CEQ applyPayloadEffects NON_TRACKED [${direction}] variantId=${pvId} branchId=${branchId} delta=${delta}`);
            await adjustStocks(tx, pvId, branchId, delta, userId, currentDate);
        }
    }
}

// ── CREATE ────────────────────────────────────────────────────────────────────
// items payload shape:
//   tracked:     { type: "TRACKED",     productAssetItemId: number }
//   non-tracked: { type: "NON_TRACKED", productVariantId: number, quantity: number, unitId?: number }
export const createCustomerEquipment = async (req: Request, res: Response): Promise<void> => {
    try {
        const loggedInUser = req.user;
        if (!loggedInUser) { res.status(401).json({ message: "Unauthenticated." }); return; }

        const { customerId, branchId, assignType, assignedAt, orderId, stockRequestId, note, items, swaps } = req.body;

        if (!customerId) { res.status(400).json({ message: "customerId is required." }); return; }
        if (!branchId)   { res.status(400).json({ message: "branchId is required." }); return; }
        if (!assignType) { res.status(400).json({ message: "assignType is required." }); return; }
        if (!assignedAt) { res.status(400).json({ message: "assignedAt is required." }); return; }
        if (!Array.isArray(items) || items.length === 0) {
            res.status(400).json({ message: "At least one item must be added." }); return;
        }

        // Validate each item
        for (const item of items) {
            if (item.type === "TRACKED") {
                if (!item.productAssetItemId) {
                    res.status(400).json({ message: "productAssetItemId required for tracked items." }); return;
                }
                const found = await prisma.productAssetItem.findUnique({ where: { id: Number(item.productAssetItemId) }, select: { id: true } });
                if (!found) { res.status(400).json({ message: `Serial ID ${item.productAssetItemId} not found.` }); return; }
            } else if (item.type === "NON_TRACKED") {
                if (!item.productVariantId || !item.quantity || Number(item.quantity) < 1) {
                    res.status(400).json({ message: "productVariantId and quantity (≥1) required for non-tracked items." }); return;
                }
                const found = await prisma.productVariants.findUnique({ where: { id: Number(item.productVariantId) }, select: { id: true } });
                if (!found) { res.status(400).json({ message: `Product variant ID ${item.productVariantId} not found.` }); return; }
            } else {
                res.status(400).json({ message: `Unknown item type: ${item.type}` }); return;
            }
        }

        // Validate orderId / stockRequestId
        if (orderId) {
            const order = await prisma.order.findUnique({ where: { id: Number(orderId) }, select: { id: true } });
            if (!order) { res.status(400).json({ message: `Invoice/Order ID ${orderId} does not exist.` }); return; }
            const existingCeq = await prisma.customerEquipment.findFirst({
                where: { orderId: Number(orderId) },
                orderBy: { id: "desc" },
                select: { id: true, ref: true },
            });
            if (existingCeq) { res.status(400).json({ message: `Invoice is already linked to Customer Equipment ${existingCeq.ref}. Each invoice can only be linked once.` }); return; }
        }
        if (stockRequestId) {
            const req2 = await prisma.stockRequests.findUnique({ where: { id: Number(stockRequestId) }, select: { id: true, StatusType: true } });
            if (!req2) { res.status(400).json({ message: `Stock Request ID ${stockRequestId} does not exist.` }); return; }
            if (req2.StatusType !== "APPROVED") { res.status(400).json({ message: "Stock Request must be APPROVED before linking to equipment." }); return; }
            const existingCeq = await prisma.customerEquipment.findFirst({
                where: { stockRequestId: Number(stockRequestId) },
                orderBy: { id: "desc" },
                select: { id: true, ref: true },
            });
            if (existingCeq) { res.status(400).json({ message: `Stock Request is already linked to Customer Equipment ${existingCeq.ref}. Each stock request can only be linked once.` }); return; }
        }

        // Generate ref
        const last = await prisma.customerEquipment.findFirst({ orderBy: { id: "desc" }, select: { ref: true } });
        const nextNum = last?.ref ? (parseInt(last.ref.split("-")[1] || "0", 10) + 1) : 1;
        const ref = `CEQ-${String(nextNum).padStart(5, "0")}`;

        const currentDate = nowDate();

        const itemCreates = (items as any[]).map((item) => {
            if (item.type === "TRACKED") {
                return { productAssetItemId: Number(item.productAssetItemId) };
            } else {
                return {
                    productVariantId: Number(item.productVariantId),
                    quantity:         Number(item.quantity),
                    unitId:           item.unitId ? Number(item.unitId) : null,
                };
            }
        });

        const record = await prisma.$transaction(async (tx) => {
            // Validate non-tracked quantities against invoice when orderId is linked
            if (orderId) {
                for (const item of items) {
                    if (item.type === "NON_TRACKED") {
                        const variant = await tx.productVariants.findUnique({
                            where: { id: Number(item.productVariantId) },
                            select: { products: { select: { name: true } } },
                        });
                        const productName = variant?.products?.name || `Product #${item.productVariantId}`;
                        const orderItem = await tx.orderItem.findFirst({
                            where: {
                                orderId: Number(orderId),
                                productVariantId: Number(item.productVariantId),
                                ItemType: "PRODUCT",
                            },
                            select: { id: true, baseQty: true, unitId: true },
                        });
                        if (!orderItem) {
                            throw new Error(`VALIDATION: "${productName}" was not sold in the linked invoice. Please remove this product or unlink the invoice.`);
                        }
                        const { baseQty: ceqBaseQty, unitId: ceqUnitId } = await computeBaseQty(tx, {
                            productVariantId: Number(item.productVariantId),
                            quantity: Number(item.quantity),
                            unitId: item.unitId ? Number(item.unitId) : undefined,
                        });
                        // Unit must match the invoice's sold unit
                        if (orderItem.unitId && ceqUnitId !== orderItem.unitId) {
                            const [ceqUnit, invoiceUnit] = await Promise.all([
                                tx.units.findUnique({ where: { id: ceqUnitId }, select: { name: true } }),
                                tx.units.findUnique({ where: { id: orderItem.unitId }, select: { name: true } }),
                            ]);
                            throw new Error(`VALIDATION: Wrong unit for "${productName}". The invoice sold in "${invoiceUnit?.name ?? "unknown"}" — you selected "${ceqUnit?.name ?? "unknown"}".`);
                        }
                        const invoiceBaseQty = Number(orderItem.baseQty ?? 0);
                        // Subtract qty already returned via Sale Return for this order item
                        const saleReturnAgg = await tx.saleReturnItems.aggregate({
                            where: { saleItemId: orderItem.id, saleReturn: { status: "APPROVED" } },
                            _sum: { baseQty: true },
                        });
                        const saleReturnedBaseQty = Number(saleReturnAgg._sum.baseQty ?? 0);
                        const availableBaseQty = invoiceBaseQty - saleReturnedBaseQty;
                        if (ceqBaseQty.toNumber() > availableBaseQty) {
                            const msg = saleReturnedBaseQty > 0
                                ? `VALIDATION: Quantity for "${productName}" is too high. Invoice qty: ${invoiceBaseQty}, already returned: ${saleReturnedBaseQty}, available: ${availableBaseQty} — you entered ${ceqBaseQty.toNumber()}.`
                                : `VALIDATION: Quantity for "${productName}" is too high. The invoice only has ${invoiceBaseQty} unit(s) — you entered ${ceqBaseQty.toNumber()}.`;
                            throw new Error(msg);
                        }
                    }
                }
            }

            const created = await tx.customerEquipment.create({
                data: {
                    ref,
                    customerId:    Number(customerId),
                    branchId:      Number(branchId),
                    assignType:    assignType as any,
                    assignedAt:    dayjs(assignedAt).startOf("day").toDate(),
                    orderId:       orderId       ? Number(orderId)       : null,
                    stockRequestId: stockRequestId ? Number(stockRequestId) : null,
                    note:          note ?? null,
                    createdAt:     currentDate,
                    createdBy:     loggedInUser.id,
                    updatedAt:     currentDate,
                    updatedBy:     loggedInUser.id,
                    items: { create: itemCreates },
                },
                include: {
                    customer: { select: { id: true, name: true, phone: true } },
                    branch:   { select: { id: true, name: true } },
                    ...itemInclude,
                },
            });

            // Skip stock effects when invoice OR stock request is already linked (both pre-cut stock)
            if (!orderId && !stockRequestId) {
                await applyPayloadEffects(tx, items, Number(branchId), assignType, "APPLY", loggedInUser.id, currentDate);
            }
            // For stock request linked: update TRANSFERRED serials to SOLD/RESERVED to reflect customer assignment
            if (stockRequestId && !orderId) {
                const newStatus = serialStatusForAssign(assignType as any);
                for (const item of items) {
                    if (item.type === "TRACKED") {
                        await tx.productAssetItem.update({
                            where: { id: Number(item.productAssetItemId) },
                            data: { status: newStatus as any },
                        });
                    }
                }
            }

            // Process serial swaps (replacement serials chosen at assignment time)
            if (orderId && Array.isArray(swaps) && swaps.length > 0) {
                const newStatus = serialStatusForAssign(assignType as any);
                const swapNotes: string[] = [];

                for (const { oldSerialId, newSerialId, reason } of swaps) {
                    const oldSerial = await tx.productAssetItem.findUnique({
                        where: { id: Number(oldSerialId) },
                        select: { productVariantId: true, branchId: true, serialNumber: true },
                    });
                    const newSerial = await tx.productAssetItem.findUnique({
                        where: { id: Number(newSerialId) },
                        select: { productVariantId: true, serialNumber: true },
                    });
                    if (!oldSerial || !newSerial) continue;

                    // Swap OrderItemAssetItem so the invoice shows the new serial
                    const oldLink = await tx.orderItemAssetItem.findFirst({
                        where: { productAssetItemId: Number(oldSerialId), orderItem: { orderId: Number(orderId) } },
                        select: { id: true, orderItemId: true },
                    });
                    if (oldLink) {
                        await tx.orderItemAssetItem.delete({ where: { id: oldLink.id } });
                        await tx.orderItemAssetItem.create({
                            data: { orderItemId: oldLink.orderItemId, productAssetItemId: Number(newSerialId) },
                        });
                        await tx.productAssetItem.update({ where: { id: Number(oldSerialId) }, data: { soldOrderItemId: null } });
                        await tx.productAssetItem.update({ where: { id: Number(newSerialId) }, data: { soldOrderItemId: oldLink.orderItemId } });
                    }

                    // Old serial → IN_STOCK and restore stock
                    await tx.productAssetItem.update({ where: { id: Number(oldSerialId) }, data: { status: "IN_STOCK" } });
                    await adjustStocks(tx, oldSerial.productVariantId!, oldSerial.branchId!, 1, loggedInUser.id, currentDate);

                    // New serial → SOLD/RESERVED and deduct stock
                    await tx.productAssetItem.update({ where: { id: Number(newSerialId) }, data: { status: newStatus as any } });
                    await adjustStocks(tx, newSerial.productVariantId!, Number(branchId), -1, loggedInUser.id, currentDate);

                    const reasonText = reason?.trim() ? reason.trim() : "Replaced at assignment";
                    swapNotes.push(`[SWAP ${dayjs().tz(tz).format("YYYY-MM-DD HH:mm")}] ${oldSerial.serialNumber} → ${newSerial.serialNumber}. Reason: ${reasonText}`);
                }

                if (swapNotes.length > 0) {
                    const existingNote = created.note ?? "";
                    const updatedNote = existingNote ? `${existingNote}\n${swapNotes.join("\n")}` : swapNotes.join("\n");
                    await tx.customerEquipment.update({ where: { id: created.id }, data: { note: updatedNote } });
                }
            }

            return created;
        });

        res.status(201).json(record);
    } catch (error) {
        const typedError = error as Error;
        if (typedError.message.startsWith("VALIDATION:")) {
            res.status(400).json({ message: typedError.message.replace("VALIDATION:", "").trim() });
            return;
        }
        logger.error("Error creating customer equipment:", error);
        res.status(500).json({ message: typedError.message });
    }
};

// ── RETURN ───────────────────────────────────────────────────────────────────
export const returnCustomerEquipment = async (req: Request, res: Response): Promise<void> => {
    try {
        const loggedInUser = req.user;
        if (!loggedInUser) { res.status(401).json({ message: "Unauthenticated." }); return; }

        const id = Number(req.params.id);
        const { returnedAt, note, convertToSecondHandItems, convertToSecondHandVariants } = req.body;
        const secondHandSet        = new Set<number>((convertToSecondHandItems    || []).map(Number));
        const secondHandVariantSet = new Set<number>((convertToSecondHandVariants || []).map(Number));

        const record = await prisma.customerEquipment.findUnique({ where: { id } });
        if (!record)           { res.status(404).json({ message: "Record not found." }); return; }
        if (record.returnedAt) { res.status(400).json({ message: "Equipment already marked as returned." }); return; }

        // Fetch items so we can reverse their stock effects
        const existingItems = await prisma.customerEquipmentItem.findMany({
            where: { customerEquipmentId: id },
            select: { productAssetItemId: true, productVariantId: true, quantity: true, unitId: true },
        });

        const currentDate = nowDate();
        const userId = loggedInUser.id;

        const updated = await prisma.$transaction(async (tx) => {
            // Restore stock per item, accounting for quantities already returned via Sale Return.
            // When orderId is set, the invoice handled the original stock cut.
            // We must not double-restore what Sale Return already added back.
            for (const item of existingItems) {
                if (item.productAssetItemId) {
                    // ── TRACKED item ──────────────────────────────────────────────────────
                    const assetItem = await tx.productAssetItem.findUnique({
                        where: { id: item.productAssetItemId },
                        select: {
                            productVariantId: true,
                            status: true,
                            productVariant: { select: { productId: true, productType: true, sku: true, barcode: true, name: true, trackingType: true, stockAlert: true, purchasePrice: true, purchasePriceUnitId: true, retailPrice: true, retailPriceUnitId: true, wholeSalePrice: true, wholeSalePriceUnitId: true, baseUnitId: true, isActive: true } },
                        },
                    });
                    if (!assetItem) continue;

                    // When linked to an invoice and serial is already IN_STOCK, Sale Return already
                    // restored this item — skip to avoid double-counting.
                    const alreadyRestoredViaReturn = !!record.orderId && assetItem.status === "IN_STOCK";
                    if (alreadyRestoredViaReturn) {
                        logger.info(`CEQ return: skipping assetItem ${item.productAssetItemId} — already IN_STOCK via Sale Return`);
                        continue;
                    }

                    let restoreVariantId = assetItem.productVariantId;

                    if (secondHandSet.has(item.productAssetItemId) && assetItem.productVariant?.productType === "New") {
                        const pid = assetItem.productVariant.productId;
                        let shVariant = await tx.productVariants.findFirst({
                            where: { productId: pid, productType: "SecondHand" },
                            select: { id: true },
                        });
                        if (!shVariant) {
                            const ov = assetItem.productVariant;
                            shVariant = await tx.productVariants.create({
                                data: {
                                    productId: pid, productType: "SecondHand",
                                    sku: ov.sku, barcode: ov.barcode, name: ov.name,
                                    trackingType: ov.trackingType, stockAlert: ov.stockAlert,
                                    purchasePrice: ov.purchasePrice, purchasePriceUnitId: ov.purchasePriceUnitId,
                                    retailPrice: ov.retailPrice, retailPriceUnitId: ov.retailPriceUnitId,
                                    wholeSalePrice: ov.wholeSalePrice, wholeSalePriceUnitId: ov.wholeSalePriceUnitId,
                                    baseUnitId: ov.baseUnitId, isActive: ov.isActive,
                                    createdBy: userId, updatedBy: userId, createdAt: currentDate, updatedAt: currentDate,
                                },
                                select: { id: true },
                            });
                            logger.info(`CEQ return: auto-created SecondHand variant ${shVariant.id} from New variant ${assetItem.productVariantId}`);
                        }
                        restoreVariantId = shVariant.id;
                        await tx.productAssetItem.update({
                            where: { id: item.productAssetItemId },
                            data: { productVariantId: restoreVariantId, status: "IN_STOCK", soldOrderItemId: null },
                        });
                        logger.info(`CEQ return: converted assetItem ${item.productAssetItemId} → SecondHand variant ${restoreVariantId}`);
                    } else {
                        await tx.productAssetItem.update({
                            where: { id: item.productAssetItemId },
                            data: { status: "IN_STOCK", soldOrderItemId: null },
                        });
                    }
                    await adjustStocks(tx, restoreVariantId, record.branchId, 1, userId, currentDate);

                } else if (item.productVariantId && item.quantity) {
                    // ── NON-TRACKED item ──────────────────────────────────────────────────
                    const { baseQty } = await computeBaseQty(tx, {
                        productVariantId: item.productVariantId,
                        quantity: item.quantity,
                        unitId: item.unitId,
                    });

                    // When linked to an invoice, subtract what Sale Return already restored
                    // to avoid double-counting stock. Only restore the net remainder.
                    let netRestoreQty = baseQty.toNumber();
                    if (record.orderId) {
                        const saleReturnedRows = await tx.saleReturnItems.findMany({
                            where: {
                                productVariantId: item.productVariantId,
                                saleReturn: {
                                    orderId: record.orderId,
                                    status: "APPROVED",
                                    deletedAt: null,
                                },
                            },
                            select: { baseQty: true },
                        });
                        const alreadyReturnedBaseQty = saleReturnedRows.reduce(
                            (sum, r) => sum + Number(r.baseQty || 0), 0
                        );
                        netRestoreQty = Math.max(0, baseQty.toNumber() - alreadyReturnedBaseQty);
                        logger.info(`CEQ return non-tracked variantId=${item.productVariantId}: ceqBaseQty=${baseQty}, saleReturnedBaseQty=${alreadyReturnedBaseQty}, netRestoreQty=${netRestoreQty}`);
                    }

                    if (netRestoreQty <= 0) continue;

                    let restoreVariantId = item.productVariantId;
                    if (secondHandVariantSet.has(item.productVariantId)) {
                        const origVariant = await tx.productVariants.findUnique({ where: { id: item.productVariantId } });
                        if (origVariant?.productType === "New") {
                            let shVariant = await tx.productVariants.findFirst({
                                where: { productId: origVariant.productId, productType: "SecondHand" },
                                select: { id: true },
                            });
                            if (!shVariant) {
                                shVariant = await tx.productVariants.create({
                                    data: {
                                        productId: origVariant.productId, productType: "SecondHand",
                                        sku: origVariant.sku, barcode: origVariant.barcode, name: origVariant.name,
                                        trackingType: origVariant.trackingType, stockAlert: origVariant.stockAlert,
                                        purchasePrice: origVariant.purchasePrice, purchasePriceUnitId: origVariant.purchasePriceUnitId,
                                        retailPrice: origVariant.retailPrice, retailPriceUnitId: origVariant.retailPriceUnitId,
                                        wholeSalePrice: origVariant.wholeSalePrice, wholeSalePriceUnitId: origVariant.wholeSalePriceUnitId,
                                        baseUnitId: origVariant.baseUnitId, isActive: origVariant.isActive,
                                        createdBy: userId, updatedBy: userId, createdAt: currentDate, updatedAt: currentDate,
                                    },
                                    select: { id: true },
                                });
                                logger.info(`CEQ return: auto-created SecondHand variant ${shVariant.id} from New non-tracked variant ${item.productVariantId}`);
                            }
                            restoreVariantId = shVariant.id;
                            logger.info(`CEQ return: non-tracked qty → SecondHand variant ${restoreVariantId}`);
                        }
                    }
                    await adjustStocks(tx, restoreVariantId, record.branchId, netRestoreQty, userId, currentDate);
                }
            }

            return tx.customerEquipment.update({
                where: { id },
                data: {
                    returnedAt: returnedAt ? dayjs(returnedAt).startOf("day").toDate() : currentDate,
                    note:       note !== undefined ? note : record.note,
                    updatedAt:  currentDate,
                    updatedBy:  userId,
                },
            });
        });

        res.status(200).json(updated);
    } catch (error) {
        logger.error("Error returning customer equipment:", error);
        const typedError = error as Error;
        res.status(500).json({ message: typedError.message });
    }
};

// ── UPDATE (header + items) ───────────────────────────────────────────────────
export const updateCustomerEquipment = async (req: Request, res: Response): Promise<void> => {
    try {
        const loggedInUser = req.user;
        if (!loggedInUser) { res.status(401).json({ message: "Unauthenticated." }); return; }

        const id = Number(req.params.id);
        const { customerId, assignType, assignedAt, orderId, stockRequestId, note, items, swaps } = req.body;

        const record = await prisma.customerEquipment.findUnique({ where: { id } });
        if (!record)           { res.status(404).json({ message: "Record not found." }); return; }
        if (record.returnedAt) { res.status(400).json({ message: "Cannot edit a returned record." }); return; }

        // Validate orderId / stockRequestId
        if (orderId) {
            const order = await prisma.order.findUnique({ where: { id: Number(orderId) }, select: { id: true } });
            if (!order) { res.status(400).json({ message: `Invoice/Order ID ${orderId} does not exist.` }); return; }
            const existingCeq = await prisma.customerEquipment.findFirst({
                where: { orderId: Number(orderId), id: { not: id } },
                orderBy: { id: "desc" },
                select: { id: true, ref: true },
            });
            if (existingCeq) { res.status(400).json({ message: `Invoice is already linked to Customer Equipment ${existingCeq.ref}. Each invoice can only be linked once.` }); return; }
        }
        if (stockRequestId) {
            const sr = await prisma.stockRequests.findUnique({ where: { id: Number(stockRequestId) }, select: { id: true, StatusType: true } });
            if (!sr) { res.status(400).json({ message: `Stock Request ID ${stockRequestId} does not exist.` }); return; }
            if (sr.StatusType !== "APPROVED") { res.status(400).json({ message: "Stock Request must be APPROVED before linking." }); return; }
            const existingCeq = await prisma.customerEquipment.findFirst({
                where: { stockRequestId: Number(stockRequestId), id: { not: id } },
                orderBy: { id: "desc" },
                select: { id: true, ref: true },
            });
            if (existingCeq) { res.status(400).json({ message: `Stock Request is already linked to Customer Equipment ${existingCeq.ref}. Each stock request can only be linked once.` }); return; }
        }

        // Validate items if provided
        if (Array.isArray(items)) {
            if (items.length === 0) { res.status(400).json({ message: "At least one item is required." }); return; }
            for (const item of items) {
                if (item.type === "TRACKED") {
                    const found = await prisma.productAssetItem.findUnique({ where: { id: Number(item.productAssetItemId) }, select: { id: true } });
                    if (!found) { res.status(400).json({ message: `Asset item ${item.productAssetItemId} not found.` }); return; }
                } else if (item.type === "NON_TRACKED") {
                    const found = await prisma.productVariants.findUnique({ where: { id: Number(item.productVariantId) }, select: { id: true } });
                    if (!found) { res.status(400).json({ message: `Product variant ${item.productVariantId} not found.` }); return; }
                }
            }
        }

        const currentDate = nowDate();

        // Fetch old items to reverse their effects before replacing
        const oldItems = await prisma.customerEquipmentItem.findMany({
            where: { customerEquipmentId: id },
            select: { productAssetItemId: true, productVariantId: true, quantity: true, unitId: true },
        });

        const oldOrderId          = record.orderId;
        const oldStockRequestId   = (record as any).stockRequestId ?? null;
        const newOrderId          = orderId          !== undefined ? (orderId          ? Number(orderId)          : null) : oldOrderId;
        const newStockRequestId   = stockRequestId   !== undefined ? (stockRequestId   ? Number(stockRequestId)   : null) : oldStockRequestId;
        const newAssignType       = assignType !== undefined ? assignType : record.assignType;
        const hasPreCutLink       = !!(newOrderId || newStockRequestId);

        const itemsWrite = Array.isArray(items)
            ? {
                items: {
                    deleteMany: {},
                    create: items.map((item: any) =>
                        item.type === "TRACKED"
                            ? { productAssetItemId: Number(item.productAssetItemId) }
                            : { productVariantId: Number(item.productVariantId), quantity: Number(item.quantity), unitId: item.unitId ? Number(item.unitId) : null }
                    ),
                },
            }
            : {};

        const updated = await prisma.$transaction(async (tx) => {
            // Validate non-tracked quantities against invoice when orderId is linked and items are being replaced
            if (newOrderId && Array.isArray(items)) {
                for (const item of items) {
                    if (item.type === "NON_TRACKED") {
                        const variant = await tx.productVariants.findUnique({
                            where: { id: Number(item.productVariantId) },
                            select: { products: { select: { name: true } } },
                        });
                        const productName = variant?.products?.name || `Product #${item.productVariantId}`;
                        const orderItem = await tx.orderItem.findFirst({
                            where: {
                                orderId: newOrderId,
                                productVariantId: Number(item.productVariantId),
                                ItemType: "PRODUCT",
                            },
                            select: { id: true, baseQty: true, unitId: true },
                        });
                        if (!orderItem) {
                            throw new Error(`VALIDATION: "${productName}" was not sold in the linked invoice. Please remove this product or unlink the invoice.`);
                        }
                        const { baseQty: ceqBaseQty, unitId: ceqUnitId } = await computeBaseQty(tx, {
                            productVariantId: Number(item.productVariantId),
                            quantity: Number(item.quantity),
                            unitId: item.unitId ? Number(item.unitId) : undefined,
                        });
                        // Unit must match the invoice's sold unit
                        if (orderItem.unitId && ceqUnitId !== orderItem.unitId) {
                            const [ceqUnit, invoiceUnit] = await Promise.all([
                                tx.units.findUnique({ where: { id: ceqUnitId }, select: { name: true } }),
                                tx.units.findUnique({ where: { id: orderItem.unitId }, select: { name: true } }),
                            ]);
                            throw new Error(`VALIDATION: Wrong unit for "${productName}". The invoice sold in "${invoiceUnit?.name ?? "unknown"}" — you selected "${ceqUnit?.name ?? "unknown"}".`);
                        }
                        const invoiceBaseQty = Number(orderItem.baseQty ?? 0);
                        // Subtract qty already returned via Sale Return for this order item
                        const saleReturnAgg = await tx.saleReturnItems.aggregate({
                            where: { saleItemId: orderItem.id, saleReturn: { status: "APPROVED" } },
                            _sum: { baseQty: true },
                        });
                        const saleReturnedBaseQty = Number(saleReturnAgg._sum.baseQty ?? 0);
                        const availableBaseQty = invoiceBaseQty - saleReturnedBaseQty;
                        if (ceqBaseQty.toNumber() > availableBaseQty) {
                            const msg = saleReturnedBaseQty > 0
                                ? `VALIDATION: Quantity for "${productName}" is too high. Invoice qty: ${invoiceBaseQty}, already returned: ${saleReturnedBaseQty}, available: ${availableBaseQty} — you entered ${ceqBaseQty.toNumber()}.`
                                : `VALIDATION: Quantity for "${productName}" is too high. The invoice only has ${invoiceBaseQty} unit(s) — you entered ${ceqBaseQty.toNumber()}.`;
                            throw new Error(msg);
                        }
                    }
                }
            }

            // Reverse old stock effects only when items are being replaced AND old record had no pre-cut link
            if (!oldOrderId && !oldStockRequestId && Array.isArray(items)) {
                await applyDbItemEffects(tx, oldItems, record.branchId, record.assignType, "REVERSE", loggedInUser.id, currentDate);
            }

            const result = await tx.customerEquipment.update({
                where: { id },
                data: {
                    ...(customerId !== undefined && { customerId: Number(customerId) }),
                    ...(assignType !== undefined && { assignType: assignType as any }),
                    ...(assignedAt !== undefined && { assignedAt: dayjs(assignedAt).startOf("day").toDate() }),
                    orderId:         orderId         !== undefined ? (orderId         ? Number(orderId)         : null) : undefined,
                    stockRequestId:  stockRequestId  !== undefined ? (stockRequestId  ? Number(stockRequestId)  : null) : undefined,
                    note:            note            !== undefined ? note : undefined,
                    updatedAt: currentDate,
                    updatedBy: loggedInUser.id,
                    ...itemsWrite,
                },
                include: {
                    customer:     { select: { id: true, name: true, phone: true } },
                    branch:       { select: { id: true, name: true } },
                    order:        { select: { id: true, ref: true } },
                    stockRequest: { select: { id: true, ref: true, StatusType: true } },
                    ...itemInclude,
                },
            });

            // Apply new stock effects only when no pre-existing link cuts stock
            if (!hasPreCutLink && Array.isArray(items)) {
                await applyPayloadEffects(tx, items, record.branchId, newAssignType, "APPLY", loggedInUser.id, currentDate);
            }
            // For stock request linked: update TRANSFERRED serials to SOLD/RESERVED
            if (newStockRequestId && !newOrderId && Array.isArray(items)) {
                const newStatus = serialStatusForAssign(newAssignType as any);
                for (const item of items) {
                    if (item.type === "TRACKED") {
                        await tx.productAssetItem.update({
                            where: { id: Number(item.productAssetItemId) },
                            data: { status: newStatus as any },
                        });
                    }
                }
            }

            // Process serial swaps — always write swap note; only do invoice/stock
            // changes when an invoice is linked (non-invoice CEQ stock is already
            // handled by applyDbItemEffects/applyPayloadEffects above).
            if (Array.isArray(swaps) && swaps.length > 0) {
                const newStatus = serialStatusForAssign(newAssignType as any);
                const swapNotes: string[] = [];

                for (const { oldSerialId, newSerialId, reason } of swaps) {
                    const oldSerial = await tx.productAssetItem.findUnique({
                        where: { id: Number(oldSerialId) },
                        select: { productVariantId: true, branchId: true, serialNumber: true },
                    });
                    const newSerial = await tx.productAssetItem.findUnique({
                        where: { id: Number(newSerialId) },
                        select: { productVariantId: true, serialNumber: true },
                    });
                    if (!oldSerial || !newSerial) continue;

                    if (newOrderId) {
                        // Invoice-linked: update OrderItemAssetItem + handle stock/status
                        // (regular update flow does NOT touch these when orderId is set)
                        const oldLink = await tx.orderItemAssetItem.findFirst({
                            where: { productAssetItemId: Number(oldSerialId), orderItem: { orderId: newOrderId } },
                            select: { id: true, orderItemId: true },
                        });
                        if (oldLink) {
                            await tx.orderItemAssetItem.delete({ where: { id: oldLink.id } });
                            await tx.orderItemAssetItem.create({
                                data: { orderItemId: oldLink.orderItemId, productAssetItemId: Number(newSerialId) },
                            });
                            await tx.productAssetItem.update({ where: { id: Number(oldSerialId) }, data: { soldOrderItemId: null } });
                            await tx.productAssetItem.update({ where: { id: Number(newSerialId) }, data: { soldOrderItemId: oldLink.orderItemId } });
                        }
                        await tx.productAssetItem.update({ where: { id: Number(oldSerialId) }, data: { status: "IN_STOCK" } });
                        await adjustStocks(tx, oldSerial.productVariantId!, oldSerial.branchId!, 1, loggedInUser.id, currentDate);
                        await tx.productAssetItem.update({ where: { id: Number(newSerialId) }, data: { status: newStatus as any } });
                        await adjustStocks(tx, newSerial.productVariantId!, record.branchId, -1, loggedInUser.id, currentDate);
                    }
                    // Always record swap history in note
                    const reasonText = reason?.trim() ? reason.trim() : "Replaced on edit";
                    swapNotes.push(`[SWAP ${dayjs().tz(tz).format("YYYY-MM-DD HH:mm")}] ${oldSerial.serialNumber} → ${newSerial.serialNumber}. Reason: ${reasonText}`);
                }

                if (swapNotes.length > 0) {
                    const existingNote = result.note ?? "";
                    const updatedNote = existingNote ? `${existingNote}\n${swapNotes.join("\n")}` : swapNotes.join("\n");
                    await tx.customerEquipment.update({ where: { id }, data: { note: updatedNote } });
                }
            }

            return result;
        });

        res.status(200).json(updated);
    } catch (error) {
        const typedError = error as Error;
        if (typedError.message.startsWith("VALIDATION:")) {
            res.status(400).json({ message: typedError.message.replace("VALIDATION:", "").trim() });
            return;
        }
        logger.error("Error updating customer equipment:", error);
        res.status(500).json({ message: typedError.message });
    }
};

// ── CEQ RETURNED QTY (for Sale Return blocking) ──────────────────────────────
export const getCeqReturnedQty = async (req: Request, res: Response): Promise<void> => {
    try {
        const orderId = Number(req.query.orderId);
        if (!orderId) { res.status(400).json({ message: "orderId required" }); return; }

        // Find returned CEQs linked to this invoice/order
        const returnedCeqs = await prisma.customerEquipment.findMany({
            where: { orderId, returnedAt: { not: null } },
            select: { id: true, ref: true },
        });

        if (returnedCeqs.length === 0) { res.json([]); return; }

        const ceqIds = returnedCeqs.map((c) => c.id);
        const ceqRefMap = new Map(returnedCeqs.map((c) => [c.id, c.ref]));

        // Get non-tracked items from those returned CEQs
        const items = await prisma.customerEquipmentItem.findMany({
            where: {
                customerEquipmentId: { in: ceqIds },
                productVariantId: { not: null },
                productAssetItemId: null,
            },
            select: { customerEquipmentId: true, productVariantId: true, quantity: true, unitId: true },
        });

        // Accumulate base qty per productVariantId
        const variantMap = new Map<number, { baseQty: number; refs: Set<string> }>();
        for (const item of items) {
            if (!item.productVariantId || !item.quantity) continue;
            const computed = await computeBaseQty(prisma as any, {
                productVariantId: item.productVariantId,
                quantity: item.quantity,
                unitId: item.unitId,
            });
            const vid = item.productVariantId;
            const ref = ceqRefMap.get(item.customerEquipmentId) ?? "";
            if (!variantMap.has(vid)) variantMap.set(vid, { baseQty: 0, refs: new Set() });
            const entry = variantMap.get(vid)!;
            entry.baseQty += computed.baseQty.toNumber();
            entry.refs.add(ref);
        }

        if (variantMap.size === 0) { res.json([]); return; }

        // Match productVariantId → orderItemId within this order
        const orderItems = await prisma.orderItem.findMany({
            where: { orderId, productVariantId: { in: [...variantMap.keys()] }, ItemType: "PRODUCT" },
            select: { id: true, productVariantId: true },
        });

        const result = orderItems
            .map((oi) => {
                const entry = variantMap.get(oi.productVariantId!);
                if (!entry) return null;
                return {
                    orderItemId: oi.id,
                    productVariantId: oi.productVariantId,
                    ceqReturnedBaseQty: entry.baseQty,
                    ceqRefs: [...entry.refs],
                };
            })
            .filter(Boolean);

        res.json(result);
    } catch (error) {
        logger.error("Error fetching CEQ returned quantities:", error);
        res.status(500).json({ message: "Error fetching CEQ returned quantities" });
    }
};

// ── DELETE ───────────────────────────────────────────────────────────────────
export const deleteCustomerEquipment = async (req: Request, res: Response): Promise<void> => {
    try {
        const loggedInUser = req.user;
        if (!loggedInUser) { res.status(401).json({ message: "Unauthenticated." }); return; }

        const id = Number(req.params.id);
        const record = await prisma.customerEquipment.findUnique({ where: { id } });
        if (!record) { res.status(404).json({ message: "Record not found." }); return; }

        // Returned records are permanent audit history — block deletion
        if (record.returnedAt) {
            res.status(400).json({ message: "Returned records cannot be deleted. They serve as permanent assignment history." });
            return;
        }

        const currentDate = nowDate();

        // Fetch items to reverse effects if the record was never returned and has no linked order
        const existingItems = await prisma.customerEquipmentItem.findMany({
            where: { customerEquipmentId: id },
            select: { productAssetItemId: true, productVariantId: true, quantity: true, unitId: true },
        });

        await prisma.$transaction(async (tx) => {
            // Only reverse if the equipment is still active (not returned) and has no linked invoice
            if (!record.returnedAt && !record.orderId) {
                await applyDbItemEffects(tx, existingItems, record.branchId, record.assignType, "REVERSE", loggedInUser.id, currentDate);
            }

            // Items cascade-delete automatically via DB relation
            await tx.customerEquipment.delete({ where: { id } });
        });

        res.status(200).json({ message: "Deleted successfully." });
    } catch (error) {
        logger.error("Error deleting customer equipment:", error);
        const typedError = error as Error;
        res.status(500).json({ message: typedError.message });
    }
};

// ─── Swap Serial Number ───────────────────────────────────────────────────────
export const swapSerialInCustomerEquipment = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const rawId = req.params.id;
        const ceqId = Number(Array.isArray(rawId) ? rawId[0] : rawId);
        const { oldSerialId, newSerialId, reason } = req.body as {
            oldSerialId: number;
            newSerialId: number;
            reason: string;
        };
        const userId = req.user?.id ?? 0;
        const currentDate = nowDate();

        if (!oldSerialId || !newSerialId) {
            res.status(400).json({ message: "oldSerialId and newSerialId are required." });
            return;
        }
        if (!reason?.trim()) {
            res.status(400).json({ message: "A reason is required for serial swap." });
            return;
        }
        if (oldSerialId === newSerialId) {
            res.status(400).json({ message: "Old and new serial are the same." });
            return;
        }

        const record = await prisma.customerEquipment.findUnique({
            where: { id: ceqId },
            include: { items: { include: { productAssetItem: true } } },
        });

        if (!record) { res.status(404).json({ message: "Customer Equipment not found." }); return; }
        if (record.returnedAt) { res.status(400).json({ message: "Cannot swap serials on a returned record." }); return; }

        // Find the CEQ item holding the old serial
        const ceqItem = record.items.find(i => i.productAssetItemId === oldSerialId);
        if (!ceqItem) {
            res.status(400).json({ message: "Old serial not found in this equipment record." });
            return;
        }

        // Validate new serial: must be IN_STOCK, same branch, same variant
        const newSerial = await prisma.productAssetItem.findUnique({ where: { id: newSerialId } });
        if (!newSerial) { res.status(404).json({ message: "New serial not found." }); return; }
        if (newSerial.status !== "IN_STOCK") {
            res.status(400).json({ message: `Serial is not available (status: ${newSerial.status}).` });
            return;
        }
        if (newSerial.branchId !== record.branchId) {
            res.status(400).json({ message: "New serial must be from the same branch." });
            return;
        }
        if (newSerial.productVariantId !== ceqItem.productAssetItem?.productVariantId) {
            res.status(400).json({ message: "New serial must be for the same product variant." });
            return;
        }

        const variantId = newSerial.productVariantId;
        const branchId  = record.branchId;
        const newStatus = serialStatusForAssign(record.assignType);

        // Only look up invoice link when an order is actually linked
        const oldOrderItemAssetItem = record.orderId
            ? await prisma.orderItemAssetItem.findFirst({
                where: {
                    productAssetItemId: oldSerialId,
                    orderItem: { orderId: record.orderId },
                },
                select: { id: true, orderItemId: true },
              })
            : null;

        await prisma.$transaction(async (tx) => {
            // 1. Restore old serial → IN_STOCK, clear invoice link
            await tx.productAssetItem.update({
                where: { id: oldSerialId },
                data: { status: "IN_STOCK", soldOrderItemId: null },
            });
            await adjustStocks(tx, variantId, branchId, 1, userId, currentDate);

            // 2. Assign new serial → SOLD/RESERVED, set invoice link
            await tx.productAssetItem.update({
                where: { id: newSerialId },
                data: { status: newStatus as any, soldOrderItemId: oldOrderItemAssetItem?.orderItemId ?? null },
            });
            await adjustStocks(tx, variantId, branchId, -1, userId, currentDate);

            // 3. Swap OrderItemAssetItem so the invoice shows the new serial
            if (oldOrderItemAssetItem) {
                await tx.orderItemAssetItem.delete({ where: { id: oldOrderItemAssetItem.id } });
                await tx.orderItemAssetItem.create({
                    data: {
                        orderItemId:        oldOrderItemAssetItem.orderItemId,
                        productAssetItemId: newSerialId,
                    },
                });
            }

            // 4. Update CEQ item to reference new serial
            await tx.customerEquipmentItem.update({
                where: { id: ceqItem.id },
                data: { productAssetItemId: newSerialId },
            });

            // 5. Append swap record to note for audit trail
            const oldSN = ceqItem.productAssetItem?.serialNumber ?? String(oldSerialId);
            const newSN = newSerial.serialNumber ?? String(newSerialId);
            const swapNote = `[SWAP ${dayjs().tz(tz).format("YYYY-MM-DD HH:mm")}] ${oldSN} → ${newSN}. Reason: ${reason.trim()}`;
            const currentNote = record.note ?? "";
            const updatedNote = currentNote ? `${currentNote}\n${swapNote}` : swapNote;
            await tx.customerEquipment.update({
                where: { id: ceqId },
                data: { note: updatedNote, updatedAt: currentDate, updatedBy: userId },
            });

            // 6. Update linked Stock Request trackedPayload — replace old serial ID with new one
            const srId = (record as any).stockRequestId as number | null;
            if (srId) {
                const details = await tx.requestDetails.findMany({
                    where: { requestId: srId, productVariantId: variantId },
                    select: { id: true, trackedPayload: true },
                });
                for (const detail of details) {
                    if (!detail.trackedPayload) continue;
                    try {
                        const payload = JSON.parse(detail.trackedPayload);
                        const ids: number[] = payload.selectedIds ?? [];
                        const idx = ids.indexOf(oldSerialId);
                        if (idx !== -1) {
                            ids[idx] = newSerialId;
                            await tx.requestDetails.update({
                                where: { id: detail.id },
                                data: { trackedPayload: JSON.stringify({ ...payload, selectedIds: ids }) },
                            });
                        }
                    } catch (_) { /* malformed payload — skip */ }
                }
            }
        });

        // Return the updated record
        const updated = await prisma.customerEquipment.findUnique({
            where: { id: ceqId },
            include: {
                branch: { select: { name: true } },
                customer: { select: { name: true, phone: true } },
                items: {
                    include: {
                        productAssetItem: { include: { productVariant: { include: { products: true } } } },
                    },
                },
            },
        });

        res.status(200).json(updated);
    } catch (error) {
        logger.error("Error swapping serial:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
