import { Request, Response, NextFunction } from "express";
import { Decimal } from "@prisma/client/runtime/library";
import multer from "multer";
import fs from "fs";
import path from "path";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import logger from "../utils/logger";
import { getQueryNumber, getQueryString } from "../utils/request";
import { computeBaseQty } from "../utils/uom";
import { prisma } from "../lib/prisma";

dayjs.extend(utc);
dayjs.extend(timezone);
const tz = "Asia/Phnom_Penh";
const now = dayjs().tz(tz);
const currentDate = new Date(Date.UTC(now.year(), now.month(), now.date(), now.hour(), now.minute(), now.second()));

// ---------------------------------------------------------------------------
// Image upload (mirrors productController's pattern, own directory)
// ---------------------------------------------------------------------------

const packageImageDir = "public/images/packages/";

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        fs.mkdirSync(packageImageDir, { recursive: true });
        cb(null, packageImageDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const fileExtension = path.extname(file.originalname);
        cb(null, `${uniqueSuffix}${fileExtension}`);
    },
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
        return cb(new Error("Invalid file type. Only JPG, PNG, WEBP, GIF, and SVG are allowed."));
    }
    cb(null, true);
};

export const uploadPackageImage = (req: Request, res: Response, next: NextFunction) => {
    const upload = multer({
        storage,
        fileFilter,
        limits: { fileSize: 5 * 1024 * 1024 },
    }).array("images[]", 10);

    upload(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === "LIMIT_FILE_SIZE") {
                res.status(400).json({ message: "File too large. Maximum size is 5 MB." });
                return;
            }
            res.status(400).json({ message: `Multer error: ${err.message}` });
            return;
        } else if (err) {
            res.status(500).json({ message: `Unexpected error: ${(err as Error).message}` });
            return;
        }
        next();
    });
};

// ---------------------------------------------------------------------------
// Next SKU — auto-generates PKG-00001, PKG-00002, ... (globally unique,
// mirrors the ref-number pattern used for Purchase/Invoice/Quotation).
// Also used to pre-fill the Barcode field so a package is scannable at POS
// without the admin having to invent a code by hand.
// ---------------------------------------------------------------------------

export const getNextPackageSku = async (req: Request, res: Response): Promise<void> => {
    try {
        const prefix = "PKG-";

        const last = await prisma.package.findFirst({
            where: { sku: { startsWith: prefix } },
            orderBy: { id: "desc" },
            select: { sku: true },
        });

        let nextNumber = 1;
        if (last?.sku) {
            const parsed = parseInt(last.sku.slice(prefix.length), 10);
            if (!isNaN(parsed)) nextNumber = parsed + 1;
        }

        const sku = `${prefix}${String(nextNumber).padStart(5, "0")}`;
        res.status(200).json({ sku });
    } catch (error) {
        logger.error("Error generating next package SKU:", error);
        res.status(500).json({ message: (error as Error).message });
    }
};

// ---------------------------------------------------------------------------
// Availability — a persistent "how many can I still sell" figure for every
// active package at a given branch, computed the same way /explode does
// (per-component base-qty vs Stocks), just batched across all packages at
// once so it can be shown on the catalog list rather than only on add.
// ---------------------------------------------------------------------------

export const getPackagesAvailability = async (req: Request, res: Response): Promise<void> => {
    const branchId = getQueryNumber(req.query.branchId);
    if (!branchId) {
        res.status(400).json({ message: "branchId is required" });
        return;
    }

    try {
        const packages = await prisma.package.findMany({
            where: { deletedAt: null, isActive: 1 },
            select: {
                id: true,
                items: {
                    select: {
                        productVariantId: true,
                        quantity: true,
                        unitId: true,
                        productVariant: { select: { baseUnitId: true } },
                    },
                },
            },
        });

        const results = await Promise.all(
            packages.map(async (pkg) => {
                if (!pkg.items.length) return { packageId: pkg.id, maxSellable: 0 };

                const limits: number[] = [];
                for (const item of pkg.items) {
                    const { baseQty } = await computeBaseQty(prisma, {
                        productVariantId: item.productVariantId,
                        unitId: item.unitId ?? item.productVariant.baseUnitId,
                        unitQty: item.quantity,
                    });
                    if (baseQty.isZero()) continue;

                    const stock = await prisma.stocks.findUnique({
                        where: { productVariantId_branchId: { productVariantId: item.productVariantId, branchId } },
                    });
                    const available = stock ? new Decimal(stock.quantity) : new Decimal(0);
                    limits.push(available.div(baseQty).floor().toNumber());
                }

                const maxSellable = limits.length ? Math.max(0, Math.min(...limits)) : 0;
                return { packageId: pkg.id, maxSellable };
            })
        );

        res.status(200).json(results);
    } catch (error) {
        logger.error("Error computing package availability:", error);
        res.status(500).json({ message: (error as Error).message });
    }
};

