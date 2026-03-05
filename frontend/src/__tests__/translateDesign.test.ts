/**
 * translateDesign Server Action Tests - Story 2.4
 *
 * Tests:
 * - Successful translation returns MasterGeometrySnapshot
 * - Error handling for various HTTP status codes
 * - Request timeout handling
 * - Response validation with Zod schema
 */

import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";

import type { TranslateResponse } from "@/types/inference";

// Store the original fetch
const originalFetch = global.fetch;

// Type-safe mock fetch
type MockFetch = jest.Mock<typeof fetch>;
let mockFetch: MockFetch;

beforeEach(() => {
  mockFetch = jest.fn() as MockFetch;
  global.fetch = mockFetch;
});

afterEach(() => {
  global.fetch = originalFetch;
});

// We need to dynamically import the action after mocking fetch
// since "use server" directives can cause issues in test environment
async function getTranslateDesign() {
  // Clear module cache to get fresh mock
  jest.resetModules();
  const module = await import("@/app/actions/design-actions");
  return module.translateDesign;
}

describe("translateDesign (Story 2.4)", () => {
  describe("Successful translation", () => {
    it("should return MasterGeometrySnapshot on success", async () => {
      const mockResponse: TranslateResponse = {
        success: true,
        snapshot: {
          sequence_id: 1,
          base_hash: "a".repeat(64),
          algorithm_version: "1.0.0-mvp",
          deltas: [
            { key: "do_cu_eo", value: 1.5, unit: "cm", label_vi: "Độ cử eo" },
            { key: "ha_nach", value: -0.8, unit: "cm", label_vi: "Hạ nách" },
          ],
          geometry_hash: "b".repeat(64),
          created_at: "2024-01-15T10:30:00Z",
        },
        inference_time_ms: 45,
        error: null,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const translateDesign = await getTranslateDesign();
      const result = await translateDesign(
        "traditional",
        [{ key: "do_rong_vai", value: 60 }],
        1
      );

      expect(result.success).toBe(true);
      expect(result.snapshot).toBeDefined();
      expect(result.snapshot?.deltas).toHaveLength(2);
      expect(result.snapshot?.deltas[0].key).toBe("do_cu_eo");
      expect(result.inference_time_ms).toBe(45);
    });

    it("should send correct request body to API", async () => {
      const mockResponse: TranslateResponse = {
        success: true,
        snapshot: {
          sequence_id: 5,
          base_hash: "a".repeat(64),
          algorithm_version: "1.0.0-mvp",
          deltas: [],
          geometry_hash: "b".repeat(64),
          created_at: "2024-01-15T10:30:00Z",
        },
        inference_time_ms: 30,
        error: null,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const translateDesign = await getTranslateDesign();
      await translateDesign(
        "minimalist",
        [
          { key: "do_rong_vai", value: 45 },
          { key: "do_om_than", value: 70 },
        ],
        5,
        "measurement-123"
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/inference/translate"),
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pillar_id: "minimalist",
            intensities: [
              { key: "do_rong_vai", value: 45 },
              { key: "do_om_than", value: 70 },
            ],
            sequence_id: 5,
            base_measurement_id: "measurement-123",
          }),
        })
      );
    });
  });

  describe("HTTP error handling", () => {
    it("should return Vietnamese error for 400 Bad Request", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
      } as Response);

      const translateDesign = await getTranslateDesign();
      const result = await translateDesign(
        "traditional",
        [{ key: "invalid", value: 999 }],
        1
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Dữ liệu không hợp lệ — vui lòng kiểm tra lại");
      expect(result.snapshot).toBeNull();
    });

    it("should return Vietnamese error for 404 Not Found", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      } as Response);

      const translateDesign = await getTranslateDesign();
      const result = await translateDesign(
        "unknown_pillar",
        [],
        1
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Không tìm thấy quy tắc cho phong cách này");
    });

    it("should return Vietnamese error for 500 Server Error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      const translateDesign = await getTranslateDesign();
      const result = await translateDesign("traditional", [], 1);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Lỗi máy chủ — vui lòng thử lại sau");
    });

    it("should return generic connection error for other status codes", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
      } as Response);

      const translateDesign = await getTranslateDesign();
      const result = await translateDesign("traditional", [], 1);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Lỗi kết nối: 503");
    });
  });

  describe("Network error handling", () => {
    it("should return Vietnamese error on network failure", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const translateDesign = await getTranslateDesign();
      const result = await translateDesign("traditional", [], 1);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Lỗi kết nối với máy chủ");
    });

    it("should return timeout error on AbortError", async () => {
      const abortError = new Error("Aborted");
      abortError.name = "AbortError";
      mockFetch.mockRejectedValue(abortError);

      const translateDesign = await getTranslateDesign();
      const result = await translateDesign("traditional", [], 1);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Yêu cầu quá thời hạn (>15 giây) — thử lại sau");
    });
  });

  describe("Response validation", () => {
    it("should return error for malformed response", async () => {
      // Response missing required fields
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          // Missing snapshot, inference_time_ms, error
        }),
      } as Response);

      const translateDesign = await getTranslateDesign();
      const result = await translateDesign("traditional", [], 1);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Phản hồi từ Backend không đúng định dạng");
    });

    it("should return error for invalid geometry_hash length", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          snapshot: {
            sequence_id: 1,
            base_hash: "short", // Invalid - should be 64 chars
            algorithm_version: "1.0.0-mvp",
            deltas: [],
            geometry_hash: "also-short",
            created_at: "2024-01-15T10:30:00Z",
          },
          inference_time_ms: 30,
          error: null,
        }),
      } as Response);

      const translateDesign = await getTranslateDesign();
      const result = await translateDesign("traditional", [], 1);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Phản hồi từ Backend không đúng định dạng");
    });
  });

  describe("Request parameters", () => {
    it("should send null for base_measurement_id when not provided", async () => {
      const mockResponse: TranslateResponse = {
        success: true,
        snapshot: {
          sequence_id: 1,
          base_hash: "a".repeat(64),
          algorithm_version: "1.0.0-mvp",
          deltas: [],
          geometry_hash: "b".repeat(64),
          created_at: "2024-01-15T10:30:00Z",
        },
        inference_time_ms: 30,
        error: null,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const translateDesign = await getTranslateDesign();
      await translateDesign("traditional", [], 1);

      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      const callBody = JSON.parse(options.body as string);
      expect(callBody.base_measurement_id).toBeNull();
    });
  });
});
