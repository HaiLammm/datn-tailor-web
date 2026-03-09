/**
 * Story 4.3 Task 8.2: SanityCheckDashboard Manual Override UI Tests
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SanityCheckDashboard } from "@/components/client/design/SanityCheckDashboard";
import type { SanityCheckResponse } from "@/types/geometry";

const mockData: SanityCheckResponse = {
  design_id: "test-design-uuid",
  rows: [
    {
      key: "vong_eo",
      label_vi: "Vòng eo",
      body_value: 68.0,
      base_value: 70.0,
      suggested_value: 67.5,
      delta: -2.5,
      unit: "cm",
      severity: "warning",
    },
  ],
  guardrail_status: "warning",
  is_locked: false,
  geometry_hash: null,
};

describe("Story 4.3: Manual Override UI", () => {
  it("opens inline edit mode when clicking on suggested value (isOverrideEnabled=true)", () => {
    render(<SanityCheckDashboard data={mockData} isOverrideEnabled={true} />);
    
    const suggestedValue = screen.getByText("67.5 cm");
    fireEvent.click(suggestedValue);
    
    expect(screen.getByDisplayValue("67.5")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Lý do ghi đè...")).toBeInTheDocument();
    expect(screen.getByText("Lưu")).toBeInTheDocument();
    expect(screen.getByText("Hủy")).toBeInTheDocument();
  });

  it("does not open edit mode when isOverrideEnabled=false", () => {
    render(<SanityCheckDashboard data={mockData} isOverrideEnabled={false} />);
    
    const suggestedValue = screen.getByText("67.5 cm");
    fireEvent.click(suggestedValue);
    
    expect(screen.queryByDisplayValue("67.5")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Lý do ghi đè...")).not.toBeInTheDocument();
  });

  it("calls onOverride with correct values when saving", async () => {
    const handleOverride = jest.fn().mockResolvedValue(undefined);
    render(
      <SanityCheckDashboard 
        data={mockData} 
        isOverrideEnabled={true} 
        onOverride={handleOverride} 
      />
    );
    
    fireEvent.click(screen.getByText("67.5 cm"));
    
    const input = screen.getByDisplayValue("67.5");
    fireEvent.change(input, { target: { value: "69.0" } });
    
    const textarea = screen.getByPlaceholderText("Lý do ghi đè...");
    fireEvent.change(textarea, { target: { value: "Khách thích mặc rộng" } });
    
    fireEvent.click(screen.getByText("Lưu"));
    
    await waitFor(() => {
      expect(handleOverride).toHaveBeenCalledWith("vong_eo", 69.0, "Khách thích mặc rộng");
    });
  });

  it("closes edit mode on cancel", () => {
    render(<SanityCheckDashboard data={mockData} isOverrideEnabled={true} />);
    
    fireEvent.click(screen.getByText("67.5 cm"));
    expect(screen.getByDisplayValue("67.5")).toBeInTheDocument();
    
    fireEvent.click(screen.getByText("Hủy"));
    expect(screen.queryByDisplayValue("67.5")).not.toBeInTheDocument();
    expect(screen.getByText("67.5 cm")).toBeInTheDocument();
  });

  it("displays 'Ghi đè' badge for overridden rows", () => {
    const overrides = {
      vong_eo: { value: 69.0, original: 67.5 }
    };
    
    render(
      <SanityCheckDashboard 
        data={mockData} 
        isOverrideEnabled={true} 
        overrides={overrides} 
      />
    );
    
    expect(screen.getByText("69.0 cm")).toBeInTheDocument();
    expect(screen.getByText("67.5")).toHaveClass("line-through");
    // Use getAllByText because legend also has "Ghi đè"
    expect(screen.getAllByText(/Ghi đè/i)).toHaveLength(2);
  });

  it("shows error message when onOverride fails", async () => {
    const handleOverride = jest.fn().mockRejectedValue(new Error("Vi phạm ràng buộc"));
    render(
      <SanityCheckDashboard 
        data={mockData} 
        isOverrideEnabled={true} 
        onOverride={handleOverride} 
      />
    );
    
    fireEvent.click(screen.getByText("67.5 cm"));
    fireEvent.click(screen.getByText("Lưu"));
    
    await waitFor(() => {
      expect(screen.getByText("Vi phạm ràng buộc")).toBeInTheDocument();
    });
    // Edit mode should remain open
    expect(screen.getByDisplayValue("67.5")).toBeInTheDocument();
  });
});
