"use client";

import { useState, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Reset Password Form: Form to input OTP and new password.
 */
function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialEmail = searchParams.get("email") || "";

    const [email, setEmail] = useState(initialEmail);
    const [code, setCode] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    // UI state
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError("");

        // Validation
        if (newPassword !== confirmPassword) {
            setError("Mật khẩu xác nhận không khớp");
            return;
        }

        if (newPassword.length < 8) {
            setError("Mật khẩu mới phải có ít nhất 8 ký tự");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/reset-password`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email,
                    code,
                    new_password: newPassword,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.detail || "Xác thực thất bại. Vui lòng kiểm tra lại mã OTP.");
                setLoading(false);
                return;
            }

            // Success
            setSuccess(true);
            setTimeout(() => {
                router.push("/login");
            }, 3000);
        } catch (err) {
            setError("Đã xảy ra lỗi. Vui lòng thử lại sau.");
            setLoading(false);
        }
    };

    return (
        <div className="bg-white shadow-xl rounded-2xl p-8 border border-indigo-100">
            {/* Header */}
            <div className="text-center mb-8">
                <h1 className="text-3xl font-serif font-bold text-indigo-900 mb-2">
                    Đặt lại mật khẩu
                </h1>
                <p className="text-gray-600 text-sm">
                    Nhập mã xác thực đã gửi đến email và đặt mật khẩu mới của bạn
                </p>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                </div>
            )}

            {/* Success Message */}
            {success && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm text-center">
                    <p className="font-bold mb-2">Đặt lại mật khẩu thành công!</p>
                    <p>Đang chuyển hướng bạn về trang đăng nhập...</p>
                </div>
            )}

            {/* Forgot Password Form */}
            {!success && (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                            Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={loading}
                            placeholder="your@email.com"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-gray-50"
                        />
                    </div>

                    <div>
                        <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                            Mã xác thực (6 chữ số)
                        </label>
                        <input
                            id="code"
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            required
                            disabled={loading}
                            maxLength={6}
                            placeholder="123456"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed text-center text-2xl tracking-[1em] font-mono"
                        />
                    </div>

                    <div className="pt-2 border-t border-gray-100">
                        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                            Mật khẩu mới
                        </label>
                        <input
                            id="newPassword"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            disabled={loading}
                            placeholder="Tối thiểu 8 ký tự"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                    </div>

                    <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                            Xác nhận mật khẩu mới
                        </label>
                        <input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            disabled={loading}
                            placeholder="Nhập lại mật khẩu mới"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full px-4 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                    >
                        {loading ? "Đang xác thực..." : "Đặt lại mật khẩu"}
                    </button>

                    <div className="text-center mt-4">
                        <a href="/login" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                            Quay lại đăng nhập
                        </a>
                    </div>
                </form>
            )}
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        }>
            <ResetPasswordForm />
        </Suspense>
    );
}
