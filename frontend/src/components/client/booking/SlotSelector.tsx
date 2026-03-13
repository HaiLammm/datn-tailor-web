"use client";

/**
 * SlotSelector - Story 3.4: Time slot selection (Sáng / Chiều).
 *
 * Displays 2 booking sessions for the selected date:
 *  - Buổi Sáng (9:00 - 12:00)
 *  - Buổi Chiều (13:00 - 17:00)
 *
 * Animates in when date is selected via Framer Motion.
 */

import { motion } from "framer-motion";

import type { AppointmentSlot, SlotAvailability } from "@/types/booking";

interface SlotSelectorProps {
  availability: SlotAvailability;
  selectedSlot: AppointmentSlot | null;
  onSlotSelect: (slot: AppointmentSlot) => void;
}

const SLOTS: {
  key: AppointmentSlot;
  label: string;
  time: string;
  icon: string;
}[] = [
  {
    key: "morning",
    label: "Buổi Sáng",
    time: "9:00 - 12:00",
    icon: "🌅",
  },
  {
    key: "afternoon",
    label: "Buổi Chiều",
    time: "13:00 - 17:00",
    icon: "🌤",
  },
];

export default function SlotSelector({
  availability,
  selectedSlot,
  onSlotSelect,
}: SlotSelectorProps) {
  const isSlotAvailable = (slot: AppointmentSlot): boolean => {
    if (slot === "morning") return availability.morning_available;
    return availability.afternoon_available;
  };

  const remaining = (slot: AppointmentSlot): number => {
    if (slot === "morning") return availability.morning_remaining;
    return availability.afternoon_remaining;
  };

  return (
    <div>
      <h3 className="font-cormorant text-base font-semibold text-[#1A1A2E] mb-3">
        Chọn Khung Giờ
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SLOTS.map((slot, index) => {
          const available = isSlotAvailable(slot.key);
          const rem = remaining(slot.key);
          const isSelected = selectedSlot === slot.key;

          return (
            <motion.button
              key={slot.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15, delay: index * 0.06 }}
              disabled={!available}
              onClick={() => available && onSlotSelect(slot.key)}
              aria-pressed={isSelected}
              aria-label={`${slot.label} ${slot.time}${!available ? " (Đã đầy)" : ""}`}
              className={[
                "relative flex flex-col items-start p-4 rounded-lg border-2 transition-all duration-150 text-left",
                isSelected
                  ? "border-[#D4AF37] bg-[rgba(212,175,55,0.08)] shadow-sm"
                  : available
                  ? "border-gray-200 bg-white hover:border-[#D4AF37] hover:bg-[rgba(212,175,55,0.04)] cursor-pointer"
                  : "border-gray-100 bg-gray-50 cursor-not-allowed opacity-60",
              ].join(" ")}
            >
              <span className="text-xl mb-1" aria-hidden="true">
                {slot.icon}
              </span>
              <span className="font-medium text-[#1A1A2E] text-sm">
                {slot.label}
              </span>
              <span className="font-mono text-[#6B7280] text-xs mt-0.5">
                {slot.time}
              </span>
              {available ? (
                <span className="mt-2 text-xs text-[#059669] font-medium">
                  Còn {rem} chỗ
                </span>
              ) : (
                <span className="mt-2 text-xs text-[#6B7280]">Đã đầy</span>
              )}

              {/* Selected checkmark */}
              {isSelected && (
                <span className="absolute top-3 right-3 text-[#D4AF37] text-sm font-bold">
                  ✓
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
