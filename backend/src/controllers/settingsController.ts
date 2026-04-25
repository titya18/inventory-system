import { Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { prisma } from "../lib/prisma";
import logger from "../utils/logger";

// ── Logo upload via multer ────────────────────────────────────────────────────

const logoStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        const dir = path.join(process.cwd(), "public/images/settings");
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `logo${ext}`);
    },
});

export const uploadLogo = multer({
    storage: logoStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowed = [".jpg", ".jpeg", ".png", ".webp", ".svg"];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) cb(null, true);
        else cb(new Error("Only image files are allowed (.jpg, .jpeg, .png, .webp, .svg)"));
    },
});

// ── GET /api/settings ─────────────────────────────────────────────────────────

export const getCompanySettings = async (_req: Request, res: Response): Promise<void> => {
    try {
        const settings = await prisma.companySettings.findFirst({ where: { id: 1 } });
        res.json(settings || {});
    } catch (error) {
        logger.error("Error fetching company settings:", error);
        res.status(500).json({ message: "Failed to fetch settings" });
    }
};

// ── PUT /api/settings ─────────────────────────────────────────────────────────

export const updateCompanySettings = async (req: Request, res: Response): Promise<void> => {
    try {
        const { companyNameKh, companyNameEn, addressKh, addressEn, phone, vatNumber, invoiceTerms } = req.body;
        const userId = req.user?.id ?? null;

        const data: any = {
            companyNameKh: companyNameKh || null,
            companyNameEn: companyNameEn || null,
            addressKh:     addressKh     || null,
            addressEn:     addressEn     || null,
            phone:         phone         || null,
            vatNumber:     vatNumber     || null,
            invoiceTerms:  invoiceTerms  || null,
            updatedBy:     userId,
        };

        if (req.file) {
            data.logoUrl = `images/settings/${req.file.filename}`;
        }

        const settings = await prisma.companySettings.upsert({
            where:  { id: 1 },
            create: { id: 1, ...data },
            update: data,
        });

        res.json(settings);
    } catch (error) {
        logger.error("Error updating company settings:", error);
        res.status(500).json({ message: "Failed to update settings" });
    }
};
