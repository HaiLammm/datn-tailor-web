"use client";

/**
 * BookingForm - Story 3.4: Customer info form for appointment booking.
 *
 * Fields: Họ Tên, Số điện thoại, Email, Yêu cầu đặc biệt (optional).
 * Inline validation without Zod library (project rule from Story 3.1-3.3).
 * Real-time validation on blur + on submit.
 * Preserves form state on error (no reset).
 */

import { useState } from "react";

import type { AppointmentSlot, CreateAppointmentInput } from "@/types/booking";

interface FormValues {
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  special_requests: string;
}

interface FormErrors {
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  special_requests?: string;
}

interface BookingFormProps {
  selectedDate: string; // YYYY-MM-DD
  selectedSlot: AppointmentSlot;
  onSubmit: (input: CreateAppointmentInput) => Promise<void>;
  isSubmitting: boolean;
  submitError?: string | null;
}

// VN mobile phone: starts with 03/05/07/08/09, 10 digits total
const VN_PHONE_REGEX = /^0[35789]\d{8}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateForm(values: FormValues): FormErrors {
  const errors: FormErrors = {};

  if (!values.customer_name.trim() || values.customer_name.trim().length < 2) {
    errors.customer_name = "Họ tên phải có ít nhất 2 ký tự";
  }

  if (!VN_PHONE_REGEX.test(values.customer_phone)) {
    errors.customer_phone =
      "Số điện thoại không hợp lệ (10 số, bắt đầu 03/05/07/08/09)";
  }

  if (!EMAIL_REGEX.test(values.customer_email)) {
    errors.customer_email = "Email không hợp lệ";
  }

  if (values.special_requests.length > 500) {
    errors.special_requests = "Yêu cầu đặc biệt tối đa 500 ký tự";
  }

  return errors;
}

function formatSlotLabel(slot: AppointmentSlot): string {
  return slot === "morning"
    ? "Buổi Sáng (9:00 - 12:00)"
    : "Buổi Chiều (13:00 - 17:00)";
}

function formatDisplayDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

