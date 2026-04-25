import React, { createContext, ReactNode, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as apiClient from "../api/auth";
import { getAllPermissions } from "../api/permission";

import io from 'socket.io-client';

interface Roles {
    id: string;
    name: string;
    permissions: string[];
}

interface UserData {
    id: string;
    branchId: number;
    email: string;
    name: string;
    roleType: string;
    roles: Roles[];
    directPermissions: string[];
}

interface PermissionData {
    [key: string]: string;
}

interface AppContextType {
    isLoggedIn: boolean;
    user: UserData | null;
    isSidebarOpen: boolean;
    toggleSidebar: () => void;
    hasPermission: (permission: string) => boolean;
    updateUser: (updatedUser: UserData | null) => void;
    isLoading: boolean;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

// VITE_SOCKET_URL: direct backend URL for socket.io, bypassing any nginx reverse-proxy.
// In production set this to http://<server-ip>:<backend-port> (e.g. http://202.93.8.4:4000).
// Falls back to VITE_API_URL so local dev needs no extra config.
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || "http://localhost:4000";

const socket = io(SOCKET_URL, {
  path: "/socket.io",
  transports: ["websocket"],
});

export const AppContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [user, setUser] = useState<UserData | null>(null);
    const [permissionMap, setPermissionMap] = useState<PermissionData | null>(null);

    const toggleSidebar = () => {
        setIsSidebarOpen(prevState => !prevState);
    };

    const fetchPermissions = async () => {
        try {
            const permissionsResponse = await getAllPermissions();
            if (Array.isArray(permissionsResponse)) {
                const formattedPermissions: { [key: string]: string } = {};
                permissionsResponse.forEach((perm) => {
                    if (perm.id !== undefined) {
                        formattedPermissions[perm.id.toString()] = perm.name;
                    }
                });
                setPermissionMap(formattedPermissions);
            } else {
                console.error("Permissions response is not an array:", permissionsResponse);
            }
        } catch (error) {
            console.error("Error fetching permissions:", error);
        }
    };

    const { data, isError, isLoading } = useQuery({
        queryKey: ["validateToken"],
        queryFn: apiClient.validateToken,
        retry: false,
    });

    useEffect(() => {
        if (data) {
            setUser({
                id: data.userId,
                branchId: data.branchId,
                email: data.email,
                name: data.lastName + " " + data.firstName,
                roleType: data.roleType,
                roles: data.roles,
                directPermissions: data.directPermissions ?? [],
            });
            fetchPermissions();
        } else {
            setUser(null);
        }

        if (isError) {
            console.error("Token validation error");
            setUser(null);
        }
    }, [data, isError]);

    useEffect(() => {
        socket.on('permissionsUpdated', (updatedRole: { id: string; permissions: string[] }) => {
            setUser(prevUser => {
                if (prevUser) {
                    const updatedRoles = prevUser.roles.map(role => {
                        if (role.id === updatedRole.id) {
                            return { ...role, permissions: updatedRole.permissions };
                        }
                        return role;
                    });
                    return { ...prevUser, roles: updatedRoles };
                }
                return prevUser;
            });
        });

        return () => {
            socket.off('permissionsUpdated');
        };
    }, []);

    const hasPermission = (permission: string): boolean => {
        if (!user || !permissionMap) return false;

        if (user.roleType === 'ADMIN') return true;

        const permissionId = Object.keys(permissionMap).find(key => permissionMap[key] === permission);
        if (!permissionId) {
            console.warn(`Permission "${permission}" not found in permissionMap.`);
            return false;
        }

        // Check role permissions
        const inRole = user?.roles?.some(role =>
            role.permissions.includes(permission) || role.permissions.includes(permissionId)
        );
        if (inRole) return true;

        // Check direct user permissions
        return user.directPermissions?.includes(permission) ?? false;
    };

    const updateUser = (updatedUser: UserData | null) => {
        setUser(updatedUser);
    };

    return (
        <AppContext.Provider
            value={{
                isLoggedIn: !isError && !isLoading,
                user,
                isSidebarOpen,
                toggleSidebar,
                hasPermission,
                updateUser,
                isLoading
            }}
        >
            {children}
        </AppContext.Provider>
    );
}
