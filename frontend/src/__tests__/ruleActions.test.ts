/**
 * Rule Actions Server Actions Tests - Story 2.5
 *
 * Tests Server Actions for Smart Rules CRUD operations.
 * Mocks auth() and fetch() to test all paths.
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";

// Mock auth module before imports
jest.mock("@/auth", () => ({
    auth: jest.fn(),
}));

// Mock Zod schemas to pass through (avoid complex schema validation in unit tests)
jest.mock("@/types/rule", () => ({
    rulePillarSummarySchema: {
        array: () => ({
            safeParse: (data: unknown) => ({ success: true, data }),
        }),
    },
    rulePillarDetailSchema: {
        safeParse: (data: unknown) => ({ success: true, data }),
    },
    ruleUpdateResponseSchema: {
        safeParse: (data: unknown) => ({ success: true, data }),
    },
}));

import { auth } from "@/auth";
import {
    fetchRulePillars,
    fetchPillarDetail,
    updatePillarRules,
} from "@/app/actions/rule-actions";

const mockAuth = auth as jest.MockedFunction<typeof auth>;

// Mock fetch
const mockFetch = jest.fn() as jest.MockedFunction<typeof global.fetch>;
global.fetch = mockFetch;

const mockPillars = [
    {
        pillar_id: "traditional",
        pillar_name_vi: "Truyền thống",
        delta_mapping_count: 7,
        slider_count: 4,
        last_modified: "2026-03-05T10:00:00Z",
    },
];

const mockDetail = {
    pillar_id: "traditional",
    pillar_name_vi: "Truyền thống",
    mappings: [
        {
            slider_key: "do_rong_vai",
            delta_key: "rong_vai",
            delta_label_vi: "Rộng vai",
            delta_unit: "cm",
            slider_range_min: 0.0,
            slider_range_max: 100.0,
            scale_factor: 0.04,
            offset: -2.0,
            golden_point: 50.0,
        },
    ],
    last_modified: "2026-03-05T10:00:00Z",
};

const mockUpdateResponse = {
    success: true,
    pillar_id: "traditional",
    pillar_name_vi: "Truyền thống",
    mapping_count: 1,
    last_modified: "2026-03-05T11:00:00Z",
    message: "Đã cập nhật thành công",
};

beforeEach(() => {
    mockAuth.mockReset();
    mockFetch.mockReset();
});

describe("fetchRulePillars", () => {
    it("returns pillars when authenticated", async () => {
        mockAuth.mockResolvedValueOnce({ accessToken: "test-token" } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockPillars,
        } as Response);

        const result = await fetchRulePillars();
        expect(result).toEqual(mockPillars);
        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining("/api/v1/rules/pillars"),
            expect.objectContaining({
                headers: { Authorization: "Bearer test-token" },
            })
        );
    });

    it("returns error when not authenticated", async () => {
        mockAuth.mockResolvedValueOnce(null as ReturnType<typeof auth> extends Promise<infer T> ? T : never);

        const result = await fetchRulePillars();
        expect(result).toHaveProperty("error");
    });

    it("returns error on 403 forbidden", async () => {
        mockAuth.mockResolvedValueOnce({ accessToken: "test-token" } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);
        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 403,
        } as Response);

        const result = await fetchRulePillars();
        expect(result).toHaveProperty("error");
    });

    it("returns error on network failure", async () => {
        mockAuth.mockResolvedValueOnce({ accessToken: "test-token" } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);
        mockFetch.mockRejectedValueOnce(new Error("Network error"));

        const result = await fetchRulePillars();
        expect(result).toHaveProperty("error");
    });
});

describe("fetchPillarDetail", () => {
    it("returns detail when authenticated", async () => {
        mockAuth.mockResolvedValueOnce({ accessToken: "test-token" } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockDetail,
        } as Response);

        const result = await fetchPillarDetail("traditional");
        expect(result).toEqual(mockDetail);
    });

    it("returns error on 404", async () => {
        mockAuth.mockResolvedValueOnce({ accessToken: "test-token" } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);
        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 404,
        } as Response);

        const result = await fetchPillarDetail("nonexistent");
        expect(result).toHaveProperty("error");
    });

    it("returns error when not authenticated", async () => {
        mockAuth.mockResolvedValueOnce(null as ReturnType<typeof auth> extends Promise<infer T> ? T : never);

        const result = await fetchPillarDetail("traditional");
        expect(result).toHaveProperty("error");
    });
});

describe("updatePillarRules", () => {
    const validMappings = [
        {
            slider_key: "do_rong_vai",
            delta_key: "rong_vai",
            delta_label_vi: "Rộng vai",
            delta_unit: "cm",
            slider_range_min: 0.0,
            slider_range_max: 100.0,
            scale_factor: 0.05,
            offset: -2.5,
            golden_point: 50.0,
        },
    ];

    it("returns success on valid update", async () => {
        mockAuth.mockResolvedValueOnce({ accessToken: "test-token" } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockUpdateResponse,
        } as Response);

        const result = await updatePillarRules("traditional", validMappings);
        expect(result).toEqual(mockUpdateResponse);
        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining("/api/v1/rules/pillars/traditional"),
            expect.objectContaining({
                method: "PUT",
            })
        );
    });

    it("returns error on 422 validation failure", async () => {
        mockAuth.mockResolvedValueOnce({ accessToken: "test-token" } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);
        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 422,
        } as Response);

        const result = await updatePillarRules("traditional", validMappings);
        expect(result).toHaveProperty("error");
    });

    it("returns error when not authenticated", async () => {
        mockAuth.mockResolvedValueOnce(null as ReturnType<typeof auth> extends Promise<infer T> ? T : never);

        const result = await updatePillarRules("traditional", validMappings);
        expect(result).toHaveProperty("error");
    });

    it("returns error on 403 forbidden", async () => {
        mockAuth.mockResolvedValueOnce({ accessToken: "test-token" } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);
        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 403,
        } as Response);

        const result = await updatePillarRules("traditional", validMappings);
        expect(result).toHaveProperty("error");
    });
});
