"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    customerProfileCreateSchema,
    CustomerProfileCreateInput,
} from "@/types/customer";

type CustomerFormValues = {
    full_name: string;
    phone: string;
    email?: string;
    date_of_birth?: string;
    gender?: "" | "Nam" | "Nữ" | "Khác";
    address?: string;
    notes?: string;
    create_account?: boolean;
    initial_measurements?: {
        neck?: number;
        shoulder_width?: number;
        bust?: number;
        waist?: number;
        hip?: number;
        top_length?: number;
        ha_eo?: number;
        vong_nach?: number;
        sleeve_length?: number;
        vong_bap_tay?: number;
        wrist?: number;
        height?: number;
        weight?: number;
        measurement_notes?: string;
    };
};

/**
 * Customer Form - Client Component
 * Story 1.3: Quản lý Hồ sơ & Số đo
 * 
 * Features:
 * - Create customer profile with validation
 * - Optional initial measurements
 * - Optional account creation (if email provided)
 * - Client-side validation with Zod
 */
export default function CustomerForm() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showMeasurements, setShowMeasurements] = useState(false);

    const getErrorMessage = async (response: Response, fallback: string) => {
        try {
            const errorData = await response.json();
            const detail = errorData?.detail;

            if (Array.isArray(detail)) {
                return detail.map((item: { msg?: string }) => item.msg).filter(Boolean).join("; ");
            }

            if (typeof detail === "string" && detail.trim()) {
                return detail;
            }
        } catch {
            return fallback;
        }

        return fallback;
    };

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<CustomerFormValues, undefined, CustomerProfileCreateInput>({
        resolver: zodResolver(customerProfileCreateSchema) as never,
        defaultValues: {
            create_account: false,
        },
    });

    const email = watch("email");
    const createAccount = watch("create_account");

    const onSubmit = async (data: CustomerProfileCreateInput) => {
        setIsSubmitting(true);
        setError(null);

        try {
            const measurementKeys = [
                "neck",
                "shoulder_width",
                "bust",
                "waist",
                "hip",
                "top_length",
                "ha_eo",
                "vong_nach",
                "sleeve_length",
                "vong_bap_tay",
                "wrist",
                "height",
                "weight",
            ] as const;

            const initialMeasurements = data.initial_measurements
                ? Object.fromEntries(
                      Object.entries(data.initial_measurements).filter(([, value]) => value !== undefined)
                  )
                : undefined;
            const hasMeasurementValue = measurementKeys.some(
                (key) => data.initial_measurements?.[key] !== undefined
            );

            const payload: CustomerProfileCreateInput = {
                ...data,
                initial_measurements:
                    hasMeasurementValue && initialMeasurements && Object.keys(initialMeasurements).length > 0
                        ? initialMeasurements
                        : undefined,
            };

            const response = await fetch("/api/v1/customers", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error(await getErrorMessage(response, "Lỗi khi tạo khách hàng"));
            }

            const customer = await response.json();
            // Redirect to customer detail page
            router.push(`/owner/customers/${customer.id}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Đã xảy ra lỗi");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Error Alert */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex">
                        <svg
                            className="h-5 w-5 text-red-400 mr-2"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                        >
                            <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                clipRule="evenodd"
                            />
                        </svg>
                        <p className="text-red-800">{error}</p>
                    </div>
                </div>
            )}

            {/* Basic Information Section */}
            <div className="bg-white rounded-2xl shadow-xl border border-indigo-100 p-6">
                <h2 className="text-2xl font-serif font-bold text-gray-900 mb-6">
                    Thông tin cơ bản
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Full Name */}
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Họ tên <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            {...register("full_name")}
                            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                                errors.full_name ? "border-red-500" : "border-gray-300"
                            }`}
                            placeholder="Nguyễn Văn A"
                        />
                        {errors.full_name && (
                            <p className="mt-1 text-sm text-red-600">
                                {errors.full_name.message}
                            </p>
                        )}
                    </div>

                    {/* Phone */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Số điện thoại <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="tel"
                            {...register("phone")}
                            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                                errors.phone ? "border-red-500" : "border-gray-300"
                            }`}
                            placeholder="0901234567"
                        />
                        {errors.phone && (
                            <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                        )}
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email
                        </label>
                        <input
                            type="email"
                            {...register("email")}
                            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                                errors.email ? "border-red-500" : "border-gray-300"
                            }`}
                            placeholder="email@example.com"
                        />
                        {errors.email && (
                            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                        )}
                    </div>

                    {/* Date of Birth */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Ngày sinh
                        </label>
                        <input
                            type="date"
                            {...register("date_of_birth")}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>

                    {/* Gender */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Giới tính
                        </label>
                        <select
                            {...register("gender")}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="">-- Chọn giới tính --</option>
                            <option value="Nam">Nam</option>
                            <option value="Nữ">Nữ</option>
                            <option value="Khác">Khác</option>
                        </select>
                    </div>

                    {/* Address */}
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Địa chỉ
                        </label>
                        <textarea
                            {...register("address")}
                            rows={2}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="123 Đường ABC, Quận XYZ, TP.HCM"
                        />
                    </div>

                    {/* Notes */}
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Ghi chú
                        </label>
                        <textarea
                            {...register("notes")}
                            rows={3}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Khách hàng VIP, ưu tiên..."
                        />
                    </div>

                    {/* Create Account Checkbox */}
                    {email && email.length > 0 && (
                        <div className="md:col-span-2">
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    {...register("create_account")}
                                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                />
                                <span className="ml-2 text-sm text-gray-700">
                                    Tạo tài khoản cho khách hàng (gửi email mời)
                                </span>
                            </label>
                            {createAccount && (
                                <p className="mt-1 text-sm text-amber-600">
                                    Email mời đăng nhập sẽ được gửi đến {email}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Measurements Section (Optional) */}
            <div className="bg-white rounded-2xl shadow-xl border border-indigo-100 p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-serif font-bold text-gray-900">
                        Số đo (tùy chọn)
                    </h2>
                    <button
                        type="button"
                        onClick={() => setShowMeasurements(!showMeasurements)}
                        className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                    >
                        {showMeasurements ? "Ẩn" : "Thêm số đo"}
                    </button>
                </div>

                {showMeasurements && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Neck */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Vòng cổ (cm)
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                {...register("initial_measurements.neck", {
                                    valueAsNumber: true,
                                })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="38.5"
                            />
                            {errors.initial_measurements?.neck && (
                                <p className="mt-1 text-sm text-red-600">
                                    {errors.initial_measurements.neck.message}
                                </p>
                            )}
                        </div>

                        {/* Shoulder Width */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Rộng vai (cm)
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                {...register("initial_measurements.shoulder_width", {
                                    valueAsNumber: true,
                                })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="42.0"
                            />
                        </div>

                        {/* Bust */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Vòng ngực (cm)
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                {...register("initial_measurements.bust", {
                                    valueAsNumber: true,
                                })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="90.0"
                            />
                        </div>

                        {/* Waist */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Vòng eo (cm)
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                {...register("initial_measurements.waist", {
                                    valueAsNumber: true,
                                })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="70.0"
                            />
                        </div>

                        {/* Hip */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Vòng mông (cm)
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                {...register("initial_measurements.hip", {
                                    valueAsNumber: true,
                                })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="95.0"
                            />
                        </div>

                        {/* Top Length */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Dài áo (cm)
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                {...register("initial_measurements.top_length", {
                                    valueAsNumber: true,
                                })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="70.0"
                            />
                        </div>

                        {/* Ha Eo */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Hạ eo (cm)
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                {...register("initial_measurements.ha_eo", {
                                    valueAsNumber: true,
                                })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="38.0"
                            />
                            {errors.initial_measurements?.ha_eo && (
                                <p className="mt-1 text-sm text-red-600">
                                    {errors.initial_measurements.ha_eo.message}
                                </p>
                            )}
                        </div>

                        {/* Vong Nach */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Vòng nách (cm)
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                {...register("initial_measurements.vong_nach", {
                                    valueAsNumber: true,
                                })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="38.0"
                            />
                            {errors.initial_measurements?.vong_nach && (
                                <p className="mt-1 text-sm text-red-600">
                                    {errors.initial_measurements.vong_nach.message}
                                </p>
                            )}
                        </div>

                        {/* Sleeve Length */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Dài tay áo (cm)
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                {...register("initial_measurements.sleeve_length", {
                                    valueAsNumber: true,
                                })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="55.0"
                            />
                        </div>

                        {/* Vong Bap Tay */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Vòng bắp tay (cm)
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                {...register("initial_measurements.vong_bap_tay", {
                                    valueAsNumber: true,
                                })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="28.0"
                            />
                            {errors.initial_measurements?.vong_bap_tay && (
                                <p className="mt-1 text-sm text-red-600">
                                    {errors.initial_measurements.vong_bap_tay.message}
                                </p>
                            )}
                        </div>

                        {/* Wrist */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Vòng cổ tay (cm)
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                {...register("initial_measurements.wrist", {
                                    valueAsNumber: true,
                                })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="15.0"
                            />
                        </div>

                        {/* Height */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Chiều cao (cm)
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                {...register("initial_measurements.height", {
                                    valueAsNumber: true,
                                })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="165.0"
                            />
                        </div>

                        {/* Weight */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Cân nặng (kg)
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                {...register("initial_measurements.weight", {
                                    valueAsNumber: true,
                                })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="55.0"
                            />
                        </div>

                        {/* Measurement Notes */}
                        <div className="md:col-span-3">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Ghi chú số đo
                            </label>
                            <textarea
                                {...register("initial_measurements.measurement_notes")}
                                rows={2}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="Khách thích rộng, vai cần chú ý..."
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Form Actions */}
            <div className="flex gap-4">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                    Hủy
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? "Đang lưu..." : "Tạo khách hàng"}
                </button>
            </div>
        </form>
    );
}
