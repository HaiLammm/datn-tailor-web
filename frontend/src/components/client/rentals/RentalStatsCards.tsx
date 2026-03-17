"use client";

/**
 * Rental Stats Cards Component (Story 4.3)
 * Shows 4 summary cards with KPI metrics
 */

import { Skeleton } from "@/components/ui/skeleton";
import type { RentalStats } from "@/types/rental";

interface RentalStatsCardsProps {
  data?: RentalStats;
  isLoading?: boolean;
}

export function RentalStatsCards({
  data,
  isLoading = false,
}: RentalStatsCardsProps) {
  const cards = [
    {
      label: "Đang Thuê",
      value: data?.active_rentals ?? 0,
      icon: "📦",
      color: "bg-blue-50 border-blue-200",
      textColor: "text-blue-900",
    },
    {
      label: "Quá Hạn",
      value: data?.overdue_rentals ?? 0,
      icon: "⏰",
      color: "bg-red-50 border-red-200",
      textColor: "text-red-900",
    },
    {
      label: "Trả Trong Tuần",
      value: data?.due_this_week ?? 0,
      icon: "📅",
      color: "bg-amber-50 border-amber-200",
      textColor: "text-amber-900",
    },
    {
      label: "Đã Trả Tháng Này",
      value: data?.returned_this_month ?? 0,
      icon: "✓",
      color: "bg-green-50 border-green-200",
      textColor: "text-green-900",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`${card.color} border rounded-lg p-4`}
        >
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
            </div>
          ) : (
            <>
              <div className="text-2xl mb-2">{card.icon}</div>
              <div className="text-sm font-medium text-gray-600">
                {card.label}
              </div>
              <div className={`text-3xl font-bold ${card.textColor}`}>
                {card.value}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
