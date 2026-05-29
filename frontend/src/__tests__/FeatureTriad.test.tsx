/**
 * FeatureTriad Component Tests — Story 15.3.
 */

import { describe, it, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { FeatureTriad, type FeatureItem } from "@/components/client/brand/FeatureTriad";

const items: FeatureItem[] = [
  { icon: <svg data-testid="ico-1" />, title: "Yêu ngay lần thử đầu", description: "Vừa in ngay lần đầu." },
  { icon: <svg data-testid="ico-2" />, title: "Riêng một mình bạn", description: "Chọn từng chi tiết." },
  { icon: <svg data-testid="ico-3" />, title: "Nâng niu đến từng chút", description: "Chu đáo, ấm áp." },
];

describe("FeatureTriad", () => {
  it("renders the section eyebrow and heading", () => {
    render(<FeatureTriad eyebrow="Vì sao khách thương" heading="Điều khiến bạn muốn quay lại" items={items} />);
    expect(screen.getByText("Vì sao khách thương")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Điều khiến bạn muốn quay lại" })
    ).toBeInTheDocument();
  });

  it("renders all 3 items with titles and descriptions", () => {
    render(<FeatureTriad items={items} />);
    expect(screen.getByRole("heading", { name: "Yêu ngay lần thử đầu" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Riêng một mình bạn" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Nâng niu đến từng chút" })).toBeInTheDocument();
    expect(screen.getByText("Vừa in ngay lần đầu.")).toBeInTheDocument();
    expect(screen.getByText("Chọn từng chi tiết.")).toBeInTheDocument();
    expect(screen.getByText("Chu đáo, ấm áp.")).toBeInTheDocument();
  });

  it("renders one list item per feature", () => {
    render(<FeatureTriad items={items} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });
});
