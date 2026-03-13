/**
 * DeleteConfirmDialog Component Tests - Story 2.4
 *
 * Tests:
 * - Renders dialog with garment name in Vietnamese message (AC #3)
 * - Cancel button calls onCancel
 * - Confirm button calls onConfirm
 * - Shows "Đang xóa..." during deletion
 * - Backdrop click calls onCancel
 */

import { describe, it, expect, jest } from "@jest/globals";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";

import DeleteConfirmDialog from "@/components/client/products/DeleteConfirmDialog";
import type { Garment } from "@/types/garment";

const mockGarment: Garment = {
  id: "garment-test",
  tenant_id: "tenant-001",
  name: "Áo Dài Lụa Xanh",
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
};

describe("DeleteConfirmDialog", () => {
  it("renders dialog title in Vietnamese", () => {
    render(
      <DeleteConfirmDialog
        garment={mockGarment}
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />
    );
    expect(screen.getByText("Xác nhận xóa sản phẩm")).toBeInTheDocument();
  });

  it("shows garment name in confirmation message", () => {
    render(
      <DeleteConfirmDialog
        garment={mockGarment}
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />
    );
    expect(screen.getByText(/Áo Dài Lụa Xanh/)).toBeInTheDocument();
  });

  it("shows irreversible warning in Vietnamese", () => {
    render(
      <DeleteConfirmDialog
        garment={mockGarment}
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />
    );
    expect(screen.getByText(/Hành động này không thể hoàn tác/)).toBeInTheDocument();
  });

  it("calls onCancel when 'Hủy bỏ' is clicked", () => {
    const onCancel = jest.fn();
    render(
      <DeleteConfirmDialog
        garment={mockGarment}
        onConfirm={jest.fn()}
        onCancel={onCancel}
      />
    );
    fireEvent.click(screen.getByText("Hủy bỏ"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("calls onConfirm when 'Xóa sản phẩm' is clicked", async () => {
    const onConfirm = jest.fn().mockResolvedValue(undefined);
    render(
      <DeleteConfirmDialog
        garment={mockGarment}
        onConfirm={onConfirm}
        onCancel={jest.fn()}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByText("Xóa sản phẩm"));
    });

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("shows 'Đang xóa...' during deletion", async () => {
    let resolveDelete: () => void;
    const onConfirm = jest.fn().mockReturnValue(
      new Promise<void>((resolve) => {
        resolveDelete = resolve;
      })
    );

    render(
      <DeleteConfirmDialog
        garment={mockGarment}
        onConfirm={onConfirm}
        onCancel={jest.fn()}
      />
    );

    act(() => {
      fireEvent.click(screen.getByText("Xóa sản phẩm"));
    });

    await waitFor(() => {
      expect(screen.getByText("Đang xóa...")).toBeInTheDocument();
    });

    // Cleanup
    act(() => {
      resolveDelete!();
    });
  });

  it("calls onCancel when backdrop is clicked", () => {
    const onCancel = jest.fn();
    render(
      <DeleteConfirmDialog
        garment={mockGarment}
        onConfirm={jest.fn()}
        onCancel={onCancel}
      />
    );

    // Click the backdrop (aria-hidden div)
    const backdrop = document.querySelector("[aria-hidden='true']");
    if (backdrop) fireEvent.click(backdrop);

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("disables buttons during deletion", async () => {
    let resolveDelete: () => void;
    const onConfirm = jest.fn().mockReturnValue(
      new Promise<void>((resolve) => {
        resolveDelete = resolve;
      })
    );

    render(
      <DeleteConfirmDialog
        garment={mockGarment}
        onConfirm={onConfirm}
        onCancel={jest.fn()}
      />
    );

    act(() => {
      fireEvent.click(screen.getByText("Xóa sản phẩm"));
    });

    await waitFor(() => {
      const cancelBtn = screen.getByText("Hủy bỏ");
      expect(cancelBtn).toBeDisabled();
    });

    // Cleanup
    act(() => {
      resolveDelete!();
    });
  });
});
