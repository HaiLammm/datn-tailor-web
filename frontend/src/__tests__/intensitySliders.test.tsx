/**
 * IntensitySliders Component Tests - Story 2.2
 *
 * Tests:
 * - Golden point markers render at correct positions
 * - Inline warning display from backend
 * - Submission indicator visibility
 * - Component renders without pillar selected
 */

import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock the server action — cannot run in Jest (no actual server)
jest.mock("@/app/actions/design-actions", () => ({
  submitIntensity: jest.fn().mockImplementation(
    (_pillarId: string, _intensities: unknown, sequenceId: number) =>
      Promise.resolve({ success: true, sequence_id: sequenceId, warnings: [] })
  ),
}));

import { IntensitySliders } from "@/components/client/design/IntensitySliders";
import { useDesignStore } from "@/store/designStore";
import type { StylePillarResponse, IntensityWarning } from "@/types/style";

const mockPillarWithGoldenPoints: StylePillarResponse = {
  id: "traditional",
  name: "Truyền thống",
  description: "Phong cách may đo truyền thống Việt Nam",
  image_url: null,
  is_default: true,
  sliders: [
    {
      key: "shoulder_width",
      label: "Độ rộng vai",
      description: "Điều chỉnh độ rộng phần vai",
      min_value: 0,
      max_value: 100,
      default_value: 50,
      step: 5,
      unit: "%",
      golden_points: [38.2, 61.8],
    },
    {
      key: "body_fit",
      label: "Độ ôm thân",
      description: null,
      min_value: 0,
      max_value: 100,
      default_value: 60,
      step: 5,
      unit: "%",
      golden_points: [50.0],
    },
  ],
};

