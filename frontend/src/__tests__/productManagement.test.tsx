/**
 * Product Management Integration Tests - Story 2.4
 *
 * Tests:
 * - ProductManagementClient renders with initial garments
 * - Search input updates correctly
 * - Delete flow: click Xóa → dialog appears → confirm → success toast
 * - Delete flow: click Xóa → dialog appears → cancel → dialog closes
 * - Pagination renders when > 10 items
 * - Add button links to /owner/products/new
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock Next.js hooks
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockRefresh = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    refresh: mockRefresh,
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/owner/products",
}));

// Mock next/link
jest.mock("next/link", () => {
  const MockLink = ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  );
  MockLink.displayName = "MockLink";
  return MockLink;
});

// Mock next/image
jest.mock("next/image", () => {
  const MockImage = ({
    src,
    alt,
    ...props
  }: {
    src: string;
    alt: string;
    [key: string]: unknown;
  }) => <img src={src} alt={alt} {...props} />;
  MockImage.displayName = "MockImage";
  return MockImage;
});

// Mock server actions
jest.mock("@/app/actions/garment-actions", () => ({
  deleteGarment: jest.fn(),
}));

import ProductManagementClient from "@/components/client/products/ProductManagementClient";
import { deleteGarment } from "@/app/actions/garment-actions";
import type { Garment } from "@/types/garment";

const mockDeleteGarment = deleteGarment as jest.MockedFunction<typeof deleteGarment>;

function makeGarment(overrides: Partial<Garment> = {}): Garment {
  return {
    id: "garment-001",
    tenant_id: "tenant-001",
    name: "Áo Dài Test",
    description: null,
    category: "ao_dai_truyen_thong",
    color: null,
    occasion: null,
    material: null,
    size_options: ["M"],
    rental_price: "500000",
    sale_price: null,
    image_url: null,
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
    ...overrides,
  };
}

const defaultProps = {
  initialGarments: [makeGarment()],
  initialTotal: 1,
  initialPage: 1,
  initialSearch: "",
};

describe("ProductManagementClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders initial garments", () => {
    render(<ProductManagementClient {...defaultProps} />);
    expect(screen.getAllByText("Áo Dài Test").length).toBeGreaterThan(0);
  });

  it("shows search input field", () => {
    render(<ProductManagementClient {...defaultProps} />);
    expect(
      screen.getByPlaceholderText("Tìm kiếm theo tên sản phẩm...")
    ).toBeInTheDocument();
  });

  it("shows 'Thêm Sản Phẩm' link pointing to /owner/products/new (AC #1)", () => {
    render(<ProductManagementClient {...defaultProps} />);
    const addLink = screen.getByText("Thêm Sản Phẩm");
    expect(addLink.closest("a")).toHaveAttribute("href", "/owner/products/new");
  });

  it("updates search input when typing", () => {
    render(<ProductManagementClient {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText("Tìm kiếm theo tên sản phẩm...");
    fireEvent.change(searchInput, { target: { value: "áo dài đỏ" } });
    expect(searchInput).toHaveValue("áo dài đỏ");
  });

  it("shows delete dialog when Xóa button is clicked (AC #3)", () => {
    render(<ProductManagementClient {...defaultProps} />);
    const deleteButtons = screen.getAllByText("Xóa");
    fireEvent.click(deleteButtons[0]);

    expect(screen.getByText("Xác nhận xóa sản phẩm")).toBeInTheDocument();
    expect(screen.getAllByText(/Áo Dài Test/).length).toBeGreaterThan(0);
  });

  it("closes delete dialog when cancel is clicked", () => {
    render(<ProductManagementClient {...defaultProps} />);
    const deleteButtons = screen.getAllByText("Xóa");
    fireEvent.click(deleteButtons[0]);

    expect(screen.getByText("Xác nhận xóa sản phẩm")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Hủy bỏ"));
    expect(screen.queryByText("Xác nhận xóa sản phẩm")).not.toBeInTheDocument();
  });

  it("calls deleteGarment and shows success toast on confirm (AC #3, #6)", async () => {
    mockDeleteGarment.mockResolvedValue({ success: true });

    render(<ProductManagementClient {...defaultProps} />);
    const deleteButtons = screen.getAllByText("Xóa");
    fireEvent.click(deleteButtons[0]);

    await act(async () => {
      fireEvent.click(screen.getByText("Xóa sản phẩm"));
    });

    await waitFor(() => {
      expect(mockDeleteGarment).toHaveBeenCalledWith("garment-001");
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Đã xóa "Áo Dài Test" thành công/)
      ).toBeInTheDocument();
    });
  });

  it("shows error toast when deleteGarment fails", async () => {
    mockDeleteGarment.mockResolvedValue({ success: false, error: "Server error" });

    render(<ProductManagementClient {...defaultProps} />);
    const deleteButtons = screen.getAllByText("Xóa");
    fireEvent.click(deleteButtons[0]);

    await act(async () => {
      fireEvent.click(screen.getByText("Xóa sản phẩm"));
    });

    await waitFor(() => {
      expect(screen.getByText(/Lỗi: Server error/)).toBeInTheDocument();
    });
  });

  it("does NOT render pagination when total <= 10 (AC #7)", () => {
    render(<ProductManagementClient {...defaultProps} initialTotal={5} />);
    expect(screen.queryByRole("button", { name: "Trang trước" })).not.toBeInTheDocument();
  });

  it("renders pagination when total > 10 (AC #7)", () => {
    render(
      <ProductManagementClient
        {...defaultProps}
        initialTotal={25}
      />
    );
    expect(screen.getByRole("button", { name: "Trang trước" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Trang tiếp" })).toBeInTheDocument();
    // 25 items / 10 per page = 3 pages
    expect(screen.getByRole("button", { name: "Trang 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Trang 2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Trang 3" })).toBeInTheDocument();
  });

  it("shows empty state when no garments", () => {
    render(
      <ProductManagementClient
        {...defaultProps}
        initialGarments={[]}
        initialTotal={0}
      />
    );
    expect(screen.getByText("Chưa có sản phẩm nào")).toBeInTheDocument();
  });
});
