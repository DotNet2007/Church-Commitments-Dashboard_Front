import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { DashboardChartItem } from "../../interfaces/dashboard-interface";

interface DashboardChartProps {
  data: DashboardChartItem[];
}

export default function DashboardChart({
  data,
}: DashboardChartProps) {
  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 14, right: 4, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="dueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#D6C8E8" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#D6C8E8" stopOpacity={0} />
            </linearGradient>

            <linearGradient id="paidFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#9B82C4" stopOpacity={0.14} />
              <stop offset="100%" stopColor="#9B82C4" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid stroke="#F0EAF7" vertical={false} />

          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#998DA5", fontSize: 11, fontFamily: "Tajawal" }}
            dy={10}
          />

          <YAxis
            orientation="right"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#998DA5", fontSize: 10 }}
            width={45}
          />

          <Tooltip
            formatter={(value) => Number(value ?? 0).toLocaleString("en-US")}
            contentStyle={{
              border: "1px solid #E8E0F0",
              borderRadius: 10,
              fontFamily: "Tajawal",
            }}
          />

          <Area
            type="linear"
            dataKey="due"
            name="المستحق"
            stroke="#D6C8E8"
            strokeWidth={2.5}
            fill="url(#dueFill)"
            dot={{
              r: 3.5,
              fill: "#fff",
              stroke: "#D6C8E8",
              strokeWidth: 2,
            }}
          />

          <Area
            type="linear"
            dataKey="paid"
            name="المحصل"
            stroke="#9B82C4"
            strokeWidth={2.5}
            fill="url(#paidFill)"
            dot={{
              r: 3.5,
              fill: "#fff",
              stroke: "#9B82C4",
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}