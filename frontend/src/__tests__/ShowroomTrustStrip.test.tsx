import { describe, it, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ShowroomTrustStrip } from "@/components/client/showroom/ShowroomTrustStrip";

describe("ShowroomTrustStrip (Story 15.2)", () => {
  it("renders the four trust commitments", () => {
    render(<ShowroomTrustStrip />);
    expect(screen.getByText("May vừa in dáng bạn")).toBeInTheDocument();
    expect(screen.getByText("Yên tâm đổi trả")).toBeInTheDocument();
    expect(screen.getByText("Vải đẹp tuyển chọn")).toBeInTheDocument();
    expect(screen.getByText("Luôn bên cạnh bạn")).toBeInTheDocument();
  });

  it("exposes an accessible label for the strip", () => {
    render(<ShowroomTrustStrip />);
    expect(screen.getByRole("region", { name: "Cam kết của chúng tôi" })).toBeInTheDocument();
  });
});

describe("ShowroomEditorial (Story 15.2)", () => {
  it("renders the boutique storytelling line", async () => {
    const { ShowroomEditorial } = await import(
      "@/components/client/showroom/ShowroomEditorial"
    );
    render(<ShowroomEditorial />);
    expect(
      screen.getByText("Mỗi tà áo là một câu chuyện — chọn câu chuyện của riêng bạn.")
    ).toBeInTheDocument();
  });
});
