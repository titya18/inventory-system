// import {
//   ComposedChart,
//   Line,
//   Bar,
//   XAxis,
//   YAxis,
//   Tooltip,
//   ResponsiveContainer,
//   CartesianGrid,
//   ReferenceDot,
//   Legend,
//   Area,
// } from "recharts";
// import dayjs from "dayjs";
// import weekOfYear from "dayjs/plugin/weekOfYear";
// import { useState, useMemo } from "react";

// dayjs.extend(weekOfYear);

// interface SalesLineChartProps {
//   invoices: any[];
// }

// type GroupBy = "daily" | "weekly" | "monthly";

// const SalesLineChart = ({ invoices }: SalesLineChartProps) => {
//   const [groupBy, setGroupBy] = useState<GroupBy>("daily");

//   const data = useMemo(() => {
//     const map: Record<string, { amount: number; count: number; growth: number | null }> = {};
//     const sortedInvoices = [...invoices].sort(
//       (a, b) => new Date(a.orderDate).getTime() - new Date(b.orderDate).getTime()
//     );

//     sortedInvoices.forEach((i) => {
//       let dateKey = "";
//       const date = dayjs(i.orderDate);
//       if (groupBy === "daily") dateKey = date.format("DD/MM");
//       else if (groupBy === "weekly") dateKey = `W${date.week()}-${date.year()}`;
//       else dateKey = date.format("MM/YYYY");

//       if (!map[dateKey]) map[dateKey] = { amount: 0, count: 0, growth: null };
//       map[dateKey].amount += Number(i.totalAmount);
//       map[dateKey].count += 1;
//     });

//     const keys = Object.keys(map).sort((a, b) => {
//       const aDate = dayjs(a, ["DD/MM", "MM/YYYY"]);
//       const bDate = dayjs(b, ["DD/MM", "MM/YYYY"]);
//       return aDate.unix() - bDate.unix();
//     });

//     let prevAmount: number | null = null;
//     keys.forEach((key, index) => {
//       if (index === 0) {
//         map[key].growth = null; // First point: no growth
//       } else if (prevAmount !== null) {
//         map[key].growth = ((map[key].amount - prevAmount) / prevAmount) * 100;
//       }
//       prevAmount = map[key].amount;
//     });

//     return keys.map((key) => ({ date: key, ...map[key] }));
//   }, [invoices, groupBy]);

//   const maxAmount = Math.max(...data.map((d) => d.amount));
//   const minAmount = Math.min(...data.map((d) => d.amount));

//   const CustomTooltip = ({ active, payload, label }: any) => {
//     if (active && payload && payload.length) {
//       const growthValue = payload.find((p: any) => p.dataKey === "growth")?.value;
//       const growthText =
//         growthValue !== null && growthValue !== undefined
//           ? `${growthValue >= 0 ? "+" : ""}${growthValue.toFixed(1)}%`
//           : "—";

//       return (
//         <div className="bg-white shadow-lg rounded-md p-3 border border-gray-200 text-sm">
//           <p className="text-gray-500">{label}</p>
//           <p className="text-gray-800 font-semibold">
//             Sales: $
//             {payload.find((p: any) => p.dataKey === "amount")?.value?.toLocaleString()}
//           </p>
//           <p className="text-gray-600">
//             Invoices: {payload.find((p: any) => p.dataKey === "count")?.value}
//           </p>
//           <p
//             className={`${
//               growthValue !== null && growthValue >= 0 ? "text-green-600" : "text-red-600"
//             } font-medium`}
//           >
//             Growth: {growthText}
//           </p>
//         </div>
//       );
//     }
//     return null;
//   };

//   return (
//     <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition p-6 border border-gray-100">
//       <div className="flex justify-between items-center mb-4">
//         <h3 className="text-lg font-semibold text-gray-800">Sales Trend</h3>
//         <div className="space-x-2">
//           {(["daily", "weekly", "monthly"] as GroupBy[]).map((g) => (
//             <button
//               key={g}
//               onClick={() => setGroupBy(g)}
//               className={`px-3 py-1 rounded-full text-sm font-medium ${
//                 groupBy === g ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"
//               }`}
//             >
//               {g.charAt(0).toUpperCase() + g.slice(1)}
//             </button>
//           ))}
//         </div>
//       </div>

