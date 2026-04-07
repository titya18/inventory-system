// import { useQuery } from "@tanstack/react-query";
// import { useAppContext } from "@/hooks/useAppContext";
// import {
//   getAllReportInvoices,
//   getAllReportPurchases,
//   getAllReportQuotations,
//   getAllPaymentReportInvoices
// } from "@/api/report";

// interface DashboardFilters {
//   startDate: string;
//   endDate: string;
//   branchId?: number;
// }

// export const useDashboardData = (filters: DashboardFilters) => {
//   const { user } = useAppContext();

//   const branchFilter =
//     user?.roleType === "ADMIN"
//       ? filters.branchId
//       : user?.branchId;

//   return {
//     invoices: useQuery({
//       queryKey: ["dashboard-invoices", filters],
//       queryFn: () =>
//         getAllReportInvoices({
//           page: 1,
//           pageSize: 1000,
//           startDate: filters.startDate,
//           endDate: filters.endDate,
//           branchId: branchFilter
//         })
//     }),

//     payments: useQuery({
//       queryKey: ["dashboard-payments", filters],
//       queryFn: () =>
//         getAllPaymentReportInvoices({
//           page: 1,
//           pageSize: 1000,
//           startDate: filters.startDate,
//           endDate: filters.endDate,
//           branchId: branchFilter
//         })
//     }),

//     quotations: useQuery({
//       queryKey: ["dashboard-quotations", filters],
//       queryFn: () =>
//         getAllReportQuotations({
//           page: 1,
//           pageSize: 1000,
//           startDate: filters.startDate,
//           endDate: filters.endDate,
//           branchId: branchFilter
//         })
//     }),

//     purchases: useQuery({
//       queryKey: ["dashboard-purchases", filters],
//       queryFn: () =>
//         getAllReportPurchases({
//           page: 1,
//           pageSize: 1000,
//           startDate: filters.startDate,
//           endDate: filters.endDate,
//           branchId: branchFilter
//         })
//     })
//   };
// };

import { useQuery } from "@tanstack/react-query";
import { useAppContext } from "@/hooks/useAppContext";
import {
  getAllReportInvoices,
  getAllReportPurchases,
  getAllReportQuotations,
  getAllPaymentReportInvoices,
  getAllReportSaleReturns,
  getDashboardTopSellingProducts,
  getDashboardLowStockProducts,
} from "@/api/report";

interface DashboardFilters {
  startDate: string;
  endDate: string;
  branchId?: number;
}

export const useDashboardData = (filters: DashboardFilters) => {
  const { user } = useAppContext();

  const branchFilter =
    user?.roleType === "ADMIN"
      ? filters.branchId
      : user?.branchId;

  return {
    invoices: useQuery({
      queryKey: ["dashboard-invoices", filters],
      queryFn: () =>
        getAllReportInvoices({
          page: 1,
          pageSize: 1000,
          startDate: filters.startDate,
          endDate: filters.endDate,
          branchId: branchFilter,
        }),
    }),

    payments: useQuery({
      queryKey: ["dashboard-payments", filters],
      queryFn: () =>
        getAllPaymentReportInvoices({
          page: 1,
          pageSize: 1000,
          startDate: filters.startDate,
          endDate: filters.endDate,
          branchId: branchFilter,
        }),
    }),

    quotations: useQuery({
      queryKey: ["dashboard-quotations", filters],
      queryFn: () =>
        getAllReportQuotations({
          page: 1,
          pageSize: 1000,
          startDate: filters.startDate,
          endDate: filters.endDate,
          branchId: branchFilter,
        }),
    }),

    purchases: useQuery({
      queryKey: ["dashboard-purchases", filters],
      queryFn: () =>
        getAllReportPurchases({
          page: 1,
          pageSize: 1000,
          startDate: filters.startDate,
          endDate: filters.endDate,
          branchId: branchFilter,
        }),
    }),

    saleReturns: useQuery({
      queryKey: ["dashboard-sale-returns", filters],
      queryFn: () =>
        getAllReportSaleReturns({
          page: 1,
          pageSize: 1000,
          startDate: filters.startDate,
          endDate: filters.endDate,
          branchId: branchFilter,
        }),
    }),

    topSellingProducts: useQuery({
      queryKey: ["dashboard-top-selling-products", filters],
      queryFn: () =>
        getDashboardTopSellingProducts({
          startDate: filters.startDate,
          endDate: filters.endDate,
          branchId: branchFilter,
          limit: 8,
        }),
    }),

    lowStockProducts: useQuery({
      queryKey: ["dashboard-low-stock-products", filters.branchId, user?.branchId],
      queryFn: () =>
        getDashboardLowStockProducts({
          branchId: branchFilter,
          limit: 8,
          threshold: 5,
        }),
    }),
  };
};
