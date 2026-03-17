"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { fetchKPIQuickGlance } from "@/app/actions/kpi-actions";
import KPICard from "./KPICard";
import RevenueChart from "./RevenueChart";
import OrderStatsCard from "./OrderStatsCard";
import ProductionAlerts from "./ProductionAlerts";
import AppointmentsTodayCard from "./AppointmentsTodayCard";

function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
      <div className="h-3 bg-gray-200 rounded w-20 mb-3" />
      <div className="h-7 bg-gray-200 rounded w-32 mb-2" />
      <div className="h-3 bg-gray-200 rounded w-16" />
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
      <div className="h-3 bg-gray-200 rounded w-32 mb-3" />
      <div className="h-48 bg-gray-100 rounded" />
    </div>
  );
}

export default function OwnerDashboardClient() {
  const router = useRouter();
  const [chartRange, setChartRange] = useState<"week" | "month">("week");

  const { data, isLoading, error } = useQuery({
    queryKey: ["kpi-quick-glance", chartRange],
    queryFn: () => fetchKPIQuickGlance(chartRange),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
        <p className="text-red-700 text-sm">
          {error instanceof Error ? error.message : "Không thể tải dữ liệu Dashboard. Vui lòng thử lại."}
        </p>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <SkeletonChart />
          <SkeletonCard />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Revenue KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <KPICard
          title="Doanh thu hôm nay"
          value={formatVND(data.revenue.daily)}
          trend={data.revenue.daily_trend}
          subtitle="so với hôm qua"
          onClick={() => router.push("/owner/orders")}
        />
        <KPICard
          title="Doanh thu tuần"
          value={formatVND(data.revenue.weekly)}
          trend={data.revenue.weekly_trend}
          subtitle="so với tuần trước"
          onClick={() => router.push("/owner/orders")}
        />
        <KPICard
          title="Doanh thu tháng"
          value={formatVND(data.revenue.monthly)}
          trend={data.revenue.monthly_trend}
          subtitle="so với tháng trước"
          onClick={() => router.push("/owner/orders")}
        />
      </div>

      {/* Chart + Order Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <RevenueChart
          data={data.revenue_chart}
          chartRange={chartRange}
          onRangeChange={setChartRange}
        />
        <OrderStatsCard
          stats={data.orders}
          onClick={() => router.push("/owner/orders")}
        />
      </div>

      {/* Alerts + Appointments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ProductionAlerts alerts={data.production_alerts} />
        <AppointmentsTodayCard
          appointments={data.appointments_today}
          onClick={() => router.push("/owner/appointments")}
        />
      </div>
    </div>
  );
}
