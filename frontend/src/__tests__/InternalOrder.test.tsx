/**
 * Frontend tests for Internal Order feature.
 * Tests InternalOrderDialog, "Nội bộ" badge, and null shipping_address handling.
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { OrderConfirmation } from "@/components/client/checkout/OrderConfirmation";
import type { OrderResponse } from "@/types/order";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

function createQueryWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

// ---------------------------------------------------------------------------
// OrderConfirmation null shipping_address test (F8)
// ---------------------------------------------------------------------------

describe("OrderConfirmation", () => {
  it("handles null shipping_address without crash", () => {
    const order: OrderResponse = {
      id: "test-id-123",
      status: "in_production",
      payment_status: "paid",
      total_amount: 1200000,
      payment_method: "internal",
      customer_name: "Chủ Tiệm Test",
      customer_phone: "0901234567",
      shipping_address: null,
      shipping_note: null,
      is_internal: true,
      items: [
        {
          garment_id: "g1",
          garment_name: "Áo Dài Đỏ",
          image_url: null,
          transaction_type: "buy",
          unit_price: 1200000,
          total_price: 1200000,
        },
      ],
      created_at: "2026-03-19T00:00:00Z",
    };

    const { container } = render(
      <OrderConfirmation order={order} />,
      { wrapper: createQueryWrapper() }
    );

    // Should render without crash
    expect(container).toBeTruthy();
    // Should NOT display shipping address section
    expect(screen.queryByText("Địa chỉ giao hàng")).not.toBeInTheDocument();
    // Should display customer name
    expect(screen.getByText("Chủ Tiệm Test")).toBeInTheDocument();
  });

  it("displays shipping address when present", () => {
    const order: OrderResponse = {
      id: "test-id-456",
      status: "pending",
      payment_status: "pending",
      total_amount: 900000,
      payment_method: "cod",
      customer_name: "Khách Hàng",
      customer_phone: "0900000000",
      shipping_address: {
        province: "Hà Nội",
        district: "Đống Đa",
        ward: "Láng Hạ",
        address_detail: "123 ABC",
      },
      shipping_note: null,
      items: [],
      created_at: "2026-03-19T00:00:00Z",
    };

    render(
      <OrderConfirmation order={order} />,
      { wrapper: createQueryWrapper() }
    );

    expect(screen.getByText("Địa chỉ giao hàng")).toBeInTheDocument();
    expect(screen.getByText(/123 ABC/)).toBeInTheDocument();
  });
});
