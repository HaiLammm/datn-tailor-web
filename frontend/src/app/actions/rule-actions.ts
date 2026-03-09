"use server";

/**
 * Rule Editor Server Actions - Story 2.5
 *
 * Server Actions for Smart Rules CRUD operations.
 * Owner-only access enforced by backend RBAC.
 */

import { auth } from "@/auth";
import {
  rulePillarDetailSchema,
  rulePillarSummarySchema,
  ruleUpdateResponseSchema,
  type DeltaMappingUpdateItem,
  type RulePillarDetail,
  type RulePillarSummary,
  type RuleUpdateResponse,
} from "@/types/rule";

const BACKEND_URL = (() => {
  const url = process.env.BACKEND_URL;
  if (!url && process.env.NODE_ENV === "production") {
    console.warn(
      "[rule-actions] BACKEND_URL env var is not set — falling back to http://localhost:8000"
    );
  }
  return url ?? "http://localhost:8000";
})();

/**
 * Get auth token from current session for backend API calls.
 */
async function getAuthToken(): Promise<string | null> {
  const session = await auth();
  return session?.accessToken ?? null;
}

/**
 * Fetch all rule pillars with summaries (AC1).
 *
 * @returns List of RulePillarSummary or error
 */
export async function fetchRulePillars(): Promise<
  RulePillarSummary[] | { error: string }
> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  try {
    const token = await getAuthToken();
    if (!token) {
      return { error: "Bạn cần đăng nhập để truy cập chức năng này" };
    }

    const response = await fetch(`${BACKEND_URL}/api/v1/rules/pillars`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    });

    if (response.status === 403) {
      return { error: "Bạn không có quyền truy cập Quản lý Quy tắc" };
    }

    if (!response.ok) {
      return { error: `Lỗi kết nối: ${response.status}` };
    }

    const raw: unknown = await response.json();
    const parsed = rulePillarSummarySchema.array().safeParse(raw);
    if (!parsed.success) {
      return { error: "Phản hồi từ Backend không đúng định dạng" };
    }

    return parsed.data;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { error: "Yêu cầu quá thời hạn — thử lại sau" };
    }
    return { error: "Lỗi kết nối với máy chủ" };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch detailed rules for a specific pillar (AC2).
 *
 * @param pillarId - The pillar identifier
 * @returns RulePillarDetail or error
 */
export async function fetchPillarDetail(
  pillarId: string
): Promise<RulePillarDetail | { error: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  try {
    const token = await getAuthToken();
    if (!token) {
      return { error: "Bạn cần đăng nhập để truy cập chức năng này" };
    }

    const response = await fetch(
      `${BACKEND_URL}/api/v1/rules/pillars/${encodeURIComponent(pillarId)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      }
    );

    if (response.status === 403) {
      return { error: "Bạn không có quyền truy cập Quản lý Quy tắc" };
    }

    if (response.status === 404) {
      return { error: `Không tìm thấy trụ cột phong cách '${pillarId}'` };
    }

    if (!response.ok) {
      return { error: `Lỗi kết nối: ${response.status}` };
    }

    const raw: unknown = await response.json();
    const parsed = rulePillarDetailSchema.safeParse(raw);
    if (!parsed.success) {
      return { error: "Phản hồi từ Backend không đúng định dạng" };
    }

    return parsed.data;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { error: "Yêu cầu quá thời hạn — thử lại sau" };
    }
    return { error: "Lỗi kết nối với máy chủ" };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Update a pillar's Smart Rules (AC3).
 *
 * @param pillarId - The pillar identifier
 * @param mappings - New delta mapping definitions
 * @returns RuleUpdateResponse or error
 */
export async function updatePillarRules(
  pillarId: string,
  mappings: DeltaMappingUpdateItem[]
): Promise<RuleUpdateResponse | { error: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  try {
    const token = await getAuthToken();
    if (!token) {
      return { error: "Bạn cần đăng nhập để truy cập chức năng này" };
    }

    const response = await fetch(
      `${BACKEND_URL}/api/v1/rules/pillars/${encodeURIComponent(pillarId)}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ mappings }),
        signal: controller.signal,
      }
    );

    if (response.status === 403) {
      return { error: "Bạn không có quyền cập nhật Quy tắc" };
    }

    if (response.status === 404) {
      return { error: `Không tìm thấy trụ cột phong cách '${pillarId}'` };
    }

    if (response.status === 422) {
      return { error: "Dữ liệu không hợp lệ — vui lòng kiểm tra lại các giá trị" };
    }

    if (!response.ok) {
      return { error: `Lỗi kết nối: ${response.status}` };
    }

    const raw: unknown = await response.json();
    const parsed = ruleUpdateResponseSchema.safeParse(raw);
    if (!parsed.success) {
      return { error: "Phản hồi từ Backend không đúng định dạng" };
    }

    return parsed.data;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { error: "Yêu cầu quá thời hạn — thử lại sau" };
    }
    return { error: "Lỗi kết nối với máy chủ" };
  } finally {
    clearTimeout(timeoutId);
  }
}
