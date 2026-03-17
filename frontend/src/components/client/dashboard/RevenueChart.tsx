"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { DailyRevenue } from "@/types/kpi";

interface RevenueChartProps {
  data: DailyRevenue[];
  chartRange: "week" | "month";
  onRangeChange: (range: "week" | "month") => void;
}

function formatVND(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}tr`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return value.toString();
}

function formatDate(dateStr: string, range: "week" | "month"): string {
  const d = new Date(dateStr);
  if (range === "month") {
    return `${d.getDate()}/${d.getMonth() + 1}`;
  }
  const days = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  return days[d.getDay()];
}

export default function RevenueChart({ data, chartRange, onRangeChange }: RevenueChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    label: formatDate(d.date, chartRange),
  }));

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700">
          Doanh thu {chartRange === "week" ? "7 ngày" : "30 ngày"} qua
        </h3>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          <button
            onClick={() => onRangeChange("week")}
            className={`px-3 py-1 text-xs font-medium transition-colors ${
              chartRange === "week"
                ? "bg-[#1A2B4C] text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            Tuần
          </button>
          <button
            onClick={() => onRangeChange("month")}
            className={`px-3 py-1 text-xs font-medium transition-colors ${
              chartRange === "month"
                ? "bg-[#1A2B4C] text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            Tháng
          </button>
        </div>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: chartRange === "month" ? 9 : 12, fill: "#6B7280" }}
              axisLine={false}
              tickLine={false}
              interval={chartRange === "month" ? 2 : 0}
            />
            <YAxis
              tickFormatter={formatVND}
              tick={{ fontSize: 11, fill: "#6B7280" }}
              axisLine={false}
              tickLine={false}
              width={45}
            />
            <Tooltip
              formatter={(value) => [
                new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(value)),
                "Doanh thu",
              ]}
              labelFormatter={(label) => `Ngày: ${label}`}
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
            />
            <Bar dataKey="amount" fill="#1A2B4C" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
