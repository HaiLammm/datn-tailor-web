"use client";

import { useState, FormEvent, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

/**
 * OTP Verification Form Component: Separated to be wrapped in Suspense.
 */
function VerifyOTPForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const emailFromUrl = searchParams.get("email") || "";

    const [email, setEmail] = useState(emailFromUrl);
    const [otpCode, setOtpCode] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);

    useEffect(() => {
        // If no email in URL, redirect to register
        if (!emailFromUrl) {
            router.push("/register");
        }
    }, [emailFromUrl, router]);

    const handleVerifyOTP = async (e: FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        // Validation
        if (otpCode.length !== 6 || !/^\d+$/.test(otpCode)) {
            setError("Mã OTP phải có đúng 6 chữ số");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/verify-otp`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email,
                    code: otpCode,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.detail || "Mã OTP không đúng hoặc đã hết hạn. Vui lòng thử lại.");
                setLoading(false);
                return;
            }

            // Success - Auto login with the returned JWT token
            setSuccess("Xác thực thành công! Đang đăng nhập...");

            // Use signIn with credentials to create session
            // We'll pass the JWT token as password (backend won't validate it again)
            const signInResult = await signIn("credentials", {
                email,
                password: data.access_token, // Pass JWT as password for session creation
                redirect: false,
            });

            if (signInResult?.ok) {
                // Redirect to home page (Customer dashboard)
                router.push("/");
            } else {
                setError("Đăng nhập tự động thất bại. Vui lòng đăng nhập thủ công.");
                setTimeout(() => router.push("/login"), 2000);
            }
        } catch (err) {
            setError("Đã xảy ra lỗi. Vui lòng thử lại sau.");
            setLoading(false);
        }
    };

    const handleResendOTP = async () => {
        setError("");
        setSuccess("");
        setResendLoading(true);

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/resend-otp`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.detail || "Không thể gửi lại mã OTP. Vui lòng thử lại.");
                setResendLoading(false);
                return;
            }

            setSuccess("Mã OTP mới đã được gửi đến email của bạn!");
            setOtpCode(""); // Clear OTP input
            setResendLoading(false);
        } catch (err) {
            setError("Đã xảy ra lỗi. Vui lòng thử lại sau.");
            setResendLoading(false);
        }
    };

    return (
        <div className="bg-white shadow-xl rounded-2xl p-8 border border-indigo-100">
            {/* Header */}
            <div className="text-center mb-8">
                <div className="mb-4">
                    {/* Email Icon */}
                    <svg
                        className="w-16 h-16 mx-auto text-indigo-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                    </svg>
                </div>
                <h1 className="text-3xl font-serif font-bold text-indigo-900 mb-2">
                    Xác thực Email
                </h1>
                <p className="text-gray-600 text-sm">
                    Chúng tôi đã gửi mã OTP 6 chữ số đến email
                </p>
                <p className="text-indigo-700 font-medium text-sm mt-1">
                    {email}
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
                    {success}
                </div>
            )}

            {/* OTP Verification Form */}
            <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div>
                    <label htmlFor="otpCode" className="block text-sm font-medium text-gray-700 mb-1">
                        Mã OTP
                    </label>
                    <input
                        id="otpCode"
                        type="text"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        required
                        disabled={loading || resendLoading}
                        placeholder="123456"
                        maxLength={6}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed text-center text-2xl tracking-widest font-mono"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Nhập mã 6 chữ số bạn nhận được qua email
                    </p>
                </div>

                <button
                    type="submit"
                    disabled={loading || resendLoading || otpCode.length !== 6}
                    className="w-full px-4 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                >
                    {loading ? "Đang xác thực..." : "Xác thực"}
                </button>
            </form>

            {/* Resend OTP */}
            <div className="mt-6 text-center">
                <p className="text-sm text-gray-600 mb-2">
                    Không nhận được mã?
                </p>
                <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={loading || resendLoading}
                    className="text-indigo-600 hover:text-indigo-700 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {resendLoading ? "Đang gửi lại..." : "Gửi lại mã OTP"}
                </button>
            </div>

            {/* Footer */}
            <p className="mt-6 text-center text-sm text-gray-600">
                <a href="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
                    ← Quay lại đăng nhập
                </a>
            </p>
        </div>
    );
}

/**
 * OTP Verification Page: Verify email with 6-digit OTP code.
 * Wrapped in Suspense to prevent Next.js prerender error.
 */
export default function VerifyOTPPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        }>
            <VerifyOTPForm />
        </Suspense>
    );
}
