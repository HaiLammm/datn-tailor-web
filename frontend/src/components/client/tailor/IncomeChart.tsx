"use client";

import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { TailorIncomeResponse } from "@/types/tailor-task";

interface IncomeChartProps {
  income: TailorIncomeResponse;
}

function formatVND(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}tr`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return value.toString();
}

function formatVNDFull(value: number): string {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);
}

/** Bar colors: index 0 = previous month (gray), index 1 = current month (Heritage Gold) */
const BAR_COLORS = ["#E5E7EB", "#D4AF37"];

export default function IncomeChart({ income }: IncomeChartProps) {
  const { current_month, previous_month } = income;

  const chartData = [
    {
      label: `Th${previous_month.month}/${previous_month.year}`,
      total_income: previous_month.total_income,
      task_count: previous_month.task_count,
    },
    {
      label: `Th${current_month.month}/${current_month.year}`,
      total_income: current_month.total_income,
      task_count: current_month.task_count,
    },
  ];

  return (
    <div data-testid="income-chart">
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={chartData} barCategoryGap="35%">
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#6B7280" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatVND}
            tick={{ fontSize: 10, fill: "#9CA3AF" }}
            axisLine={false}
            tickLine={false}
            width={38}
          />
          <Tooltip
            formatter={(value) => [
              formatVNDFull(Number(value)),
              "Tiền công",
            ]}
            contentStyle={{ fontSize: 11, borderRadius: 8 }}
          />
          <Bar dataKey="total_income" radius={[4, 4, 0, 0]}>
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={BAR_COLORS[index]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