// ---------------------------------------------------------------------------
// List / Read
// ---------------------------------------------------------------------------

export const getAllPackagesWithPagination = async (req: Request, res: Response): Promise<void> => {
    try {
        const allowedSortFields = new Set(["id", "name", "sku", "barcode", "packageRetailPrice", "createdAt", "updatedAt"]);

        const pageSize = getQueryNumber(req.query.pageSize, 10)!;
        const pageNumber = getQueryNumber(req.query.page, 1)!;
        const searchTerm = getQueryString(req.query.searchTerm, "")!.trim();
        const sortFieldRaw = getQueryString(req.query.sortField, "name")!;
        const sortField = allowedSortFields.has(sortFieldRaw) ? sortFieldRaw : "name";
        const sortOrder = getQueryString(req.query.sortOrder)?.toLowerCase() === "desc" ? "DESC" : "ASC";
        const offset = (pageNumber - 1) * pageSize;

        const likeTerm = `%${searchTerm}%`;

        const totalResult: any = await prisma.$queryRawUnsafe(
            `
            SELECT COUNT(*) AS total
            FROM "Package" p
            WHERE p."deletedAt" IS NULL
            AND (
                p."name" ILIKE $1
                OR p."sku" ILIKE $1
                OR p."barcode" ILIKE $1
            )
        `,
            likeTerm
        );

        const total = parseInt(totalResult[0]?.total ?? 0, 10);

        const packages: any = await prisma.$queryRawUnsafe(
            `
            SELECT
                p.*,
                json_build_object('id', cr.id, 'firstName', cr."firstName", 'lastName', cr."lastName") AS creator,
                json_build_object('id', up.id, 'firstName', up."firstName", 'lastName', up."lastName") AS updater,
                (
                    SELECT json_agg(json_build_object(
                        'id', pi.id,
                        'productVariantId', pi."productVariantId",
                        'quantity', pi."quantity",
                        'unitId', pi."unitId",
                        'variantName', pv."name",
                        'sku', pv."sku"
                    ))
                    FROM "PackageItems" pi
                    LEFT JOIN "ProductVariants" pv ON pv.id = pi."productVariantId"
                    WHERE pi."packageId" = p.id
                ) AS items
            FROM "Package" p
            LEFT JOIN "User" cr ON p."createdBy" = cr.id
            LEFT JOIN "User" up ON p."updatedBy" = up.id
            WHERE p."deletedAt" IS NULL
            AND (
                p."name" ILIKE $1
                OR p."sku" ILIKE $1
                OR p."barcode" ILIKE $1
            )
            ORDER BY p."${sortField}" ${sortOrder}
            LIMIT $2 OFFSET $3
        `,
            likeTerm,
            pageSize,
            offset
        );

        res.status(200).json({ data: packages, total });
    } catch (error) {
        logger.error("Error fetching packages:", error);
        res.status(500).json({ message: (error as Error).message });
    }
};

// Lightweight list for search widgets (POS / Invoice / Quotation package picker)
export const getAllPackages = async (req: Request, res: Response): Promise<void> => {
    try {
        const searchTerm = getQueryString(req.query.searchTerm, "")!.trim();

        const packages = await prisma.package.findMany({
            where: {
                deletedAt: null,
                isActive: 1,
                ...(searchTerm
                    ? {
                          OR: [
                              { name: { contains: searchTerm, mode: "insensitive" } },
                              { sku: { contains: searchTerm, mode: "insensitive" } },
                              { barcode: { contains: searchTerm, mode: "insensitive" } },
                          ],
                      }
                    : {}),
            },
            include: {
                items: {
                    include: {
                        productVariant: { select: { id: true, name: true, sku: true, barcode: true } },
                    },
                },
            },
            orderBy: { name: "asc" },
            take: 50,
        });

        res.status(200).json(packages);
    } catch (error) {
        logger.error("Error fetching packages:", error);
        res.status(500).json({ message: (error as Error).message });
    }
};

export const getPackageById = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    try {
        const pkg = await prisma.package.findUnique({
            where: { id: Number(id) },
            include: {
                items: {
                    include: {
                        productVariant: {
                            select: {
                                id: true,
                                name: true,
                                sku: true,
                                barcode: true,
                                trackingType: true,
                                baseUnitId: true,
                                retailPrice: true,
                                wholeSalePrice: true,
                            },
                        },
                        unit: true,
                    },
                },
            },
        });

        if (!pkg || pkg.deletedAt) {
            res.status(404).json({ message: "Package not found!" });
            return;
        }

        res.status(200).json(pkg);
    } catch (error) {
        logger.error("Error fetching package by ID:", error);
        res.status(500).json({ message: (error as Error).message });
    }
};

// ---------------------------------------------------------------------------
// Create / Update
// ---------------------------------------------------------------------------

