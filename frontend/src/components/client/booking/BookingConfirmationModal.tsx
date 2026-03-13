"use client";

/**
 * BookingConfirmationModal - Story 3.4: Success modal after appointment creation.
 *
 * Shows appointment details with a Framer Motion celebration animation.
 * Uses useFocusTrap for keyboard accessibility.
 * Click outside backdrop to close.
 */

import { useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

import { useFocusTrap } from "@/utils/useFocusTrap";
import type { AppointmentResponse } from "@/types/booking";

interface BookingConfirmationModalProps {
  appointment: AppointmentResponse;
  onClose: () => void;
}

function formatDisplayDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function formatSlotLabel(slot: string): string {
  return slot === "morning"
    ? "Buổi Sáng (9:00 - 12:00)"
    : "Buổi Chiều (13:00 - 17:00)";
}

export default function BookingConfirmationModal({
  appointment,
  onClose,
}: BookingConfirmationModalProps) {
  const containerRef = useFocusTrap(true);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="booking-confirm-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal panel */}
      <motion.div
        ref={containerRef}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 text-center"
      >
        {/* Success Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.15, stiffness: 400, damping: 20 }}
          className="mx-auto mb-5 w-16 h-16 rounded-full bg-[rgba(5,150,105,0.1)] flex items-center justify-center"
          aria-hidden="true"
        >
          <span className="text-3xl">✓</span>
        </motion.div>

        <h2
          id="booking-confirm-title"
          className="font-cormorant text-2xl font-semibold text-[#1A1A2E] mb-2"
        >
          Đặt Lịch Thành Công!
        </h2>
        <p className="text-sm text-[#6B7280] mb-6">
          Email xác nhận đã được gửi đến{" "}
          <strong className="text-[#1A1A2E]">{appointment.customer_email}</strong>
        </p>

        {/* Appointment details */}
        <div className="bg-[#F9F7F2] rounded-xl p-5 text-left space-y-3 mb-6">
          <div className="flex justify-between text-sm">
            <span className="text-[#6B7280]">Họ tên</span>
            <span className="font-medium text-[#1A1A2E]">
              {appointment.customer_name}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#6B7280]">Ngày hẹn</span>
            <span className="font-mono font-medium text-[#1A1A2E]">
              {formatDisplayDate(appointment.appointment_date)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#6B7280]">Khung giờ</span>
            <span className="font-medium text-[#1A1A2E]">
              {formatSlotLabel(appointment.slot)}
            </span>
          </div>
          {appointment.special_requests && (
            <div className="pt-2 border-t border-gray-200">
              <p className="text-xs text-[#6B7280]">Yêu cầu đặc biệt</p>
              <p className="text-sm text-[#1A1A2E] mt-1">
                {appointment.special_requests}
              </p>
            </div>
          )}
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/"
            className="flex-1 min-h-[44px] px-4 py-3 rounded-lg border-2 border-[#D4AF37] text-[#D4AF37] font-semibold text-sm text-center hover:bg-[rgba(212,175,55,0.05)] transition-colors"
          >
            Về Trang Chủ
          </Link>
          <Link
            href="/profile/appointments"
            className="flex-1 min-h-[44px] px-4 py-3 rounded-lg bg-[#D4AF37] text-white font-semibold text-sm text-center hover:bg-[#B8962E] transition-colors"
          >
            Xem Lịch Hẹn
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
