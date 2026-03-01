/**
 * Frontend tests for Registration and OTP Verification flows.
 * Story 1.2: Đăng ký Tài khoản Khách hàng & Xác thực OTP
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import RegisterPage from "@/app/(auth)/register/page";
import VerifyOTPPage from "@/app/(auth)/verify-otp/page";

// Mock Next.js navigation
jest.mock("next/navigation", () => ({
    useRouter: jest.fn(),
    useSearchParams: jest.fn(),
}));

// Mock NextAuth
jest.mock("next-auth/react", () => ({
    signIn: jest.fn(),
}));

// Mock fetch globally
global.fetch = jest.fn() as jest.Mock;

describe("RegisterPage", () => {
    let mockPush: jest.Mock;

    beforeEach(() => {
        mockPush = jest.fn();
        (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
        (fetch as jest.Mock).mockClear();
    });

    it("renders registration form with all fields", () => {
        render(<RegisterPage />);

        expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/^Mật khẩu/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Xác nhận mật khẩu/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Họ và tên/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Số điện thoại/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Ngày sinh/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Giới tính/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Địa chỉ/i)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Đăng ký/i })).toBeInTheDocument();
    });

    it("shows error when passwords don't match", async () => {
        render(<RegisterPage />);

        fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: "test@example.com" } });
        fireEvent.change(screen.getByLabelText(/^Mật khẩu/i), { target: { value: "password123" } });
        fireEvent.change(screen.getByLabelText(/Xác nhận mật khẩu/i), { target: { value: "password456" } });
        fireEvent.change(screen.getByLabelText(/Họ và tên/i), { target: { value: "Nguyễn Văn A" } });

        fireEvent.click(screen.getByRole("button", { name: /Đăng ký/i }));

        await waitFor(() => {
            expect(screen.getByText(/Mật khẩu xác nhận không khớp/i)).toBeInTheDocument();
        });

        expect(fetch).not.toHaveBeenCalled();
    });

    it("shows error when password is too short", async () => {
        render(<RegisterPage />);

        fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: "test@example.com" } });
        fireEvent.change(screen.getByLabelText(/^Mật khẩu/i), { target: { value: "short" } });
        fireEvent.change(screen.getByLabelText(/Xác nhận mật khẩu/i), { target: { value: "short" } });
        fireEvent.change(screen.getByLabelText(/Họ và tên/i), { target: { value: "Nguyễn Văn A" } });

        fireEvent.click(screen.getByRole("button", { name: /Đăng ký/i }));

        await waitFor(() => {
            expect(screen.getByText(/Mật khẩu phải có ít nhất 8 ký tự/i)).toBeInTheDocument();
        });

        expect(fetch).not.toHaveBeenCalled();
    });

    it("successfully registers and redirects to OTP page", async () => {
        (fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ message: "Đăng ký thành công", email: "test@example.com" }),
        });

        render(<RegisterPage />);

        fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: "test@example.com" } });
        fireEvent.change(screen.getByLabelText(/^Mật khẩu/i), { target: { value: "password123" } });
        fireEvent.change(screen.getByLabelText(/Xác nhận mật khẩu/i), { target: { value: "password123" } });
        fireEvent.change(screen.getByLabelText(/Họ và tên/i), { target: { value: "Nguyễn Văn A" } });
        fireEvent.change(screen.getByLabelText(/Số điện thoại/i), { target: { value: "0901234567" } });
        fireEvent.change(screen.getByLabelText(/Giới tính/i), { target: { value: "Male" } });

        fireEvent.click(screen.getByRole("button", { name: /Đăng ký/i }));

        await waitFor(() => {
            expect(fetch).toHaveBeenCalledWith(
                `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/register`,
                expect.objectContaining({
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: expect.stringContaining("test@example.com"),
                })
            );
        });

        await waitFor(() => {
            expect(mockPush).toHaveBeenCalledWith("/verify-otp?email=test%40example.com");
        });
    });

    it("shows error when email already exists", async () => {
        (fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            json: async () => ({ detail: "Email này đã được đăng ký" }),
        });

        render(<RegisterPage />);

        fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: "existing@example.com" } });
        fireEvent.change(screen.getByLabelText(/^Mật khẩu/i), { target: { value: "password123" } });
        fireEvent.change(screen.getByLabelText(/Xác nhận mật khẩu/i), { target: { value: "password123" } });
        fireEvent.change(screen.getByLabelText(/Họ và tên/i), { target: { value: "Nguyễn Văn A" } });

        fireEvent.click(screen.getByRole("button", { name: /Đăng ký/i }));

        await waitFor(() => {
            expect(screen.getByText(/Email này đã được đăng ký/i)).toBeInTheDocument();
        });
    });
});

describe("VerifyOTPPage", () => {
    let mockPush: jest.Mock;
    let mockGet: jest.Mock;

    beforeEach(() => {
        mockPush = jest.fn();
        mockGet = jest.fn().mockReturnValue("test@example.com");
        (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
        (useSearchParams as jest.Mock).mockReturnValue({ get: mockGet });
        (fetch as jest.Mock).mockClear();
        (signIn as jest.Mock).mockClear();
    });

    it("renders OTP verification form", () => {
        render(<VerifyOTPPage />);

        expect(screen.getByText(/Xác thực Email/i)).toBeInTheDocument();
        expect(screen.getByText(/test@example.com/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Mã OTP/i)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /^Xác thực$/i })).toBeInTheDocument();
        expect(screen.getByText(/Gửi lại mã OTP/i)).toBeInTheDocument();
    });

    it("redirects to register if no email in URL", () => {
        mockGet.mockReturnValue(null);
        render(<VerifyOTPPage />);

        expect(mockPush).toHaveBeenCalledWith("/register");
    });

    it("only allows 6 digits in OTP input", () => {
        render(<VerifyOTPPage />);

        const otpInput = screen.getByLabelText(/Mã OTP/i) as HTMLInputElement;

        fireEvent.change(otpInput, { target: { value: "abc123xyz" } });
        expect(otpInput.value).toBe("123");

        fireEvent.change(otpInput, { target: { value: "1234567890" } });
        expect(otpInput.value).toBe("123456");
    });

    it("successfully verifies OTP and auto-logs in", async () => {
        (fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ message: "Xác thực thành công", access_token: "mock_jwt_token" }),
        });

        (signIn as jest.Mock).mockResolvedValueOnce({ ok: true });

        render(<VerifyOTPPage />);

        fireEvent.change(screen.getByLabelText(/Mã OTP/i), { target: { value: "123456" } });
        fireEvent.click(screen.getByRole("button", { name: /^Xác thực$/i }));

        await waitFor(() => {
            expect(fetch).toHaveBeenCalledWith(
                `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/verify-otp`,
                expect.objectContaining({
                    method: "POST",
                    body: JSON.stringify({ email: "test@example.com", code: "123456" }),
                })
            );
        });

        await waitFor(() => {
            expect(signIn).toHaveBeenCalledWith("credentials", {
                email: "test@example.com",
                password: "mock_jwt_token",
                redirect: false,
            });
        });

        await waitFor(() => {
            expect(mockPush).toHaveBeenCalledWith("/");
        });
    });

    it("shows error for invalid OTP", async () => {
        (fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            json: async () => ({ detail: "Mã OTP không đúng hoặc đã hết hạn" }),
        });

        render(<VerifyOTPPage />);

        fireEvent.change(screen.getByLabelText(/Mã OTP/i), { target: { value: "999999" } });
        fireEvent.click(screen.getByRole("button", { name: /^Xác thực$/i }));

        await waitFor(() => {
            expect(screen.getByText(/Mã OTP không đúng hoặc đã hết hạn/i)).toBeInTheDocument();
        });

        expect(signIn).not.toHaveBeenCalled();
    });

    it("successfully resends OTP", async () => {
        (fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ message: "Mã OTP mới đã được gửi" }),
        });

        render(<VerifyOTPPage />);

        fireEvent.change(screen.getByLabelText(/Mã OTP/i), { target: { value: "123456" } });
        fireEvent.click(screen.getByText(/Gửi lại mã OTP/i));

        await waitFor(() => {
            expect(fetch).toHaveBeenCalledWith(
                `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/resend-otp`,
                expect.objectContaining({
                    method: "POST",
                    body: JSON.stringify({ email: "test@example.com" }),
                })
            );
        });

        await waitFor(() => {
            expect(screen.getByText(/Mã OTP mới đã được gửi đến email của bạn!/i)).toBeInTheDocument();
        });

        // OTP input should be cleared
        const otpInput = screen.getByLabelText(/Mã OTP/i) as HTMLInputElement;
        expect(otpInput.value).toBe("");
    });

    it("disables submit button when OTP is not 6 digits", () => {
        render(<VerifyOTPPage />);

        const submitButton = screen.getByRole("button", { name: /^Xác thực$/i });

        expect(submitButton).toBeDisabled();

        fireEvent.change(screen.getByLabelText(/Mã OTP/i), { target: { value: "123" } });
        expect(submitButton).toBeDisabled();

        fireEvent.change(screen.getByLabelText(/Mã OTP/i), { target: { value: "123456" } });
        expect(submitButton).not.toBeDisabled();
    });
});
