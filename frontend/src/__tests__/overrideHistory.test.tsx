/**
 * Story 4.3 Task 8.3: OverrideHistoryPanel Component Tests
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { OverrideHistoryPanel } from "@/components/client/design/OverrideHistoryPanel";
import { OverrideHistoryItem } from "@/types/override";

const mockOverrides: OverrideHistoryItem[] = [
  {
    id: "override-1",
    delta_key: "vong_eo",
    label_vi: "Vòng eo",
    original_value: 67.5,
    overridden_value: 69.0,
    reason_vi: "Khách thích mặc rộng",
    tailor_name: "Minh Thợ May",
    created_at: "2026-03-09T10:00:00Z",
  },
  {
    id: "override-2",
    delta_key: "rong_vai",
    label_vi: "Rộng vai",
    original_value: 44.0,
    overridden_value: 42.0,
    reason_vi: null,
    tailor_name: "Minh Thợ May",
    created_at: "2026-03-09T09:30:00Z",
  },
];

describe("Story 4.3: OverrideHistoryPanel", () => {
  it("renders correctly with count in title", () => {
    render(<OverrideHistoryPanel overrides={mockOverrides} />);
    // Use regex for case-insensitive match and handle broken-up text
    expect(screen.getByText(/Lịch sử ghi đè/i)).toBeInTheDocument();
    expect(screen.getByText(/\(2\)/)).toBeInTheDocument();
  });

  it("is collapsed by default and expands on click", () => {
    render(<OverrideHistoryPanel overrides={mockOverrides} />);
    
    // Items should not be visible initially
    expect(screen.queryByText(/Khách thích mặc rộng/i)).not.toBeInTheDocument();
    
    // Click to expand - get by role because there's a button
    fireEvent.click(screen.getByRole("button"));
    
    expect(screen.getByText(/Khách thích mặc rộng/i)).toBeInTheDocument();
    expect(screen.getByText("69.0 cm")).toBeInTheDocument();
    expect(screen.getAllByText(/bởi Minh Thợ May/i)).toHaveLength(2);
  });

  it("shows empty state message when no overrides", () => {
    render(<OverrideHistoryPanel overrides={[]} />);
    expect(screen.getByText(/Chưa có ghi đè nào/i)).toBeInTheDocument();
  });

  it("shows loading skeleton when isLoading is true", () => {
    render(<OverrideHistoryPanel overrides={[]} isLoading={true} />);
    expect(screen.queryByText(/Lịch sử ghi đè/i)).not.toBeInTheDocument();
  });

  it("displays both original and overridden values", () => {
    render(<OverrideHistoryPanel overrides={mockOverrides} />);
    fireEvent.click(screen.getByRole("button"));
    
    expect(screen.getByText("67.5 cm")).toHaveClass("line-through");
    expect(screen.getByText("69.0 cm")).toBeInTheDocument();
  });
});
