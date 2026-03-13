"use client";

/**
 * BookingCalendar - Story 3.4: Lịch Book Appointments.
 *
 * Renders a calendar with slot availability indicators.
 * Mobile (< 768px): Week view (7 days around current/selected date).
 * Desktop (≥ 768px): Full month grid view.
 *
 * Uses native Date API (no date-fns/dayjs dependency required).
 * Animated month transitions via Framer Motion.
 *
 * States per date:
 *   - available: has open slots (Jade Green border)
 *   - unavailable: both slots full (gray, not clickable)
 *   - selected: currently picked date (Heritage Gold outline)
 *   - today: current date (Indigo dot indicator)
 *   - past: before today (disabled)
 */

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import type { MonthAvailability } from "@/types/booking";

interface BookingCalendarProps {
  monthAvailability: MonthAvailability;
  selectedDate: string | null;
  onDateSelect: (date: string) => void;
  currentMonth: { year: number; month: number };
  onMonthChange: (year: number, month: number) => void;
}

const WEEKDAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const MONTH_NAMES = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4",
  "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8",
  "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
];

function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isDateInPast(d: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

function isToday(d: Date): boolean {
  const today = new Date();
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
}

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const current = new Date(year, month - 1, 1);
  while (current.getMonth() === month - 1) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
}

/** Returns 0-indexed day of week where Monday=0, Sunday=6 */
function getMondayStartWeekday(d: Date): number {
  return (d.getDay() + 6) % 7;
}

/** Get the Monday-starting week containing the given date */
function getWeekDays(anchor: Date): Date[] {
  const dayOfWeek = getMondayStartWeekday(anchor);
  const monday = new Date(anchor);
  monday.setDate(monday.getDate() - dayOfWeek);
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
}

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return isMobile;
}

export default function BookingCalendar({
  monthAvailability,
  selectedDate,
  onDateSelect,
  currentMonth,
  onMonthChange,
}: BookingCalendarProps) {
  const { year, month } = currentMonth;
  const isMobile = useIsMobile();
  const days = getDaysInMonth(year, month);

  // For week view: anchor on selected date or today
  const weekAnchor = selectedDate
    ? new Date(selectedDate + "T00:00:00")
    : new Date();
  const weekDays = getWeekDays(weekAnchor);

  // Padding cells before first day of month (desktop only)
  const firstDayOffset = getMondayStartWeekday(new Date(year, month - 1, 1));

  const goPrevMonth = () => {
    if (month === 1) onMonthChange(year - 1, 12);
    else onMonthChange(year, month - 1);
  };

  const goNextMonth = () => {
    if (month === 12) onMonthChange(year + 1, 1);
    else onMonthChange(year, month + 1);
  };

  // Week navigation for mobile
  const goPrevWeek = () => {
    const prev = new Date(weekAnchor);
    prev.setDate(prev.getDate() - 7);
    const key = formatDateKey(prev);
    // If navigating to a different month, trigger month change too
    if (prev.getMonth() + 1 !== month || prev.getFullYear() !== year) {
      onMonthChange(prev.getFullYear(), prev.getMonth() + 1);
    }
    onDateSelect(key);
  };

  const goNextWeek = () => {
    const next = new Date(weekAnchor);
    next.setDate(next.getDate() + 7);
    const key = formatDateKey(next);
    if (next.getMonth() + 1 !== month || next.getFullYear() !== year) {
      onMonthChange(next.getFullYear(), next.getMonth() + 1);
    }
    onDateSelect(key);
  };

  const renderDayCell = (day: Date) => {
    const dateKey = formatDateKey(day);
    const avail = monthAvailability[dateKey];
    const isPast = isDateInPast(day);
    const todayDate = isToday(day);
    const isSelected = selectedDate === dateKey;

    const hasAvailableSlot =
      avail?.morning_available || avail?.afternoon_available;
    const isClickable = !isPast && hasAvailableSlot;

    let cellClass =
      "relative flex flex-col items-center justify-center w-full aspect-square rounded-lg text-sm font-mono transition-all duration-150 select-none ";

    if (isSelected) {
      cellClass +=
        "border-2 border-[#D4AF37] bg-[rgba(212,175,55,0.1)] text-[#1A1A2E] cursor-pointer";
    } else if (isPast) {
      cellClass += "text-gray-300 cursor-not-allowed";
    } else if (isClickable) {
      cellClass +=
        "border border-[#059669] text-[#1A1A2E] cursor-pointer hover:border-[#D4AF37] hover:bg-[rgba(212,175,55,0.05)]";
    } else {
      cellClass += "text-[#9CA3AF] cursor-not-allowed bg-gray-50";
    }

    return (
      <button
        key={dateKey}
        disabled={!isClickable}
        onClick={() => isClickable && onDateSelect(dateKey)}
        aria-label={`${day.getDate()} tháng ${day.getMonth() + 1}${isSelected ? " (đang chọn)" : ""}${!isClickable && !isPast ? " (đã đầy)" : ""}`}
        aria-pressed={isSelected}
        className={cellClass}
      >
        <span>{day.getDate()}</span>

        {/* Today indicator dot */}
        {todayDate && (
          <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#1A2B4C]" />
        )}

        {/* Available slot indicator */}
        {isClickable && !isSelected && (
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#059669]" />
        )}
      </button>
    );
  };

  return (
    <div className="w-full">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={isMobile ? goPrevWeek : goPrevMonth}
          aria-label={isMobile ? "Tuần trước" : "Tháng trước"}
          className="w-9 h-9 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-[#1A1A2E] font-medium"
        >
          ‹
        </button>
        <h2 className="font-cormorant text-lg font-semibold text-[#1A1A2E]">
          {MONTH_NAMES[month - 1]} {year}
        </h2>
        <button
          onClick={isMobile ? goNextWeek : goNextMonth}
          aria-label={isMobile ? "Tuần sau" : "Tháng sau"}
          className="w-9 h-9 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-[#1A1A2E] font-medium"
        >
          ›
        </button>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 mb-2">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="text-center text-xs font-medium text-[#6B7280] py-1"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Calendar Grid with Framer Motion animation */}
      <AnimatePresence mode="wait">
        <motion.div
          key={isMobile ? `week-${formatDateKey(weekDays[0])}` : `${year}-${month}`}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="grid grid-cols-7 gap-1"
        >
          {isMobile ? (
            /* Mobile: Week view — 7 days */
            weekDays.map((day) => renderDayCell(day))
          ) : (
            <>
              {/* Desktop: Full month view with padding */}
              {Array.from({ length: firstDayOffset }).map((_, i) => (
                <div key={`pad-${i}`} aria-hidden="true" />
              ))}
              {days.map((day) => renderDayCell(day))}
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-[#6B7280]">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full border border-[#059669]" />
          Còn slot
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full border-2 border-[#D4AF37]" />
          Đang chọn
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#1A2B4C]" />
          Hôm nay
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-gray-200" />
          Đã đầy / Quá khứ
        </span>
      </div>
    </div>
  );
}
