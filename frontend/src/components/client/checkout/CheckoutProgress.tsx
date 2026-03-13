"use client";

/**
 * CheckoutProgress - Story 3.3: Checkout Information & Payment Gateway
 * 3-step progress indicator for the checkout flow.
 */

interface CheckoutProgressProps {
  currentStep: 1 | 2 | 3;
}

const STEPS = [
  { label: "Kiểm Tra Giỏ Hàng" },
  { label: "Thông Tin Giao Hàng" },
  { label: "Xác Nhận & Thanh Toán" },
] as const;

export function CheckoutProgress({ currentStep }: CheckoutProgressProps) {
  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex items-center justify-center gap-2 text-sm">
          {STEPS.map((step, index) => {
            const stepNumber = (index + 1) as 1 | 2 | 3;
            const isCompleted = stepNumber < currentStep;
            const isCurrent = stepNumber === currentStep;

            return (
              <div key={stepNumber} className="flex items-center gap-2">
                {index > 0 && (
                  <span
                    className={`w-8 h-px ${isCompleted ? "bg-[#D4AF37]" : "bg-gray-300"}`}
                    aria-hidden="true"
                  />
                )}
                <span className="flex items-center gap-1.5">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      isCompleted
                        ? "bg-[#059669] text-white"
                        : isCurrent
                          ? "bg-[#D4AF37] text-white"
                          : "bg-gray-300 text-gray-500"
                    }`}
                    aria-current={isCurrent ? "step" : undefined}
                  >
                    {isCompleted ? (
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      stepNumber
                    )}
                  </span>
                  <span
                    className={
                      isCurrent
                        ? "font-medium text-[#1A1A2E]"
                        : isCompleted
                          ? "text-[#059669]"
                          : "text-[#6B7280]"
                    }
                  >
                    {step.label}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
