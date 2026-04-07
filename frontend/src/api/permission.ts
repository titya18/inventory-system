const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export interface PermissionData {
    id?: number;
    name: string;
}

export const getAllPermissions = async (): Promise<PermissionData[]> => {
    const response = await fetch(`${API_BASE_URL}/api/permission`, {
        credentials: "include"
    });
    if (!response.ok) {
        throw new Error("Error fetching Permission");
    }
    return response.json();
};