"use client";

/**
 * RentalCheckoutFields - Story 10.3: Service-Type Checkout
 * Rental-specific checkout form fields: pickup/return dates, security type selection.
 */

import { useState } from "react";
import type { SecurityType } from "@/types/order";

interface RentalFieldsData {
  pickup_date: string;
  return_date: string;
  security_type: SecurityType;
  security_value: string;
}

interface RentalCheckoutFieldsProps {
  value: RentalFieldsData;
  onChange: (fields: RentalFieldsData) => void;
  errors?: Partial<Record<keyof RentalFieldsData, string>>;
}

export function RentalCheckoutFields({
  value,
  onChange,
  errors = {},
}: RentalCheckoutFieldsProps) {
  const handleChange = (field: keyof RentalFieldsData, val: string) => {
    onChange({ ...value, [field]: val });
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div
      className="bg-amber-50 rounded-xl border border-amber-200 p-4 md:p-6 mb-6"
      data-testid="rental-checkout-fields"
    >
      <h2
        className="text-lg font-semibold text-[#1A2B4C] mb-4 flex items-center gap-2"
        style={{ fontFamily: "Cormorant Garamond, serif" }}
      >
        <span className="inline-block w-3 h-3 rounded-full bg-amber-400" />
        Thong Tin Thue
      </h2>

      <div className="space-y-4">
        {/* Pickup & Return Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="pickup_date"
              className="block text-sm font-medium text-[#1A1A2E] mb-1"
            >
              Ngay Nhan <span className="text-[#DC2626]">*</span>
            </label>
            <input
              id="pickup_date"
              type="date"
              min={today}
              value={value.pickup_date}
              onChange={(e) => handleChange("pickup_date", e.target.value)}
              className={`w-full px-4 py-3 rounded-lg border bg-white text-[#1A1A2E] text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37] transition-colors min-h-[44px] ${
                errors.pickup_date ? "border-[#DC2626]" : "border-gray-300"
              }`}
              aria-invalid={!!errors.pickup_date}
            />
            {errors.pickup_date && (
              <p className="mt-1 text-xs text-[#DC2626]">{errors.pickup_date}</p>
            )}
          </div>
          <div>
            <label
              htmlFor="return_date"
              className="block text-sm font-medium text-[#1A1A2E] mb-1"
            >
              Ngay Tra <span className="text-[#DC2626]">*</span>
            </label>
            <input
              id="return_date"
              type="date"
              min={value.pickup_date || today}
              value={value.return_date}
              onChange={(e) => handleChange("return_date", e.target.value)}
              className={`w-full px-4 py-3 rounded-lg border bg-white text-[#1A1A2E] text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37] transition-colors min-h-[44px] ${
                errors.return_date ? "border-[#DC2626]" : "border-gray-300"
              }`}
              aria-invalid={!!errors.return_date}
            />
            {errors.return_date && (
              <p className="mt-1 text-xs text-[#DC2626]">{errors.return_date}</p>
            )}
          </div>
        </div>

        {/* Security Type */}
        <div>
          <label className="block text-sm font-medium text-[#1A1A2E] mb-2">
            Hinh Thuc Bao Dam <span className="text-[#DC2626]">*</span>
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="security_type"
                value="cccd"
                checked={value.security_type === "cccd"}
                onChange={() => handleChange("security_type", "cccd")}
                className="w-4 h-4 text-[#D4AF37] focus:ring-[#D4AF37]"
              />
              <span className="text-sm text-[#1A1A2E]">CCCD (Can cuoc cong dan)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="security_type"
                value="cash_deposit"
                checked={value.security_type === "cash_deposit"}
                onChange={() => handleChange("security_type", "cash_deposit")}
                className="w-4 h-4 text-[#D4AF37] focus:ring-[#D4AF37]"
              />
              <span className="text-sm text-[#1A1A2E]">Tien coc the chan</span>
            </label>
          </div>
          {errors.security_type && (
            <p className="mt-1 text-xs text-[#DC2626]">{errors.security_type}</p>
          )}
        </div>

        {/* Security Value */}
        <div>
          <label
            htmlFor="security_value"
            className="block text-sm font-medium text-[#1A1A2E] mb-1"
          >
            {value.security_type === "cccd" ? "So CCCD" : "So Tien Coc"}{" "}
            <span className="text-[#DC2626]">*</span>
          </label>
          <input
            id="security_value"
            type="text"
            value={value.security_value}
            onChange={(e) => handleChange("security_value", e.target.value)}
            placeholder={
              value.security_type === "cccd"
                ? "001234567890"
                : "500000"
            }
            className={`w-full px-4 py-3 rounded-lg border bg-white text-[#1A1A2E] text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37] transition-colors min-h-[44px] ${
              errors.security_value ? "border-[#DC2626]" : "border-gray-300"
            }`}
            aria-invalid={!!errors.security_value}
          />
          {errors.security_value && (
            <p className="mt-1 text-xs text-[#DC2626]">{errors.security_value}</p>
          )}
        </div>
      </div>
    </div>
  );
}