//       <ResponsiveContainer width="100%" height={400}>
//         <ComposedChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
//           <defs>
//             <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
//               <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.4} />
//               <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
//             </linearGradient>
//             <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
//               <stop offset="0%" stopColor="#10B981" stopOpacity={0.6} />
//               <stop offset="100%" stopColor="#10B981" stopOpacity={0.1} />
//             </linearGradient>
//           </defs>

//           <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" />
//           <XAxis
//             dataKey="date"
//             tick={{ fill: "#6b7280", fontSize: 12 }}
//             axisLine={{ stroke: "#d1d5db" }}
//             tickLine={false}
//             interval={groupBy === "daily" ? 0 : 0} // show all daily ticks; for weekly/monthly, we can skip some if needed
//             angle={groupBy === "daily" ? 0 : -30} // rotate labels for weekly/monthly
//             textAnchor={groupBy === "daily" ? "middle" : "end"} // align rotated labels
//             height={groupBy === "daily" ? 40 : 60} // increase height for rotated labels
//           />
//           <YAxis
//             yAxisId="left"
//             tickFormatter={(value) => `$${value.toLocaleString()}`}
//             tick={{ fill: "#6b7280", fontSize: 12 }}
//             axisLine={{ stroke: "#d1d5db" }}
//             tickLine={false}
//           />
//           <YAxis
//             yAxisId="right"
//             orientation="right"
//             tick={{ fill: "#6b7280", fontSize: 12 }}
//             axisLine={{ stroke: "#d1d5db" }}
//             tickLine={false}
//           />

//           <Tooltip content={<CustomTooltip />} />
//           <Legend verticalAlign="top" height={36} />

//           <Bar yAxisId="right" dataKey="count" barSize={8} fill="#FBBF24" radius={[4, 4, 0, 0]} />

//           {/* Area for growth: ignores null values */}
//           <Area yAxisId="left" dataKey="growth" stroke="transparent" fill="url(#growthGradient)" connectNulls={false} />

//           <Line
//             yAxisId="left"
//             type="monotone"
//             dataKey="amount"
//             stroke="#3B82F6"
//             strokeWidth={3}
//             dot={{ r: 4, stroke: "#3B82F6", strokeWidth: 2, fill: "white" }}
//             activeDot={{ r: 6, strokeWidth: 3, stroke: "#2563EB", fill: "#3B82F6" }}
//             isAnimationActive
//             animationDuration={1200}
//           />

//           <ReferenceDot
//             yAxisId="left"
//             x={data.find((d) => d.amount === maxAmount)?.date}
//             y={maxAmount}
//             r={6}
//             fill="#10B981"
//             stroke="#047857"
//             strokeWidth={2}
//             label={{
//               position: "top",
//               value: `Max: $${maxAmount.toLocaleString()}`,
//               fill: "#047857",
//               fontSize: 12,
//             }}
//           />

//           <ReferenceDot
//             yAxisId="left"
//             x={data.find((d) => d.amount === minAmount)?.date}
//             y={minAmount}
//             r={6}
//             fill="#EF4444"
//             stroke="#B91C1C"
//             strokeWidth={2}
//             label={{
//               position: "bottom",
//               value: `Min: $${minAmount.toLocaleString()}`,
//               fill: "#B91C1C",
//               fontSize: 12,
//             }}
//           />
//         </ComposedChart>
//       </ResponsiveContainer>
//     </div>
//   );
// };

// export default SalesLineChart;

import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceDot,
  Legend,
} from "recharts";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import { useMemo, useState } from "react";

dayjs.extend(isoWeek);

type GroupBy = "daily" | "weekly" | "monthly";

interface InvoiceItem {
  orderDate?: string | null;
  totalAmount?: number | string | null;
}

interface SalesLineChartProps {
  invoices: InvoiceItem[];
}

interface ChartRow {
  date: string;
  amount: number;
  count: number;
  growth: number | null;
  sortDate: string;
}

