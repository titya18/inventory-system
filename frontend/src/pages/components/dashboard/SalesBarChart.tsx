// import {
//   BarChart,
//   Bar,
//   XAxis,
//   YAxis,
//   Tooltip,
//   ResponsiveContainer,
//   CartesianGrid,
//   Legend
// } from "recharts";
// import dayjs from "dayjs";
// import isoWeek from "dayjs/plugin/isoWeek";
// import isBetween from "dayjs/plugin/isBetween";
// dayjs.extend(isoWeek);
// dayjs.extend(isBetween);

// interface Props {
//   purchases: any[];
//   startDate: string;
//   endDate: string;
//   groupBy: "daily" | "weekly" | "monthly";
//   setGroupBy: (v: "daily" | "weekly" | "monthly") => void;
//   growth: number | null;
// }

// const SalesBarChart = ({
//   purchases,
//   startDate,
//   endDate,
//   groupBy,
//   setGroupBy,
//   growth
// }: Props) => {

//   const start = dayjs(startDate);
//   const end = dayjs(endDate);

//   const grouped = new Map<string, number>();

//   // 1️ Group Data
//   purchases.forEach(p => {
//     const date = dayjs(p.createdAt || p.purchaseDate);

//     let key = "";

//     if (groupBy === "daily") {
//       key = date.format("YYYY-MM-DD");
//     }

//     if (groupBy === "weekly") {
//       key = `${date.year()}-W${date.isoWeek()}`;
//     }

//     if (groupBy === "monthly") {
//       key = date.format("YYYY-MM");
//     }

//     grouped.set(
//       key,
//       (grouped.get(key) || 0) + Number(p.grandTotal || 0)
//     );
//   });

//   // 2️ Auto-fill missing dates
//   const data: any[] = [];

//   let cursor = start.clone();

//   while (cursor.isBefore(end) || cursor.isSame(end)) {

//     let key = "";

//     if (groupBy === "daily") {
//       key = cursor.format("YYYY-MM-DD");
//       data.push({
//         label: cursor.format("DD/MM"),
//         amount: grouped.get(key) || 0
//       });
//       cursor = cursor.add(1, "day");
//     }

//     else if (groupBy === "weekly") {
//       key = `${cursor.year()}-W${cursor.isoWeek()}`;
//       data.push({
//         label: `W${cursor.isoWeek()}`,
//         amount: grouped.get(key) || 0
//       });
//       cursor = cursor.add(1, "week");
//     }

//     else if (groupBy === "monthly") {
//       key = cursor.format("YYYY-MM");
//       data.push({
//         label: cursor.format("MMM YYYY"),
//         amount: grouped.get(key) || 0
//       });
//       cursor = cursor.add(1, "month");
//     }
//   }

//   // // 3️ Previous Period Comparison
//   // const periodLength = end.diff(start, "day") + 1;
//   // const prevStart = start.subtract(periodLength, "day");
//   // const prevEnd = start.subtract(1, "day");

//   // const previousTotal = purchases
//   // .filter(p => {
//   //   const d = dayjs(p.createdAt || p.purchaseDate);
//   //   return d.isBetween(prevStart, prevEnd, null, "[]"); // inclusive
//   // })
//   // .reduce((sum, p) => sum + Number(p.grandTotal || 0), 0);

//   const currentTotal = data.reduce((sum, d) => sum + d.amount, 0);

//   // const growth =
//   //   previousTotal === 0
//   //     ? 100
//   //     : ((currentTotal - previousTotal) / previousTotal) * 100;

//   // 4️ UI
//   return (
//     <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">

//       {/* Header */}
//       <div className="flex justify-between items-center mb-6">

//         <div>
//           <h3 className="text-lg font-semibold text-gray-800">
//             Purchases Overview
//           </h3>
//           <p className="text-sm text-gray-500">
//             Total: <span className="font-semibold text-gray-800">
//               {currentTotal.toLocaleString()} $
//             </span>
//           </p>
//           <p
//             className={`text-sm font-medium ${
//               growth === null
//                 ? "text-gray-400"
//                 : growth >= 0
//                 ? "text-green-500"
//                 : "text-red-500"
//             }`}
//           >
//             {growth === null
//               ? "—"
//               : `${growth}% vs previous period`}
//           </p>
//         </div>

//         {/* Grouping Switch */}
//         <div className="flex gap-2">
//           {["daily", "weekly", "monthly"].map((g: any) => (
//             <button
//               key={g}
//               onClick={() => setGroupBy(g)}
//               className={`px-3 py-1 rounded-lg text-sm ${
//                 groupBy === g
//                   ? "bg-blue-500 text-white"
//                   : "bg-gray-100 text-gray-600"
//               }`}
//             >
//               {g}
//             </button>
//           ))}
//         </div>

//       </div>

//       {/* Chart */}
//       <ResponsiveContainer width="100%" height={320}>
//         <BarChart data={data}>
//           <CartesianGrid strokeDasharray="3 3" />
//           <XAxis dataKey="label" />
//           <YAxis />
//           <Tooltip
//             formatter={(value: number | undefined) =>
//               [`${(value ?? 0).toLocaleString()} $`, "Purchase"]
//             }
//           />
//           <Legend />
//           <Bar
//             dataKey="amount"
//             fill="#10B981"
//             radius={[6, 6, 0, 0]}
//           />
//         </BarChart>
//       </ResponsiveContainer>

