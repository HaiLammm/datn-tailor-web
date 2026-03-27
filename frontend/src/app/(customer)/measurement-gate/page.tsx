/**
 * Measurement Gate Page - Story 10.2
 * Server Component wrapper for bespoke measurement verification.
 * Checks if customer has valid measurements before proceeding to checkout.
 */

import type { Metadata } from "next";
import { MeasurementGate } from "@/components/client/checkout/MeasurementGate";

export const metadata: Metadata = {
  title: "Xác nhận số đo - Tailor Design",
  description: "Kiểm tra và xác nhận số đo trước khi đặt may",
};

export default function MeasurementGatePage() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">
        Xác nhận số đo cho Đặt may
      </h1>
      <MeasurementGate />
    </div>
  );
}