const formatCurrency = (value: number) =>
  `$${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const SalesLineChart = ({ invoices }: SalesLineChartProps) => {
  const [groupBy, setGroupBy] = useState<GroupBy>("daily");

  const data = useMemo(() => {
    if (!invoices || invoices.length === 0) return [];

    const validInvoices = invoices
      .filter((invoice) => invoice.orderDate && dayjs(invoice.orderDate).isValid())
      .sort(
        (a, b) =>
          dayjs(a.orderDate).valueOf() - dayjs(b.orderDate).valueOf()
      );

    if (validInvoices.length === 0) return [];

    const firstDate = dayjs(validInvoices[0].orderDate!).startOf("day");
    const lastDate = dayjs(validInvoices[validInvoices.length - 1].orderDate!).endOf("day");

    const grouped = new Map<string, { amount: number; count: number }>();

    validInvoices.forEach((invoice) => {
      const date = dayjs(invoice.orderDate);
      let key = "";

      if (groupBy === "daily") {
        key = date.startOf("day").format("YYYY-MM-DD");
      } else if (groupBy === "weekly") {
        key = date.startOf("isoWeek").format("YYYY-MM-DD");
      } else {
        key = date.startOf("month").format("YYYY-MM-DD");
      }

      const current = grouped.get(key) || { amount: 0, count: 0 };

      grouped.set(key, {
        amount: current.amount + Number(invoice.totalAmount || 0),
        count: current.count + 1,
      });
    });

    const rows: ChartRow[] = [];
    let cursor = firstDate.clone();

    if (groupBy === "daily") {
      while (cursor.isBefore(lastDate) || cursor.isSame(lastDate, "day")) {
        const key = cursor.format("YYYY-MM-DD");
        const values = grouped.get(key) || { amount: 0, count: 0 };

        rows.push({
          date: cursor.format("DD/MM"),
          amount: values.amount,
          count: values.count,
          growth: null,
          sortDate: key,
        });

        cursor = cursor.add(1, "day");
      }
    } else if (groupBy === "weekly") {
      cursor = firstDate.startOf("isoWeek");

      while (cursor.isBefore(lastDate) || cursor.isSame(lastDate, "day")) {
        const key = cursor.format("YYYY-MM-DD");
        const values = grouped.get(key) || { amount: 0, count: 0 };

        rows.push({
          date: `W${cursor.isoWeek()} ${cursor.format("YY")}`,
          amount: values.amount,
          count: values.count,
          growth: null,
          sortDate: key,
        });

        cursor = cursor.add(1, "week");
      }
    } else {
      cursor = firstDate.startOf("month");

      while (cursor.isBefore(lastDate) || cursor.isSame(lastDate, "day")) {
        const key = cursor.format("YYYY-MM-DD");
        const values = grouped.get(key) || { amount: 0, count: 0 };

        rows.push({
          date: cursor.format("MMM YYYY"),
          amount: values.amount,
          count: values.count,
          growth: null,
          sortDate: key,
        });

        cursor = cursor.add(1, "month");
      }
    }

    let previousAmount: number | null = null;

    rows.forEach((row, index) => {
      if (index === 0) {
        row.growth = null;
      } else if (previousAmount === null || previousAmount === 0) {
        row.growth = row.amount > 0 ? 100 : 0;
      } else {
        row.growth = ((row.amount - previousAmount) / previousAmount) * 100;
      }

      previousAmount = row.amount;
    });

    return rows;
  }, [invoices, groupBy]);

  const maxPoint = useMemo(() => {
    if (!data.length) return null;
    return data.reduce((max, item) => (item.amount > max.amount ? item : max), data[0]);
  }, [data]);

  const minPoint = useMemo(() => {
    if (!data.length) return null;

    const positiveOrZero = data.filter((item) => item.amount >= 0);
    if (!positiveOrZero.length) return null;

    return positiveOrZero.reduce((min, item) => (item.amount < min.amount ? item : min), positiveOrZero[0]);
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const amount = Number(
      payload.find((p: any) => p.dataKey === "amount")?.value || 0
    );
    const count = Number(
      payload.find((p: any) => p.dataKey === "count")?.value || 0
    );
    const growthValue = payload.find((p: any) => p.dataKey === "growth")?.payload?.growth;

    return (
      <div className="bg-white shadow-lg rounded-xl p-3 border border-gray-200 text-sm">
        <p className="text-gray-500">{label}</p>

        <p className="text-gray-800 font-semibold mt-1">
          Sales: {formatCurrency(amount)}
        </p>

        <p className="text-gray-600 mt-1">
          Invoices: {count}
        </p>

        <p
          className={`mt-1 font-medium ${
            growthValue === null || growthValue === undefined
              ? "text-gray-400"
              : growthValue >= 0
              ? "text-green-600"
              : "text-red-600"
          }`}
        >
          Growth:{" "}
          {growthValue === null || growthValue === undefined
            ? "—"
            : `${growthValue >= 0 ? "+" : ""}${growthValue.toFixed(1)}%`}
        </p>
      </div>
    );
  };

  const buttons: GroupBy[] = ["daily", "weekly", "monthly"];

  return (
    <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition p-6 border border-gray-100">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            Sales Trend
          </h3>
        </div>

        <div className="inline-flex items-center bg-gray-100 rounded-lg p-1 self-start">
          {buttons.map((g) => {
            const label = g.charAt(0).toUpperCase() + g.slice(1);

            const icon =
              g === "daily" ? "📅" :
              g === "weekly" ? "📊" :
              "📆";

            return (
              <button
                key={g}
                type="button"
                onClick={() => setGroupBy(g)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md leading-none transition-all duration-200 whitespace-nowrap ${
                  groupBy === g
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                <span className="text-xs">{icon}</span>
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart
          data={data}
          margin={{ top: 20, right: 20, left: 0, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" />

          <XAxis
            dataKey="date"
            tick={{ fill: "#6b7280", fontSize: 12 }}
            axisLine={{ stroke: "#d1d5db" }}
            tickLine={false}
            interval="preserveStartEnd"
            angle={groupBy === "daily" ? 0 : -20}
            textAnchor={groupBy === "daily" ? "middle" : "end"}
            height={groupBy === "daily" ? 35 : 55}
          />

          <YAxis
            yAxisId="left"
            tickFormatter={(value) => `$${Number(value).toLocaleString()}`}
            tick={{ fill: "#6b7280", fontSize: 12 }}
            axisLine={{ stroke: "#d1d5db" }}
            tickLine={false}
          />

          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: "#6b7280", fontSize: 12 }}
            axisLine={{ stroke: "#d1d5db" }}
            tickLine={false}
          />

          <Tooltip content={<CustomTooltip />} />
          <Legend verticalAlign="top" height={36} />

          <Bar
            yAxisId="right"
            dataKey="count"
            name="Invoices"
            barSize={10}
            fill="#FBBF24"
            radius={[4, 4, 0, 0]}
          />

          <Line
            yAxisId="left"
            type="monotone"
            dataKey="amount"
            name="Sales Amount"
            stroke="#3B82F6"
            strokeWidth={3}
            dot={{ r: 4, stroke: "#3B82F6", strokeWidth: 2, fill: "white" }}
            activeDot={{ r: 6, strokeWidth: 3, stroke: "#2563EB", fill: "#3B82F6" }}
            isAnimationActive
            animationDuration={1000}
          />

          {maxPoint && (
            <ReferenceDot
              yAxisId="left"
              x={maxPoint.date}
              y={maxPoint.amount}
              r={6}
              fill="#10B981"
              stroke="#047857"
              strokeWidth={2}
              label={{
                position: "top",
                value: `Max: ${formatCurrency(maxPoint.amount)}`,
                fill: "#047857",
                fontSize: 12,
              }}
            />
          )}

          {minPoint && (
            <ReferenceDot
              yAxisId="left"
              x={minPoint.date}
              y={minPoint.amount}
              r={6}
              fill="#EF4444"
              stroke="#B91C1C"
              strokeWidth={2}
              label={{
                position: "bottom",
                value: `Min: ${formatCurrency(minPoint.amount)}`,
                fill: "#B91C1C",
                fontSize: 12,
              }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SalesLineChart;