describe("IntensitySliders (Story 2.2)", () => {
  beforeEach(() => {
    useDesignStore.getState().clearSession();
  });

  describe("No pillar selected", () => {
    it("should render empty state message when no pillar is selected", () => {
      render(<IntensitySliders />);
      expect(screen.getByText(/Chưa chọn phong cách/i)).toBeTruthy();
    });
  });

  describe("Golden Points rendering (AC2)", () => {
    beforeEach(() => {
      useDesignStore.getState().selectPillar(mockPillarWithGoldenPoints);
    });

    it("should render golden point markers for shoulder_width slider", () => {
      render(<IntensitySliders />);

      // Slider shoulder_width has 2 golden points: 38.2 and 61.8
      const marker1 = screen.getByTestId("golden-point-shoulder_width-38.2");
      const marker2 = screen.getByTestId("golden-point-shoulder_width-61.8");
      expect(marker1).toBeTruthy();
      expect(marker2).toBeTruthy();
    });

    it("should render golden point marker for body_fit slider", () => {
      render(<IntensitySliders />);

      // Slider body_fit has 1 golden point: 50.0
      const marker = screen.getByTestId("golden-point-body_fit-50");
      expect(marker).toBeTruthy();
    });

    it("should render golden points legend", () => {
      render(<IntensitySliders />);
      expect(screen.getByText(/Mốc tỷ lệ vàng của nghệ nhân/i)).toBeTruthy();
    });
  });

  describe("Submission indicator (AC1)", () => {
    beforeEach(() => {
      useDesignStore.getState().selectPillar(mockPillarWithGoldenPoints);
    });

    it("should not show submission indicator when not submitting", () => {
      render(<IntensitySliders />);
      const indicator = screen.queryByTestId("submission-indicator");
      expect(indicator).toBeNull();
    });

    it("should show submission indicator when is_submitting is true", () => {
      useDesignStore.getState().setSubmitting(true);
      render(<IntensitySliders />);
      expect(screen.getByTestId("submission-indicator")).toBeTruthy();
    });
  });

  describe("Warning display (AC3)", () => {
    beforeEach(() => {
      useDesignStore.getState().selectPillar(mockPillarWithGoldenPoints);
    });

    it("should display inline warning for slider with soft constraint", () => {
      const warnings: IntensityWarning[] = [
        {
          slider_key: "body_fit",
          message: "Độ ôm thân quá cao có thể gây hạn chế vận động khi mặc",
          severity: "soft",
        },
      ];
      useDesignStore.getState().setSubmissionResult(1, warnings);

      render(<IntensitySliders />);

      const warningEl = screen.getByTestId("warning-body_fit");
      expect(warningEl).toBeTruthy();
      expect(warningEl.textContent).toContain(
        "Độ ôm thân quá cao có thể gây hạn chế vận động khi mặc"
      );
    });

    it("should not display warning for slider without violation", () => {
      const warnings: IntensityWarning[] = [
        {
          slider_key: "body_fit",
          message: "Cảnh báo",
          severity: "soft",
        },
      ];
      useDesignStore.getState().setSubmissionResult(1, warnings);

      render(<IntensitySliders />);

      // shoulder_width has no warning
      const warningEl = screen.queryByTestId("warning-shoulder_width");
      expect(warningEl).toBeNull();
    });

    it("should not display any warnings when submission_warnings is empty", () => {
      useDesignStore.getState().setSubmissionResult(1, []);

      render(<IntensitySliders />);

      const warningEls = screen.queryAllByRole("alert");
      expect(warningEls).toHaveLength(0);
    });
  });

  describe("Slider rendering (regression from Story 2.1)", () => {
    beforeEach(() => {
      useDesignStore.getState().selectPillar(mockPillarWithGoldenPoints);
    });

    it("should render slider labels", () => {
      render(<IntensitySliders />);
      expect(screen.getByText("Độ rộng vai")).toBeTruthy();
      expect(screen.getByText("Độ ôm thân")).toBeTruthy();
    });

    it("should render reset button", () => {
      render(<IntensitySliders />);
      expect(screen.getByText(/Đặt lại mặc định/i)).toBeTruthy();
    });

    it("should render header with pillar name", () => {
      render(<IntensitySliders />);
      expect(screen.getByText(/Truyền thống/i)).toBeTruthy();
    });
  });

  describe("Debounced submission timing (AC1, AC5)", () => {
    beforeEach(() => {
      jest.useFakeTimers();
      useDesignStore.getState().selectPillar(mockPillarWithGoldenPoints);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (jest.requireMock("@/app/actions/design-actions") as any).submitIntensity.mockClear();
    });

    afterEach(() => {
      jest.clearAllTimers();
      jest.useRealTimers();
    });

    it("should NOT call submitIntensity immediately on slider change", () => {
      render(<IntensitySliders />);
      const slider = screen.getAllByRole("slider")[0];
      fireEvent.change(slider, { target: { value: "75" } });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockSubmit = (jest.requireMock("@/app/actions/design-actions") as any).submitIntensity;
      expect(mockSubmit).not.toHaveBeenCalled();
    });

    it("should call submitIntensity after 300ms", async () => {
      render(<IntensitySliders />);
      const slider = screen.getAllByRole("slider")[0];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockSubmit = (jest.requireMock("@/app/actions/design-actions") as any).submitIntensity;
      fireEvent.change(slider, { target: { value: "75" } });
      expect(mockSubmit).not.toHaveBeenCalled();
      await act(async () => { jest.advanceTimersByTime(300); });
      await act(async () => {}); // flush microtasks
      expect(mockSubmit).toHaveBeenCalledTimes(1);
    });

    it("should debounce multiple rapid changes into single submission", async () => {
      render(<IntensitySliders />);
      const slider = screen.getAllByRole("slider")[0];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockSubmit = (jest.requireMock("@/app/actions/design-actions") as any).submitIntensity;
      fireEvent.change(slider, { target: { value: "60" } });
      fireEvent.change(slider, { target: { value: "70" } });
      fireEvent.change(slider, { target: { value: "80" } });
      expect(mockSubmit).not.toHaveBeenCalled();
      await act(async () => { jest.advanceTimersByTime(300); });
      await act(async () => {});
      // Only 1 call despite 3 rapid changes
      expect(mockSubmit).toHaveBeenCalledTimes(1);
    });

    it("should pass correct pillar_id and intensities to submitIntensity", async () => {
      render(<IntensitySliders />);
      const slider = screen.getAllByRole("slider")[0];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockSubmit = (jest.requireMock("@/app/actions/design-actions") as any).submitIntensity;
      fireEvent.change(slider, { target: { value: "75" } });
      await act(async () => { jest.advanceTimersByTime(300); });
      await act(async () => {});
      expect(mockSubmit).toHaveBeenCalledWith(
        "traditional",
        expect.arrayContaining([expect.objectContaining({ key: "shoulder_width" })]),
        expect.any(Number)
      );
    });

    it("should increment sequence_id on successive submissions", async () => {
      render(<IntensitySliders />);
      const slider = screen.getAllByRole("slider")[0];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockSubmit = (jest.requireMock("@/app/actions/design-actions") as any).submitIntensity;
      // First submission
      fireEvent.change(slider, { target: { value: "60" } });
      await act(async () => { jest.advanceTimersByTime(300); });
      await act(async () => {});
      // Second submission
      fireEvent.change(slider, { target: { value: "70" } });
      await act(async () => { jest.advanceTimersByTime(300); });
      await act(async () => {});
      expect(mockSubmit).toHaveBeenCalledTimes(2);
      const firstCallSeqId = mockSubmit.mock.calls[0][2] as number;
      const secondCallSeqId = mockSubmit.mock.calls[1][2] as number;
      expect(secondCallSeqId).toBeGreaterThan(firstCallSeqId);
    });
  });
});
