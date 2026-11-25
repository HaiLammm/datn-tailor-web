import { render, screen } from "@testing-library/react";
import { ShowroomContactButtons } from "@/components/client/showroom/ShowroomContactButtons";

describe("ShowroomContactButtons (giỏ hàng tắt)", () => {
  it("dẫn tới Zalo và số điện thoại của tiệm", () => {
    render(<ShowroomContactButtons garmentName="Áo Dài Đỏ Thêu" isAvailable />);
    expect(screen.getByText("Nhắn Zalo giữ áo").closest("a")).toHaveAttribute("href", "https://zalo.me/0947516881");
    expect(screen.getByText("Gọi tiệm").closest("a")).toHaveAttribute("href", "tel:0947516881");
    expect(screen.getByText(/Nhắn kèm tên áo/)).toHaveTextContent("Áo Dài Đỏ Thêu");
  });

  it("áo hết hàng thì hỏi áo thay vì giữ áo; bản gọn không có dòng hướng dẫn", () => {
    render(<ShowroomContactButtons garmentName="Áo Trắng" isAvailable={false} compact />);
    expect(screen.getByText("Nhắn Zalo hỏi áo")).toBeInTheDocument();
    expect(screen.queryByText(/Nhắn kèm tên áo/)).not.toBeInTheDocument();
  });
});
