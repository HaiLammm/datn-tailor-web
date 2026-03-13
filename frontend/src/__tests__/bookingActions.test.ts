/**
 * Booking Server Actions Tests - Story 3.4.
 * Tests getMonthAvailability and createAppointment server action mocks.
 */

import { describe, it, expect, beforeEach } from "@jest/globals";

jest.mock("@/app/actions/booking-actions", () => ({
  getMonthAvailability: jest.fn(),
  createAppointment: jest.fn(),
}));

import {
  getMonthAvailability,
  createAppointment,
} from "@/app/actions/booking-actions";

const mockGetMonthAvailability = getMonthAvailability as jest.MockedFunction<
  typeof getMonthAvailability
>;
const mockCreateAppointment = createAppointment as jest.MockedFunction<
  typeof createAppointment
>;

const MOCK_AVAILABILITY = {
  "2026-06-10": {
    date: "2026-06-10",
    morning_available: true,
    morning_remaining: 3,
    afternoon_available: true,
    afternoon_remaining: 2,
  },
};

const MOCK_APPOINTMENT = {
  id: "appt-uuid-123",
  customer_name: "Nguyễn Thị Lan",
  customer_phone: "0912345678",
  customer_email: "lan@test.com",
  appointment_date: "2026-06-15",
  slot: "morning" as const,
  status: "pending" as const,
  special_requests: null,
  created_at: "2026-06-01T10:00:00Z",
};

describe("booking-actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getMonthAvailability", () => {
    it("returns success with availability data on success", async () => {
      mockGetMonthAvailability.mockResolvedValue({
        success: true,
        data: MOCK_AVAILABILITY,
      });

      const result = await getMonthAvailability(2026, 6);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(MOCK_AVAILABILITY);
    });

    it("returns error on failure", async () => {
      mockGetMonthAvailability.mockResolvedValue({
        success: false,
        error: "Lỗi kết nối",
      });

      const result = await getMonthAvailability(2026, 6);
      expect(result.success).toBe(false);
      expect(result.error).toBe("Lỗi kết nối");
    });

    it("calls action with correct year and month", async () => {
      mockGetMonthAvailability.mockResolvedValue({ success: true, data: {} });
      await getMonthAvailability(2026, 12);
      expect(mockGetMonthAvailability).toHaveBeenCalledWith(2026, 12);
    });
  });

  describe("createAppointment", () => {
    const VALID_INPUT = {
      customer_name: "Nguyễn Thị Lan",
      customer_phone: "0912345678",
      customer_email: "lan@test.com",
      appointment_date: "2026-06-15",
      slot: "morning" as const,
    };

    it("returns success with appointment data on successful booking", async () => {
      mockCreateAppointment.mockResolvedValue({
        success: true,
        data: MOCK_APPOINTMENT,
      });

      const result = await createAppointment(VALID_INPUT);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(MOCK_APPOINTMENT);
    });

    it("returns errorCode slot_taken on 409 conflict", async () => {
      mockCreateAppointment.mockResolvedValue({
        success: false,
        error: "Khung giờ này vừa được đặt",
        errorCode: "slot_taken",
      });

      const result = await createAppointment(VALID_INPUT);
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("slot_taken");
    });

    it("returns generic error message on server failure", async () => {
      mockCreateAppointment.mockResolvedValue({
        success: false,
        error: "Lỗi máy chủ (HTTP 500)",
      });

      const result = await createAppointment(VALID_INPUT);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Lỗi");
    });

    it("returns timeout error on abort", async () => {
      mockCreateAppointment.mockResolvedValue({
        success: false,
        error: "Yêu cầu hết thời gian. Vui lòng thử lại.",
      });

      const result = await createAppointment(VALID_INPUT);
      expect(result.error).toContain("hết thời gian");
    });

    it("calls action with correct input including optional fields", async () => {
      mockCreateAppointment.mockResolvedValue({ success: true, data: MOCK_APPOINTMENT });
      const inputWithNote = {
        ...VALID_INPUT,
        special_requests: "Tôi muốn tư vấn áo cưới",
      };
      await createAppointment(inputWithNote);
      expect(mockCreateAppointment).toHaveBeenCalledWith(
        expect.objectContaining({ special_requests: "Tôi muốn tư vấn áo cưới" })
      );
    });

    it("handles afternoon slot correctly", async () => {
      mockCreateAppointment.mockResolvedValue({
        success: true,
        data: { ...MOCK_APPOINTMENT, slot: "afternoon" },
      });

      const afternoonInput = { ...VALID_INPUT, slot: "afternoon" as const };
      const result = await createAppointment(afternoonInput);
      expect(result.success).toBe(true);
      expect(result.data?.slot).toBe("afternoon");
    });
  });
});
