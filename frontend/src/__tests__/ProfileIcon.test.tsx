/**
 * ProfileIcon Component Tests - Story 4.4a: Customer Profile Layout + Navbar Icon
 */

import { describe, it, expect } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

import { ProfileIcon } from "@/components/client/profile/ProfileIcon";

// Mock next/navigation
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe("ProfileIcon", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  describe("khi user đã đăng nhập (userName truyền vào)", () => {
    it("hiển thị user icon button", () => {
      render(<ProfileIcon userName="Nguyễn Linh" />);
      const button = screen.getByRole("button", { name: /Hồ sơ cá nhân/i });
      expect(button).toBeInTheDocument();
    });

    it("button có aria-label 'Hồ sơ cá nhân'", () => {
      render(<ProfileIcon userName="Nguyễn Linh" />);
      expect(screen.getByLabelText("Hồ sơ cá nhân")).toBeInTheDocument();
    });

    it("click icon → navigate đến /profile", () => {
      render(<ProfileIcon userName="Nguyễn Linh" />);
      fireEvent.click(screen.getByLabelText("Hồ sơ cá nhân"));
      expect(mockPush).toHaveBeenCalledWith("/profile");
    });

    it("button có min-h và min-w 44px (touch target)", () => {
      render(<ProfileIcon userName="Nguyễn Linh" />);
      const button = screen.getByLabelText("Hồ sơ cá nhân");
      expect(button).toHaveClass("min-h-[44px]");
      expect(button).toHaveClass("min-w-[44px]");
    });

    it("không hiển thị link 'Đăng nhập'", () => {
      render(<ProfileIcon userName="Nguyễn Linh" />);
      expect(screen.queryByText("Đăng nhập")).not.toBeInTheDocument();
    });
  });

  describe("khi user chưa đăng nhập (userName=undefined)", () => {
    it("hiển thị link 'Đăng nhập'", () => {
      render(<ProfileIcon userName={undefined} />);
      expect(screen.getByText("Đăng nhập")).toBeInTheDocument();
    });

    it("click 'Đăng nhập' → navigate đến /login", () => {
      render(<ProfileIcon userName={undefined} />);
      fireEvent.click(screen.getByText("Đăng nhập"));
      expect(mockPush).toHaveBeenCalledWith("/login");
    });

    it("không hiển thị user icon button", () => {
      render(<ProfileIcon userName={undefined} />);
      expect(screen.queryByLabelText("Hồ sơ cá nhân")).not.toBeInTheDocument();
    });
  });

  describe("edge cases — userName=null và userName=''", () => {
    it("userName=null → hiển thị 'Đăng nhập' (chưa đăng nhập)", () => {
      render(<ProfileIcon userName={null} />);
      expect(screen.getByText("Đăng nhập")).toBeInTheDocument();
      expect(screen.queryByLabelText("Hồ sơ cá nhân")).not.toBeInTheDocument();
    });

    it("userName='' (empty string) → hiển thị user icon button (đã đăng nhập, thiếu tên)", () => {
      render(<ProfileIcon userName="" />);
      expect(screen.getByLabelText("Hồ sơ cá nhân")).toBeInTheDocument();
      expect(screen.queryByText("Đăng nhập")).not.toBeInTheDocument();
    });

    it("userName='' → click icon navigate đến /profile", () => {
      render(<ProfileIcon userName="" />);
      fireEvent.click(screen.getByLabelText("Hồ sơ cá nhân"));
      expect(mockPush).toHaveBeenCalledWith("/profile");
    });
  });
});