export const upsertPackage = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const { name, sku, barcode, note, isActive, packageRetailPrice, packageWholeSalePrice, imagesToDelete, items } = req.body;

    let parsedItems: { productVariantId: number; quantity: number; unitId?: number }[] = [];
    if (typeof items === "string") {
        parsedItems = JSON.parse(items);
    } else if (Array.isArray(items)) {
        parsedItems = items.map((it: any) => ({
            productVariantId: Number(it.productVariantId),
            quantity: Number(it.quantity),
            unitId: it.unitId ? Number(it.unitId) : undefined,
        }));
    }

    const newImagePaths = req.files ? (req.files as Express.Multer.File[]).map((file) => file.path.replace(/^public[\\/]/, "")) : [];

    try {
        if (!name?.trim()) throw new Error("Package name is required");
        if (!packageRetailPrice) throw new Error("Package retail price is required");
        if (!parsedItems.length) throw new Error("Package must have at least one component");
        if (parsedItems.some((it) => !it.productVariantId || !it.quantity || it.quantity <= 0)) {
            throw new Error("Every component needs a product and a quantity greater than 0");
        }

        const result = await prisma.$transaction(async (tx) => {
            const packageId = id ? Number(id) : 0;

            let existing: { image: string[] } | null = null;
            if (packageId) {
                existing = await tx.package.findUnique({ where: { id: packageId }, select: { image: true } });
                if (!existing) throw new Error("Package not found!");
            }

            const dupeWhere: any = {
                deletedAt: null,
                OR: [{ name: name.trim() }, ...(sku ? [{ sku }] : []), ...(barcode ? [{ barcode }] : [])],
            };
            if (packageId) dupeWhere.id = { not: packageId };

            const dupe = await tx.package.findFirst({ where: dupeWhere });
            if (dupe) throw new Error("A package with this name, SKU, or barcode already exists");

            let imagePaths: string[] = existing?.image ?? [];
            if (imagesToDelete) {
                const toDelete: string[] = typeof imagesToDelete === "string" ? JSON.parse(imagesToDelete) : imagesToDelete;
                imagePaths = imagePaths.filter((p) => !toDelete.includes(p));
                for (const img of toDelete) {
                    const filePath = path.join("public", img);
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                }
            }
            imagePaths = [...imagePaths, ...newImagePaths];

            const data = {
                name: name.trim(),
                sku: sku?.trim() || null,
                barcode: barcode?.trim() || null,
                note: note ?? null,
                isActive: isActive !== undefined ? Number(isActive) : 1,
                packageRetailPrice: new Decimal(packageRetailPrice),
                packageWholeSalePrice: packageWholeSalePrice ? new Decimal(packageWholeSalePrice) : null,
                image: imagePaths,
                updatedAt: currentDate,
                updatedBy: req.user ? req.user.id : null,
            };

            const pkg = packageId
                ? await tx.package.update({ where: { id: packageId }, data })
                : await tx.package.create({
                      data: { ...data, createdAt: currentDate, createdBy: req.user ? req.user.id : null },
                  });

            await tx.packageItems.deleteMany({ where: { packageId: pkg.id } });
            await tx.packageItems.createMany({
                data: parsedItems.map((it) => ({
                    packageId: pkg.id,
                    productVariantId: it.productVariantId,
                    quantity: it.quantity,
                    unitId: it.unitId ?? null,
                })),
            });

            return pkg;
        });

        res.status(id ? 200 : 201).json(result);
    } catch (error) {
        logger.error("Error upserting package:", error);
        res.status(400).json({ message: (error as Error).message });
    }
};

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export const deletePackage = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    try {
        const pkg = await prisma.package.findUnique({ where: { id: Number(id) } });
        if (!pkg) {
            res.status(404).json({ message: "Package not found!" });
            return;
        }

        await prisma.package.update({
            where: { id: Number(id) },
            data: { deletedAt: currentDate, deletedBy: req.user ? req.user.id : null },
        });

        res.status(200).json(pkg);
    } catch (error) {
        logger.error("Error deleting package:", error);
        res.status(500).json({ message: (error as Error).message });
    }
};

// ---------------------------------------------------------------------------
// Explode — the core "how does selling a package cut stock" endpoint.
// Returns component sale-lines with allocated pricing so
// SUM(component.total) === packagePrice * qty, plus a branch-aware
// maxSellable figure so the frontend can block/warn before add-to-cart.
// Read-only: does not touch Stocks/StockMovements. Actual FIFO consumption
// happens later, per component line, through the normal invoice-approval
// path exactly like any other OrderItem.
// ---------------------------------------------------------------------------

