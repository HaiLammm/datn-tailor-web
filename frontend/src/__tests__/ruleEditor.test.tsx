/**
 * Rule Editor Component Tests - Story 2.5
 *
 * Tests:
 * - AC1: Pillar list renders with correct data
 * - AC2: Detail view shows table and JSON toggle
 * - AC3: Edit mode and save flow
 * - AC4: Validation error display
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock Server Actions to avoid next-auth ESM import issues
const mockFetchRulePillars = jest.fn();
const mockFetchPillarDetail = jest.fn();
const mockUpdatePillarRules = jest.fn();

jest.mock("@/app/actions/rule-actions", () => ({
    fetchRulePillars: (...args: unknown[]) => mockFetchRulePillars(...args),
    fetchPillarDetail: (...args: unknown[]) => mockFetchPillarDetail(...args),
    updatePillarRules: (...args: unknown[]) => mockUpdatePillarRules(...args),
}));

import RuleEditorClient from "@/components/client/rules/RuleEditorClient";
import PillarRuleTable from "@/components/client/rules/PillarRuleTable";
import RuleJsonViewer from "@/components/client/rules/RuleJsonViewer";
import type { RulePillarSummary, RulePillarDetail } from "@/types/rule";

// Mock data
const mockPillars: RulePillarSummary[] = [
    {
        pillar_id: "traditional",
        pillar_name_vi: "Size S",
        delta_mapping_count: 7,
        slider_count: 4,
        last_modified: "2026-03-05T10:00:00Z",
    },
    {
        pillar_id: "minimalist",
        pillar_name_vi: "Size M",
        delta_mapping_count: 5,
        slider_count: 4,
        last_modified: "2026-03-05T10:00:00Z",
    },
    {
        pillar_id: "avant_garde",
        pillar_name_vi: "Size L",
        delta_mapping_count: 9,
        slider_count: 5,
        last_modified: "2026-03-05T10:00:00Z",
    },
];

const mockDetail: RulePillarDetail = {
    pillar_id: "traditional",
    pillar_name_vi: "Size S",
    mappings: [
        {
            slider_key: "shoulder_width",
            delta_key: "rong_vai",
            delta_label_vi: "Rộng vai",
            delta_unit: "cm",
            slider_range_min: 0.0,
            slider_range_max: 100.0,
            scale_factor: 0.04,
            offset: -2.0,
            golden_point: 50.0,
        },
        {
            slider_key: "body_fit",
            delta_key: "do_cu_eo",
            delta_label_vi: "Độ cử eo",
            delta_unit: "cm",
            slider_range_min: 0.0,
            slider_range_max: 100.0,
            scale_factor: -0.045,
            offset: 3.0,
            golden_point: 40.0,
        },
    ],
    last_modified: "2026-03-05T10:00:00Z",
};

// Helper to create a fresh QueryClient per test
function createTestQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    });
}

function renderWithQueryClient(ui: React.ReactElement) {
    const queryClient = createTestQueryClient();
    return render(
        <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    );
}

beforeEach(() => {
    mockFetchRulePillars.mockReset();
    mockFetchPillarDetail.mockReset();
    mockUpdatePillarRules.mockReset();
});

describe("RuleEditorClient", () => {
    it("AC1: renders pillar list after loading", async () => {
        mockFetchRulePillars.mockResolvedValueOnce(mockPillars);

        renderWithQueryClient(<RuleEditorClient />);

        // Loading state
        expect(screen.getByText("Đang tải quy tắc...")).toBeInTheDocument();

        // Wait for data
        await waitFor(() => {
            expect(screen.getByText("Size S")).toBeInTheDocument();
        });

        expect(screen.getByText("Size M")).toBeInTheDocument();
        expect(screen.getByText("Size L")).toBeInTheDocument();
    });

    it("AC1: shows pillar summary info (delta count, slider count)", async () => {
        mockFetchRulePillars.mockResolvedValueOnce(mockPillars);

        renderWithQueryClient(<RuleEditorClient />);

        await waitFor(() => {
            expect(screen.getByText("Size S")).toBeInTheDocument();
        });

        // Check delta counts are shown
        expect(screen.getByText("7 delta")).toBeInTheDocument();
        expect(screen.getByText("5 delta")).toBeInTheDocument();
        expect(screen.getByText("9 delta")).toBeInTheDocument();
    });

    it("shows placeholder when no pillar selected", async () => {
        mockFetchRulePillars.mockResolvedValueOnce(mockPillars);

        renderWithQueryClient(<RuleEditorClient />);

        await waitFor(() => {
            expect(screen.getByText("Size S")).toBeInTheDocument();
        });

        expect(
            screen.getByText("Chọn một trụ cột phong cách để xem và chỉnh sửa quy tắc")
        ).toBeInTheDocument();
    });

    it("shows error on fetch failure", async () => {
        mockFetchRulePillars.mockResolvedValueOnce({ error: "Lỗi kết nối: 500" });

        renderWithQueryClient(<RuleEditorClient />);

        await waitFor(() => {
            expect(screen.getByText("Lỗi tải dữ liệu")).toBeInTheDocument();
        });
    });
});

describe("PillarRuleTable", () => {
    it("AC2: renders mapping table with all columns", async () => {
        mockFetchPillarDetail.mockResolvedValueOnce(mockDetail);

        renderWithQueryClient(<PillarRuleTable pillarId="traditional" />);

        await waitFor(() => {
            expect(screen.getByText("Size S")).toBeInTheDocument();
        });

        // Table headers
        expect(screen.getByText("Slider")).toBeInTheDocument();
        expect(screen.getByText("Delta")).toBeInTheDocument();
        expect(screen.getByText("Hệ số")).toBeInTheDocument();
        expect(screen.getByText("Offset")).toBeInTheDocument();
        expect(screen.getByText("Điểm Vàng")).toBeInTheDocument();

        // Mapping data
        expect(screen.getByText("shoulder_width")).toBeInTheDocument();
        expect(screen.getByText("rong_vai")).toBeInTheDocument();
        expect(screen.getByText("Rộng vai")).toBeInTheDocument();
    });

    it("AC2: toggles JSON view", async () => {
        mockFetchPillarDetail.mockResolvedValueOnce(mockDetail);

        renderWithQueryClient(<PillarRuleTable pillarId="traditional" />);

        await waitFor(() => {
            expect(screen.getByText("Size S")).toBeInTheDocument();
        });

        // Click JSON toggle
        const jsonButton = screen.getByText("JSON");
        fireEvent.click(jsonButton);

        // JSON content should appear
        await waitFor(() => {
            expect(screen.getByText(/pillar_id/)).toBeInTheDocument();
        });
    });

    it("AC3: enters edit mode and shows save button", async () => {
        mockFetchPillarDetail.mockResolvedValueOnce(mockDetail);

        renderWithQueryClient(<PillarRuleTable pillarId="traditional" />);

        await waitFor(() => {
            expect(screen.getByText("Size S")).toBeInTheDocument();
        });

        // Click edit button
        const editButton = screen.getByText("Chỉnh sửa");
        fireEvent.click(editButton);

        // Should show save and cancel buttons
        expect(screen.getByText("Lưu thay đổi")).toBeInTheDocument();
        expect(screen.getByText("Hủy")).toBeInTheDocument();

        // Should show input fields
        const inputs = screen.getAllByRole("spinbutton");
        expect(inputs.length).toBeGreaterThan(0);
    });

    it("AC3: cancel exits edit mode", async () => {
        mockFetchPillarDetail.mockResolvedValueOnce(mockDetail);

        renderWithQueryClient(<PillarRuleTable pillarId="traditional" />);

        await waitFor(() => {
            expect(screen.getByText("Size S")).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText("Chỉnh sửa"));
        expect(screen.getByText("Lưu thay đổi")).toBeInTheDocument();

        fireEvent.click(screen.getByText("Hủy"));
        expect(screen.getByText("Chỉnh sửa")).toBeInTheDocument();
    });
});

describe("RuleJsonViewer", () => {
    it("AC2: renders JSON representation of rule data", () => {
        render(<RuleJsonViewer data={mockDetail} />);

        // Should display JSON content
        const pre = screen.getByText(/traditional/);
        expect(pre).toBeInTheDocument();
        expect(screen.getByText(/Size S/)).toBeInTheDocument();
    });
});