//     </div>
//   );
// };

// export default SalesBarChart;

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import { useMemo } from "react";

dayjs.extend(isoWeek);

type GroupBy = "daily" | "weekly" | "monthly";

interface PurchaseItem {
  createdAt?: string | Date | null;
  purchaseDate?: string | Date | null;
  grandTotal?: number | string | null;
}

interface Props {
  purchases: PurchaseItem[];
  startDate: string;
  endDate: string;
  groupBy: GroupBy;
  setGroupBy: (v: GroupBy) => void;
  growth: number | null;
}

interface ChartRow {
  label: string;
  amount: number;
  fullDate: string;
}

const formatCurrency = (value: number) =>
  `$${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const SalesBarChart = ({
  purchases,
  startDate,
  endDate,
  groupBy,
  setGroupBy,
  growth,
}: Props) => {
  const chartData = useMemo(() => {
    const start = dayjs(startDate).startOf("day");
    const end = dayjs(endDate).endOf("day");

    if (!start.isValid() || !end.isValid() || start.isAfter(end)) {
      return [];
    }

    const grouped = new Map<string, number>();

    purchases.forEach((purchase) => {
      const rawDate = purchase.purchaseDate || purchase.createdAt;
      if (!rawDate) return;

      const date = dayjs(rawDate);
      if (!date.isValid()) return;
      if (date.isBefore(start) || date.isAfter(end)) return;

      let key = "";

      if (groupBy === "daily") {
        key = date.format("YYYY-MM-DD");
      } else if (groupBy === "weekly") {
        key = date.startOf("isoWeek").format("YYYY-MM-DD");
      } else {
        key = date.startOf("month").format("YYYY-MM-DD");
      }

      grouped.set(key, (grouped.get(key) || 0) + Number(purchase.grandTotal || 0));
    });

    const rows: ChartRow[] = [];
    let cursor = start.clone();

    if (groupBy === "daily") {
      while (cursor.isBefore(end) || cursor.isSame(end, "day")) {
        const key = cursor.format("YYYY-MM-DD");

        rows.push({
          label: cursor.format("DD/MM"),
          amount: grouped.get(key) || 0,
          fullDate: key,
        });

        cursor = cursor.add(1, "day");
      }
    } else if (groupBy === "weekly") {
      cursor = start.startOf("isoWeek");

      while (cursor.isBefore(end) || cursor.isSame(end, "day")) {
        const key = cursor.format("YYYY-MM-DD");

        rows.push({
          label: `W${cursor.isoWeek()} ${cursor.format("YY")}`,
          amount: grouped.get(key) || 0,
          fullDate: key,
        });

        cursor = cursor.add(1, "week");
      }
    } else {
      cursor = start.startOf("month");

      while (cursor.isBefore(end) || cursor.isSame(end, "day")) {
        const key = cursor.format("YYYY-MM-DD");

        rows.push({
          label: cursor.format("MMM YYYY"),
          amount: grouped.get(key) || 0,
          fullDate: key,
        });

        cursor = cursor.add(1, "month");
      }
    }

    return rows;
  }, [purchases, startDate, endDate, groupBy]);

  const currentTotal = useMemo(
    () => chartData.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [chartData]
  );

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const amount = Number(payload[0]?.value || 0);

    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3">
        <p className="text-sm font-semibold text-gray-800">{label}</p>
        <p className="text-sm text-gray-600 mt-1">
          Purchase: <span className="font-semibold text-emerald-600">{formatCurrency(amount)}</span>
        </p>
      </div>
    );
  };

  const buttons: GroupBy[] = ["daily", "weekly", "monthly"];

  return (
    <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            Purchases Overview
          </h3>

          <p className="text-sm text-gray-500 mt-1">
            Total:{" "}
            <span className="font-semibold text-gray-800">
              {formatCurrency(currentTotal)}
            </span>
          </p>

          <p
            className={`text-sm font-medium mt-1 ${
              growth === null
                ? "text-gray-400"
                : growth >= 0
                ? "text-green-600"
                : "text-red-600"
            }`}
          >
            {growth === null ? "—" : `${growth}% vs previous period`}
          </p>
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

      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="label"
            tick={{ fill: "#6b7280", fontSize: 12 }}
            axisLine={{ stroke: "#d1d5db" }}
            tickLine={false}
            interval="preserveStartEnd"
            angle={groupBy === "daily" ? 0 : -20}
            textAnchor={groupBy === "daily" ? "middle" : "end"}
            height={groupBy === "daily" ? 35 : 55}
          />
          <YAxis
            tick={{ fill: "#6b7280", fontSize: 12 }}
            axisLine={{ stroke: "#d1d5db" }}
            tickLine={false}
            tickFormatter={(value) => `$${Number(value).toLocaleString()}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar
            dataKey="amount"
            name="Amount"
            fill="#10B981"
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SalesBarChart;