/**
 * Checkout Page - Story 3.2: Render Cart Checkout Details
 * Server Component shell for the checkout step 1 page.
 */

import type { Metadata } from "next";
import { CheckoutProgress } from "@/components/client/checkout/CheckoutProgress";
import { CheckoutClient } from "@/components/client/checkout/CheckoutClient";

export const metadata: Metadata = {
  title: "Thanh Toán - Tailor Design",
  description: "Xem lại giỏ hàng và tiến hành thanh toán",
};

export default function CheckoutPage() {
  return (
    <>
      <CheckoutProgress currentStep={1} />
      <CheckoutClient />
    </>
  );
}
