"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CustomerWithMeasurementsResponse } from "@/types/customer";

/**
 * Schema riêng cho form chỉnh sửa khách hàng.
 * Cho phép chuỗi rỗng ở các trường tùy chọn (gender/email/date_of_birth)
 * để khớp với input HTML, rồi được lọc bỏ trước khi gửi PATCH.
 */
const customerEditSchema = z.object({
    full_name: z
        .string()
        .min(2, "Họ tên phải có ít nhất 2 ký tự")
        .max(255, "Họ tên không được quá 255 ký tự"),
    phone: z
        .string()
        .regex(/^0[0-9]{9,10}$/, "Số điện thoại không đúng định dạng (VD: 0901234567)"),
    email: z.string().email("Email không đúng định dạng").optional().or(z.literal("")),
    date_of_birth: z.string().optional().or(z.literal("")),
    gender: z.enum(["Nam", "Nữ", "Khác"]).optional().or(z.literal("")),
    address: z.string().optional().or(z.literal("")),
    notes: z.string().optional().or(z.literal("")),
});

type CustomerEditValues = z.infer<typeof customerEditSchema>;

interface CustomerEditFormProps {
    customerId: string;
}

/**
 * Customer Edit Form - Client Component
 * Story 1.3: Quản lý Hồ sơ & Số đo (AC: 10 - Chỉnh sửa thông tin khách hàng)
 *
 * - Nạp sẵn thông tin hiện tại qua GET /api/v1/customers/{id}
 * - Lưu thay đổi qua PATCH /api/v1/customers/{id}
 * - Chỉ sửa thông tin cơ bản; số đo được quản lý ở trang chi tiết
 */
