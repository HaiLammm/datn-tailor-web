import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockAuth = jest.fn<() => Promise<{ accessToken: string } | null>>();

jest.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

global.fetch = jest.fn() as unknown as typeof fetch;

import { fetchCustomerMeasurement, fetchPatternSession } from "@/app/actions/pattern-actions";

describe("fetchCustomerMeasurement", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue({ accessToken: "test-token" });
  });

  it("picks default measurement from list response and normalizes decimal strings", async () => {
    const mockFetch = global.fetch as unknown as jest.Mock;
    mockFetch.mockImplementationOnce(async () => ({
      ok: true,
      status: 200,
      json: async () => [
        {
          id: "m1",
          customer_profile_id: "c1",
          tenant_id: "t1",
          neck: "35.50",
          shoulder_width: "38.00",
          bust: "88.00",
          waist: "68.00",
          hip: "92.00",
          top_length: "60.00",
          ha_eo: "38.00",
          vong_nach: "40.00",
          sleeve_length: "55.00",
          vong_bap_tay: "28.00",
          wrist: "15.00",
          height: "162.00",
          weight: "55.00",
          measurement_notes: null,
          is_default: false,
          measured_date: "2026-05-25",
          measured_by: null,
          created_at: "2026-05-25T00:00:00Z",
          updated_at: "2026-05-25T00:00:00Z",
        },
        {
          id: "m2",
          customer_profile_id: "c1",
          tenant_id: "t1",
          neck: "36.00",
          shoulder_width: "39.00",
          bust: "89.00",
          waist: "69.00",
          hip: "93.00",
          top_length: "61.00",
          ha_eo: "39.00",
          vong_nach: "41.00",
          sleeve_length: "56.00",
          vong_bap_tay: "29.00",
          wrist: "15.50",
          height: "163.00",
          weight: "56.00",
          measurement_notes: "Mặc định",
          is_default: true,
          measured_date: "2026-05-26",
          measured_by: null,
          created_at: "2026-05-26T00:00:00Z",
          updated_at: "2026-05-26T00:00:00Z",
        },
      ],
    }));

    const result = await fetchCustomerMeasurement("db529391-54d2-4fc4-918d-7f8e4b599cf2");

    expect(result.success).toBe(true);
    expect(result.data?.id).toBe("m2");
    expect(result.data?.is_default).toBe(true);
    expect(result.data?.neck).toBe(36);
    expect(result.data?.shoulder_width).toBe(39);
    expect(result.data?.ha_eo).toBe(39);
    expect(result.data?.vong_nach).toBe(41);
    expect(result.data?.vong_bap_tay).toBe(29);
    expect(result.data?.weight).toBe(56);
    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/v1/customers/db529391-54d2-4fc4-918d-7f8e4b599cf2/measurements",
      expect.objectContaining({
        cache: "no-store",
        headers: {
          Authorization: "Bearer test-token",
        },
      })
    );
  });

  it("returns null when customer has no measurements", async () => {
    const mockFetch = global.fetch as unknown as jest.Mock;
    mockFetch.mockImplementationOnce(async () => ({
      ok: true,
      status: 200,
      json: async () => [],
    }));

    const result = await fetchCustomerMeasurement("db529391-54d2-4fc4-918d-7f8e4b599cf2");

    expect(result.success).toBe(true);
    expect(result.data).toBeNull();
  });
});

describe("fetchPatternSession", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue({ accessToken: "test-token" });
  });

  it("normalizes decimal-string measurement fields from pattern session detail", async () => {
    const mockFetch = global.fetch as unknown as jest.Mock;
    mockFetch.mockImplementationOnce(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          id: "3db29fce-2315-410f-94e1-cbecb7cb13b5",
          tenant_id: "t1",
          customer_id: "c1",
          created_by: "u1",
          garment_type: "ao_dai",
          status: "draft",
          do_dai_ao: "120.0",
          ha_eo: "38.5",
          vong_co: "36.0",
          vong_nach: "42.0",
          vong_nguc: "90.0",
          vong_eo: "72.0",
          vong_mong: "96.0",
          do_dai_tay: "55.0",
          vong_bap_tay: "28.0",
          vong_co_tay: "15.5",
          notes: null,
          pieces: [],
          created_at: "2026-05-26T00:00:00Z",
          updated_at: "2026-05-26T00:00:00Z",
        },
      }),
    }));

    const result = await fetchPatternSession("3db29fce-2315-410f-94e1-cbecb7cb13b5");

    expect(result.success).toBe(true);
    expect(result.data?.do_dai_ao).toBe(120);
    expect(result.data?.ha_eo).toBe(38.5);
    expect(result.data?.vong_co).toBe(36);
    expect(result.data?.vong_co_tay).toBe(15.5);
  });
});
