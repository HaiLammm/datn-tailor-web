/**
 * ProductForm Component Tests - Story 2.4
 *
 * Tests:
 * - Renders all required fields
 * - Zod validation: name min 2 chars
 * - Zod validation: rental_price > 0
 * - Zod validation: size_options required
 * - Pre-fill in edit mode
 * - Submit calls createGarment in create mode
 * - Submit calls updateGarment in edit mode
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

// Mock next/navigation
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock server actions
jest.mock("@/app/actions/garment-actions", () => ({
  createGarment: jest.fn(),
  updateGarment: jest.fn(),
}));

import ProductForm from "@/components/client/products/ProductForm";
import { createGarment, updateGarment } from "@/app/actions/garment-actions";
import type { Garment } from "@/types/garment";

const mockCreateGarment = createGarment as jest.MockedFunction<typeof createGarment>;
const mockUpdateGarment = updateGarment as jest.MockedFunction<typeof updateGarment>;

const mockGarment: Garment = {
  id: "test-id-001",
  tenant_id: "tenant-001",
  name: "Áo Dài Lụa Đỏ",
  description: "Áo dài đẹp",
  category: "ao_dai_truyen_thong",
  color: "Đỏ",
  occasion: "le_cuoi",
  material: "lua",
  size_options: ["M", "L"],
  rental_price: "500000",
  sale_price: "2000000",
  image_url: "https://example.com/anh.jpg",
  image_urls: [],
  status: "available",
  expected_return_date: null,
  days_until_available: null,
  is_overdue: false,
  renter_id: null,
  renter_name: null,
  renter_email: null,
  reminder_sent_at: null,
  reminder_sent: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("ProductForm - Create Mode", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders all required form fields", () => {
    render(<ProductForm />);

    expect(screen.getByText(/Tên sản phẩm/)).toBeInTheDocument();
    expect(screen.getByText(/Mô tả/)).toBeInTheDocument();
    expect(screen.getByText(/Loại áo dài/)).toBeInTheDocument();
    expect(screen.getByText(/Giá thuê/)).toBeInTheDocument();
    expect(screen.getByText(/Kích cỡ có sẵn/)).toBeInTheDocument();
    expect(screen.getByText(/URL ảnh chính/)).toBeInTheDocument();
  });

  it("renders all SIZE_OPTIONS as toggle chips", () => {
    render(<ProductForm />);
    const sizes = ["S", "M", "L", "XL", "XXL"];
    sizes.forEach((size) => {
      expect(screen.getByText(size)).toBeInTheDocument();
    });
  });

  it("shows validation error when name is too short", async () => {
    render(<ProductForm />);
    const nameInput = screen.getByPlaceholderText(/VD: Áo Dài Lụa Đỏ Thêu Hoa/);
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: "A" } });
      fireEvent.submit(nameInput.closest("form")!);
    });
    await waitFor(() => {
      expect(screen.getByText("Tên phải có ít nhất 2 ký tự")).toBeInTheDocument();
    });
  });

  it("shows validation error when size_options is empty", async () => {
    render(<ProductForm />);
    const nameInput = screen.getByPlaceholderText(/VD: Áo Dài Lụa Đỏ Thêu Hoa/);
    fireEvent.change(nameInput, { target: { value: "Áo Dài Test" } });

    const rentalInput = screen.getByPlaceholderText("VD: 500000");
    fireEvent.change(rentalInput, { target: { value: "500000" } });

    const categorySelect = screen.getByDisplayValue("-- Chọn loại --");
    fireEvent.change(categorySelect, { target: { value: "ao_dai_truyen_thong" } });

    await act(async () => {
      fireEvent.submit(nameInput.closest("form")!);
    });

    await waitFor(() => {
      expect(screen.getByText("Vui lòng chọn ít nhất một size")).toBeInTheDocument();
    });
  });

  it("shows validation error when rental_price is 0 or negative", async () => {
    render(<ProductForm />);
    const rentalInput = screen.getByPlaceholderText("VD: 500000");
    await act(async () => {
      fireEvent.change(rentalInput, { target: { value: "0" } });
      fireEvent.submit(rentalInput.closest("form")!);
    });
    await waitFor(() => {
      expect(screen.getByText("Giá thuê phải lớn hơn 0")).toBeInTheDocument();
    });
  });

  it("calls createGarment on successful submit", async () => {
    mockCreateGarment.mockResolvedValue({ success: true, garment: mockGarment });

    render(<ProductForm />);

    // Fill required fields
    fireEvent.change(screen.getByPlaceholderText(/VD: Áo Dài Lụa Đỏ Thêu Hoa/), {
      target: { value: "Áo Dài Lụa Đỏ" },
    });

    const categorySelect = screen.getByDisplayValue("-- Chọn loại --");
    fireEvent.change(categorySelect, { target: { value: "ao_dai_truyen_thong" } });

    // Select size M
    fireEvent.click(screen.getByText("M"));

    fireEvent.change(screen.getByPlaceholderText("VD: 500000"), {
      target: { value: "500000" },
    });

    await act(async () => {
      fireEvent.submit(screen.getByPlaceholderText(/VD: Áo Dài Lụa Đỏ Thêu Hoa/).closest("form")!);
    });

    await waitFor(() => {
      expect(mockCreateGarment).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Áo Dài Lụa Đỏ",
          category: "ao_dai_truyen_thong",
          size_options: ["M"],
          rental_price: "500000",
        })
      );
    });
  });
});

describe("ProductForm - Edit Mode", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("pre-fills form with garment data", () => {
    render(<ProductForm garment={mockGarment} />);

    const nameInput = screen.getByDisplayValue("Áo Dài Lụa Đỏ");
    expect(nameInput).toBeInTheDocument();

    const rentalInput = screen.getByDisplayValue("500000");
    expect(rentalInput).toBeInTheDocument();
  });

  it("shows 'Cập nhật sản phẩm' button in edit mode", () => {
    render(<ProductForm garment={mockGarment} />);
    expect(screen.getByText("Cập nhật sản phẩm")).toBeInTheDocument();
  });

  it("calls updateGarment on successful submit in edit mode", async () => {
    mockUpdateGarment.mockResolvedValue({ success: true, garment: mockGarment });

    render(<ProductForm garment={mockGarment} />);

    await act(async () => {
      fireEvent.submit(screen.getByDisplayValue("Áo Dài Lụa Đỏ").closest("form")!);
    });

    await waitFor(() => {
      expect(mockUpdateGarment).toHaveBeenCalledWith(
        "test-id-001",
        expect.objectContaining({
          name: "Áo Dài Lụa Đỏ",
          rental_price: "500000",
        })
      );
    });
  });

  it("shows error toast when updateGarment fails", async () => {
    mockUpdateGarment.mockResolvedValue({ success: false, error: "Lỗi server" });

    render(<ProductForm garment={mockGarment} />);

    await act(async () => {
      fireEvent.submit(screen.getByDisplayValue("Áo Dài Lụa Đỏ").closest("form")!);
    });

    await waitFor(() => {
      expect(screen.getByText("Lỗi: Lỗi server")).toBeInTheDocument();
    });
  });
});
