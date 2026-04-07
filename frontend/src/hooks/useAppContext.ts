import { useContext } from "react";
import { AppContext } from "../contexts/AppContext";

export const useAppContext = () => {
    const context = useContext(AppContext);

    if (!context) {
        throw new Error('useAppContext must be used within an AppContextProvider');
    }

    const { isLoggedIn, toggleSidebar, hasPermission, user } = context;

    return { isLoggedIn, toggleSidebar, hasPermission, user };
}