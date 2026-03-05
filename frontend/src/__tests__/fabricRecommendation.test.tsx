/**
 * Fabric Recommendation Tests - Story 2.3
 *
 * Tests:
 * - FabricCard renders with all required fields
 * - FabricRecommendationPanel empty state, loading, and loaded states
 * - Compatibility badge colors for different labels
 * - Fabric property tags display
 * - Store fabric state management
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";

import type { FabricResponse } from "@/types/fabric";
import type { StylePillarResponse } from "@/types/style";

// Mock the server action
jest.mock("@/app/actions/design-actions", () => ({
  submitIntensity: jest.fn().mockImplementation(
    (_pillarId: string, _intensities: unknown, sequenceId: number) =>
      Promise.resolve({ success: true, sequence_id: sequenceId, warnings: [] })
  ),
  fetchFabricRecommendations: jest.fn().mockImplementation(
    () =>
      Promise.resolve({
        pillar_id: "traditional",
        fabrics: mockFabrics,
        total: 2,
      })
  ),
}));

import { FabricCard } from "@/components/client/design/FabricCard";
import { FabricRecommendationPanel } from "@/components/client/design/FabricRecommendationPanel";
import { useDesignStore } from "@/store/designStore";

const mockFabrics: FabricResponse[] = [
  {
    id: "lua-ha-dong",
    name: "Lụa Hà Đông",
    description: "Lụa tơ tằm truyền thống, độ bóng cao.",
    image_url: null,
    properties: {
      do_ru: "high",
      do_day: "light",
      do_co_dan: "none",
      do_bong: "high",
      kha_nang_giu_phom: "low",
    },
    compatibility_score: 85.5,
    compatibility_label: "Rất phù hợp",
  },
  {
    id: "lanh-bac",
    name: "Lanh Bắc",
    description: "Vải lanh cao cấp, thoáng khí.",
    image_url: "/images/fabrics/lanh-bac.jpg",
    properties: {
      do_ru: "low",
      do_day: "medium",
      do_co_dan: "none",
      do_bong: "none",
      kha_nang_giu_phom: "high",
    },
    compatibility_score: 55.0,
    compatibility_label: "Phù hợp",
  },
];

const mockPillar: StylePillarResponse = {
  id: "traditional",
  name: "Truyền thống",
  description: "Phong cách may đo truyền thống",
  image_url: null,
  is_default: true,
  sliders: [
    {
      key: "do_rong_vai",
      label: "Độ rộng vai",
      description: null,
      min_value: 0,
      max_value: 100,
      default_value: 50,
      step: 5,
      unit: "%",
      golden_points: [38.2, 61.8],
    },
  ],
};

describe("FabricCard (Story 2.3)", () => {
  it("should render fabric name and description", () => {
    render(<FabricCard fabric={mockFabrics[0]} />);

    expect(screen.getByText("Lụa Hà Đông")).toBeTruthy();
    expect(screen.getByText(/Lụa tơ tằm truyền thống/)).toBeTruthy();
  });

  it("should render compatibility badge with score", () => {
    render(<FabricCard fabric={mockFabrics[0]} />);

    const badge = screen.getByTestId("compatibility-badge");
    expect(badge).toBeTruthy();
    expect(badge.textContent).toContain("Rất phù hợp");
    expect(badge.textContent).toContain("86%");
  });

  it("should render fabric property tags", () => {
    render(<FabricCard fabric={mockFabrics[0]} />);

    expect(screen.getByText(/Độ rủ: Cao/)).toBeTruthy();
    expect(screen.getByText(/Độ bóng: Cao/)).toBeTruthy();
    expect(screen.getByText(/Giữ phom: Thấp/)).toBeTruthy();
  });

  it("should render placeholder when no image_url", () => {
    render(<FabricCard fabric={mockFabrics[0]} />);

    // First fabric has no image — should render placeholder SVG, not img
    const card = screen.getByTestId("fabric-card-lua-ha-dong");
    expect(card.querySelector("img")).toBeNull();
  });

  it("should render image when image_url is provided", () => {
    render(<FabricCard fabric={mockFabrics[1]} />);

    const card = screen.getByTestId("fabric-card-lanh-bac");
    const img = card.querySelector("img");
    expect(img).toBeTruthy();
    expect(img!.getAttribute("alt")).toBe("Lanh Bắc");
  });

  it("should render data-testid with fabric id", () => {
    render(<FabricCard fabric={mockFabrics[0]} />);

    expect(screen.getByTestId("fabric-card-lua-ha-dong")).toBeTruthy();
  });
});

describe("FabricRecommendationPanel (Story 2.3)", () => {
  beforeEach(() => {
    useDesignStore.getState().clearSession();
  });

  it("should not render when no pillar selected", () => {
    const { container } = render(<FabricRecommendationPanel />);
    expect(container.innerHTML).toBe("");
  });

  it("should render panel with button when pillar is selected", () => {
    useDesignStore.getState().selectPillar(mockPillar);
    render(<FabricRecommendationPanel />);

    expect(screen.getByText("Gợi ý Chất liệu Vải")).toBeTruthy();
    const btn = screen.getByTestId("fetch-fabrics-btn");
    expect(btn).toBeTruthy();
    expect(btn.textContent).toContain("Xem gợi ý vải");
  });

  it("should show empty state before fetch", () => {
    useDesignStore.getState().selectPillar(mockPillar);
    render(<FabricRecommendationPanel />);

    expect(screen.getByTestId("fabric-empty")).toBeTruthy();
  });

  it("should show loading state when fetching", () => {
    useDesignStore.getState().selectPillar(mockPillar);
    useDesignStore.getState().setLoadingFabrics(true);
    render(<FabricRecommendationPanel />);

    expect(screen.getByTestId("fabric-loading")).toBeTruthy();
  });

  it("should render fabric cards after fetch", async () => {
    useDesignStore.getState().selectPillar(mockPillar);
    render(<FabricRecommendationPanel />);

    const btn = screen.getByTestId("fetch-fabrics-btn");
    await act(async () => {
      fireEvent.click(btn);
    });

    // Wait for async action to complete
    await act(async () => {});

    expect(screen.getByTestId("fabric-grid")).toBeTruthy();
    expect(screen.getByTestId("fabric-card-lua-ha-dong")).toBeTruthy();
    expect(screen.getByTestId("fabric-card-lanh-bac")).toBeTruthy();
  });

  it("should call fetchFabricRecommendations with correct pillar_id", async () => {
    useDesignStore.getState().selectPillar(mockPillar);
    render(<FabricRecommendationPanel />);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockFetch = (jest.requireMock("@/app/actions/design-actions") as any).fetchFabricRecommendations;
    mockFetch.mockClear();

    const btn = screen.getByTestId("fetch-fabrics-btn");
    await act(async () => {
      fireEvent.click(btn);
    });
    await act(async () => {});

    expect(mockFetch).toHaveBeenCalledWith(
      "traditional",
      expect.objectContaining({ do_rong_vai: 50 })
    );
  });
});

describe("Design Store - Fabric State (Story 2.3)", () => {
  beforeEach(() => {
    useDesignStore.getState().clearSession();
  });

  it("should initialize with empty fabric state", () => {
    const state = useDesignStore.getState();
    expect(state.fabric_recommendations).toEqual([]);
    expect(state.is_loading_fabrics).toBe(false);
  });

  it("should set fabric recommendations", () => {
    useDesignStore.getState().setFabricRecommendations(mockFabrics);

    const state = useDesignStore.getState();
    expect(state.fabric_recommendations).toHaveLength(2);
    expect(state.fabric_recommendations[0].id).toBe("lua-ha-dong");
    expect(state.is_loading_fabrics).toBe(false);
  });

  it("should set loading fabrics state", () => {
    useDesignStore.getState().setLoadingFabrics(true);
    expect(useDesignStore.getState().is_loading_fabrics).toBe(true);
  });

  it("should clear fabric recommendations", () => {
    useDesignStore.getState().setFabricRecommendations(mockFabrics);
    useDesignStore.getState().clearFabricRecommendations();

    const state = useDesignStore.getState();
    expect(state.fabric_recommendations).toEqual([]);
    expect(state.is_loading_fabrics).toBe(false);
  });

  it("should clear fabric state on clearSession", () => {
    useDesignStore.getState().setFabricRecommendations(mockFabrics);
    useDesignStore.getState().clearSession();

    const state = useDesignStore.getState();
    expect(state.fabric_recommendations).toEqual([]);
    expect(state.is_loading_fabrics).toBe(false);
  });
});
