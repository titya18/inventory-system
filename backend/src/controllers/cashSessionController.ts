import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import logger from "../utils/logger";
import { getQueryNumber, getQueryString } from "../utils/request";

export const createCashSession = async (req: Request, res: Response): Promise<void> => {
    try {
        const {
            branchId, shift, saleType, openedAt, closedAt, openedById,
            openingUSD, openingKHR, exchangeRate,
            totalSalesUSD, cashSalesUSD,
            actualCashUSD, differenceUSD,
            orderCount, note, paymentSummary,
        } = req.body;

        if (!branchId || !openedAt || !closedAt) {
            res.status(400).json({ message: "branchId, openedAt and closedAt are required" });
            return;
        }

        const session = await prisma.cashSession.create({
            data: {
                branchId: Number(branchId),
                shift: shift ?? null,
                saleType: saleType ?? "RETAIL",
                openedAt: new Date(openedAt),
                closedAt: new Date(closedAt),
                openedById: openedById ? Number(openedById) : null,
                openingUSD: Number(openingUSD ?? 0),
                openingKHR: Number(openingKHR ?? 0),
                exchangeRate: Number(exchangeRate ?? 4100),
                totalSalesUSD: Number(totalSalesUSD ?? 0),
                cashSalesUSD: Number(cashSalesUSD ?? 0),
                actualCashUSD: Number(actualCashUSD ?? 0),
                differenceUSD: Number(differenceUSD ?? 0),
                orderCount: Number(orderCount ?? 0),
                note: note ?? null,
                paymentSummary: paymentSummary ?? [],
                createdBy: req.user?.id ?? null,
            },
            include: { branch: { select: { name: true } } },
        });

        res.status(201).json(session);
    } catch (error) {
        logger.error("Error creating cash session:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const getCashSessions = async (req: Request, res: Response): Promise<void> => {
    try {
        const branchId = getQueryNumber(req.query.branchId, 0);
        const page     = getQueryNumber(req.query.page, 1) ?? 1;
        const pageSize = getQueryNumber(req.query.pageSize, 20) ?? 20;
        const from     = getQueryString(req.query.from, undefined);
        const to       = getQueryString(req.query.to, undefined);

        const where: any = {};
        if (branchId) where.branchId = branchId;
        if (from || to) {
            where.closedAt = {};
            if (from) where.closedAt.gte = new Date(from);
            if (to) {
                const toEnd = new Date(to);
                toEnd.setHours(23, 59, 59, 999);
                where.closedAt.lte = toEnd;
            }
        }

        const [total, data] = await Promise.all([
            prisma.cashSession.count({ where }),
            prisma.cashSession.findMany({
                where,
                orderBy: { closedAt: "desc" },
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: {
                    branch:   { select: { name: true } },
                    creator:  { select: { firstName: true, lastName: true } },
                    openedBy: { select: { firstName: true, lastName: true } },
                },
            }),
        ]);

        res.json({ data, total });
    } catch (error) {
        logger.error("Error fetching cash sessions:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const getCashSessionById = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = Number(req.params.id);
        const session = await prisma.cashSession.findUnique({
            where: { id },
            include: {
                branch:   { select: { name: true } },
                creator:  { select: { firstName: true, lastName: true } },
                openedBy: { select: { firstName: true, lastName: true } },
            },
        });
        if (!session) {
            res.status(404).json({ message: "Cash session not found" });
            return;
        }
        res.json(session);
    } catch (error) {
        logger.error("Error fetching cash session:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
