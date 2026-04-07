// import {
//   PieChart,
//   Pie,
//   Tooltip,
//   ResponsiveContainer,
//   Cell,
//   Legend,
//   Sector,
// } from "recharts";
// import { useState } from "react";

// interface DashboardPieChartProps {
//   invoices: { totalAmount: number };
//   quotations: { totalAmount: number };
//   payments: { totalAmount: number };
//   purchases: { totalAmount: number };
// }

// const SalesPieChart = ({
//   invoices,
//   quotations,
//   payments,
//   purchases,
// }: DashboardPieChartProps) => {
//   const [activeIndex, setActiveIndex] = useState<number | null>(null);

//   // Safe numbers
//   const safeInvoices = invoices?.totalAmount ?? 0;
//   const safeQuotations = quotations?.totalAmount ?? 0;
//   const safePayments = payments?.totalAmount ?? 0;
//   const safePurchases = purchases?.totalAmount ?? 0;

//   const data = [
//     { name: "Invoices", value: safeInvoices },
//     { name: "Quotations", value: safeQuotations },
//     { name: "Payments", value: safePayments },
//     { name: "Purchases", value: safePurchases },
//   ];

//   const colors = ["#3B82F6", "#F59E0B", "#10B981", "#EF4444"];
//   const total = data.reduce((sum, item) => sum + item.value, 0);
//   const RADIAN = Math.PI / 180;

//   // Labels inside slices
//   const renderCustomizedLabel = ({
//     cx,
//     cy,
//     midAngle,
//     innerRadius,
//     outerRadius,
//     percent,
//   }: any) => {
//     if (total === 0) return null;
//     const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
//     const x = cx + radius * Math.cos(-midAngle * RADIAN);
//     const y = cy + radius * Math.sin(-midAngle * RADIAN);

//     return (
//       <text
//         x={x}
//         y={y}
//         fill="#fff"
//         textAnchor={x > cx ? "start" : "end"}
//         dominantBaseline="central"
//         fontSize={12}
//         fontWeight={600}
//       >
//         {percent > 0 ? `${(percent * 100).toFixed(1)}%` : ""}
//       </text>
//     );
//   };

//   // Tooltip with manual percentage
//   const renderCustomTooltip = ({ active, payload }: any) => {
//     if (active && payload && payload.length) {
//       const { name, value } = payload[0];
//       const percent = total > 0 ? (value / total) * 100 : 0;

//       return (
//         <div className="bg-white shadow-lg rounded-md p-3 border border-gray-200 text-sm">
//           <p className="text-gray-800 font-semibold">{name}</p>
//           <p className="text-gray-600">
//             Amount: ${value.toLocaleString()} ({percent.toFixed(1)}%)
//           </p>
//         </div>
//       );
//     }
//     return null;
//   };

//   // Handle slice hover
//   const onPieEnter = (_: any, index: number) => setActiveIndex(index);
//   const onPieLeave = () => setActiveIndex(null);

//   return (
//     <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition p-6 border border-gray-100">
//       <h3 className="text-lg font-semibold text-gray-800 mb-4">
//         Sales & Expenses Distribution
//       </h3>

//       <ResponsiveContainer width="100%" height={350}>
//         <PieChart>
//           <Tooltip content={renderCustomTooltip} />
//           <Legend
//             verticalAlign="bottom"
//             align="center"
//             iconSize={14}
//             formatter={(value) => (
//               <span className="text-gray-700 font-medium">{value}</span>
//             )}
//           />
//           <Pie
//             data={data}
//             dataKey="value"
//             nameKey="name"
//             outerRadius={130}
//             innerRadius={70}
//             label={renderCustomizedLabel}
//             paddingAngle={3}
//             isAnimationActive
//             activeShape={(props: any) => (
//               <g>
//                 <text
//                   x={props.cx}
//                   y={props.cy}
//                   textAnchor="middle"
//                   dominantBaseline="middle"
//                   fill="#333"
//                   fontWeight="bold"
//                 >
//                   {props.name}
//                 </text>
//                 <Sector
//                   cx={props.cx}
//                   cy={props.cy}
//                   innerRadius={props.innerRadius}
//                   outerRadius={props.outerRadius + 10} // expand on hover
//                   startAngle={props.startAngle}
//                   endAngle={props.endAngle}
//                   fill={props.fill}
//                   stroke="#fff"
//                   strokeWidth={2}
//                 />
//               </g>
//             )}
//             onMouseEnter={onPieEnter}
//             onMouseLeave={onPieLeave}
//           >
//             {data.map((entry, index) => (
//               <Cell
//                 key={`cell-${index}`}
//                 fill={colors[index]}
//                 stroke="#fff"
//                 strokeWidth={2}
//               />
//             ))}
//           </Pie>
//         </PieChart>
//       </ResponsiveContainer>
//     </div>
//   );
// };

// export default SalesPieChart;

import {
  PieChart,
  Pie,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts";

interface DashboardPieChartProps {
  sales: { totalAmount: number };
  profit: { totalAmount: number };
  purchases: { totalAmount: number };
  saleReturns: { totalAmount: number };
}

const SalesPieChart = ({
  sales,
  profit,
  purchases,
  saleReturns,
}: DashboardPieChartProps) => {
  const safeSales = Number(sales?.totalAmount ?? 0);
  const safeProfit = Number(profit?.totalAmount ?? 0);
  const safePurchases = Number(purchases?.totalAmount ?? 0);
  const safeSaleReturns = Number(saleReturns?.totalAmount ?? 0);

  const data = [
    { name: "Sales", value: safeSales },
    { name: "Profit", value: safeProfit },
    { name: "Purchases", value: safePurchases },
    { name: "Sale Returns", value: safeSaleReturns },
  ];

  const colors = ["#3B82F6", "#10B981", "#EF4444", "#F59E0B"];
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const RADIAN = Math.PI / 180;

  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: any) => {
    if (total === 0 || percent <= 0) return null;

    const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="#fff"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        fontSize={12}
        fontWeight={700}
      >
        {(percent * 100).toFixed(1)}%
      </text>
    );
  };

  const renderCustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const { name, value } = payload[0];
      const percent = total > 0 ? (value / total) * 100 : 0;

      return (
        <div className="bg-white shadow-lg rounded-xl p-3 border border-gray-200 text-sm">
          <p className="text-gray-800 font-semibold">{name}</p>
          <p className="text-gray-600">
            Amount: $
            {Number(value || 0).toLocaleString(undefined, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            })}{" "}
            ({percent.toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition p-6 border border-gray-100">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          Business Distribution
        </h3>
        <p className="text-sm text-gray-500">
          Sales, profit, purchases and sale returns for selected period
        </p>
      </div>

      <ResponsiveContainer width="100%" height={360}>
        <PieChart>
          <Tooltip content={renderCustomTooltip} />
          <Legend
            verticalAlign="bottom"
            align="center"
            iconSize={12}
            formatter={(value) => (
              <span className="text-gray-700 text-sm font-medium">{value}</span>
            )}
          />

          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            outerRadius={130}
            innerRadius={72}
            paddingAngle={3}
            label={renderCustomizedLabel}
            isAnimationActive
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={colors[index % colors.length]}
                stroke="#fff"
                strokeWidth={2}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SalesPieChart;