import e, { Request, Response } from "express";
import { ItemType } from "@prisma/client";
import { DateTime } from "luxon";
import logger from "../utils/logger";
import { Decimal } from "@prisma/client/runtime/library"
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { getQueryNumber, getQueryString } from "../utils/request";
import { computeBaseQty } from "../utils/uom";
import { prisma } from "../lib/prisma";

dayjs.extend(utc);
dayjs.extend(timezone);
const tz = "Asia/Phnom_Penh";
const now = dayjs().tz(tz);
const currentDate = new Date(Date.UTC(now.year(), now.month(), now.date(), now.hour(), now.minute(), now.second()));

export const getAllSaleReturnsWithPagination = async (req: Request, res: Response): Promise<void> => {
    try {
        const pageSize = getQueryNumber(req.query.pageSize, 10)!;
        const pageNumber = getQueryNumber(req.query.page, 1)!;
        const searchTerm = getQueryString(req.query.searchTerm, "")!.trim();
        const rawSortField = getQueryString(req.query.sortField, "ref")!;
        const sortField = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(rawSortField) ? rawSortField : "ref";
        const sortOrder = getQueryString(req.query.sortOrder)?.toLowerCase() === "asc" ? "desc" : "asc";
        const offset = (pageNumber - 1) * pageSize;

        const loggedInUser = req.user;
        if (!loggedInUser) {
            res.status(401).json({ message: "User is not authenticated." });
            return;
        }

        // Base LIKE term
        const likeTerm = `%${searchTerm}%`;

        // Split into words ("Lorn Titya")
        const searchWords = searchTerm.split(/\s+/).filter(Boolean);

        // Build full name conditions
        const fullNameConditions = searchWords
            .map((_, idx) => `
                (c."firstName" ILIKE $${idx + 2} OR c."lastName" ILIKE $${idx + 2}
                 OR u."firstName" ILIKE $${idx + 2} OR u."lastName" ILIKE $${idx + 2}
                 OR cs."name" ILIKE $${idx + 2}
                 OR br."name" ILIKE $${idx + 2})
            `)
            .join(" AND ");

        // Build parameters: $1 = likeTerm, $2..$n = searchword, $n+1 = limit, $n+2 = offset
        const params = [likeTerm, ...searchWords.map(w => `%${w}%`), pageSize, offset];

        // Branch restriction
        let branchRestriction = "";
        if (loggedInUser.roleType === "USER" && loggedInUser.branchId) {
            branchRestriction = `
                AND rd."branchId" = ${loggedInUser.branchId}
                AND rd."createdBy" = ${loggedInUser.id}
            `;
        }

        // If we want to use this AND condition, we need to copy it and past below WHERE 1=1 ${branchRestriction}
        // AND (
        //             rd."status" NOT IN ('COMPLETED', 'CANCELLED')
        //             OR rd."orderDate"::date >= CURRENT_DATE
        //         )

        // ----- 1) COUNT -----
        const totalResult: any = await prisma.$queryRawUnsafe(`
            SELECT COUNT(*) AS total
            FROM "SaleReturns" sr
            LEFT JOIN "Order" rd ON sr."orderId" = rd.id
            LEFT JOIN "Customer" cs ON sr."customerId" = cs.id
            LEFT JOIN "Branch" br ON sr."branchId" = br.id
            LEFT JOIN "User" c ON sr."createdBy" = c.id
            LEFT JOIN "User" u ON sr."updatedBy" = u.id
            WHERE 1=1
                ${branchRestriction}
                AND (
                    sr."ref" ILIKE $1
                    OR rd."ref" ILIKE $1
                    OR cs."name" ILIKE $1
                    OR br."name" ILIKE $1
                    OR TO_CHAR(sr."createdAt", 'YYYY-MM-DD HH24:MI:SS') ILIKE $1
                    OR TO_CHAR(sr."updatedAt", 'YYYY-MM-DD HH24:MI:SS') ILIKE $1
                    OR TO_CHAR(sr."createdAt", 'DD / Mon / YYYY HH24:MI:SS') ILIKE $1
                    OR TO_CHAR(sr."updatedAt", 'DD / Mon / YYYY HH24:MI:SS') ILIKE $1
                    ${fullNameConditions ? `OR (${fullNameConditions})` : ""}
                )
        `, ...params.slice(0, params.length - 2));

        const total = parseInt(totalResult[0]?.total ?? 0, 10);

        // If we want to use this AND condition, we need to copy it and past below WHERE 1=1 ${branchRestriction}
        // AND (
        //     rd."status" NOT IN ('COMPLETED', 'CANCELLED')
        //     OR rd."orderDate"::date >= CURRENT_DATE
        // )
        // ----- 2) DATA FETCH -----
        const invoices: any = await prisma.$queryRawUnsafe(`
            SELECT sr.*,
                   json_build_object('id', rd.id, 'ref', rd.ref) AS order,
                   json_build_object('id', cs.id, 'name', cs.name) AS customer,
                   json_build_object('id', br.id, 'name', br.name) AS branch,
                   json_build_object('id', c.id, 'firstName', c."firstName", 'lastName', c."lastName") AS creator,
                   json_build_object('id', u.id, 'firstName', u."firstName", 'lastName', u."lastName") AS updater
            FROM "SaleReturns" sr
            LEFT JOIN "Order" rd ON sr."orderId" = rd.id
            LEFT JOIN "Customer" cs ON sr."customerId" = cs.id
            LEFT JOIN "Branch" br ON sr."branchId" = br.id
            LEFT JOIN "User" c ON sr."createdBy" = c.id
            LEFT JOIN "User" u ON sr."updatedBy" = u.id
            WHERE 1=1
                ${branchRestriction}
                AND (
                    sr."ref" ILIKE $1
                    OR rd."ref" ILIKE $1
                    OR cs."name" ILIKE $1
                    OR br."name" ILIKE $1
                    OR TO_CHAR(sr."createdAt", 'YYYY-MM-DD HH24:MI:SS') ILIKE $1
                    OR TO_CHAR(sr."updatedAt", 'YYYY-MM-DD HH24:MI:SS') ILIKE $1
                    OR TO_CHAR(sr."createdAt", 'DD / Mon / YYYY HH24:MI:SS') ILIKE $1
                    OR TO_CHAR(sr."updatedAt", 'DD / Mon / YYYY HH24:MI:SS') ILIKE $1
                    ${fullNameConditions ? `OR (${fullNameConditions})` : ""}
                )
            ORDER BY sr."${sortField}" ${sortOrder}
            LIMIT $${params.length - 1} OFFSET $${params.length}
        `, ...params);

        res.status(200).json({ data: invoices, total });

    } catch (error) {
        console.error("Error fetching sale returns:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const createSaleReturn = async (
    req: Request,
    res: Response
): Promise<void> => {
    const {
        orderId,
        branchId,
        customerId,
        status,
        note,
        items,
    } = req.body;

    if (!items || items.length === 0) {
        res.status(400).json({ message: "No items to return" });
        return;
    }

    const userId = req.user?.id;
    const now = new Date();

    try {
        const result = await prisma.$transaction(async (tx) => {
            /* -------------------------------------------------------
            1️⃣ LOAD ORDER
            ------------------------------------------------------- */
            const order = await tx.order.findUnique({
                where: { id: Number(orderId) },
                select: {
                    id: true,
                    discount: true,
                    taxRate: true,
                },
            });

            if (!order) throw new Error("Order not found");

            /* -------------------------------------------------------
            2️⃣ GENERATE RETURN REF
            ------------------------------------------------------- */
            let ref = "SR-00001";

            const lastReturn = await tx.saleReturns.findFirst({
                where: { branchId: Number(branchId) },
                orderBy: { id: "desc" },
            });

            if (lastReturn?.ref) {
                const lastNo = parseInt(lastReturn.ref.split("-")[1]) || 0;
                ref = `SR-${String(lastNo + 1).padStart(5, "0")}`;
            }

            /* -------------------------------------------------------
            3️⃣ RETURN ITEMS SUBTOTAL
            ------------------------------------------------------- */
            let itemsSubtotal = 0;

            for (const item of items) {
                const qty =
                    item.ItemType === "PRODUCT"
                        ? Number(item.unitQty ?? item.quantity ?? 0)
                        : Number(item.quantity ?? 0);

                const netUnit =
                    item.discountMethod === "Fixed"
                        ? Number(item.price) - Number(item.discount || 0)
                        : Number(item.price) * ((100 - Number(item.discount || 0)) / 100);

                itemsSubtotal += netUnit * qty;
            }

            if (itemsSubtotal <= 0) {
                throw new Error("Invalid return subtotal");
            }

            /* -------------------------------------------------------
            4️⃣ FULL ORDER SUBTOTAL
            ------------------------------------------------------- */
            const orderItemsAgg = await tx.orderItem.aggregate({
                where: { orderId: Number(orderId) },
                _sum: { total: true },
            });

            const invoiceSubtotal = Number(orderItemsAgg._sum.total || 0);
            if (invoiceSubtotal <= 0) {
                throw new Error("Invalid invoice subtotal");
            }

            /* -------------------------------------------------------
            5️⃣ PRORATE DISCOUNT & TAX
            ------------------------------------------------------- */
            const returnRatio = itemsSubtotal / invoiceSubtotal;

            const rawReturnDiscount =
                Number(order.discount || 0) * returnRatio;

            const taxableAmount = itemsSubtotal - rawReturnDiscount;

            const rawReturnTax =
                taxableAmount * (Number(order.taxRate || 0) / 100);

            /* -------------------------------------------------------
            6️⃣ PREVIOUS RETURNS (DISCOUNT + TAX)
            ------------------------------------------------------- */
            const previousReturns = await tx.saleReturns.aggregate({
                where: { orderId: Number(orderId) },
                _sum: {
                    discount: true,
                    taxNet: true,
                },
            });

            const prevDiscount = Number(previousReturns._sum.discount || 0);
            const prevTax = Number(previousReturns._sum.taxNet || 0);

            const maxOrderTax =
                (invoiceSubtotal - Number(order.discount || 0)) *
                (Number(order.taxRate || 0) / 100);

            const remainingDiscount =
                Number(order.discount || 0) - prevDiscount;

            const remainingTax =
                maxOrderTax - prevTax;

            const returnDiscount = Math.min(rawReturnDiscount, remainingDiscount);
            const returnTax = Math.min(rawReturnTax, remainingTax);

            const returnTotal =
                taxableAmount - (rawReturnDiscount - returnDiscount) + returnTax;

            /* -------------------------------------------------------
            7️⃣ CREATE SALE RETURN
            ------------------------------------------------------- */
            const saleReturn = await tx.saleReturns.create({
                data: {
                    orderId: Number(orderId),
                    branchId: Number(branchId),
                    customerId: customerId ? Number(customerId) : null,
                    ref,
                    discount: returnDiscount,
                    taxRate: order.taxRate,
                    taxNet: returnTax,
                    shipping: 0,
                    totalAmount: returnTotal,
                    status,
                    note,
                    createdBy: userId,
                    updatedBy: userId,
                    createdAt: currentDate,
                    updatedAt: currentDate,
                },
            });

            /* -------------------------------------------------------
            8️⃣ PROCESS RETURN ITEMS
            ------------------------------------------------------- */
            for (const item of items) {
                const isProduct = item.ItemType === "PRODUCT";

                const saleItemId = Number(item.orderItemId ?? item.saleItemId);
                if (!saleItemId) {
                    throw new Error("saleItemId/orderItemId is required");
                }

                let unitId: number | null = null;
                let unitQty: Decimal | null = null;
                let baseQty: Decimal | null = null;

                if (isProduct) {
                    if (!item.productVariantId) {
                        throw new Error("Product return requires productVariantId");
                    }

                    const computed = await computeBaseQty(tx, {
                        productVariantId: Number(item.productVariantId),
                        unitId: item.unitId ? Number(item.unitId) : undefined,
                        unitQty: item.unitQty ?? item.quantity ?? 0,
                    });

                    unitId = computed.unitId;
                    unitQty = computed.unitQty;
                    baseQty = computed.baseQty;
                } else {
                    unitId = null;
                    unitQty = null;
                    baseQty = null;
                }

                /* -----------------------------
                RESOLVE TARGET VARIANT
                (New → SecondHand if user chose)
                ----------------------------- */
                let targetVariantId = isProduct ? Number(item.productVariantId) : 0;
                if (isProduct && item.convertToSecondHand) {
                    const origVariant = await tx.productVariants.findUnique({
                        where: { id: Number(item.productVariantId) },
                    });
                    if (origVariant?.productType === "New") {
                        let shVariant = await tx.productVariants.findFirst({
                            where: { productId: origVariant.productId, productType: "SecondHand" },
                            select: { id: true },
                        });
                        if (!shVariant) {
                            shVariant = await tx.productVariants.create({
                                data: {
                                    productId: origVariant.productId,
                                    productType: "SecondHand",
                                    sku: origVariant.sku,
                                    barcode: origVariant.barcode,
                                    name: origVariant.name,
                                    trackingType: origVariant.trackingType,
                                    stockAlert: origVariant.stockAlert,
                                    purchasePrice: origVariant.purchasePrice,
                                    purchasePriceUnitId: origVariant.purchasePriceUnitId,
                                    retailPrice: origVariant.retailPrice,
                                    retailPriceUnitId: origVariant.retailPriceUnitId,
                                    wholeSalePrice: origVariant.wholeSalePrice,
                                    wholeSalePriceUnitId: origVariant.wholeSalePriceUnitId,
                                    baseUnitId: origVariant.baseUnitId,
                                    isActive: origVariant.isActive,
                                    createdBy: userId,
                                    updatedBy: userId,
                                    createdAt: currentDate,
                                    updatedAt: currentDate,
                                },
                                select: { id: true },
                            });
                            logger.info(`Sale return: auto-created SecondHand variant ${shVariant.id} from New variant ${item.productVariantId}`);
                        }
                        targetVariantId = shVariant.id;
                        logger.info(`Sale return: converting variant ${item.productVariantId} → SecondHand variant ${shVariant.id}`);
                    }
                }

                /* -----------------------------
                CREATE RETURN ITEM
                ----------------------------- */
                const returnItem = await tx.saleReturnItems.create({
                    data: {
                        saleReturn: {
                            connect: { id: saleReturn.id },
                        },

                        saleItemId,
                        ItemType: item.ItemType,

                        quantity: isProduct
                            ? Number(unitQty ?? 0)
                            : Number(item.quantity ?? 0),

                        price: new Decimal(item.price ?? 0),
                        discount: new Decimal(item.discount ?? 0),
                        discountMethod: item.discountMethod,
                        taxNet: new Decimal(item.taxNet ?? 0),
                        taxMethod: item.taxMethod,
                        total: new Decimal(item.total ?? 0),

                        unitQty: isProduct ? unitQty : null,
                        baseQty: isProduct ? baseQty : null,

                        ...(isProduct && unitId
                            ? {
                                unit: {
                                    connect: { id: unitId },
                                },
                            }
                            : {}),

                        ...(item.productId
                            ? {
                                products: {
                                    connect: { id: Number(item.productId) },
                                },
                            }
                            : {}),

                        ...(item.productVariantId
                            ? {
                                productvariants: {
                                    connect: { id: Number(item.productVariantId) },
                                },
                            }
                            : {}),

                        ...(item.serviceId
                            ? {
                                services: {
                                    connect: { id: Number(item.serviceId) },
                                },
                            }
                            : {}),
                    },
                });

                /* =====================================================
                PRODUCT STOCK & FIFO RESTORE
                ===================================================== */
                if (isProduct) {
                    const orderItem = await tx.orderItem.findUnique({
                        where: { id: saleItemId },
                    });

                    if (!orderItem) {
                        throw new Error(`Order item ${saleItemId} not found`);
                    }

                    /* =====================================================
                    SERIAL RETURN LOGIC (ADD THIS)
                    ===================================================== */
                    if (item.selectedTrackedItemIds && item.selectedTrackedItemIds.length > 0) {
                        // 1. Get sold serials for this order item
                        const soldRows = await tx.orderItemAssetItem.findMany({
                            where: {
                                orderItemId: saleItemId,
                            },
                        });

                        const soldIds = soldRows.map((x) => x.productAssetItemId);

                        // 2. Validate returned serials
                        for (const sid of item.selectedTrackedItemIds) {
                            if (!soldIds.includes(sid)) {
                                throw new Error(`Invalid serial return: ${sid}`);
                            }
                        }

                        // 3. Restore asset items (loop so we can update productVariantId per serial)
                        for (const sid of item.selectedTrackedItemIds) {
                            await tx.productAssetItem.update({
                                where: { id: sid },
                                data: {
                                    status: "IN_STOCK",
                                    soldOrderItemId: null,
                                    productVariantId: targetVariantId,
                                },
                            });
                        }

                        // 4. Remove link from order
                        await tx.orderItemAssetItem.deleteMany({
                            where: {
                                orderItemId: saleItemId,
                                productAssetItemId: {
                                    in: item.selectedTrackedItemIds,
                                },
                            },
                        });
                    }

                    const returnedAgg = await tx.saleReturnItems.aggregate({
                        where: { saleItemId },
                        _sum: { baseQty: true },
                    });

                    const alreadyReturnedBaseQty = Number(returnedAgg._sum.baseQty || 0);
                    const soldBaseQty = Number((orderItem as any).baseQty ?? orderItem.quantity ?? 0);

                    if (alreadyReturnedBaseQty > soldBaseQty) {
                        throw new Error(
                            `Return exceeds available quantity for order item ${saleItemId}`
                        );
                    }

                    let qtyToRestore = new Decimal(baseQty ?? 0);

                    const soldMovements = await tx.stockMovements.findMany({
                        where: {
                            orderItemId: saleItemId,
                            productVariantId: Number(item.productVariantId),
                            branchId: Number(branchId),
                            type: "ORDER",
                            status: "APPROVED",
                        },
                        orderBy: { createdAt: "asc" },
                    });

                    for (const mov of soldMovements) {
                        if (qtyToRestore.lte(0)) break;

                        const soldQty = new Decimal(Math.abs(Number(mov.quantity)));
                        const restoreQty = Decimal.min(soldQty, qtyToRestore);

                        await tx.stockMovements.create({
                            data: {
                                productVariantId: targetVariantId,
                                branchId: Number(branchId),
                                orderItemId: saleItemId,
                                saleReturnItemId: returnItem.id,
                                type: "SALE_RETURN",
                                status: "APPROVED",
                                quantity: restoreQty,
                                unitCost: mov.unitCost,
                                sourceMovementId: mov.id,
                                remainingQty: restoreQty,
                                note: `Sale Return #${ref}`,
                                createdBy: userId,
                                approvedBy: userId,
                                createdAt: currentDate,
                                approvedAt: currentDate,
                            },
                        });

                        qtyToRestore = qtyToRestore.minus(restoreQty);
                    }

                    if (qtyToRestore.gt(0)) {
                        throw new Error("FIFO restore quantity mismatch");
                    }

                    await tx.stocks.upsert({
                        where: {
                            productVariantId_branchId: {
                                productVariantId: targetVariantId,
                                branchId: Number(branchId),
                            },
                        },
                        update: {
                            quantity: { increment: baseQty ?? new Decimal(0) },
                            updatedBy: userId,
                            updatedAt: currentDate,
                        },
                        create: {
                            productVariantId: targetVariantId,
                            branchId: Number(branchId),
                            quantity: baseQty ?? new Decimal(0),
                            createdBy: userId,
                            updatedBy: userId,
                            createdAt: currentDate,
                            updatedAt: currentDate,
                        },
                    });
                }
            }

            /* -------------------------------------------------------
            9️⃣ PAYMENT REVERSAL (REFUND)
            ------------------------------------------------------- */
            const payments = await tx.orderOnPayments.findMany({
                where: { orderId: Number(orderId) },
            });

            for (const pay of payments) {
                if (Number(pay.totalPaid) > 0) {
                    await tx.orderOnPayments.create({
                        data: {
                            branchId: Number(branchId),
                            orderId: Number(orderId),
                            paymentDate: now,
                            paymentMethodId: pay.paymentMethodId,
                            totalPaid: new Decimal(-Number(pay.totalPaid)),
                            receive_usd: pay.receive_usd
                                ? new Decimal(-Number(pay.receive_usd))
                                : null,
                            receive_khr: pay.receive_khr
                                ? -Number(pay.receive_khr)
                                : null,
                            exchangerate: pay.exchangerate,
                            status: "REFUND",
                            createdBy: userId,
                        },
                    });
                }
            }

            /* -------------------------------------------------------
            🔟 UPDATE ORDER TOTAL
            ------------------------------------------------------- */
            await tx.order.update({
                where: { id: Number(orderId) },
                data: {
                    totalAmount: {
                        decrement: returnTotal,
                    },
                    returnstatus: 1,
                },
            });

            return saleReturn;
        });

        res.status(201).json(result);
    } catch (error: any) {
        console.error(error);
        res.status(500).json({
            message: error?.message || "Sale return failed",
        });
    }
};

export const getSaleReturnById = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    try {
        const saleReturn = await prisma.saleReturns.findMany({
            where: { orderId: Number(id) },
            include: {
                SaleReturns: {
                    include: {
                        unit: true,
                        products: {
                            include: {
                                unitConversions: {
                                    include: {
                                        fromUnit: { select: { id: true, name: true, type: true } },
                                        toUnit: { select: { id: true, name: true, type: true } },
                                    },
                                },
                            },
                        },
                        productvariants: {
                            include: {
                                baseUnit: {
                                    select: { id: true, name: true, type: true },
                                },
                            },
                        },
                        services: true,
                    },
                },
                customer: true, // Include related customer data
                branch: true, // Include related branch data
                creator: true, // Include related creator data
                updater: true, // Include related updater data
            }, // Include related quotation details
            // Include related quotation details
        });

        if (!saleReturn) {
            res.status(404).json({ message: "Sale Return not found!" });
            return;
        }

        res.status(200).json(saleReturn);
    } catch (error) {
        logger.error("Error fetching sale return by ID:", error);
        const typedError = error as Error;
        res.status(500).json({ message: typedError.message });
    }
};

export const getSaleReturnByReturnId = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    try {
        const saleReturn = await prisma.saleReturns.findUnique({
            where: { id: Number(id) },
            include: {
                branch: true,
                creator: true,
                updater: true,
                customer: true,
                SaleReturns: {
                    include: {
                        unit: true,
                        products: {
                            include: {
                                unitConversions: {
                                    include: {
                                        fromUnit: { select: { id: true, name: true, type: true } },
                                        toUnit: { select: { id: true, name: true, type: true } },
                                    },
                                },
                            },
                        },
                        productvariants: {
                            include: {
                                baseUnit: {
                                    select: { id: true, name: true, type: true },
                                },
                            },
                        },
                        services: true,
                    },
                },
            }, // Include related quotation details
            // Include related quotation detail
        });

        if (!saleReturn) {
            res.status(404).json({ message: "Sale Return not found!" });
            return;
        }

        res.status(200).json(saleReturn);
    } catch (error) {
        logger.error("Error fetching sale return by ID:", error);
        const typedError = error as Error;
        res.status(500).json({ message: typedError.message });
    }
};

