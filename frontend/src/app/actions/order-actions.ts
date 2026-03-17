"use server";

/**
 * Server actions for Order operations.
 * Story 3.3: Checkout (guest checkout).
 * Story 4.2: Owner order board (authenticated, owner-only).
 */

import { auth } from "@/auth";
import type {
  CreateOrderInput,
  OrderDetailResponse,
  OrderListParams,
  OrderListResponse,
  OrderResponse,
  OrderStatus,
} from "@/types/order";

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

// ---------------------------------------------------------------------------
// Story 4.2: Owner order board actions
// ---------------------------------------------------------------------------

/**
 * Fetch paginated order list (Owner only).
 * Throws on error so TanStack Query can handle error state.
 */
export async function fetchOrders(
  params: OrderListParams = {}
): Promise<OrderListResponse> {
  const session = await auth();
  const token = session?.accessToken;
  if (!token) throw new Error("Chưa đăng nhập. Vui lòng đăng nhập lại.");

  const url = new URL(`${BACKEND_URL}/api/v1/orders`);

  if (params.status?.length) {
    params.status.forEach((s) => url.searchParams.append("status", s));
  }
  if (params.payment_status?.length) {
    params.payment_status.forEach((p) =>
      url.searchParams.append("payment_status", p)
    );
  }
  if (params.transaction_type)
    url.searchParams.set("transaction_type", params.transaction_type);
  if (params.search) url.searchParams.set("search", params.search);
  if (params.page) url.searchParams.set("page", String(params.page));
  if (params.page_size)
    url.searchParams.set("page_size", String(params.page_size));
  if (params.sort_by) url.searchParams.set("sort_by", params.sort_by);
  if (params.sort_order) url.searchParams.set("sort_order", params.sort_order);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(
        err?.detail ||
          err?.error?.message ||
          `Lỗi máy chủ (HTTP ${response.status})`
      );
    }

    return (await response.json()) as OrderListResponse;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Yêu cầu hết thời gian. Vui lòng thử lại.");
    }
    throw error;
  }
}

/**
 * Update order status (Owner only).
 * Throws on error including invalid transitions.
 */
export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus
): Promise<OrderResponse> {
  const session = await auth();
  const token = session?.accessToken;
  if (!token) throw new Error("Chưa đăng nhập. Vui lòng đăng nhập lại.");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(
      `${BACKEND_URL}/api/v1/orders/${orderId}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(
        err?.detail?.error?.message ||
          err?.error?.message ||
          err?.detail ||
          `Lỗi cập nhật trạng thái (HTTP ${response.status})`
      );
    }

    const result = await response.json();
    return result.data as OrderResponse;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Yêu cầu hết thời gian. Vui lòng thử lại.");
    }
    throw error;
  }
}

/**
 * Fetch full order detail with payment transactions (Owner only).
 */
export async function fetchOrderDetail(
  orderId: string
): Promise<OrderDetailResponse> {
  const session = await auth();
  const token = session?.accessToken;
  if (!token) throw new Error("Chưa đăng nhập. Vui lòng đăng nhập lại.");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(
      `${BACKEND_URL}/api/v1/orders/${orderId}/detail`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
        cache: "no-store",
      }
    );
    clearTimeout(timeoutId);

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(
        err?.error?.message ||
          err?.detail ||
          `Lỗi tải chi tiết đơn hàng (HTTP ${response.status})`
      );
    }

    const result = await response.json();
    return result.data as OrderDetailResponse;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Yêu cầu hết thời gian. Vui lòng thử lại.");
    }
    throw error;
  }
}
