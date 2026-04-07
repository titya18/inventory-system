import { toast } from "react-toastify";
import * as apiClient from "@/api/customer";
import { CustomerType } from "@/data_types/types";

export const upsertCustomerAction = async (
    payload: { data: CustomerType },
    invalidate: () => Promise<void>,
    refresh: () => Promise<void>,
    closeModal: () => void
) => {
    try {
        await invalidate();

        const { data } = payload;
        const customerData: CustomerType = {
            id: data.id || 0,
            ...data
        };

        await apiClient.upsertCustomer(customerData);

        toast.success(
            customerData.id
                ? "Customer updated successfully"
                : "Customer created successfully",
            {
                position: "top-right",
                autoClose: 2000
            }
        );

        await refresh();
        closeModal();
    } catch (error: any) {
        toast.error(
            error?.message || "Error adding/editing customer",
            { position: "top-right", autoClose: 2000 }
        );
    }
};
