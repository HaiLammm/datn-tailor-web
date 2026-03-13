"use client";

/**
 * RentalDateModal - Story 3.1: Cart State Management
 * Modal for selecting rental start/end dates with validation and price preview.
 */

import { useState, useEffect } from "react";
import type { Garment } from "@/types/garment";
import { useCartStore } from "@/store/cartStore";
import { formatPrice, parsePrice } from "@/utils/format";
import { useFocusTrap } from "@/utils/useFocusTrap";
import type { CartItem } from "@/types/cart";

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function calcDays(start: string, end: string): number {
  if (!start || !end) return 0;
  const diff = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

interface ValidationErrors {
  start_date?: string;
  end_date?: string;
}

function validate(startDate: string, endDate: string): ValidationErrors {
  const errors: ValidationErrors = {};
  const today = getToday();

  if (!startDate) {
    errors.start_date = "Vui lòng chọn ngày bắt đầu";
  } else if (startDate < today) {
    errors.start_date = "Ngày bắt đầu phải từ hôm nay trở đi";
  }

  if (!endDate) {
    errors.end_date = "Vui lòng chọn ngày kết thúc";
  } else if (startDate && endDate <= startDate) {
    errors.end_date = "Ngày kết thúc phải sau ngày bắt đầu";
  }

  return errors;
}

interface RentalDateModalProps {
  garment: Garment;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function RentalDateModal({ garment, isOpen, onClose, onSuccess }: RentalDateModalProps) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [errors, setErrors] = useState<ValidationErrors>({});
  const addItem = useCartStore((state) => state.addItem);
  const focusTrapRef = useFocusTrap(isOpen);

  // M2: Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const today = getToday();
  const days = calcDays(startDate, endDate);
  const unitPrice = parsePrice(garment.rental_price);
  const totalPrice = unitPrice * days;

  const handleSubmit = () => {
    const validationErrors = validate(startDate, endDate);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) return;

    const cartItem: CartItem = {
      id: crypto.randomUUID(),
      garment_id: garment.id,
      garment_name: garment.name,
      image_url: garment.image_url ?? "",
      transaction_type: "rent",
      start_date: startDate,
      end_date: endDate,
      rental_days: days,
      unit_price: unitPrice,
      total_price: totalPrice,
    };

    addItem(cartItem);
    onSuccess();
    onClose();
    setStartDate("");
    setEndDate("");
    setErrors({});
  };

  const handleClose = () => {
    setStartDate("");
    setEndDate("");
    setErrors({});
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-50"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-label="Chọn ngày thuê"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div ref={focusTrapRef} className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[#1A2B4C]" style={{ fontFamily: "Cormorant Garamond, serif" }}>
              Chọn ngày thuê
            </h3>
            <button
              onClick={handleClose}
              aria-label="Đóng"
              className="p-2 text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p className="text-sm text-gray-600 mb-4">{garment.name}</p>

          {/* Date pickers */}
          <div className="space-y-4">
            <div>
              <label htmlFor="start-date" className="block text-sm font-medium text-[#1A2B4C] mb-1">
                Ngày bắt đầu
              </label>
              <input
                id="start-date"
                type="date"
                value={startDate}
                min={today}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setErrors((prev) => ({ ...prev, start_date: undefined }));
                }}
                className={`w-full border rounded-lg px-3 py-2 text-sm text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#D4AF37] min-h-[44px] ${
                  errors.start_date ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.start_date && (
                <p className="text-xs text-red-500 mt-1" role="alert">{errors.start_date}</p>
              )}
            </div>

            <div>
              <label htmlFor="end-date" className="block text-sm font-medium text-[#1A2B4C] mb-1">
                Ngày kết thúc
              </label>
              <input
                id="end-date"
                type="date"
                value={endDate}
                min={startDate || today}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setErrors((prev) => ({ ...prev, end_date: undefined }));
                }}
                className={`w-full border rounded-lg px-3 py-2 text-sm text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#D4AF37] min-h-[44px] ${
                  errors.end_date ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.end_date && (
                <p className="text-xs text-red-500 mt-1" role="alert">{errors.end_date}</p>
              )}
            </div>
          </div>

          {/* Price preview */}
          {days > 0 && (
            <div className="mt-4 p-3 bg-[#F9F7F2] rounded-lg">
              <div className="flex justify-between text-sm text-gray-600">
                <span>{formatPrice(unitPrice)} × {days} ngày</span>
                <span className="font-bold text-[#D4AF37]">{formatPrice(totalPrice)}</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={handleClose}
              className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors min-h-[44px]"
            >
              Huỷ
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 py-2 px-4 bg-[#D4AF37] text-white rounded-lg text-sm font-semibold hover:bg-amber-600 transition-colors min-h-[44px]"
            >
              Thêm vào Giỏ
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
