"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

/**
 * Forgot Password Page: Request OTP for password recovery.
 * Story 1.7: AC1
 */
export default function ForgotPasswordPage() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/forgot-password`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.detail || "Không thể gửi yêu cầu. Vui lòng thử lại.");
                setLoading(false);
                return;
            }

            // Success - show success message then redirect or just direct to reset page
            setSuccess(true);
            setTimeout(() => {
                router.push(`/reset-password?email=${encodeURIComponent(email)}`);
            }, 2000);
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
                    Quên mật khẩu?
                </h1>
                <p className="text-gray-600 text-sm">
                    Nhập email của bạn để nhận mã xác thực khôi phục mật khẩu
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
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                    Yêu cầu thành công! Chúng tôi đang chuyển hướng bạn đến trang nhập mã xác thực...
                </div>
            )}

            {/* Forgot Password Form */}
            {!success && (
                <form onSubmit={handleSubmit} className="space-y-6">
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
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full px-4 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Đang gửi yêu cầu..." : "Gửi mã xác thực"}
                    </button>

                    <div className="text-center">
                        <a href="/login" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                            Quay lại đăng nhập
                        </a>
                    </div>
                </form>
            )}
        </div>
    );
}
