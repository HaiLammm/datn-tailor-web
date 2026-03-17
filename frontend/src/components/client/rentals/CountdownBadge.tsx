"use client";

/**
 * Countdown Badge Component (Story 4.3)
 * Visual countdown based on days remaining
 * Green: > 3 days, Amber: 1-3 days, Red: Overdue
 */

interface CountdownBadgeProps {
  daysRemaining: number;
  status: "active" | "overdue" | "returned";
}

export function CountdownBadge({
  daysRemaining,
  status,
}: CountdownBadgeProps) {
  // Determine color based on days remaining
  let bgColor = "bg-green-100";
  let textColor = "text-green-800";
  let label = "Còn lâu";

  if (status === "returned") {
    bgColor = "bg-gray-100";
    textColor = "text-gray-800";
    label = "Đã trả";
  } else if (status === "overdue" || daysRemaining < 0) {
    bgColor = "bg-red-100 animate-pulse";
    textColor = "text-red-800";
    label = `Quá hạn ${Math.abs(daysRemaining)} ngày`;
  } else if (daysRemaining === 0) {
    bgColor = "bg-amber-100";
    textColor = "text-amber-800";
    label = "Hôm nay là hạn trả";
  } else if (daysRemaining <= 3 && daysRemaining > 0) {
    bgColor = "bg-amber-100";
    textColor = "text-amber-800";
    label = `Còn ${daysRemaining} ngày`;
  } else {
    label = `Còn ${daysRemaining} ngày`;
  }

  return (
    <span className={`${bgColor} ${textColor} px-3 py-1 rounded-full text-sm font-medium`}>
      {label}
    </span>
  );
}
