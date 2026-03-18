/**
 * Profile Page & Layout Tests — Story 4.4b
 * Updated: profile page now fetches real profile data (no longer a placeholder).
 */

import { describe, it, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock next/navigation
const mockRedirect = jest.fn();
jest.mock("next/navigation", () => ({
  redirect: (url: string) => {
    mockRedirect(url);
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
  usePathname: () => "/profile",
}));

// Mock @/auth (used by layout only)
const mockAuth = jest.fn();
jest.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock ProfileSidebar to simplify layout tests
jest.mock("@/components/client/profile/ProfileSidebar", () => ({
  ProfileSidebar: () => <nav data-testid="profile-sidebar">Sidebar</nav>,
}));

// Mock Server Actions
const mockGetCustomerProfile = jest.fn();
jest.mock("@/app/actions/profile-actions", () => ({
  getCustomerProfile: () => mockGetCustomerProfile(),
  updateCustomerProfile: jest.fn(),
  changePassword: jest.fn(),
  getUnreadNotificationCount: jest.fn().mockResolvedValue({ success: true, data: { unread_count: 0 } }),
}));

// Mock client components so we can test the page server logic
jest.mock("@/components/client/profile/PersonalInfoForm", () => ({
  PersonalInfoForm: ({ profile }: { profile: { email: string } }) => (
    <div data-testid="personal-info-form">PersonalInfoForm: {profile.email}</div>
  ),
}));

jest.mock("@/components/client/profile/PasswordChangeForm", () => ({
  PasswordChangeForm: ({ hasPassword }: { hasPassword: boolean }) => (
    <div data-testid="password-change-form">
      PasswordChangeForm: {hasPassword ? "has-password" : "no-password"}
    </div>
  ),
}));

import ProfileLayout from "@/app/(customer)/profile/layout";
import ProfilePage from "@/app/(customer)/profile/page";

// ────────────────────────────────────────────────────────
// Layout auth guard tests (unchanged from Story 4.4a)
// ────────────────────────────────────────────────────────

describe("Profile Layout — auth guard", () => {
  beforeEach(() => {
    mockAuth.mockClear();
    mockRedirect.mockClear();
  });

  it("redirect đến /login nếu chưa đăng nhập", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(
      ProfileLayout({ children: <div>test</div> })
    ).rejects.toThrow("NEXT_REDIRECT:/login");

    expect(mockRedirect).toHaveBeenCalledWith("/login");
  });

  it("render layout khi đã đăng nhập", async () => {
    mockAuth.mockResolvedValue({
      user: { name: "Nguyễn Linh", id: "linh@example.com", role: "Customer" },
      accessToken: "token123",
    });

    const jsx = await ProfileLayout({ children: <div>Nội dung trang</div> });
    render(jsx);

    expect(screen.getByText(/Xin chào/)).toBeInTheDocument();
    expect(screen.getByText("Nguyễn Linh")).toBeInTheDocument();
    expect(screen.getByText("Hồ sơ")).toBeInTheDocument();
    expect(screen.getByText("Nội dung trang")).toBeInTheDocument();
  });

  it("hiển thị breadcrumb 'Trang chủ > Hồ sơ'", async () => {
    mockAuth.mockResolvedValue({
      user: { name: "Linh", id: "linh@example.com", role: "Customer" },
      accessToken: "token",
    });

    const jsx = await ProfileLayout({ children: <div /> });
    render(jsx);

    expect(screen.getByText("Trang chủ")).toBeInTheDocument();
    expect(screen.getByText("Hồ sơ")).toBeInTheDocument();
  });
});

// ────────────────────────────────────────────────────────
// Profile Page — new Story 4.4b behavior
// ────────────────────────────────────────────────────────

describe("Profile Page — Story 4.4b", () => {
  beforeEach(() => {
    mockGetCustomerProfile.mockClear();
  });

  it("renders PersonalInfoForm and PasswordChangeForm with profile data", async () => {
    mockGetCustomerProfile.mockResolvedValue({
      success: true,
      data: {
        full_name: "Nguyễn Linh",
        email: "linh@example.com",
        phone: "0901234567",
        gender: "Nữ",
        date_of_birth: null,
        has_password: true,
      },
    });

    const jsx = await ProfilePage();
    render(jsx);

    expect(screen.getByTestId("personal-info-form")).toBeInTheDocument();
    expect(screen.getByTestId("password-change-form")).toBeInTheDocument();
    expect(screen.getByText("PersonalInfoForm: linh@example.com")).toBeInTheDocument();
    expect(screen.getByText("PasswordChangeForm: has-password")).toBeInTheDocument();
  });

  it("hiển thị lỗi khi getCustomerProfile thất bại", async () => {
    mockGetCustomerProfile.mockResolvedValue({
      success: false,
      error: "Lỗi kết nối",
    });

    const jsx = await ProfilePage();
    render(jsx);

    expect(screen.getByText("Lỗi kết nối")).toBeInTheDocument();
    expect(screen.getByText(/Vui lòng tải lại trang/)).toBeInTheDocument();
    expect(screen.queryByTestId("personal-info-form")).not.toBeInTheDocument();
  });

  it("hiển thị lỗi mặc định khi không có error message", async () => {
    mockGetCustomerProfile.mockResolvedValue({ success: false });

    const jsx = await ProfilePage();
    render(jsx);

    expect(screen.getByText("Không thể tải thông tin hồ sơ")).toBeInTheDocument();
  });

  it("truyền has_password=false cho OAuth user", async () => {
    mockGetCustomerProfile.mockResolvedValue({
      success: true,
      data: {
        full_name: "Google User",
        email: "google@example.com",
        phone: null,
        gender: null,
        date_of_birth: null,
        has_password: false,
      },
    });

    const jsx = await ProfilePage();
    render(jsx);

    expect(screen.getByText("PasswordChangeForm: no-password")).toBeInTheDocument();
  });
});
