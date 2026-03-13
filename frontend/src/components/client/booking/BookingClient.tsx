"use client";

/**
 * BookingClient - Story 3.4: Main orchestrator for booking flow.
 *
 * Flow: Calendar (select date) → SlotSelector (select morning/afternoon)
 *       → BookingForm (fill info + submit) → BookingConfirmationModal (success)
 *
 * State management is local (no Zustand needed — single-page flow).
 */

import { useState } from "react";
import { AnimatePresence } from "framer-motion";

import BookingCalendar from "./BookingCalendar";
import SlotSelector from "./SlotSelector";
import BookingForm from "./BookingForm";
import BookingConfirmationModal from "./BookingConfirmationModal";
import { createAppointment, getMonthAvailability } from "@/app/actions/booking-actions";
import type {
  AppointmentResponse,
  AppointmentSlot,
  CreateAppointmentInput,
  MonthAvailability,
} from "@/types/booking";

interface BookingClientProps {
  initialYear: number;
  initialMonth: number;
  initialAvailability: MonthAvailability;
}

export default function BookingClient({
  initialYear,
  initialMonth,
  initialAvailability,
}: BookingClientProps) {
  const [currentMonth, setCurrentMonth] = useState({
    year: initialYear,
    month: initialMonth,
  });
  const [monthAvailability, setMonthAvailability] =
    useState<MonthAvailability>(initialAvailability);
  const [isLoadingMonth, setIsLoadingMonth] = useState(false);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AppointmentSlot | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmedAppointment, setConfirmedAppointment] =
    useState<AppointmentResponse | null>(null);

  // Load availability when month changes
  const handleMonthChange = async (year: number, month: number) => {
    setCurrentMonth({ year, month });
    setIsLoadingMonth(true);
    setSelectedDate(null);
    setSelectedSlot(null);
    setSubmitError(null);

    const result = await getMonthAvailability(year, month);
    if (result.success && result.data) {
      setMonthAvailability(result.data);
    }
    setIsLoadingMonth(false);
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setSelectedSlot(null); // reset slot when date changes
    setSubmitError(null);
    // Smooth scroll to slot selector on mobile
    setTimeout(() => {
      document
        .getElementById("slot-selector")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const handleSlotSelect = (slot: AppointmentSlot) => {
    setSelectedSlot(slot);
    setSubmitError(null);
    // Smooth scroll to form
    setTimeout(() => {
      document
        .getElementById("booking-form")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const handleFormSubmit = async (input: CreateAppointmentInput) => {
    setIsSubmitting(true);
    setSubmitError(null);

    const result = await createAppointment(input);

    if (result.success && result.data) {
      setConfirmedAppointment(result.data);
    } else {
      // If slot was just taken by another user (race condition), refresh availability
      if (result.errorCode === "slot_taken") {
        setSelectedSlot(null);
        // Refresh current month availability
        const refreshed = await getMonthAvailability(
          currentMonth.year,
          currentMonth.month
        );
        if (refreshed.success && refreshed.data) {
          setMonthAvailability(refreshed.data);
        }
      }
      setSubmitError(result.error || "Đã có lỗi xảy ra. Vui lòng thử lại.");
    }

    setIsSubmitting(false);
  };

  const currentAvailability = selectedDate
    ? monthAvailability[selectedDate]
    : null;

  return (
    <div className="min-h-screen bg-[#F9F7F2] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Page Header */}
        <div className="mb-8 text-center">
          <nav className="text-xs text-[#6B7280] mb-3">
            <a href="/" className="hover:text-[#D4AF37] transition-colors">
              Trang Chủ
            </a>
            {" › "}
            <span className="text-[#1A1A2E]">Đặt Lịch Tư Vấn</span>
          </nav>
          <h1 className="font-cormorant text-3xl md:text-4xl font-semibold text-[#1A1A2E]">
            Đặt Lịch Tư Vấn Bespoke
          </h1>
          <p className="mt-2 text-sm text-[#6B7280] max-w-sm mx-auto">
            Chọn ngày và khung giờ phù hợp để gặp nghệ nhân tại tiệm
          </p>
        </div>

        {/* Desktop: 2-column | Mobile: single column */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
          {/* Left: Calendar */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h2 className="font-cormorant text-lg font-semibold text-[#1A1A2E] mb-4">
                Chọn Ngày Hẹn
              </h2>
              {isLoadingMonth ? (
                <div className="h-64 flex items-center justify-center">
                  <span className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <BookingCalendar
                  monthAvailability={monthAvailability}
                  selectedDate={selectedDate}
                  onDateSelect={handleDateSelect}
                  currentMonth={currentMonth}
                  onMonthChange={handleMonthChange}
                />
              )}
            </div>
          </div>

          {/* Right: Slot + Form */}
          <div className="lg:col-span-2 space-y-4">
            {/* Slot Selector */}
            {selectedDate && currentAvailability && (
              <div
                id="slot-selector"
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5"
              >
                <SlotSelector
                  availability={currentAvailability}
                  selectedSlot={selectedSlot}
                  onSlotSelect={handleSlotSelect}
                />
              </div>
            )}

            {/* Booking Form */}
            {selectedDate && selectedSlot && (
              <div
                id="booking-form"
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5"
              >
                <BookingForm
                  selectedDate={selectedDate}
                  selectedSlot={selectedSlot}
                  onSubmit={handleFormSubmit}
                  isSubmitting={isSubmitting}
                  submitError={submitError}
                />
              </div>
            )}

            {/* Empty state hint */}
            {!selectedDate && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
                <p className="text-[#6B7280] text-sm">
                  ← Chọn ngày trên lịch để xem khung giờ trống
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Success Modal */}
      <AnimatePresence>
        {confirmedAppointment && (
          <BookingConfirmationModal
            appointment={confirmedAppointment}
            onClose={() => setConfirmedAppointment(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
