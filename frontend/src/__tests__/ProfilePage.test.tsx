/**
 * Profile Page & Layout Auth Guard Tests - Story 4.4a
 * Tests auth redirect behavior for profile pages.
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

// Mock @/auth
const mockAuth = jest.fn();
jest.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock ProfileSidebar to simplify layout tests
jest.mock("@/components/client/profile/ProfileSidebar", () => ({
  ProfileSidebar: () => <nav data-testid="profile-sidebar">Sidebar</nav>,
}));

import ProfileLayout from "@/app/(customer)/profile/layout";
import ProfilePage from "@/app/(customer)/profile/page";

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

describe("Profile Default Page — auth guard", () => {
  beforeEach(() => {
    mockAuth.mockClear();
    mockRedirect.mockClear();
  });

  it("redirect đến /login nếu chưa đăng nhập", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(ProfilePage()).rejects.toThrow("NEXT_REDIRECT:/login");
    expect(mockRedirect).toHaveBeenCalledWith("/login");
  });

  it("hiển thị placeholder 'Thông tin cá nhân — Sắp ra mắt' khi đã đăng nhập", async () => {
    mockAuth.mockResolvedValue({
      user: { name: "Linh", id: "linh@example.com", role: "Customer" },
      accessToken: "token",
    });

    const jsx = await ProfilePage();
    render(jsx);

    expect(screen.getByText("Thông tin cá nhân")).toBeInTheDocument();
    expect(screen.getByText(/Sắp ra mắt/)).toBeInTheDocument();
  });
});