export default function BookingForm({
  selectedDate,
  selectedSlot,
  onSubmit,
  isSubmitting,
  submitError,
}: BookingFormProps) {
  const [values, setValues] = useState<FormValues>({
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    special_requests: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof FormValues, boolean>>>({});

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    // Clear error on change if already touched
    if (touched[name as keyof FormValues]) {
      const newErrors = validateForm({ ...values, [name]: value });
      setErrors((prev) => ({ ...prev, [name]: newErrors[name as keyof FormErrors] }));
    }
  };

  const handleBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const newErrors = validateForm(values);
    setErrors((prev) => ({ ...prev, [name]: newErrors[name as keyof FormErrors] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Mark all fields as touched
    setTouched({
      customer_name: true,
      customer_phone: true,
      customer_email: true,
      special_requests: true,
    });

    const newErrors = validateForm(values);
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) return;

    await onSubmit({
      customer_name: values.customer_name.trim(),
      customer_phone: values.customer_phone.trim(),
      customer_email: values.customer_email.trim(),
      appointment_date: selectedDate,
      slot: selectedSlot,
      special_requests: values.special_requests.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <h3 className="font-cormorant text-base font-semibold text-[#1A1A2E] mb-1">
        Thông Tin Đặt Lịch
      </h3>
      {/* Summary of selection */}
      <p className="text-xs text-[#6B7280] mb-4">
        {formatDisplayDate(selectedDate)} — {formatSlotLabel(selectedSlot)}
      </p>

      <div className="space-y-4">
        {/* Họ Tên */}
        <div>
          <label
            htmlFor="customer_name"
            className="block text-sm font-medium text-[#1A1A2E] mb-1"
          >
            Họ và Tên <span className="text-[#DC2626]">*</span>
          </label>
          <input
            id="customer_name"
            name="customer_name"
            type="text"
            autoComplete="name"
            value={values.customer_name}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Nguyễn Thị Lan"
            className={[
              "w-full px-3 py-2.5 rounded-lg border text-sm text-[#1A1A2E] bg-white transition-colors outline-none",
              "focus:border-[#D4AF37] focus:ring-2 focus:ring-[rgba(212,175,55,0.2)]",
              errors.customer_name && touched.customer_name
                ? "border-[#DC2626]"
                : "border-gray-200",
            ].join(" ")}
          />
          {errors.customer_name && touched.customer_name && (
            <p className="mt-1 text-xs text-[#DC2626]">
              {errors.customer_name}
            </p>
          )}
        </div>

        {/* Số điện thoại */}
        <div>
          <label
            htmlFor="customer_phone"
            className="block text-sm font-medium text-[#1A1A2E] mb-1"
          >
            Số điện thoại <span className="text-[#DC2626]">*</span>
          </label>
          <input
            id="customer_phone"
            name="customer_phone"
            type="tel"
            autoComplete="tel"
            value={values.customer_phone}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="0912345678"
            className={[
              "w-full px-3 py-2.5 rounded-lg border text-sm text-[#1A1A2E] bg-white transition-colors outline-none",
              "focus:border-[#D4AF37] focus:ring-2 focus:ring-[rgba(212,175,55,0.2)]",
              errors.customer_phone && touched.customer_phone
                ? "border-[#DC2626]"
                : "border-gray-200",
            ].join(" ")}
          />
          {errors.customer_phone && touched.customer_phone && (
            <p className="mt-1 text-xs text-[#DC2626]">
              {errors.customer_phone}
            </p>
          )}
        </div>

        {/* Email */}
        <div>
          <label
            htmlFor="customer_email"
            className="block text-sm font-medium text-[#1A1A2E] mb-1"
          >
            Email <span className="text-[#DC2626]">*</span>
          </label>
          <input
            id="customer_email"
            name="customer_email"
            type="email"
            autoComplete="email"
            value={values.customer_email}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="lan@email.com"
            className={[
              "w-full px-3 py-2.5 rounded-lg border text-sm text-[#1A1A2E] bg-white transition-colors outline-none",
              "focus:border-[#D4AF37] focus:ring-2 focus:ring-[rgba(212,175,55,0.2)]",
              errors.customer_email && touched.customer_email
                ? "border-[#DC2626]"
                : "border-gray-200",
            ].join(" ")}
          />
          {errors.customer_email && touched.customer_email && (
            <p className="mt-1 text-xs text-[#DC2626]">
              {errors.customer_email}
            </p>
          )}
        </div>

        {/* Yêu cầu đặc biệt */}
        <div>
          <label
            htmlFor="special_requests"
            className="block text-sm font-medium text-[#1A1A2E] mb-1"
          >
            Yêu cầu đặc biệt{" "}
            <span className="text-[#6B7280] font-normal">(tuỳ chọn)</span>
          </label>
          <textarea
            id="special_requests"
            name="special_requests"
            value={values.special_requests}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Ví dụ: Tôi muốn tư vấn áo dài cưới, màu đỏ đô..."
            rows={3}
            className={[
              "w-full px-3 py-2.5 rounded-lg border text-sm text-[#1A1A2E] bg-white transition-colors outline-none resize-none",
              "focus:border-[#D4AF37] focus:ring-2 focus:ring-[rgba(212,175,55,0.2)]",
              errors.special_requests && touched.special_requests
                ? "border-[#DC2626]"
                : "border-gray-200",
            ].join(" ")}
          />
          <div className="flex justify-between mt-1">
            {errors.special_requests && touched.special_requests ? (
              <p className="text-xs text-[#DC2626]">{errors.special_requests}</p>
            ) : (
              <span />
            )}
            <span className="text-xs text-[#6B7280]">
              {values.special_requests.length}/500
            </span>
          </div>
        </div>
      </div>

      {/* Submit error */}
      {submitError && (
        <div className="mt-4 p-3 rounded-lg bg-red-50 border border-[#DC2626]/20">
          <p className="text-sm text-[#DC2626]">{submitError}</p>
        </div>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-5 w-full min-h-[44px] px-6 py-3 rounded-lg bg-[#D4AF37] hover:bg-[#B8962E] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors duration-200 flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Đang xử lý...
          </>
        ) : (
          "Xác Nhận Đặt Lịch"
        )}
      </button>
    </form>
  );
}
