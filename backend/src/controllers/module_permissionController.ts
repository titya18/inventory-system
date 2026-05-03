import { prisma } from "../lib/prisma";
import { Request, Response } from 'express';
import { DateTime } from "luxon";

import logger from '../utils/logger';
import { getQueryNumber, getQueryString } from "../utils/request";


export const upsertModule = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params; // Extract id from URL parameters
    const { name, permissions } = req.body;
    const utcNow = DateTime.now().setZone('Asia/Phnom_Penh').toUTC();

    try {
        // Parse id to integer if present
        const moduleId = id ? (Array.isArray(id) ? id[0] : id) : 0;

        // Step 1: Fetch current permissions for duplicate-name checking (only when updating)
        let currentModulePermissions: string[] = [];
        if (moduleId) {
            const existing = await prisma.module.findUnique({
                where: { id: Number(moduleId) },
                include: { permissions: true },
            });
            if (!existing) { res.status(404).json({ message: 'Module not found' }); return; }
            currentModulePermissions = existing.permissions.map((p: any) => p.name);
        }

        // Step 2: Check if the module name is unique (excluding the current module if updating)
        const existingModule = await prisma.module.findFirst({
            where: {
                name,
                id: { not: Number(moduleId) } // Exclude the current module from the unique name check
            }
        });

        if (existingModule) {
            res.status(400).json({ message: 'Module name must be unique' });
            return;
        }

        // Step 3: Handle permissions mapping
        const permissionsData = permissions ? permissions.map((perm: { name: string }) => ({ name: perm.name })) : [];

        // Step 4: Check for unique permission names excluding the current module’s permissions
        const permissionChecks = permissionsData.map(async (perm: { name: string }) => {
            const existingPermission = await prisma.permission.findFirst({
                where: {
                    name: perm.name,
                    AND: { NOT: { name: { in: currentModulePermissions } } } // Exclude permissions of the current module
                }
            });

            return {
                name: perm.name,
                exists: !!existingPermission // true if exists, false otherwise
            };
        });

        const permissionResults = await Promise.all(permissionChecks);

        // Extract names of existing permissions
        const existingPermissionNames = permissionResults
            .filter(result => result.exists)
            .map(result => result.name);

        // If there are existing permissions, return them in the response
        if (existingPermissionNames.length > 0) {
            res.status(400).json({ 
                message: `Permissions ${existingPermissionNames.join(', ')} already exist`,
                existingPermissions: existingPermissionNames
            });
            return;
        }

        // Step 3: Create or Update the module based on whether an id exists
        let module;
        if (moduleId) {
            // Diff-based update — NEVER delete permissions that still exist in the new list.
            // Deleting a Permission triggers onDelete:Cascade on PermissionOnRole, wiping role assignments.
            const currentModule = await prisma.module.findUnique({
                where: { id: Number(moduleId) },
                include: { permissions: true },
            });

            const existingNames = new Set(currentModule?.permissions.map((p: any) => p.name) ?? []);
            const newNames      = new Set(permissionsData.map((p: { name: string }) => p.name));

            // Names to remove (in DB but not in new list)
            const toDelete = [...existingNames].filter(n => !newNames.has(n));
            // Names to add (in new list but not in DB)
            const toCreate = permissionsData.filter((p: { name: string }) => !existingNames.has(p.name));

            module = await prisma.module.update({
                where: { id: Number(moduleId) },
                data: {
                    name,
                    updatedAt: utcNow.toJSDate(),
                    permissions: {
                        deleteMany: toDelete.length > 0 ? { name: { in: toDelete } } : undefined,
                        create: toCreate,
                    }
                }
            });
        } else {
            // Resync sequences to prevent id collision after manual/seed inserts
            await prisma.$executeRaw`SELECT setval('"Module_id_seq"', COALESCE((SELECT MAX(id) FROM "Module"), 0) + 1, false)`;
            await prisma.$executeRaw`SELECT setval('"Permission_id_seq"', COALESCE((SELECT MAX(id) FROM "Permission"), 0) + 1, false)`;
            // Create a new module
            module = await prisma.module.create({
                data: {
                    name,
                    createdAt: utcNow.toJSDate(),
                    updatedAt: utcNow.toJSDate(),
                    permissions: {
                        create: permissionsData // Create new permissions
                    }
                }
            });
        }

        res.status(moduleId ? 200 : 201).json(module);
    } catch (error) {
        logger.error("Error upserting module:", error);
        console.error("Error upserting module:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Get All Modules
export const getAllModulesWithPagination = async (req: Request, res: Response): Promise<void> => {
    try {
        const pageSize = getQueryNumber(req.query.pageSize, 10)!;
        const pageNumber = getQueryNumber(req.query.page, 1)!;
        const searchTerm = getQueryString(req.query.searchTerm, "")!.trim();
        const sortField = getQueryString(req.query.sortField, "name")!;
        const sortOrder = getQueryString(req.query.sortOrder)?.toLowerCase() === "desc" ? "desc" : "asc";

        const skip = (pageNumber - 1) * pageSize;

        // Dynamically construct the where condition
        const whereCondition: any = {};

        if (searchTerm) {
            whereCondition.name = {
                contains: searchTerm,
                mode: "insensitive", // Case-insensitive search
            };
        }

        // Get total count of module matching the search term
        const total = await prisma.module.count({
            where: whereCondition,
        });

        // Fetch pagination modules with sorting and include permission
        const modules = await prisma.module.findMany({
            where: whereCondition, // Filter based on searchTerm if available
            skip: skip,
            orderBy: {
                [sortField]: sortOrder as "asc" | "desc", // Dynamic sorting
            },
            take: pageSize,
            include: { 
                permissions: true,
                creator: true,
                updater: true
            }
        });
        res.status(200).json({data: modules, total});
    } catch (error) {
        logger.error("Error fetching modules:", error);
        const typedError = error as Error; // Type assertion
        res.status(500).json({ message: typedError.message });
    }
};

// Get All Modules
export const getAllModules = async (_req: Request, res: Response): Promise<void> => {
    try {
        const modules = await prisma.module.findMany({
            include: { permissions: true }
        });
        res.status(200).json(modules);
    } catch (error) {
        logger.error("Error fetching modules:", error);
        const typedError = error as Error; // Type assertion
        res.status(500).json({ message: typedError.message });
    }
};

// Get Module by ID
export const getModuleById = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const moduleId = id ? (Array.isArray(id) ? id[0] : id) : 0;
    try {
        const module = await prisma.module.findUnique({
            where: { id: Number(moduleId) },
            include: { permissions: true }
        });

        if (module) {
            res.status(200).json(module);
        } else {
            res.status(404).json({ message: 'Module not found' });
        }
    } catch (error) {
        logger.error("Error fetching module by ID:", error);
        const typedError = error as Error; // Type assertion
        res.status(500).json({ message: typedError.message });
    }
};

// Delete a Module
export const deleteModule = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const moduleId = id ? (Array.isArray(id) ? id[0] : id) : 0;
    try {
        await prisma.$transaction(async (tx) => {
            // 1. Delete all permissions linked to this module
            await tx.permission.deleteMany({
                where: { moduleId: Number(moduleId) }
            });

            // 2. Now delete the module
            await tx.module.delete({
                where: { id: Number(moduleId) }
            });
        });

        res.status(200).json({ message: "Module deleted successfully" });
    } catch (error) {
        logger.error("Error deleting module:", error);

        res.status(500).json({
            message: (error as Error).message
        });
    }
};
