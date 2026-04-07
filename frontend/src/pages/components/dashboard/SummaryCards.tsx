// import { FiShoppingCart, FiDollarSign, FiCreditCard, FiPackage } from "react-icons/fi";

// const Card = ({ title, value, color, icon: Icon }: any) => (
//   <div className={`rounded-lg shadow-lg p-5 flex items-center border-l-8 ${color} bg-white hover:shadow-2xl transition`}>
//     <div className="p-3 rounded-full bg-gray-100 mr-4">
//       <Icon className="w-8 h-8 text-gray-700" />
//     </div>
//     <div>
//       <p className="text-gray-500 font-medium text-sm">{title}</p>
//       <p className="text-2xl font-bold mt-1">{value.toLocaleString()}</p>
//     </div>
//   </div>
// );

// const SummaryCards = ({ invoices, purchases, payments }: any) => (
//   <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
//     <Card
//       title="Invoices"
//       value={invoices?.totalInvoice || 0}
//       color="border-green-400"
//       icon={FiShoppingCart}
//     />
//     <Card
//       title="Sales Amount"
//       value={invoices?.totalAmount || 0}
//       color="border-blue-400"
//       icon={FiDollarSign}
//     />
//     <Card
//       title="Paid"
//       value={payments?.totalPaid || 0}
//       color="border-purple-400"
//       icon={FiCreditCard}
//     />
//     <Card
//       title="Purchases"
//       value={purchases?.grandTotalAmount || 0}
//       color="border-red-400"
//       icon={FiPackage}
//     />
//   </div>
// );

// export default SummaryCards;

import {
  FiShoppingCart,
  FiDollarSign,
  FiCreditCard,
  FiPackage,
  FiTrendingUp,
  FiAlertCircle,
  FiFileText,
  FiRotateCcw,
} from "react-icons/fi";

interface SummaryCardsProps {
  invoices?: {
    totalInvoice?: number;
    totalAmount?: number;
    totalProfit?: number;
    totalRemainAmount?: number;
  };
  purchases?: {
    grandTotalAmount?: number;
    totalRemainAmount?: number;
  };
  quotations?: {
    totalQuotation?: number;
    totalAmount?: number;
  };
  saleReturns?: {
    totalNumberSaleReturn?: number;
    totalAmount?: number;
  };
  payments?: {
    totalPaid?: number;
  };
}

const formatNumber = (value: number, isCurrency = false) => {
  const safeValue = Number(value || 0);

  return isCurrency
    ? `$${safeValue.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })}`
    : safeValue.toLocaleString();
};

const Card = ({
  title,
  value,
  icon: Icon,
  borderColor,
  iconBg,
  iconColor,
  subtitle,
}: {
  title: string;
  value: string;
  icon: any;
  borderColor: string;
  iconBg: string;
  iconColor: string;
  subtitle?: string;
}) => (
  <div className={`rounded-2xl border ${borderColor} bg-white shadow-sm hover:shadow-lg transition-all duration-300 p-5`}>
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="mt-2 text-2xl font-bold text-gray-900 break-words">{value}</p>
        {subtitle && <p className="mt-2 text-xs text-gray-400">{subtitle}</p>}
      </div>

      <div className={`p-3 rounded-xl ${iconBg} shrink-0`}>
        <Icon className={`w-6 h-6 ${iconColor}`} />
      </div>
    </div>
  </div>
);

const SummaryCards = ({
  invoices,
  purchases,
  quotations,
  saleReturns,
}: SummaryCardsProps) => {
  const totalSales = Number(invoices?.totalAmount || 0);
  const totalProfit = Number(invoices?.totalProfit || 0);

  const profitMargin =
    totalSales > 0 ? ((totalProfit / totalSales) * 100).toFixed(1) : "0.0";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
      <Card
        title="Invoices"
        value={formatNumber(invoices?.totalInvoice || 0)}
        icon={FiShoppingCart}
        borderColor="border-blue-100"
        iconBg="bg-blue-50"
        iconColor="text-blue-600"
        subtitle="Approved / completed invoices"
      />

      <Card
        title="Sales Amount"
        value={formatNumber(invoices?.totalAmount || 0, true)}
        icon={FiDollarSign}
        borderColor="border-emerald-100"
        iconBg="bg-emerald-50"
        iconColor="text-emerald-600"
        subtitle="Total invoice amount"
      />

      <Card
        title="Gross Profit"
        value={formatNumber(invoices?.totalProfit || 0, true)}
        icon={FiTrendingUp}
        borderColor="border-violet-100"
        iconBg="bg-violet-50"
        iconColor="text-violet-600"
        subtitle={`Margin: ${profitMargin}%`}
      />

      <Card
        title="Receivable"
        value={formatNumber(invoices?.totalRemainAmount || 0, true)}
        icon={FiCreditCard}
        borderColor="border-amber-100"
        iconBg="bg-amber-50"
        iconColor="text-amber-600"
        subtitle="Customer unpaid amount"
      />

      <Card
        title="Purchases"
        value={formatNumber(purchases?.grandTotalAmount || 0, true)}
        icon={FiPackage}
        borderColor="border-rose-100"
        iconBg="bg-rose-50"
        iconColor="text-rose-600"
        subtitle="Total purchase amount"
      />

      <Card
        title="Payable"
        value={formatNumber(purchases?.totalRemainAmount || 0, true)}
        icon={FiAlertCircle}
        borderColor="border-red-100"
        iconBg="bg-red-50"
        iconColor="text-red-600"
        subtitle="Supplier unpaid amount"
      />

      <Card
        title="Quotations"
        value={formatNumber(quotations?.totalQuotation || 0)}
        icon={FiFileText}
        borderColor="border-cyan-100"
        iconBg="bg-cyan-50"
        iconColor="text-cyan-600"
        subtitle={`Amount: ${formatNumber(quotations?.totalAmount || 0, true)}`}
      />

      <Card
        title="Sale Returns"
        value={formatNumber(saleReturns?.totalNumberSaleReturn || 0)}
        icon={FiRotateCcw}
        borderColor="border-orange-100"
        iconBg="bg-orange-50"
        iconColor="text-orange-600"
        subtitle={`Amount: ${formatNumber(saleReturns?.totalAmount || 0, true)}`}
      />
    </div>
  );
};

export default SummaryCards;