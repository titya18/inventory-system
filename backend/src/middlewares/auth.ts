import { NextFunction, Request, RequestHandler, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import logger from "../utils/logger";


declare global {
    namespace Express {
        interface Request {
            user?: {
                id: number;
                branchId: number | null;
                email: string;
                firstName: string;
                lastName: string;
                roleType: string;
                roles: Array<{
                    id: number;
                    name: string;
                    permissions: string[];
                }>;
                directPermissions: string[];
            };
        }
    }
}

interface RoleOnUser {
    role: {
        id: number;
        name: string;
        permissions: {
            permission: {
                name: string;
            }
        }[];
    }
}

interface PermissionOnRole {
    name: string;
}

const verifyToken = async (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies["auth_token"];

    if (!token) {
        res.status(401).json({ message: "Unauthorized: No token provided" });
        return;
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY as string) as JwtPayload;

        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            include: {
                roles: {
                    include: {
                        role: {
                            include: {
                                permissions: {
                                    include: { permission: true },
                                },
                            },
                        },
                    },
                },
                directPermissions: {
                    include: { permission: true },
                },
            },
        });

        if (user) {
            const rolesWithPermissions = user.roles.map((roleOnUser: RoleOnUser) => ({
                id: roleOnUser.role.id,
                name: roleOnUser.role.name,
                permissions: roleOnUser.role.permissions.map(
                    (p: { permission: PermissionOnRole }) => p.permission.name
                ),
            }));

            const directPermissions = (user.directPermissions as any[]).map(
                (up) => up.permission.name
            );

            req.user = {
                id: user.id,
                branchId: user.branchId,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                roleType: user.roleType,
                roles: rolesWithPermissions,
                directPermissions,
            };
            next();
        } else {
            res.status(404).json({ message: "User not found" });
            return;
        }
    } catch (error) {
        logger.error("Token verification error:", error);
        res.status(401).json({ message: "Unauthorized: Invalid token" });
        return;
    }
};

const authorize = (requiredPermissions: string[]): RequestHandler => {
    return (req: Request, res: Response, next: NextFunction): void => {
        const user = req.user;

        if (!user) {
            res.status(403).json({ message: "Forbidden: No user found" });
            return;
        }

        if (user.roleType === 'ADMIN') {
            return next();
        }

        // Union of role permissions + direct user permissions
        const rolePermissions = user.roles.flatMap((role) => role.permissions);
        const allPermissions = Array.from(new Set([...rolePermissions, ...user.directPermissions]));

        const hasPermission = requiredPermissions.every((perm) =>
            allPermissions.includes(perm)
        );

        if (!hasPermission) {
            res.status(403).json({ message: "Forbidden: Insufficient permissions" });
            return;
        }

        next();
    };
};

export { verifyToken, authorize };
