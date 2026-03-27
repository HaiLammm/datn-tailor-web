"use server";

/**
 * Server actions for Order operations.
 * Story 3.3: Checkout (guest checkout).
 * Story 4.2: Owner order board (authenticated, owner-only).
 */

import { auth } from "@/auth";
import type {
  ApproveOrderRequest,
  ApproveOrderResponse,
  CreateOrderInput,
  CustomerOrderDetail,
  CustomerOrderFilter,
  CustomerOrderListResponse,
  InternalOrderInput,
  OrderDetailResponse,
  OrderListParams,
  OrderListResponse,
  OrderResponse,
  OrderStatus,
  UpdatePreparationStepRequest,
  UpdatePreparationStepResponse,
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
    // Send auth token if user is logged in to link order to their account
    const session = await auth();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (session?.accessToken) {
      headers["Authorization"] = `Bearer ${session.accessToken}`;
    }

    const response = await fetch(`${BACKEND_URL}/api/v1/orders`, {
      method: "POST",
      headers,
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
  if (params.is_internal !== undefined)
    url.searchParams.set("is_internal", String(params.is_internal));
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

// ---------------------------------------------------------------------------
// Internal Order actions (Owner only)
// ---------------------------------------------------------------------------

/**
 * Create an internal production order (Owner only).
 * Throws on error so TanStack Query can handle error state.
 */
export async function createInternalOrder(
  orderData: InternalOrderInput
): Promise<OrderResponse> {
  const session = await auth();
  const token = session?.accessToken;
  if (!token) throw new Error("Chưa đăng nhập. Vui lòng đăng nhập lại.");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/orders/internal`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(orderData),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const msg =
        err?.detail?.error?.message ||
        err?.error?.message ||
        err?.detail ||
        `Lỗi tạo đơn nội bộ (HTTP ${response.status})`;
      throw new Error(msg);
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
 * Fetch garments for internal order dialog (Owner only, authenticated).
 */
export async function fetchGarmentsForInternalOrder(): Promise<
  { id: string; name: string; rental_price: number; sale_price: number | null; image_url: string | null; size_options: string[] }[]
> {
  const session = await auth();
  const token = session?.accessToken;
  if (!token) throw new Error("Chưa đăng nhập. Vui lòng đăng nhập lại.");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(
      `${BACKEND_URL}/api/v1/garments?page_size=100`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
        cache: "no-store",
      }
    );
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error("Không thể tải danh sách sản phẩm");

    const json = await response.json();
    return json.data?.items ?? [];
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Yêu cầu hết thời gian. Vui lòng thử lại.");
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Story 4.4c: Customer Order History actions
// ---------------------------------------------------------------------------

/**
 * Fetch paginated order list for the authenticated customer.
 */
export async function getCustomerOrders(
  filters?: CustomerOrderFilter,
  pagination?: { page: number; limit: number }
): Promise<{ success: boolean; data?: CustomerOrderListResponse; error?: string }> {
  const session = await auth();
  const token = session?.accessToken;
  if (!token) return { success: false, error: "Chưa đăng nhập" };

  const params = new URLSearchParams();
  if (pagination) {
    params.append("page", pagination.page.toString());
    params.append("limit", pagination.limit.toString());
  }
  if (filters?.status) params.append("status", filters.status);
  if (filters?.order_type) params.append("order_type", filters.order_type);
  if (filters?.date_from) params.append("date_from", filters.date_from);
  if (filters?.date_to) params.append("date_to", filters.date_to);
  if (filters?.search) params.append("search", filters.search);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const resp = await fetch(
      `${BACKEND_URL}/api/v1/customer/orders?${params.toString()}`,
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

    if (resp.status === 401) return { success: false, error: "Phiên đăng nhập hết hạn" };
    if (!resp.ok) return { success: false, error: "Không thể tải danh sách đơn hàng" };

    const json = await resp.json();
    return {
      success: true,
      data: { data: json.data, meta: json.meta } as CustomerOrderListResponse,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === "AbortError") {
      return { success: false, error: "Yêu cầu quá hạn, vui lòng thử lại" };
    }
    return { success: false, error: "Lỗi kết nối" };
  }
}

/**
 * Fetch full detail of a single customer order.
 */
export async function getCustomerOrderDetail(
  orderId: string
): Promise<{ success: boolean; data?: CustomerOrderDetail; error?: string }> {
  const session = await auth();
  const token = session?.accessToken;
  if (!token) return { success: false, error: "Chưa đăng nhập" };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const resp = await fetch(
      `${BACKEND_URL}/api/v1/customer/orders/${orderId}`,
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

    if (resp.status === 401) return { success: false, error: "Phiên đăng nhập hết hạn" };
    if (resp.status === 404) return { success: false, error: "Không tìm thấy đơn hàng" };
    if (!resp.ok) return { success: false, error: "Không thể tải chi tiết đơn hàng" };

    const json = await resp.json();
    return { success: true, data: json.data as CustomerOrderDetail };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === "AbortError") {
      return { success: false, error: "Yêu cầu quá hạn, vui lòng thử lại" };
    }
    return { success: false, error: "Lỗi kết nối" };
  }
}

/**
 * Download invoice HTML for a customer order.
 * Returns the HTML content as a string to trigger browser print/download.
 */
export async function downloadOrderInvoice(
  orderId: string
): Promise<{ success: boolean; htmlContent?: string; error?: string }> {
  const session = await auth();
  const token = session?.accessToken;
  if (!token) return { success: false, error: "Chưa đăng nhập" };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const resp = await fetch(
      `${BACKEND_URL}/api/v1/customer/orders/${orderId}/invoice`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
        cache: "no-store",
      }
    );
    clearTimeout(timeoutId);

    if (resp.status === 401) return { success: false, error: "Phiên đăng nhập hết hạn" };
    if (resp.status === 404) return { success: false, error: "Không tìm thấy đơn hàng" };
    if (!resp.ok) return { success: false, error: "Không thể tải hóa đơn" };

    const htmlContent = await resp.text();
    return { success: true, htmlContent };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === "AbortError") {
      return { success: false, error: "Yêu cầu quá hạn, vui lòng thử lại" };
    }
    return { success: false, error: "Lỗi kết nối" };
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


// ---------------------------------------------------------------------------
// Story 10.4: Owner Approve & Auto-routing
// ---------------------------------------------------------------------------

/**
 * Approve a pending order and auto-route to tailor or warehouse (Owner only).
 * Bespoke orders require assigned_to in request body.
 * Throws on error so TanStack Query useMutation can handle error state.
 */
export async function approveOrder(
  orderId: string,
  request: ApproveOrderRequest
): Promise<ApproveOrderResponse> {
  const session = await auth();
  const token = session?.accessToken;
  if (!token) throw new Error("Chưa đăng nhập. Vui lòng đăng nhập lại.");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(
      `${BACKEND_URL}/api/v1/orders/${orderId}/approve`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(request),
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
          `Lỗi phê duyệt đơn hàng (HTTP ${response.status})`
      );
    }

    const result = await response.json();
    return result.data as ApproveOrderResponse;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Yêu cầu hết thời gian. Vui lòng thử lại.");
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Story 10.5: Preparation sub-step tracking
// ---------------------------------------------------------------------------

/**
 * Advance preparation sub-step for a Buy/Rent order (Owner only).
 * Throws on error so TanStack Query useMutation can handle error state.
 */
export async function updatePreparationStep(
  orderId: string,
  request: UpdatePreparationStepRequest
): Promise<UpdatePreparationStepResponse> {
  const session = await auth();
  const token = session?.accessToken;
  if (!token) throw new Error("Chưa đăng nhập. Vui lòng đăng nhập lại.");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(
      `${BACKEND_URL}/api/v1/orders/${orderId}/update-preparation`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(request),
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
          `Lỗi cập nhật bước chuẩn bị (HTTP ${response.status})`
      );
    }

    const result = await response.json();
    return result.data as UpdatePreparationStepResponse;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Yêu cầu hết thời gian. Vui lòng thử lại.");
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Story 10.2: Measurement Gate — Check customer measurements for bespoke
// ---------------------------------------------------------------------------

export interface MeasurementCheckResult {
  has_measurements: boolean;
  last_updated: string | null;
  measurements_summary: Record<string, number | null> | null;
}

/**
 * Check if authenticated customer has measurements for bespoke orders.
 * Requires authentication — returns null if not logged in.
 */
export async function checkMeasurement(): Promise<MeasurementCheckResult | null> {
  const session = await auth();
  if (!session?.accessToken) {
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/orders/check-measurement`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: "{}",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 401) {
      return null;
    }

    if (!response.ok) {
      console.error(`checkMeasurement: HTTP ${response.status}`);
      return null;
    }

    const result = await response.json();
    return result.data as MeasurementCheckResult;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error("checkMeasurement error:", error);
    return null;
  }
}
