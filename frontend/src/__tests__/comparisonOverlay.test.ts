
/**
 * Comparison Overlay Tests - Story 3.3
 * Tests Zustand store for comparison mode state management.
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import { useDesignStore } from "@/store/designStore";

describe("Comparison Overlay State (Story 3.3)", () => {
  beforeEach(() => {
    // Reset store before each test
    useDesignStore.getState().clearSession();
  });

  it("should have is_comparison_mode as false initially", () => {
    const { is_comparison_mode } = useDesignStore.getState();
    expect(is_comparison_mode).toBe(false);
  });

  it("should toggle is_comparison_mode when toggleComparisonMode is called", () => {
    // Initial: false
    expect(useDesignStore.getState().is_comparison_mode).toBe(false);

    // Toggle: true
    useDesignStore.getState().toggleComparisonMode();
    expect(useDesignStore.getState().is_comparison_mode).toBe(true);

    // Toggle: false
    useDesignStore.getState().toggleComparisonMode();
    expect(useDesignStore.getState().is_comparison_mode).toBe(false);
  });

  it("should reset is_comparison_mode to false when session is cleared", () => {
    // Set to true
    useDesignStore.getState().toggleComparisonMode();
    expect(useDesignStore.getState().is_comparison_mode).toBe(true);

    // Clear session
    useDesignStore.getState().clearSession();
    expect(useDesignStore.getState().is_comparison_mode).toBe(false);
  });
});
