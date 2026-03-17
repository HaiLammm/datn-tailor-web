"use server";

/**
 * Server actions for KPI Dashboard (Story 5.1)
 * Owner-only authenticated endpoint.
 */

import { auth } from "@/auth";
import type { KPIQuickGlance } from "@/types/kpi";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
const FETCH_TIMEOUT = 10000;

/**
 * Fetch KPI quick-glance data for Owner Dashboard.
 * Requires Owner role authentication via Server Action.
 * Throws on error so TanStack Query can handle error state properly.
 */
export async function fetchKPIQuickGlance(
  chartRange: "week" | "month" = "week"
): Promise<KPIQuickGlance> {
  const session = await auth();
  const token = session?.accessToken;

  if (!token) {
    throw new Error("Chưa đăng nhập. Vui lòng đăng nhập lại.");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const url = new URL(`${BACKEND_URL}/api/v1/kpi/quick-glance`);
    url.searchParams.set("chart_range", chartRange);

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

    if (response.status === 401 || response.status === 403) {
      throw new Error("Không có quyền truy cập. Vui lòng đăng nhập lại.");
    }

    if (!response.ok) {
      throw new Error(`Lỗi tải dữ liệu Dashboard (HTTP ${response.status})`);
    }

    const json = await response.json();
    return json.data as KPIQuickGlance;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new Error("Hết thời gian kết nối. Vui lòng thử lại.");
      }
      throw error;
    }
    throw new Error("Lỗi không xác định khi tải Dashboard.");
  }
}