export default function CustomerEditForm({ customerId }: CustomerEditFormProps) {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [error, setError] = useState<string | null>(null);
    const [accountError, setAccountError] = useState<string | null>(null);
    const [accountMsg, setAccountMsg] = useState<string | null>(null);

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

    // Nạp dữ liệu khách hàng hiện tại để điền sẵn form
    const { data, isLoading, error: loadError } = useQuery<CustomerWithMeasurementsResponse>({
        queryKey: ["customer", customerId],
        queryFn: async () => {
            const response = await fetch(`/api/v1/customers/${customerId}`, {
                credentials: "include",
            });

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error("Không tìm thấy khách hàng");
                }
                throw new Error("Lỗi khi tải thông tin khách hàng");
            }

            return response.json();
        },
    });

    const customer = data?.customer;

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<CustomerEditValues>({
        resolver: zodResolver(customerEditSchema),
        // `values` đồng bộ lại form khi dữ liệu async tải về
        values: customer
            ? {
                  full_name: customer.full_name ?? "",
                  phone: customer.phone ?? "",
                  email: customer.email ?? "",
                  date_of_birth: customer.date_of_birth ?? "",
                  gender: (customer.gender as CustomerEditValues["gender"]) ?? "",
                  address: customer.address ?? "",
                  notes: customer.notes ?? "",
              }
            : undefined,
    });

    const mutation = useMutation({
        mutationFn: async (values: CustomerEditValues) => {
            // Chỉ gửi các trường có giá trị hợp lệ.
            // email/gender/date_of_birth rỗng sẽ bị bỏ qua (backend không nhận chuỗi rỗng).
            const payload: Record<string, unknown> = {
                full_name: values.full_name,
                phone: values.phone,
                address: values.address ?? "",
                notes: values.notes ?? "",
            };
            if (values.email && values.email.trim()) payload.email = values.email.trim();
            if (values.date_of_birth && values.date_of_birth.trim())
                payload.date_of_birth = values.date_of_birth;
            if (values.gender && values.gender.trim()) payload.gender = values.gender;

            const response = await fetch(`/api/v1/customers/${customerId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error(await getErrorMessage(response, "Lỗi khi cập nhật khách hàng"));
            }

            return response.json();
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["customer", customerId] });
            router.push(`/owner/customers/${customerId}`);
        },
        onError: (err) => {
            setError(err instanceof Error ? err.message : "Đã xảy ra lỗi");
        },
    });

    const onSubmit = (values: CustomerEditValues) => {
        setError(null);
        mutation.mutate(values);
    };

    // Tạo tài khoản đăng nhập cho khách hàng đã tồn tại (dùng email đã lưu)
    const accountMutation = useMutation({
        mutationFn: async () => {
            const response = await fetch(`/api/v1/customers/${customerId}/create-account`, {
                method: "POST",
                credentials: "include",
            });

            if (!response.ok) {
                throw new Error(await getErrorMessage(response, "Lỗi khi tạo tài khoản"));
            }

            return response.json();
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["customer", customerId] });
            setAccountMsg("Đã tạo tài khoản và gửi email mời đăng nhập cho khách hàng.");
        },
        onError: (err) => {
            setAccountError(err instanceof Error ? err.message : "Đã xảy ra lỗi");
        },
    });

    const hasAccount = customer?.has_account ?? false;
    const savedEmail = customer?.email ?? "";
    // So sánh email đang nhập với email đã lưu — tạo tài khoản dùng email phía server
    const emailChanged = (watch("email") ?? "") !== savedEmail;

    const handleCreateAccount = () => {
        setAccountError(null);
        setAccountMsg(null);
        accountMutation.mutate();
    };

    if (isLoading) {
        return (
            <div className="bg-white rounded-2xl shadow-xl border border-indigo-100 p-12 text-center text-gray-500">
                Đang tải thông tin khách hàng...
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
                <p className="text-red-800">
                    {loadError instanceof Error ? loadError.message : "Không thể tải khách hàng"}
                </p>
                <button
                    onClick={() => router.push("/owner/customers")}
                    className="mt-4 px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg font-medium"
                >
                    ← Về danh sách khách hàng
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex">
                        <svg className="h-5 w-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
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

            <div className="bg-white rounded-2xl shadow-xl border border-indigo-100 p-6">
                <h2 className="text-2xl font-serif font-bold text-gray-900 mb-6">Thông tin cơ bản</h2>

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
                            <p className="mt-1 text-sm text-red-600">{errors.full_name.message}</p>
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">Ngày sinh</label>
                        <input
                            type="date"
                            {...register("date_of_birth")}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>

                    {/* Gender */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Giới tính</label>
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">Địa chỉ</label>
                        <textarea
                            {...register("address")}
                            rows={2}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="123 Đường ABC, Quận XYZ, TP.HCM"
                        />
                    </div>

                    {/* Notes */}
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Ghi chú</label>
                        <textarea
                            {...register("notes")}
                            rows={3}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Khách hàng VIP, ưu tiên..."
                        />
                    </div>
                </div>
            </div>

            {/* Account Section */}
            <div className="bg-white rounded-2xl shadow-xl border border-indigo-100 p-6">
                <h2 className="text-2xl font-serif font-bold text-gray-900 mb-4">
                    Tài khoản đăng nhập
                </h2>

                {hasAccount ? (
                    <div className="flex items-center gap-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Đã có tài khoản
                        </span>
                        <span className="text-gray-700">{savedEmail || "—"}</span>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <p className="text-gray-600 text-sm">
                            Khách hàng này chưa có tài khoản đăng nhập. Tạo tài khoản sẽ gửi email
                            mời để khách tự đặt mật khẩu và đăng nhập.
                        </p>

                        {accountMsg && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                <p className="text-green-800 text-sm">{accountMsg}</p>
                            </div>
                        )}
                        {accountError && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <p className="text-red-800 text-sm">{accountError}</p>
                            </div>
                        )}

                        {!savedEmail ? (
                            <p className="text-sm text-amber-600">
                                Khách chưa có email. Vui lòng nhập email và bấm “Lưu thay đổi” trước
                                khi tạo tài khoản.
                            </p>
                        ) : emailChanged ? (
                            <p className="text-sm text-amber-600">
                                Bạn vừa thay đổi email. Hãy bấm “Lưu thay đổi” trước, rồi tạo tài
                                khoản với email mới.
                            </p>
                        ) : (
                            <>
                                <p className="text-sm text-gray-500">
                                    Email mời đăng nhập sẽ được gửi đến {savedEmail}
                                </p>
                                <button
                                    type="button"
                                    onClick={handleCreateAccount}
                                    disabled={accountMutation.isPending}
                                    className="px-5 py-2.5 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {accountMutation.isPending
                                        ? "Đang tạo tài khoản..."
                                        : "Tạo tài khoản & gửi email mời"}
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Form Actions */}
            <div className="flex gap-4">
                <button
                    type="button"
                    onClick={() => router.push(`/owner/customers/${customerId}`)}
                    className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                    Hủy
                </button>
                <button
                    type="submit"
                    disabled={mutation.isPending}
                    className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {mutation.isPending ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
            </div>
        </form>
    );
}
