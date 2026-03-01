"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

/**
 * Registration Page: Customer account registration with OTP verification.
 * Story 1.2: AC1, AC2, AC3, AC4
 */
export default function RegisterPage() {
    const router = useRouter();

    // Form fields
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [phone, setPhone] = useState("");
    const [dateOfBirth, setDateOfBirth] = useState("");
    const [gender, setGender] = useState("");
    const [address, setAddress] = useState("");

    // UI state
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleRegister = async (e: FormEvent) => {
        e.preventDefault();
        setError("");

        // Client-side validation
        if (password !== confirmPassword) {
            setError("Mật khẩu xác nhận không khớp");
            return;
        }

        if (password.length < 8) {
            setError("Mật khẩu phải có ít nhất 8 ký tự");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email,
                    password,
                    full_name: fullName,
                    phone: phone || undefined,
                    date_of_birth: dateOfBirth || undefined,
                    gender: gender || undefined,
                    address: address || undefined,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.detail || "Đăng ký thất bại. Vui lòng thử lại.");
                setLoading(false);
                return;
            }

            // Success - redirect to OTP verification page
            router.push(`/verify-otp?email=${encodeURIComponent(email)}`);
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
                    Đăng ký tài khoản
                </h1>
                <p className="text-gray-600 text-sm">
                    Tạo tài khoản mới để bắt đầu sử dụng Tailor Project
                </p>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                </div>
            )}

            {/* Registration Form */}
            <form onSubmit={handleRegister} className="space-y-4">
                {/* Email - Required */}
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                        Email <span className="text-red-500">*</span>
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

                {/* Password - Required */}
                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                        Mật khẩu <span className="text-red-500">*</span>
                    </label>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={loading}
                        placeholder="Tối thiểu 8 ký tự"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                </div>

                {/* Confirm Password - Required */}
                <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                        Xác nhận mật khẩu <span className="text-red-500">*</span>
                    </label>
                    <input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        disabled={loading}
                        placeholder="Nhập lại mật khẩu"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                </div>

                {/* Full Name - Required */}
                <div>
                    <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                        Họ và tên <span className="text-red-500">*</span>
                    </label>
                    <input
                        id="fullName"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        disabled={loading}
                        placeholder="Nguyễn Văn A"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                </div>

                {/* Phone - Optional */}
                <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                        Số điện thoại
                    </label>
                    <input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        disabled={loading}
                        placeholder="0901234567"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                </div>

                {/* Date of Birth - Optional */}
                <div>
                    <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-1">
                        Ngày sinh
                    </label>
                    <input
                        id="dateOfBirth"
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        disabled={loading}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                </div>

                {/* Gender - Optional */}
                <div>
                    <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
                        Giới tính
                    </label>
                    <select
                        id="gender"
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        disabled={loading}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <option value="">-- Chọn giới tính --</option>
                        <option value="Male">Nam</option>
                        <option value="Female">Nữ</option>
                        <option value="Other">Khác</option>
                    </select>
                </div>

                {/* Address - Optional */}
                <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                        Địa chỉ
                    </label>
                    <textarea
                        id="address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        disabled={loading}
                        placeholder="Số nhà, đường, phường, quận, thành phố"
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed resize-none"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full px-4 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                >
                    {loading ? "Đang xử lý..." : "Đăng ký"}
                </button>
            </form>

            {/* Footer */}
            <p className="mt-6 text-center text-sm text-gray-600">
                Đã có tài khoản?{" "}
                <a href="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
                    Đăng nhập ngay
                </a>
            </p>
        </div>
    );
}
