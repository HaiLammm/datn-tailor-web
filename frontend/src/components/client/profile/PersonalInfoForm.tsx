"use client";

/**
 * PersonalInfoForm — Story 4.4b (AC1, AC2, AC6)
 * Form for customer to view/edit their personal info.
 * Uses react-hook-form + Zod validation + inline toast pattern.
 */

import { useRef, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateCustomerProfile } from "@/app/actions/profile-actions";
import { profileUpdateSchema, type CustomerProfileDetail, type ProfileUpdateInput } from "@/types/customer";

interface PersonalInfoFormProps {
  profile: CustomerProfileDetail;
}

export function PersonalInfoForm({ profile }: PersonalInfoFormProps) {
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    formState: { errors, isSubmitting },
  } = useForm<ProfileUpdateInput>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      full_name: profile.full_name ?? "",
      phone: profile.phone ?? "",
      gender: (profile.gender as "Nam" | "Nữ" | "Khác" | "") ?? "",
      shipping_province: profile.shipping_province ?? "",
      shipping_district: profile.shipping_district ?? "",
      shipping_ward: profile.shipping_ward ?? "",
      shipping_address_detail: profile.shipping_address_detail ?? "",
      auto_fill_infor: profile.auto_fill_infor ?? false,
    },
  });

  async function onSubmit(data: ProfileUpdateInput) {
    const result = await updateCustomerProfile(data);
    if (result.success) {
      showToast("Cập nhật thông tin thành công", "success");
    } else {
      showToast(result.error ?? "Đã xảy ra lỗi", "error");
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 md:p-8">
      <h2 className="text-xl font-serif font-bold text-gray-900 mb-6">Thông tin cá nhân</h2>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-5">
          {/* Full name */}
          <div className="md:grid md:grid-cols-3 md:gap-4 md:items-start">
            <label className="block text-sm font-medium text-gray-700 md:pt-2" htmlFor="full_name">
              Họ tên
            </label>
            <div className="mt-1 md:mt-0 md:col-span-2">
              <input
                id="full_name"
                type="text"
                {...register("full_name")}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Nguyễn Thị Linh"
              />
              {errors.full_name && (
                <p className="mt-1 text-sm text-red-600">{errors.full_name.message}</p>
              )}
            </div>
          </div>

          {/* Email — read-only */}
          <div className="md:grid md:grid-cols-3 md:gap-4 md:items-start">
            <label className="block text-sm font-medium text-gray-700 md:pt-2">
              Email
            </label>
            <div className="mt-1 md:mt-0 md:col-span-2">
              <p className="text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
                {profile.email}
              </p>
              <p className="mt-1 text-xs text-gray-400">Email không thể thay đổi</p>
            </div>
          </div>

          {/* Phone */}
          <div className="md:grid md:grid-cols-3 md:gap-4 md:items-start">
            <label className="block text-sm font-medium text-gray-700 md:pt-2" htmlFor="phone">
              Số điện thoại
            </label>
            <div className="mt-1 md:mt-0 md:col-span-2">
              <input
                id="phone"
                type="tel"
                {...register("phone")}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="0901234567"
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
              )}
            </div>
          </div>

          {/* Gender */}
          <div className="md:grid md:grid-cols-3 md:gap-4 md:items-start">
            <label className="block text-sm font-medium text-gray-700 md:pt-2" htmlFor="gender">
              Giới tính
            </label>
            <div className="mt-1 md:mt-0 md:col-span-2">
              <select
                id="gender"
                {...register("gender")}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              >
                <option value="">-- Chọn --</option>
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
                <option value="Khác">Khác</option>
              </select>
              {errors.gender && (
                <p className="mt-1 text-sm text-red-600">{errors.gender.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Shipping Address Section */}
        <h3 className="text-lg font-serif font-bold text-gray-900 mt-8 mb-4">Địa chỉ giao hàng</h3>
        <div className="space-y-5">
          {/* Shipping Province */}
          <div className="md:grid md:grid-cols-3 md:gap-4 md:items-start">
            <label className="block text-sm font-medium text-gray-700 md:pt-2" htmlFor="shipping_province">
              Tỉnh/Thành phố
            </label>
            <div className="mt-1 md:mt-0 md:col-span-2">
              <input
                id="shipping_province"
                type="text"
                {...register("shipping_province")}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="TP. Hồ Chí Minh"
              />
            </div>
          </div>

          {/* Shipping District */}
          <div className="md:grid md:grid-cols-3 md:gap-4 md:items-start">
            <label className="block text-sm font-medium text-gray-700 md:pt-2" htmlFor="shipping_district">
              Quận/Huyện
            </label>
            <div className="mt-1 md:mt-0 md:col-span-2">
              <input
                id="shipping_district"
                type="text"
                {...register("shipping_district")}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Quận 1"
              />
            </div>
          </div>

          {/* Shipping Ward */}
          <div className="md:grid md:grid-cols-3 md:gap-4 md:items-start">
            <label className="block text-sm font-medium text-gray-700 md:pt-2" htmlFor="shipping_ward">
              Phường/Xã
            </label>
            <div className="mt-1 md:mt-0 md:col-span-2">
              <input
                id="shipping_ward"
                type="text"
                {...register("shipping_ward")}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Phường Bến Nghé"
              />
            </div>
          </div>

          {/* Shipping Address Detail */}
          <div className="md:grid md:grid-cols-3 md:gap-4 md:items-start">
            <label className="block text-sm font-medium text-gray-700 md:pt-2" htmlFor="shipping_address_detail">
              Địa chỉ chi tiết
            </label>
            <div className="mt-1 md:mt-0 md:col-span-2">
              <input
                id="shipping_address_detail"
                type="text"
                {...register("shipping_address_detail")}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="123 Nguyễn Huệ"
              />
            </div>
          </div>

          {/* Auto-fill toggle */}
          <div className="md:grid md:grid-cols-3 md:gap-4 md:items-start">
            <label className="block text-sm font-medium text-gray-700 md:pt-2" htmlFor="auto_fill_infor">
              Tự động điền
            </label>
            <div className="mt-1 md:mt-0 md:col-span-2">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  id="auto_fill_infor"
                  type="checkbox"
                  {...register("auto_fill_infor")}
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">Tự động điền thông tin khi checkout</span>
              </label>
            </div>
          </div>
        </div>

        {/* Submit button */}
        <div className="mt-8 flex justify-end">
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
            {isSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </form>

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
