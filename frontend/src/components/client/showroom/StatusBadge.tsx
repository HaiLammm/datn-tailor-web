"use client";

/**
 * StatusBadge component - Story 5.1
 * Displays garment availability status with color coding
 */

import { GarmentStatus } from "@/types/garment";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const STATUS_CONFIG = {
  [GarmentStatus.AVAILABLE]: {
    label: "Sẵn sàng",
    bgColor: "bg-green-100",
    textColor: "text-green-800",
  },
  [GarmentStatus.RENTED]: {
    label: "Đang thuê",
    bgColor: "bg-amber-100",
    textColor: "text-amber-900",
  },
  [GarmentStatus.MAINTENANCE]: {
    label: "Bảo trì",
    bgColor: "bg-gray-100",
    textColor: "text-gray-800",
  },
};

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status as GarmentStatus] || {
    label: status,
    bgColor: "bg-gray-100",
    textColor: "text-gray-800",
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.bgColor} ${config.textColor} ${className}`}
    >
      {config.label}
    </span>
  );
}
