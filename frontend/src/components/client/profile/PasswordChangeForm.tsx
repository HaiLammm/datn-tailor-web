"use client";

/**
 * PasswordChangeForm — Story 4.4b (AC3, AC4, AC7) + OTP verification
 * Two-step flow:
 *   Step 1: Enter old + new password → backend sends OTP to email
 *   Step 2: Enter 6-digit OTP → backend verifies and changes password
 * Shows informational message for OAuth-only users (AC7).
 */

import { useRef, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { changePassword, confirmPasswordChange } from "@/app/actions/profile-actions";
import { passwordChangeSchema, type PasswordChangeInput } from "@/types/customer";

interface PasswordChangeFormProps {
  hasPassword: boolean;
}

type PasswordStrength = "Yếu" | "Trung bình" | "Mạnh" | null;

function evaluateStrength(pwd: string): PasswordStrength {
  if (!pwd) return null;
  const hasUpper = /[A-Z]/.test(pwd);
  const hasLower = /[a-z]/.test(pwd);
  const hasDigit = /[0-9]/.test(pwd);
  const hasLength = pwd.length >= 8;
  const score = [hasUpper, hasLower, hasDigit, hasLength].filter(Boolean).length;
  if (score <= 2) return "Yếu";
  if (score === 3) return "Trung bình";
  return "Mạnh";
}

function EyeIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
    </svg>
  );
}

export function PasswordChangeForm({ hasPassword }: PasswordChangeFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [newPwdValue, setNewPwdValue] = useState("");

  // OTP step state
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [pendingNewPassword, setPendingNewPassword] = useState("");

  function showToast(message: string, type: "success" | "error") {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordChangeInput>({
    resolver: zodResolver(passwordChangeSchema),
  });

  // Step 1: Verify old password → send OTP
  async function onSubmit(data: PasswordChangeInput) {
    const result = await changePassword({
      old_password: data.old_password,
      new_password: data.new_password,
    });
    if (result.success && result.otpRequired) {
      setPendingNewPassword(data.new_password);
      setOtpStep(true);
      setOtpCode("");
      setOtpError(null);
      showToast("Mã OTP đã gửi đến email của bạn", "success");
    } else if (!result.success) {
      showToast(result.error ?? "Đã xảy ra lỗi", "error");
    }
  }

  // Step 2: Verify OTP → change password
  async function onConfirmOtp() {
    if (otpCode.length !== 6) {
      setOtpError("Vui lòng nhập đủ 6 chữ số");
      return;
    }
    setIsConfirming(true);
    setOtpError(null);

    const result = await confirmPasswordChange({
      otp_code: otpCode,
      new_password: pendingNewPassword,
    });

    setIsConfirming(false);

    if (result.success) {
      showToast("Mật khẩu đã cập nhật thành công", "success");
      resetAll();
    } else {
      setOtpError(result.error ?? "Mã OTP không hợp lệ");
    }
  }

  function resetAll() {
    reset();
    setNewPwdValue("");
    setOtpStep(false);
    setOtpCode("");
    setOtpError(null);
    setPendingNewPassword("");
    setIsOpen(false);
  }

  const strength = evaluateStrength(newPwdValue);
  const strengthColor =
    strength === "Mạnh"
      ? "text-green-600"
      : strength === "Trung bình"
        ? "text-amber-600"
        : strength === "Yếu"
          ? "text-red-600"
          : "";

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 md:p-8">
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between"
        aria-expanded={isOpen}
      >
        <h2 className="text-xl font-serif font-bold text-gray-900">Đổi mật khẩu</h2>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="mt-6">
          {/* AC7: OAuth user — show message instead of form */}
          {!hasPassword ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
              Tài khoản của bạn sử dụng đăng nhập Google. Để đặt mật khẩu, sử dụng chức năng{" "}
              <strong>Quên mật khẩu</strong>.
            </div>
          ) : otpStep ? (
            /* ─── Step 2: OTP verification ─── */
            <div className="space-y-5">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                Mã xác thực OTP đã được gửi đến email của bạn. Vui lòng nhập mã 6 chữ số để hoàn tất đổi mật khẩu.
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="otp_code">
                  Mã OTP
                </label>
                <input
                  id="otp_code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setOtpCode(val);
                    setOtpError(null);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center text-2xl tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="000000"
                  autoFocus
                />
                {otpError && (
                  <p className="mt-1 text-sm text-red-600">{otpError}</p>
                )}
              </div>

              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={resetAll}
                  className="text-sm text-gray-500 hover:text-gray-700 underline"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={onConfirmOtp}
                  disabled={isConfirming || otpCode.length !== 6}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg px-6 py-2.5 text-sm font-medium transition-colors flex items-center gap-2"
                >
                  {isConfirming && (
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  )}
                  {isConfirming ? "Đang xác nhận..." : "Xác nhận"}
                </button>
              </div>
            </div>
          ) : (
            /* ─── Step 1: Password form ─── */
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="space-y-5">
                {/* Old password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="old_password">
                    Mật khẩu hiện tại
                  </label>
                  <div className="relative">
                    <input
                      id="old_password"
                      type={showOld ? "text" : "password"}
                      {...register("old_password")}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOld((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      aria-label={showOld ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    >
                      {showOld ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                  {errors.old_password && (
                    <p className="mt-1 text-sm text-red-600">{errors.old_password.message}</p>
                  )}
                </div>

                {/* New password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="new_password">
                    Mật khẩu mới
                  </label>
                  <div className="relative">
                    <input
                      id="new_password"
                      type={showNew ? "text" : "password"}
                      {...register("new_password", {
                        onChange: (e) => setNewPwdValue(e.target.value),
                      })}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      aria-label={showNew ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    >
                      {showNew ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                  {/* Password strength indicator */}
                  {strength && (
                    <p className={`mt-1 text-xs font-medium ${strengthColor}`}>
                      Độ mạnh: {strength}
                    </p>
                  )}
                  {errors.new_password && (
                    <p className="mt-1 text-sm text-red-600">{errors.new_password.message}</p>
                  )}
                </div>

                {/* Confirm new password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="new_password_confirm">
                    Xác nhận mật khẩu mới
                  </label>
                  <div className="relative">
                    <input
                      id="new_password_confirm"
                      type={showConfirm ? "text" : "password"}
                      {...register("new_password_confirm")}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      aria-label={showConfirm ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    >
                      {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                  {errors.new_password_confirm && (
                    <p className="mt-1 text-sm text-red-600">{errors.new_password_confirm.message}</p>
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg px-6 py-2.5 text-sm font-medium transition-colors flex items-center gap-2"
                >
                  {isSubmitting && (
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  )}
                  {isSubmitting ? "Đang xử lý..." : "Tiếp tục"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Inline toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-2xl text-sm font-medium ${
            toast.type === "success" ? "bg-indigo-900 text-white" : "bg-red-700 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
