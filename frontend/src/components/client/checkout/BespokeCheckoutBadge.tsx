"use client";

/**
 * BespokeCheckoutBadge - Story 10.3: Service-Type Checkout
 * Displays measurement confirmation badge for bespoke orders at checkout.
 */

import { useRouter } from "next/navigation";

interface BespokeCheckoutBadgeProps {
  measurementConfirmed: boolean;
}

export function BespokeCheckoutBadge({
  measurementConfirmed,
}: BespokeCheckoutBadgeProps) {
  const router = useRouter();

  if (!measurementConfirmed) {
    return (
      <div
        className="bg-red-50 rounded-xl border border-red-200 p-4 md:p-6 mb-6"
        data-testid="bespoke-measurement-warning"
      >
        <div className="flex items-center gap-3">
          <span className="text-red-500 text-xl">!</span>
          <div>
            <p className="text-sm font-medium text-red-700">
              Chua xac nhan so do
            </p>
            <p className="text-xs text-red-600 mt-1">
              Ban can xac nhan so do truoc khi dat may.
            </p>
          </div>
        </div>
        <button
          onClick={() => router.push("/measurement-gate")}
          className="mt-3 w-full py-2 px-4 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors min-h-[40px]"
          data-testid="go-to-measurement-gate"
        >
          Xac Nhan So Do
        </button>
      </div>
    );
  }

  return (
    <div
      className="bg-purple-50 rounded-xl border border-purple-200 p-4 md:p-6 mb-6"
      data-testid="bespoke-checkout-badge"
    >
      <h2
        className="text-lg font-semibold text-[#1A2B4C] mb-2 flex items-center gap-2"
        style={{ fontFamily: "Cormorant Garamond, serif" }}
      >
        <span className="inline-block w-3 h-3 rounded-full bg-purple-500" />
        Dat May
      </h2>
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          So do da xac nhan
        </span>
      </div>
      <button
        onClick={() => router.push("/measurement-gate")}
        className="mt-2 text-xs text-purple-600 hover:underline"
        data-testid="re-verify-measurement"
      >
        Xac nhan lai so do
      </button>
    </div>
  );
}
