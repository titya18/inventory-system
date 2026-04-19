import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
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
                customer: { select: { id: true, name: true, phone: true, email: true, address: true } },
                branch:   { select: { id: true, name: true } },
                order:    { select: { id: true, ref: true } },
                creator:  { select: { id: true, firstName: true, lastName: true } },
                updater:  { select: { id: true, firstName: true, lastName: true } },
                ...itemInclude,
            },
        });
        if (!record) { res.status(404).json({ message: "Record not found." }); return; }
        res.status(200).json(record);
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
        const variantId = getQueryNumber(req.query.variantId, 0)!;
        const branchId  = getQueryNumber(req.query.branchId,  0)!;

        if (!variantId || !branchId) {
            res.status(400).json({ message: "variantId and branchId are required." });
            return;
        }

        // Return all serials so the frontend can warn about SOLD/RESERVED ones.
        // Frontend controls selectability: only IN_STOCK serials are selectable.
        const items = await prisma.productAssetItem.findMany({
            where: { productVariantId: variantId, branchId },
            orderBy: { id: "asc" },
            select: {
                id: true, serialNumber: true, assetCode: true, macAddress: true, status: true,
                // For SOLD serials: include the invoice ref so frontend can tell the user which invoice to link
                orderItemLinks: {
                    select: {
                        orderItem: {
                            select: {
                                order: {
                                    select: { id: true, ref: true, customer: { select: { name: true } } },
                                },
                            },
                        },
                    },
                    take: 1,
                },
            },
        });

        res.status(200).json(items);
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
            },
        });

        res.status(200).json(orders);
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
                data:  { status: direction === "APPLY" ? serialStatusForAssign(assignType) : "IN_STOCK" },
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
                data:  { status: direction === "APPLY" ? serialStatusForAssign(assignType) : "IN_STOCK" },
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

        const { customerId, branchId, assignType, assignedAt, orderId, note, items } = req.body;

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

        // Validate orderId
        if (orderId) {
            const order = await prisma.order.findUnique({ where: { id: Number(orderId) }, select: { id: true } });
            if (!order) { res.status(400).json({ message: `Invoice/Order ID ${orderId} does not exist.` }); return; }
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
            const created = await tx.customerEquipment.create({
                data: {
                    ref,
                    customerId: Number(customerId),
                    branchId:   Number(branchId),
                    assignType: assignType as any,
                    assignedAt: dayjs(assignedAt).startOf("day").toDate(),
                    orderId:    orderId ? Number(orderId) : null,
                    note:       note ?? null,
                    createdAt:  currentDate,
                    createdBy:  loggedInUser.id,
                    updatedAt:  currentDate,
                    updatedBy:  loggedInUser.id,
                    items: { create: itemCreates },
                },
                include: {
                    customer: { select: { id: true, name: true, phone: true } },
                    branch:   { select: { id: true, name: true } },
                    ...itemInclude,
                },
            });

            // Apply stock effects only when there is no linked invoice/order
            if (!orderId) {
                await applyPayloadEffects(tx, items, Number(branchId), assignType, "APPLY", loggedInUser.id, currentDate);
            }

            return created;
        });

        res.status(201).json(record);
    } catch (error) {
        logger.error("Error creating customer equipment:", error);
        const typedError = error as Error;
        res.status(500).json({ message: typedError.message });
    }
};

// ── RETURN ───────────────────────────────────────────────────────────────────
export const returnCustomerEquipment = async (req: Request, res: Response): Promise<void> => {
    try {
        const loggedInUser = req.user;
        if (!loggedInUser) { res.status(401).json({ message: "Unauthenticated." }); return; }

        const id = Number(req.params.id);
        const { returnedAt, note } = req.body;

        const record = await prisma.customerEquipment.findUnique({ where: { id } });
        if (!record)           { res.status(404).json({ message: "Record not found." }); return; }
        if (record.returnedAt) { res.status(400).json({ message: "Equipment already marked as returned." }); return; }

        // Fetch items so we can reverse their stock effects
        const existingItems = await prisma.customerEquipmentItem.findMany({
            where: { customerEquipmentId: id },
            select: { productAssetItemId: true, productVariantId: true, quantity: true, unitId: true },
        });

        const currentDate = nowDate();

        const updated = await prisma.$transaction(async (tx) => {
            // Reverse stock effects only when there is no linked invoice/order
            if (!record.orderId) {
                await applyDbItemEffects(tx, existingItems, record.branchId, record.assignType, "REVERSE", loggedInUser.id, currentDate);
            }

            return tx.customerEquipment.update({
                where: { id },
                data: {
                    returnedAt: returnedAt ? dayjs(returnedAt).startOf("day").toDate() : currentDate,
                    note:       note !== undefined ? note : record.note,
                    updatedAt:  currentDate,
                    updatedBy:  loggedInUser.id,
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
        const { customerId, assignType, assignedAt, orderId, note, items } = req.body;

        const record = await prisma.customerEquipment.findUnique({ where: { id } });
        if (!record)           { res.status(404).json({ message: "Record not found." }); return; }
        if (record.returnedAt) { res.status(400).json({ message: "Cannot edit a returned record." }); return; }

        // Validate orderId
        if (orderId) {
            const order = await prisma.order.findUnique({ where: { id: Number(orderId) }, select: { id: true } });
            if (!order) { res.status(400).json({ message: `Invoice/Order ID ${orderId} does not exist.` }); return; }
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

        const oldOrderId   = record.orderId;
        const newOrderId   = orderId !== undefined ? (orderId ? Number(orderId) : null) : oldOrderId;
        const newAssignType = assignType !== undefined ? assignType : record.assignType;

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
            // Reverse old stock effects only when items are being replaced AND old record had no linked invoice
            if (!oldOrderId && Array.isArray(items)) {
                await applyDbItemEffects(tx, oldItems, record.branchId, record.assignType, "REVERSE", loggedInUser.id, currentDate);
            }

            const result = await tx.customerEquipment.update({
                where: { id },
                data: {
                    ...(customerId !== undefined && { customerId: Number(customerId) }),
                    ...(assignType !== undefined && { assignType: assignType as any }),
                    ...(assignedAt !== undefined && { assignedAt: dayjs(assignedAt).startOf("day").toDate() }),
                    orderId:   orderId !== undefined ? (orderId ? Number(orderId) : null) : undefined,
                    note:      note    !== undefined ? note : undefined,
                    updatedAt: currentDate,
                    updatedBy: loggedInUser.id,
                    ...itemsWrite,
                },
                include: {
                    customer: { select: { id: true, name: true, phone: true } },
                    branch:   { select: { id: true, name: true } },
                    order:    { select: { id: true, ref: true } },
                    ...itemInclude,
                },
            });

            // Apply new stock effects if new record has no linked invoice/order
            if (!newOrderId && Array.isArray(items)) {
                await applyPayloadEffects(tx, items, record.branchId, newAssignType, "APPLY", loggedInUser.id, currentDate);
            }

            return result;
        });

        res.status(200).json(updated);
    } catch (error) {
        logger.error("Error updating customer equipment:", error);
        const typedError = error as Error;
        res.status(500).json({ message: typedError.message });
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
