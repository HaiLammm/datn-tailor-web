/**
 * Checkout Confirmation Page - Story 3.3: Checkout Information & Payment Gateway
 * Server Component shell for Step 3 — order confirmation.
 */

import type { Metadata } from "next";
import { CheckoutProgress } from "@/components/client/checkout/CheckoutProgress";
import { OrderConfirmationClient } from "@/components/client/checkout/OrderConfirmationClient";

export const metadata: Metadata = {
  title: "Xác Nhận Đơn Hàng - Tailor Design",
  description: "Đơn hàng của bạn đã được tạo thành công",
};

interface ConfirmationPageProps {
  searchParams: Promise<{ orderId?: string }>;
}

export default async function ConfirmationPage({
  searchParams,
}: ConfirmationPageProps) {
  const params = await searchParams;
  const orderId = params.orderId ?? null;

  return (
    <>
      <CheckoutProgress currentStep={3} />
      <OrderConfirmationClient orderId={orderId} />
    </>
  );
}
