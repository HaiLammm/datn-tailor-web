"use server";

/**
 * Server actions for Order operations - Story 3.3: Checkout Information & Payment Gateway
 * Supports guest checkout (no auth required) or authenticated checkout.
 */

import type { CreateOrderInput, OrderResponse } from "@/types/order";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
const FETCH_TIMEOUT = 10000;

export interface CreateOrderResult {
  success: boolean;
  data?: {
    order_id: string;
    status: string;
    payment_url?: string | null;
  };
  error?: string;
}

/**
 * Create a new order (guest checkout supported — no auth required).
 * Backend verifies prices and availability (Authoritative Server Pattern).
 */
export async function createOrder(
  orderData: CreateOrderInput
): Promise<CreateOrderResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderData),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 400) {
      const errorData = await response.json();
      const msg =
        errorData?.error?.message ||
        errorData?.detail ||
        "Dữ liệu đơn hàng không hợp lệ";
      console.error("createOrder: 400 Bad Request", errorData);
      return { success: false, error: msg };
    }

    if (response.status === 404) {
      const errorData = await response.json();
      const msg =
        errorData?.error?.message ||
        errorData?.detail ||
        "Sản phẩm không tồn tại";
      console.error("createOrder: 404 Not Found", errorData);
      return { success: false, error: msg };
    }

    if (response.status === 422) {
      const errorData = await response.json();
      const msg =
        errorData?.error?.message ||
        errorData?.detail ||
        "Sản phẩm không khả dụng";
      console.error("createOrder: 422 Unprocessable", errorData);
      return { success: false, error: msg };
    }

    if (!response.ok) {
      console.error(`createOrder: HTTP ${response.status}`);
      return { success: false, error: `Lỗi máy chủ (HTTP ${response.status})` };
    }

    const result = await response.json();
    const order: OrderResponse = result.data;

    return {
      success: true,
      data: {
        order_id: order.id,
        status: order.status,
        payment_url: order.payment_url,
      },
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        console.error("createOrder: Request timeout");
        return { success: false, error: "Yêu cầu hết thời gian. Vui lòng thử lại." };
      }
      console.error("createOrder error:", error.message);
      return { success: false, error: "Không thể kết nối đến máy chủ. Vui lòng thử lại." };
    }
    return { success: false, error: "Lỗi không xác định" };
  }
}

/**
 * Fetch order detail by ID (public lookup for confirmation page).
 */
export async function getOrder(
  orderId: string
): Promise<{ success: boolean; data?: OrderResponse; error?: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(
      `${BACKEND_URL}/api/v1/orders/${orderId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        cache: "no-store",
      }
    );

    clearTimeout(timeoutId);

    if (response.status === 404) {
      console.error("getOrder: 404 Order not found");
      return { success: false, error: "Đơn hàng không tồn tại" };
    }

    if (!response.ok) {
      console.error(`getOrder: HTTP ${response.status}`);
      return { success: false, error: `Lỗi máy chủ (HTTP ${response.status})` };
    }

    const result = await response.json();
    return { success: true, data: result.data as OrderResponse };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        console.error("getOrder: Request timeout");
        return { success: false, error: "Yêu cầu hết thời gian. Vui lòng thử lại." };
      }
      console.error("getOrder error:", error.message);
      return { success: false, error: "Không thể kết nối đến máy chủ. Vui lòng thử lại." };
    }
    return { success: false, error: "Lỗi không xác định" };
  }
}
