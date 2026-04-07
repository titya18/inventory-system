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
    id: string,
    branchId: number,
    email: string,
    name: string,
    roleType: string,
    roles: Roles[]
}

interface PermissionData {
    [key: string]: string; // Maps permission ID to permission name
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

// socket io connect to backend index.ts
const socket = io(import.meta.env.VITE_API_URL || "http://localhost:4000", {
  path: "/socket.io",
  transports: ["websocket"],
});
// end socket io connect to backend index.ts

export const AppContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [user, setUser] = useState<UserData | null>(null);
    const [permissionMap, setPermissionMap] = useState<PermissionData | null>(null);

    const toggleSidebar = () => {
        setIsSidebarOpen(prevState => !prevState);
    };

    // Fetch permissions and set permissionMap
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
                // console.log("Permission map updated:", formattedPermissions); // Check the map
            } else {
                console.error("Permissions response is not an array:", permissionsResponse);
            }
        } catch (error) {
            console.error("Error fetching permissions:", error);
        }
    };

    const { data, isError, isLoading } = useQuery({
        queryKey: ["validateToken"],
        queryFn: apiClient.validateToken, // Function to fetch token data
        retry: false, // Disable retries
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
          });
      
          fetchPermissions(); // Fetch permissions after setting user
        } else {
          setUser(null);
        }

        if (isError) {
            console.error("Token validation error");
            setUser(null);
        }
    }, [data, isError]);

    // I used socket io for real time update user role permission that effect sidebar componen or other components
    // For Socket IO
    // I used socket io for real-time updates
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
    
    // End for Socket IO

    // Check if the user has a specific permission
    const hasPermission = (permission: string): boolean => {
        if (!user || !permissionMap) {
            // console.log("User or permissionMap is not defined.");
            return false;
        }
    
        if (user.roleType === 'ADMIN') {
            return true;
        }
    
        const permissionId = Object.keys(permissionMap).find(key => permissionMap[key] === permission);
    
        if (!permissionId) {
            console.warn(`Permission "${permission}" not found in permissionMap.`);
            return false;
        }
    
        // // Log user roles and permissions for detailed inspection
        // console.log("User roles and permissions:", user.roles);
    
        // Check if user roles contain the permission string directly
        const hasPerm = user?.roles?.some(role =>
            role.permissions.includes(permission) || role.permissions.includes(permissionId) // Check against the permission string directly
        );
        // console.log(`User has permission "${permission}": ${hasPerm}`);
        return hasPerm;
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