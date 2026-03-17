/**
 * PasswordChangeForm Tests — Story 4.4b (AC3, AC4, AC7)
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PasswordChangeForm } from "@/components/client/profile/PasswordChangeForm";

// Mock Server Action
const mockChangePassword = jest.fn();
jest.mock("@/app/actions/profile-actions", () => ({
  changePassword: (...args: unknown[]) => mockChangePassword(...args),
}));

function openForm() {
  // Click the toggle button to open the collapsible form
  fireEvent.click(screen.getByRole("button", { name: /Đổi mật khẩu/ }));
}

describe("PasswordChangeForm", () => {
  beforeEach(() => {
    mockChangePassword.mockClear();
  });

  it("renders toggle button for collapsible section", () => {
    render(<PasswordChangeForm hasPassword={true} />);

    expect(screen.getByRole("button", { name: /Đổi mật khẩu/ })).toBeInTheDocument();
    // Form fields NOT visible until opened
    expect(screen.queryByLabelText("Mật khẩu hiện tại")).not.toBeInTheDocument();
  });

  it("opens collapsible and shows form fields when toggled", () => {
    render(<PasswordChangeForm hasPassword={true} />);
    openForm();

    expect(screen.getByLabelText("Mật khẩu hiện tại")).toBeInTheDocument();
    expect(screen.getByLabelText("Mật khẩu mới")).toBeInTheDocument();
    expect(screen.getByLabelText("Xác nhận mật khẩu mới")).toBeInTheDocument();
  });

  it("shows password strength indicator as user types", async () => {
    render(<PasswordChangeForm hasPassword={true} />);
    openForm();

    fireEvent.change(screen.getByLabelText("Mật khẩu mới"), {
      target: { value: "StrongPass1" },
    });

    await waitFor(() => {
      expect(screen.getByText(/Độ mạnh: Mạnh/)).toBeInTheDocument();
    });
  });

  it("shows 'Yếu' for short password", async () => {
    render(<PasswordChangeForm hasPassword={true} />);
    openForm();

    fireEvent.change(screen.getByLabelText("Mật khẩu mới"), {
      target: { value: "abc" },
    });

    await waitFor(() => {
      expect(screen.getByText(/Độ mạnh: Yếu/)).toBeInTheDocument();
    });
  });

  it("shows validation error when passwords don't match", async () => {
    render(<PasswordChangeForm hasPassword={true} />);
    openForm();

    fireEvent.change(screen.getByLabelText("Mật khẩu mới"), {
      target: { value: "StrongPass1" },
    });
    fireEvent.change(screen.getByLabelText("Xác nhận mật khẩu mới"), {
      target: { value: "DifferentPass1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Cập nhật mật khẩu/ }));

    await waitFor(() => {
      expect(screen.getByText(/không khớp/)).toBeInTheDocument();
    });
  });

  it("calls changePassword on valid submit", async () => {
    mockChangePassword.mockResolvedValue({ success: true });
    render(<PasswordChangeForm hasPassword={true} />);
    openForm();

    fireEvent.change(screen.getByLabelText("Mật khẩu hiện tại"), {
      target: { value: "OldPass1" },
    });
    fireEvent.change(screen.getByLabelText("Mật khẩu mới"), {
      target: { value: "NewPass99" },
    });
    fireEvent.change(screen.getByLabelText("Xác nhận mật khẩu mới"), {
      target: { value: "NewPass99" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Cập nhật mật khẩu/ }));

    await waitFor(() => {
      expect(mockChangePassword).toHaveBeenCalledWith({
        old_password: "OldPass1",
        new_password: "NewPass99",
      });
    });
  });

  it("shows error toast for wrong old password", async () => {
    mockChangePassword.mockResolvedValue({
      success: false,
      error: "Mật khẩu hiện tại không đúng",
    });
    render(<PasswordChangeForm hasPassword={true} />);
    openForm();

    fireEvent.change(screen.getByLabelText("Mật khẩu hiện tại"), {
      target: { value: "WrongPass1" },
    });
    fireEvent.change(screen.getByLabelText("Mật khẩu mới"), {
      target: { value: "NewPass99" },
    });
    fireEvent.change(screen.getByLabelText("Xác nhận mật khẩu mới"), {
      target: { value: "NewPass99" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Cập nhật mật khẩu/ }));

    await waitFor(() => {
      expect(screen.getByText("Mật khẩu hiện tại không đúng")).toBeInTheDocument();
    });
  });

  it("clears form and closes collapsible on success", async () => {
    mockChangePassword.mockResolvedValue({ success: true });
    render(<PasswordChangeForm hasPassword={true} />);
    openForm();

    fireEvent.change(screen.getByLabelText("Mật khẩu hiện tại"), {
      target: { value: "OldPass1" },
    });
    fireEvent.change(screen.getByLabelText("Mật khẩu mới"), {
      target: { value: "NewPass99" },
    });
    fireEvent.change(screen.getByLabelText("Xác nhận mật khẩu mới"), {
      target: { value: "NewPass99" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Cập nhật mật khẩu/ }));

    await waitFor(() => {
      // Toast shown
      expect(screen.getByText("Mật khẩu đã cập nhật")).toBeInTheDocument();
    });
    // Form should close (fields no longer visible)
    expect(screen.queryByLabelText("Mật khẩu hiện tại")).not.toBeInTheDocument();
  });

  it("OAuth user sees informational message instead of form (AC7)", () => {
    render(<PasswordChangeForm hasPassword={false} />);
    openForm();

    expect(screen.getByText(/đăng nhập Google/)).toBeInTheDocument();
    expect(screen.getByText(/Quên mật khẩu/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Mật khẩu hiện tại")).not.toBeInTheDocument();
  });
});
