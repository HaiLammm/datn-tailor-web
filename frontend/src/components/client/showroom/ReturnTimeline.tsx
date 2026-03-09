"use client";

/**
 * ReturnTimeline component - Story 5.2: Return Timeline & Status
 *
 * Displays garment return timeline based on computed backend fields.
 * Backend computes days_until_available and is_overdue — frontend does NOT recalculate.
 *
 * Status colors per Heritage Palette:
 * - Available: Green #059669
 * - Rented (future): Amber #FEF3C7 / #92400E
 * - Overdue: Red #FEE2E2 / #991B1B
 * - Maintenance: Gray #F3F4F6 / #374151
 */

import { Garment, GarmentStatus } from "@/types/garment";

interface ReturnTimelineProps {
  garment: Garment;
}

function formatReturnDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function ReturnTimeline({ garment }: ReturnTimelineProps) {
  const { status, expected_return_date, days_until_available, is_overdue } =
    garment;

  // Available garment: no timeline needed
  if (status === GarmentStatus.AVAILABLE) {
    return (
      <div
        className="rounded-lg p-4 border border-green-200"
        style={{ backgroundColor: "#ECFDF5" }}
        aria-label="Trạng thái: Sẵn sàng cho thuê"
      >
        <div className="flex items-center gap-2">
          <span
            className="text-2xl"
            role="img"
            aria-label="checkmark"
          >
            ✓
          </span>
          <div>
            <p
              className="font-semibold text-base"
              style={{ color: "#059669" }}
            >
              Sẵn sàng cho thuê
            </p>
            <p className="text-sm text-gray-600">
              Bộ trang phục này hiện có sẵn để thuê ngay hôm nay.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Maintenance garment
  if (status === GarmentStatus.MAINTENANCE) {
    return (
      <div
        className="rounded-lg p-4 border border-gray-200"
        style={{ backgroundColor: "#F3F4F6" }}
        aria-label="Trạng thái: Đang bảo trì"
      >
        <div className="flex items-center gap-2">
          <span
            className="text-2xl"
            role="img"
            aria-label="tools"
          >
            🔧
          </span>
          <div>
            <p
              className="font-semibold text-base"
              style={{ color: "#374151" }}
            >
              Đang bảo trì
            </p>
            <p className="text-sm text-gray-600">
              Bộ trang phục đang được bảo dưỡng, chưa sẵn sàng cho thuê.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Rented garment — show timeline
  if (status === GarmentStatus.RENTED) {
    // Overdue
    if (is_overdue) {
      const overdueDays = Math.abs(days_until_available ?? 0);
      return (
        <div
          className="rounded-lg p-4 border border-red-200"
          style={{ backgroundColor: "#FEE2E2" }}
          aria-label={`Trạng thái: Quá hạn ${overdueDays} ngày`}
        >
          <div className="flex items-center gap-2 mb-2">
            <span
              className="text-2xl"
              role="img"
              aria-label="warning"
            >
              ⚠️
            </span>
            <p
              className="font-semibold text-base"
              style={{ color: "#991B1B" }}
            >
              Quá hạn trả
            </p>
          </div>
          {expected_return_date && (
            <p className="text-sm mb-1" style={{ color: "#991B1B" }}>
              Hạn trả: {formatReturnDate(expected_return_date)}
            </p>
          )}
          <p className="text-sm font-medium" style={{ color: "#991B1B" }}>
            Đã quá hạn {overdueDays} ngày
          </p>
        </div>
      );
    }

    // Due today
    if (days_until_available === 0) {
      return (
        <div
          className="rounded-lg p-4 border border-amber-200"
          style={{ backgroundColor: "#FEF3C7" }}
          aria-label="Trạng thái: Trả hàng hôm nay"
        >
          <div className="flex items-center gap-2 mb-2">
            <span
              className="text-2xl"
              role="img"
              aria-label="calendar"
            >
              📅
            </span>
            <p
              className="font-semibold text-base"
              style={{ color: "#92400E" }}
            >
              Trả hàng hôm nay
            </p>
          </div>
          {expected_return_date && (
            <p className="text-sm" style={{ color: "#92400E" }}>
              Hạn trả: {formatReturnDate(expected_return_date)}
            </p>
          )}
        </div>
      );
    }

    // Future return date
    return (
      <div
        className="rounded-lg p-4 border border-amber-200"
        style={{ backgroundColor: "#FEF3C7" }}
        aria-label={`Trạng thái: Đang thuê, còn ${days_until_available} ngày`}
      >
        <div className="flex items-center gap-2 mb-2">
          <span
            className="text-2xl"
            role="img"
            aria-label="clock"
          >
            🕐
          </span>
          <p
            className="font-semibold text-base"
            style={{ color: "#92400E" }}
          >
            Đang được thuê
          </p>
        </div>
        {expected_return_date && (
          <p className="text-sm mb-1" style={{ color: "#92400E" }}>
            Dự kiến trả: {formatReturnDate(expected_return_date)}
          </p>
        )}
        {days_until_available !== null && (
          <p className="text-sm font-medium" style={{ color: "#92400E" }}>
            Còn {days_until_available} ngày sẵn sàng
          </p>
        )}
      </div>
    );
  }

  // Fallback (unknown status)
  return null;
}
