/**
 * PersonalInfoForm Tests — Story 4.4b (AC1, AC2)
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PersonalInfoForm } from "@/components/client/profile/PersonalInfoForm";
import type { CustomerProfileDetail } from "@/types/customer";

// Mock Server Action
const mockUpdateProfile = jest.fn();
jest.mock("@/app/actions/profile-actions", () => ({
  updateCustomerProfile: (...args: unknown[]) => mockUpdateProfile(...args),
}));

const mockProfile: CustomerProfileDetail = {
  full_name: "Nguyễn Thị Linh",
  email: "linh@example.com",
  phone: "0901234567",
  gender: "Nữ",
  date_of_birth: null,
  has_password: true,
};

describe("PersonalInfoForm", () => {
  beforeEach(() => {
    mockUpdateProfile.mockClear();
  });

  it("renders all form fields", () => {
    render(<PersonalInfoForm profile={mockProfile} />);

    expect(screen.getByLabelText("Họ tên")).toBeInTheDocument();
    expect(screen.getByLabelText("Số điện thoại")).toBeInTheDocument();
    expect(screen.getByLabelText("Giới tính")).toBeInTheDocument();
  });

  it("email is read-only — shows text, not an input", () => {
    render(<PersonalInfoForm profile={mockProfile} />);

    expect(screen.getByText("linh@example.com")).toBeInTheDocument();
    // No input with value = email
    const emailInput = screen.queryByDisplayValue("linh@example.com");
    expect(emailInput).toBeNull();
  });

  it("pre-fills form with current profile data", () => {
    render(<PersonalInfoForm profile={mockProfile} />);

    expect(screen.getByDisplayValue("Nguyễn Thị Linh")).toBeInTheDocument();
    expect(screen.getByDisplayValue("0901234567")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Nữ")).toBeInTheDocument();
  });

  it("shows inline error for short full_name", async () => {
    render(<PersonalInfoForm profile={mockProfile} />);

    fireEvent.change(screen.getByLabelText("Họ tên"), { target: { value: "A" } });
    fireEvent.click(screen.getByRole("button", { name: /Lưu thay đổi/ }));

    await waitFor(() => {
      expect(screen.getByText(/ít nhất 2 ký tự/)).toBeInTheDocument();
    });
  });

  it("shows inline error for invalid phone format", async () => {
    render(<PersonalInfoForm profile={mockProfile} />);

    fireEvent.change(screen.getByLabelText("Số điện thoại"), {
      target: { value: "12345" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Lưu thay đổi/ }));

    await waitFor(() => {
      expect(screen.getByText(/không đúng định dạng/)).toBeInTheDocument();
    });
  });

  it("calls updateCustomerProfile on valid submit", async () => {
    mockUpdateProfile.mockResolvedValue({ success: true, data: mockProfile });
    render(<PersonalInfoForm profile={mockProfile} />);

    fireEvent.click(screen.getByRole("button", { name: /Lưu thay đổi/ }));

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledTimes(1);
    });
  });

  it("shows success toast on successful save", async () => {
    mockUpdateProfile.mockResolvedValue({ success: true, data: mockProfile });
    render(<PersonalInfoForm profile={mockProfile} />);

    fireEvent.click(screen.getByRole("button", { name: /Lưu thay đổi/ }));

    await waitFor(() => {
      expect(screen.getByText("Cập nhật thông tin thành công")).toBeInTheDocument();
    });
  });

  it("shows error toast on failed save", async () => {
    mockUpdateProfile.mockResolvedValue({ success: false, error: "Lỗi kết nối" });
    render(<PersonalInfoForm profile={mockProfile} />);

    fireEvent.click(screen.getByRole("button", { name: /Lưu thay đổi/ }));

    await waitFor(() => {
      expect(screen.getByText("Lỗi kết nối")).toBeInTheDocument();
    });
  });

  it("submit button shows spinner and is disabled while submitting", async () => {
    mockUpdateProfile.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 200))
    );
    render(<PersonalInfoForm profile={mockProfile} />);

    fireEvent.click(screen.getByRole("button", { name: /Lưu thay đổi/ }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Đang lưu/ })).toBeDisabled();
    });
  });
});