export const explodePackage = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const packageId = Number(id);
    const qty = getQueryNumber(req.query.qty, 1)!;
    const branchId = getQueryNumber(req.query.branchId);
    const saleType = getQueryString(req.query.saleType, "RETAIL")!;

    try {
        if (qty <= 0) throw new Error("Quantity must be greater than 0");

        const pkg = await prisma.package.findUnique({
            where: { id: packageId },
            include: {
                items: {
                    include: {
                        productVariant: {
                            select: {
                                id: true,
                                productId: true,
                                name: true,
                                sku: true,
                                barcode: true,
                                trackingType: true,
                                baseUnitId: true,
                                retailPrice: true,
                                wholeSalePrice: true,
                                baseUnit: { select: { name: true } },
                            },
                        },
                    },
                },
            },
        });

        if (!pkg || pkg.deletedAt) {
            res.status(404).json({ message: "Package not found" });
            return;
        }
        if (!pkg.items.length) {
            res.status(400).json({ message: "Package has no components" });
            return;
        }

        const packageUnitPrice =
            saleType === "WHOLESALE" && pkg.packageWholeSalePrice ? new Decimal(pkg.packageWholeSalePrice) : new Decimal(pkg.packageRetailPrice);
        const packagePrice = packageUnitPrice.mul(qty);

        const packageMultiplier = new Decimal(qty);
        const perUnitLimits: number[] = [];
        const shortages: {
            productVariantId: number;
            name: string;
            sku: string | null;
            availableBaseQty: number;
            requiredBaseQty: number;
            baseUnitName: string | null;
        }[] = [];

        const componentCalcs = [];
        let totalWeight = new Decimal(0);

        for (const item of pkg.items) {
            const variant = item.productVariant;

            const { unitId, baseQty: baseQtyPerPackage, baseUnitId } = await computeBaseQty(prisma, {
                productVariantId: variant.id,
                unitId: item.unitId ?? variant.baseUnitId,
                unitQty: item.quantity,
            });

            const unitQtyForSale = new Decimal(item.quantity).mul(packageMultiplier);
            const baseQtyForSale = baseQtyPerPackage.mul(packageMultiplier);

            const unitPrice = saleType === "WHOLESALE" && variant.wholeSalePrice ? new Decimal(variant.wholeSalePrice) : new Decimal(variant.retailPrice ?? 0);

            const weight = unitPrice.mul(unitQtyForSale);
            totalWeight = totalWeight.add(weight);

            componentCalcs.push({ variant, unitId, unitQtyForSale, baseQtyForSale, baseUnitId, weight });

            if (branchId) {
                const stock = await prisma.stocks.findUnique({
                    where: { productVariantId_branchId: { productVariantId: variant.id, branchId } },
                });
                const available = stock ? new Decimal(stock.quantity) : new Decimal(0);
                if (!baseQtyPerPackage.isZero()) {
                    perUnitLimits.push(available.div(baseQtyPerPackage).floor().toNumber());
                }
                if (available.lt(baseQtyForSale)) {
                    shortages.push({
                        productVariantId: variant.id,
                        name: variant.name,
                        sku: variant.sku,
                        availableBaseQty: available.toDecimalPlaces(4).toNumber(),
                        requiredBaseQty: baseQtyForSale.toDecimalPlaces(4).toNumber(),
                        baseUnitName: variant.baseUnit?.name ?? null,
                    });
                }
            }
        }

        const maxSellable = branchId ? (perUnitLimits.length ? Math.max(0, Math.min(...perUnitLimits)) : 0) : null;
        const allocationRatio = totalWeight.isZero() ? new Decimal(0) : packagePrice.div(totalWeight);
        const packageGroupId = `PKG-${packageId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

        const components = componentCalcs.map((c) => {
            const total = c.weight.mul(allocationRatio);
            const price = c.unitQtyForSale.isZero() ? new Decimal(0) : total.div(c.unitQtyForSale);
            return {
                packageId,
                packageGroupId,
                productId: c.variant.productId,
                productVariantId: c.variant.id,
                name: c.variant.name,
                sku: c.variant.sku,
                barcode: c.variant.barcode,
                trackingType: c.variant.trackingType,
                unitId: c.unitId,
                unitQty: c.unitQtyForSale.toDecimalPlaces(4).toNumber(),
                baseQty: c.baseQtyForSale.toDecimalPlaces(4).toNumber(),
                baseUnitId: c.baseUnitId,
                baseUnitName: c.variant.baseUnit?.name ?? null,
                price: price.toDecimalPlaces(4).toNumber(),
                total: total.toDecimalPlaces(4).toNumber(),
            };
        });

        res.status(200).json({
            packageId,
            packageGroupId,
            packageName: pkg.name,
            qty,
            packagePrice: packagePrice.toDecimalPlaces(4).toNumber(),
            maxSellable,
            shortages,
            components,
        });
    } catch (error) {
        logger.error("Error exploding package:", error);
        res.status(400).json({ message: (error as Error).message });
    }
};