export const getReturnTrackedItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const orderItemId = Number(req.query.orderItemId);

    if (!orderItemId) {
      res.status(400).json({ message: "orderItemId required" });
      return;
    }

    const rows = await prisma.orderItemAssetItem.findMany({
      where: { orderItemId },
      include: { productAssetItem: true },
    });

    // Get the orderId (invoice) that this orderItem belongs to
    const orderItem = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
      select: { orderId: true },
    });
    const orderId = orderItem?.orderId;

    const assetIds = rows.map((x) => x.productAssetItem.id);

    // Active CEQ assignments (not yet returned)
    const ceqAssigned = await prisma.customerEquipmentItem.findMany({
      where: {
        productAssetItemId: { in: assetIds },
        customerEquipment: { returnedAt: null },
      },
      select: { productAssetItemId: true, customerEquipment: { select: { ref: true } } },
    });
    const ceqActiveMap = new Map(ceqAssigned.map((r) => [r.productAssetItemId, (r.customerEquipment as any).ref as string]));

    // Past CEQ returns linked to THIS invoice — only these serials are already returned
    const ceqReturned = await prisma.customerEquipmentItem.findMany({
      where: {
        productAssetItemId: { in: assetIds },
        customerEquipment: {
          returnedAt: { not: null },
          ...(orderId ? { orderId } : {}),
        },
      },
      select: { productAssetItemId: true, customerEquipment: { select: { ref: true, returnedAt: true } } },
      orderBy: { customerEquipment: { returnedAt: "desc" } },
    });
    // Keep only the most-recent returned CEQ per serial
    const ceqReturnedMap = new Map<number, string>();
    for (const r of ceqReturned) {
      if (!ceqReturnedMap.has(r.productAssetItemId!)) {
        ceqReturnedMap.set(r.productAssetItemId!, (r.customerEquipment as any).ref as string);
      }
    }

    const result = rows.map((x) => {
      const ai = x.productAssetItem;
      const activeCeqAssigned = ceqActiveMap.has(ai.id);
      // Block only if the returned CEQ was linked to THIS same invoice
      const alreadyReturnedViaCeq = !activeCeqAssigned && ceqReturnedMap.has(ai.id);
      return {
        id: ai.id,
        branchId: ai.branchId,
        serialNumber: ai.serialNumber,
        assetCode: ai.assetCode,
        macAddress: ai.macAddress,
        status: ai.status,
        soldOrderItemId: ai.soldOrderItemId,
        activeCeqAssigned,
        ceqRef: ceqActiveMap.get(ai.id) ?? null,
        alreadyReturnedViaCeq,
        returnedCeqRef: alreadyReturnedViaCeq ? (ceqReturnedMap.get(ai.id) ?? null) : null,
      };
    });

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching return serials" });
  }
};


