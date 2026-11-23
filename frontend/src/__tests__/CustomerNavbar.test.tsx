/**
 * CustomerNavbar Component Tests — Story 15.1: Shared customer navigation.
 */

import React from "react";
import { describe, it, expect } from "@jest/globals";
import { render, screen, within, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

import { CustomerNavbar } from "@/components/client/navigation/CustomerNavbar";

// ─── Mocks ─────────────────────────────────────────────────────────────────

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
    onClick,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    onClick?: () => void;
  }) => (
    <a href={href} onClick={onClick} {...rest}>
      {children}
    </a>
  ),
}));

let mockPathname = "/showroom";
jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

// Stub the heavy reused components so this stays a focused unit test.
jest.mock("@/components/client/cart/CartBadge", () => ({
  CartBadge: () => <div data-testid="cart-badge" />,
}));
jest.mock("@/components/client/profile/ProfileIcon", () => ({
  ProfileIcon: ({ userName }: { userName?: string | null }) => (
    <div data-testid="profile-icon">{userName ?? "guest"}</div>
  ),
}));
jest.mock("@/components/client/profile/LogoutButton", () => ({
  LogoutButton: () => <div data-testid="logout-button" />,
}));
jest.mock("@/components/client/profile/NotificationBell", () => ({
  NotificationBell: () => <div data-testid="notification-bell" />,
}));

// Compact controllable Radix Dialog stub.
jest.mock("@radix-ui/react-dialog", () => {
  const ReactLib = jest.requireActual("react") as typeof import("react");
  const Ctx = ReactLib.createContext<{ open: boolean; setOpen: (v: boolean) => void }>({
    open: false,
    setOpen: () => {},
  });
  return {
    Root: ({
      children,
      open,
      onOpenChange,
    }: {
      children: React.ReactNode;
      open: boolean;
      onOpenChange: (v: boolean) => void;
    }) =>
      ReactLib.createElement(Ctx.Provider, { value: { open, setOpen: onOpenChange } }, children),
    Trigger: ({ children }: { children: React.ReactElement; asChild?: boolean }) => {
      const { setOpen } = ReactLib.useContext(Ctx);
      return ReactLib.cloneElement(children, { onClick: () => setOpen(true) });
    },
    Portal: ({ children }: { children: React.ReactNode }) => children,
    Overlay: (props: Record<string, unknown>) => ReactLib.createElement("div", props),
    Content: ({ children, ...props }: { children: React.ReactNode }) => {
      const { open } = ReactLib.useContext(Ctx);
      return open ? ReactLib.createElement("div", props, children) : null;
    },
    Title: ({ children, ...props }: { children: React.ReactNode }) =>
      ReactLib.createElement("h2", props, children),
    Close: ({ children }: { children: React.ReactElement; asChild?: boolean }) => {
      const { setOpen } = ReactLib.useContext(Ctx);
      return ReactLib.cloneElement(children, { onClick: () => setOpen(false) });
    },
  };
});

// ─── Tests ─────────────────────────────────────────────────────────────────

describe("CustomerNavbar", () => {
  beforeEach(() => {
    mockPathname = "/showroom";
  });

  it("renders the real nav links with correct hrefs (Showroom hidden while SHOWROOM_ENABLED=false)", () => {
    render(<CustomerNavbar userName={null} />);
    const nav = screen.getByRole("navigation", { name: "Điều hướng chính" });
    expect(within(nav).getByRole("link", { name: "Trang chủ" })).toHaveAttribute("href", "/");
    expect(within(nav).queryByRole("link", { name: "Showroom" })).not.toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: "Giới thiệu" })).toHaveAttribute("href", "/about");
    expect(within(nav).getByRole("link", { name: "Cẩm nang" })).toHaveAttribute("href", "/blog");
    expect(within(nav).getByRole("link", { name: "Liên hệ" })).toHaveAttribute("href", "/contact");
    expect(within(nav).getByRole("link", { name: "Đặt lịch" })).toHaveAttribute("href", "/booking");
  });

  it("points 'Trang chủ' to / and NOT /showroom", () => {
    render(<CustomerNavbar userName={null} />);
    const nav = screen.getByRole("navigation", { name: "Điều hướng chính" });
    const home = within(nav).getByRole("link", { name: "Trang chủ" });
    expect(home).toHaveAttribute("href", "/");
    expect(home).not.toHaveAttribute("href", "/showroom");
  });

  it("logo links to / (loop removed)", () => {
    render(<CustomerNavbar userName={null} />);
    const logo = screen.getByRole("link", { name: /Áo Dài Thanh Lộc/ });
    expect(logo).toHaveAttribute("href", "/");
  });

  it("marks the active route with aria-current", () => {
    mockPathname = "/blog/cach-chon-vai";
    render(<CustomerNavbar userName={null} />);
    const nav = screen.getByRole("navigation", { name: "Điều hướng chính" });
    expect(within(nav).getByRole("link", { name: "Cẩm nang" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(within(nav).getByRole("link", { name: "Trang chủ" })).not.toHaveAttribute("aria-current");
  });

  it("hides notification bell and logout for guests, shows profile (login) entry", () => {
    render(<CustomerNavbar userName={null} />);
    expect(screen.queryByTestId("notification-bell")).not.toBeInTheDocument();
    expect(screen.queryByTestId("logout-button")).not.toBeInTheDocument();
    expect(screen.getByTestId("profile-icon")).toHaveTextContent("guest");
    // Giỏ hàng ẩn khi showroom online đang tắt
    expect(screen.queryByTestId("cart-badge")).not.toBeInTheDocument();
  });

  it("shows the store phone as a tel: link in the header", () => {
    render(<CustomerNavbar userName={null} />);
    expect(screen.getByRole("link", { name: /0947 516 881/ })).toHaveAttribute(
      "href",
      "tel:0947516881"
    );
  });

  it("shows notification bell and logout for authenticated users", () => {
    render(<CustomerNavbar userName="Lem" />);
    expect(screen.getByTestId("notification-bell")).toBeInTheDocument();
    expect(screen.getByTestId("logout-button")).toBeInTheDocument();
    expect(screen.getByTestId("profile-icon")).toHaveTextContent("Lem");
  });

  it("opens the mobile drawer when the hamburger is clicked", () => {
    render(<CustomerNavbar userName={null} />);
    // Drawer nav not present until opened
    expect(screen.queryByRole("navigation", { name: "Menu di động" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Mở menu" }));
    const drawerNav = screen.getByRole("navigation", { name: "Menu di động" });
    expect(within(drawerNav).getByRole("link", { name: "Giới thiệu" })).toHaveAttribute(
      "href",
      "/about"
    );
  });

  it("closes the drawer when a link inside it is clicked", () => {
    render(<CustomerNavbar userName={null} />);
    fireEvent.click(screen.getByRole("button", { name: "Mở menu" }));
    const drawerNav = screen.getByRole("navigation", { name: "Menu di động" });
    fireEvent.click(within(drawerNav).getByRole("link", { name: "Cẩm nang" }));
    expect(screen.queryByRole("navigation", { name: "Menu di động" })).not.toBeInTheDocument();
  });

  it("offers call and Zalo buttons inside the mobile drawer", () => {
    render(<CustomerNavbar userName={null} />);
    fireEvent.click(screen.getByRole("button", { name: "Mở menu" }));
    expect(screen.getByRole("link", { name: "Nhắn Zalo" })).toHaveAttribute(
      "href",
      "https://zalo.me/0947516881"
    );
    expect(screen.getByRole("link", { name: "Gọi 0947 516 881" })).toHaveAttribute(
      "href",
      "tel:0947516881"
    );
  });
});
