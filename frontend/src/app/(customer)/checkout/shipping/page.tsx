/**
 * Checkout Shipping Page - Story 3.3: Checkout Information & Payment Gateway
 * Server Component shell for Step 2 of checkout flow.
 */

import type { Metadata } from "next";
import { CheckoutProgress } from "@/components/client/checkout/CheckoutProgress";
import { ShippingFormClient } from "@/components/client/checkout/ShippingFormClient";

export const metadata: Metadata = {
  title: "Thông Tin Giao Hàng - Tailor Design",
  description: "Nhập thông tin giao hàng và chọn phương thức thanh toán",
};

export default function ShippingPage() {
  return (
    <>
      <CheckoutProgress currentStep={2} />
      <ShippingFormClient />
    </>
  );
}
