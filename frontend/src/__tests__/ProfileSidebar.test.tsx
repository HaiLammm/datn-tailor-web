/**
 * ProfileSidebar Component Tests - Story 4.4a: Customer Profile Layout + Navbar Icon
 */

import { describe, it, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { ProfileSidebar } from "@/components/client/profile/ProfileSidebar";

// Mock next/navigation usePathname
let mockPathname = "/profile";
jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

describe("ProfileSidebar", () => {
  beforeEach(() => {
    mockPathname = "/profile";
  });

  it("render đủ 6 mục navigation (desktop + mobile nav)", () => {
    render(<ProfileSidebar />);
    // getAllByText because desktop+mobile both render; at least one instance per item
    expect(screen.getAllByText("Thông tin cá nhân").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Đơn hàng").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Số đo").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Lịch hẹn").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Thông báo").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Voucher").length).toBeGreaterThan(0);
  });

  it("highlight mục 'Thông tin cá nhân' khi pathname=/profile", () => {
    mockPathname = "/profile";
    render(<ProfileSidebar />);
    // Desktop sidebar link (first occurrence) uses bg-indigo-50 + text-indigo-700
    const links = screen.getAllByText("Thông tin cá nhân").map((el) => el.closest("a"));
    // At least one link should have text-indigo-700 (active)
    const activeLinks = links.filter((link) => link?.classList.contains("text-indigo-700"));
    expect(activeLinks.length).toBeGreaterThan(0);
  });

  it("highlight mục 'Đơn hàng' khi pathname=/profile/orders", () => {
    mockPathname = "/profile/orders";
    render(<ProfileSidebar />);
    const links = screen.getAllByText("Đơn hàng").map((el) => el.closest("a"));
    const activeLinks = links.filter((link) => link?.classList.contains("text-indigo-700"));
    expect(activeLinks.length).toBeGreaterThan(0);
  });

  it("không highlight mục khác khi pathname=/profile/orders", () => {
    mockPathname = "/profile/orders";
    render(<ProfileSidebar />);
    const thongTinLinks = screen.getAllByText("Thông tin cá nhân").map((el) => el.closest("a"));
    // None of the "Thông tin cá nhân" links should be active
    const activeLinks = thongTinLinks.filter((link) => link?.classList.contains("text-indigo-700"));
    expect(activeLinks.length).toBe(0);
  });

  it("mỗi mục nav là thẻ <a> với href đúng", () => {
    render(<ProfileSidebar />);
    // Use getAllByRole because desktop+mobile both render same items
    expect(screen.getAllByRole("link", { name: /Thông tin cá nhân/i })[0]).toHaveAttribute("href", "/profile");
    expect(screen.getAllByRole("link", { name: /Đơn hàng/i })[0]).toHaveAttribute("href", "/profile/orders");
    expect(screen.getAllByRole("link", { name: /Số đo/i })[0]).toHaveAttribute("href", "/profile/measurements");
    expect(screen.getAllByRole("link", { name: /Lịch hẹn/i })[0]).toHaveAttribute("href", "/profile/appointments");
    expect(screen.getAllByRole("link", { name: /Thông báo/i })[0]).toHaveAttribute("href", "/profile/notifications");
    expect(screen.getAllByRole("link", { name: /Voucher/i })[0]).toHaveAttribute("href", "/profile/vouchers");
  });
});
