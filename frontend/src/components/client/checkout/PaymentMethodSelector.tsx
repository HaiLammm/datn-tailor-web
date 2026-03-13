"use client";

/**
 * PaymentMethodSelector - Story 3.3: Checkout Information & Payment Gateway
 * Radio selector for COD / VNPay / Momo payment methods.
 */

import type { PaymentMethod } from "@/types/order";

interface PaymentOption {
  value: PaymentMethod;
  label: string;
  description: string;
  icon: string;
}

const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    value: "cod",
    label: "Thanh Toán Khi Nhận Hàng",
    description: "COD - Miễn phí",
    icon: "💵",
  },
  {
    value: "vnpay",
    label: "VNPay",
    description: "Thẻ ATM / Visa / Mastercard",
    icon: "🏦",
  },
  {
    value: "momo",
    label: "Ví Điện Tử MoMo",
    description: "Ví điện tử MoMo",
    icon: "📱",
  },
];

interface PaymentMethodSelectorProps {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
}

export function PaymentMethodSelector({
  value,
  onChange,
}: PaymentMethodSelectorProps) {
  return (
    <div>
      <h2
        className="text-lg font-semibold text-[#1A2B4C] mb-4"
        style={{ fontFamily: "Cormorant Garamond, serif" }}
      >
        Phương Thức Thanh Toán
      </h2>

      <div className="space-y-3" role="radiogroup" aria-label="Phương thức thanh toán">
        {PAYMENT_OPTIONS.map((option) => {
          const isSelected = value === option.value;
          return (
            <label
              key={option.value}
              className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                isSelected
                  ? "border-[#D4AF37] bg-[#D4AF37]/5"
                  : "border-gray-200 bg-white hover:border-[#D4AF37]/50"
              }`}
              data-testid={`payment-option-${option.value}`}
            >
              <input
                type="radio"
                name="payment_method"
                value={option.value}
                checked={isSelected}
                onChange={() => onChange(option.value)}
                className="sr-only"
                aria-label={option.label}
              />
              <span
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  isSelected ? "border-[#D4AF37]" : "border-gray-300"
                }`}
                aria-hidden="true"
              >
                {isSelected && (
                  <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37]" />
                )}
              </span>
              <span className="text-2xl flex-shrink-0" aria-hidden="true">
                {option.icon}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[#1A1A2E] text-sm">
                  {option.label}
                </p>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  {option.description}
                </p>
              </div>
            </label>
          );
        })}
      </div>

      {/* Trust badge */}
      <div className="flex items-center gap-2 mt-4 p-3 bg-gray-50 rounded-lg">
        <svg
          className="w-4 h-4 text-[#059669] flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        <span className="text-xs text-[#6B7280]">Thanh toán an toàn &amp; bảo mật</span>
      </div>
    </div>
  );
}
