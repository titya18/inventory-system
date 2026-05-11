import { useEffect, useState, useCallback } from "react";
import { getLowStockAlerts, StockAlertItem } from "@/api/stock";
import { useAppContext } from "./useAppContext";
import { socket } from "@/contexts/AppContext";

export function useStockAlerts() {
  const { isLoggedIn, user } = useAppContext();
  const [alerts, setAlerts] = useState<StockAlertItem[]>([]);

  const fetchAlerts = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const data = await getLowStockAlerts();
      setAlerts(data);
    } catch {
    }
  }, [isLoggedIn]);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  useEffect(() => {
    const handler = (data: StockAlertItem) => {
      if (user?.roleType !== "ADMIN" && user?.branchId && data.branchId !== user.branchId) return;
      setAlerts((prev) => {
        const exists = prev.find(
          (a) => a.variantId === data.variantId && a.branchId === data.branchId
        );
        if (exists) {
          return prev.map((a) =>
            a.variantId === data.variantId && a.branchId === data.branchId
              ? { ...a, currentQty: data.currentQty }
              : a
          );
        }
        return [...prev, data];
      });
    };
    socket.on("stock:low-alert", handler);
    return () => {
      socket.off("stock:low-alert", handler);
    };
  }, [user]);

  const dismiss = (variantId: number, branchId: number) => {
    setAlerts((prev) =>
      prev.filter((a) => !(a.variantId === variantId && a.branchId === branchId))
    );
  };

  return { alerts, count: alerts.length, dismiss, refetch: fetchAlerts };
}
