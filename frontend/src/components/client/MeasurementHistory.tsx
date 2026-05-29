"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    CustomerWithMeasurementsResponse,
    MeasurementCreateInput,
    MeasurementResponse,
    measurementCreateSchema,
} from "@/types/customer";

type MeasurementFormValues = {
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
    measured_date?: string;
    measurement_notes?: string;
};

type NumericMeasurementField = Exclude<keyof MeasurementFormValues, "measured_date" | "measurement_notes">;

const measurementFields: Array<{
    name: NumericMeasurementField;
    label: string;
    placeholder: string;
}> = [
    { name: "neck", label: "Vòng cổ (cm)", placeholder: "38.5" },
    { name: "shoulder_width", label: "Rộng vai (cm)", placeholder: "42.0" },
    { name: "bust", label: "Vòng ngực (cm)", placeholder: "90.0" },
    { name: "waist", label: "Vòng eo (cm)", placeholder: "70.0" },
    { name: "hip", label: "Vòng mông (cm)", placeholder: "95.0" },
    { name: "top_length", label: "Dài áo (cm)", placeholder: "70.0" },
    { name: "ha_eo", label: "Hạ eo (cm)", placeholder: "38.0" },
    { name: "vong_nach", label: "Vòng nách (cm)", placeholder: "38.0" },
    { name: "sleeve_length", label: "Dài tay áo (cm)", placeholder: "55.0" },
    { name: "vong_bap_tay", label: "Vòng bắp tay (cm)", placeholder: "28.0" },
    { name: "wrist", label: "Vòng cổ tay (cm)", placeholder: "15.0" },
    { name: "height", label: "Chiều cao (cm)", placeholder: "165.0" },
    { name: "weight", label: "Cân nặng (kg)", placeholder: "55.0" },
];

interface MeasurementHistoryProps {
    customerId: string;
}

/**
 * Measurement History Component - Client Component
 * Story 1.3: Quản lý Hồ sơ & Số đo
 * 
 * Features:
 * - Display customer profile
 * - List all measurements with history
 * - Highlight default measurement
 * - Set measurement as default
 * - Add/Edit/Delete measurements
 */
export default function MeasurementHistory({ customerId }: MeasurementHistoryProps) {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [showAddMeasurement, setShowAddMeasurement] = useState(false);
    const [measurementError, setMeasurementError] = useState<string | null>(null);
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors: measurementErrors },
    } = useForm<MeasurementFormValues, undefined, MeasurementCreateInput>({
        resolver: zodResolver(measurementCreateSchema) as never,
    });

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

    // Fetch customer with measurements
    const { data, isLoading, error } = useQuery<CustomerWithMeasurementsResponse>({
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

    // Set default measurement mutation
    const setDefaultMutation = useMutation({
        mutationFn: async (measurementId: string) => {
            const response = await fetch(
                `/api/v1/customers/measurements/${measurementId}/set-default?customer_id=${customerId}`,
                {
                    method: "PATCH",
                    credentials: "include",
                }
            );

            if (!response.ok) {
                throw new Error("Lỗi khi đặt số đo mặc định");
            }

            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["customer", customerId] });
        },
    });

    // Delete measurement mutation
    const deleteMutation = useMutation({
        mutationFn: async (measurementId: string) => {
            const response = await fetch(`/api/v1/customers/measurements/${measurementId}`, {
                method: "DELETE",
                credentials: "include",
            });

            if (!response.ok) {
                throw new Error("Lỗi khi xóa số đo");
            }

            return null;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["customer", customerId] });
        },
    });

    const createMeasurementMutation = useMutation({
        mutationFn: async (data: MeasurementCreateInput) => {
            const payload = Object.fromEntries(
                Object.entries(data).filter(([, value]) => value !== undefined)
            );

            const response = await fetch(`/api/v1/customers/${customerId}/measurements`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error(await getErrorMessage(response, "Lỗi khi tạo số đo"));
            }

            return response.json();
        },
        onSuccess: () => {
            reset();
            setMeasurementError(null);
            setShowAddMeasurement(false);
            queryClient.invalidateQueries({ queryKey: ["customer", customerId] });
        },
    });

    const handleToggleMeasurementForm = () => {
        if (showAddMeasurement) {
            reset();
            setMeasurementError(null);
        }

        setShowAddMeasurement(!showAddMeasurement);
    };

    const handleCreateMeasurement = async (data: MeasurementCreateInput) => {
        setMeasurementError(null);

        const hasMeasurementValue = measurementFields.some((field) => data[field.name] !== undefined);
        if (!hasMeasurementValue) {
            setMeasurementError("Vui lòng nhập ít nhất một số đo trước khi lưu");
            return;
        }

        try {
            await createMeasurementMutation.mutateAsync(data);
        } catch (error) {
            setMeasurementError(error instanceof Error ? error.message : "Lỗi khi tạo số đo");
        }
    };

    const handleSetDefault = async (measurementId: string) => {
        if (confirm("Bạn có muốn đặt bộ số đo này làm mặc định không?")) {
            await setDefaultMutation.mutateAsync(measurementId);
        }
    };

    const handleDelete = async (measurementId: string) => {
        if (confirm("Bạn có chắc muốn xóa bộ số đo này không?")) {
            await deleteMutation.mutateAsync(measurementId);
        }
    };

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <p className="text-red-800">
                    {error instanceof Error ? error.message : "Lỗi khi tải dữ liệu"}
                </p>
                <button
                    onClick={() => router.push("/owner/customers")}
                    className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                    Quay lại danh sách
                </button>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="animate-pulse bg-white rounded-2xl shadow-xl border border-indigo-100 p-6">
                    <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
                    <div className="space-y-3">
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    </div>
                </div>
            </div>
        );
    }

    const customer = data?.customer;
    const measurements = data?.measurements || [];
    const defaultMeasurement = data?.default_measurement;

    if (!customer) {
        return null;
    }

    return (
        <div className="space-y-6">
            {/* Header with Back Button */}
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={() => router.push("/owner/customers")}
                    className="p-2 hover:bg-indigo-100 rounded-lg transition-colors"
                >
                    <svg
                        className="w-6 h-6 text-indigo-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 19l-7-7 7-7"
                        />
                    </svg>
                </button>
                <div>
                    <h1 className="text-4xl font-serif font-bold text-indigo-900">
                        {customer.full_name}
                    </h1>
                    <p className="text-gray-600">Thông tin khách hàng và số đo</p>
                </div>
            </div>

            {/* Customer Profile Section */}
            <div className="bg-white rounded-2xl shadow-xl border border-indigo-100 p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-serif font-bold text-gray-900">
                        Thông tin cơ bản
                    </h2>
                    <button
                        onClick={() => router.push(`/owner/customers/${customerId}/edit`)}
                        className="px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors font-medium"
                    >
                        Chỉnh sửa
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <p className="text-sm text-gray-500 mb-1">Số điện thoại</p>
                        <p className="text-gray-900 font-medium">{customer.phone}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 mb-1">Email</p>
                        <p className="text-gray-900 font-medium">{customer.email || "—"}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 mb-1">Giới tính</p>
                        <p className="text-gray-900 font-medium">{customer.gender || "—"}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 mb-1">Tài khoản</p>
                        {customer.has_account ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Có tài khoản
                            </span>
                        ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                Chưa có
                            </span>
                        )}
                    </div>
                    {customer.address && (
                        <div className="md:col-span-2">
                            <p className="text-sm text-gray-500 mb-1">Địa chỉ</p>
                            <p className="text-gray-900">{customer.address}</p>
                        </div>
                    )}
                    {customer.notes && (
                        <div className="md:col-span-2">
                            <p className="text-sm text-gray-500 mb-1">Ghi chú</p>
                            <p className="text-gray-900">{customer.notes}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Measurements Section */}
            <div className="bg-white rounded-2xl shadow-xl border border-indigo-100 p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-serif font-bold text-gray-900">
                        Lịch sử số đo
                    </h2>
                    <button
                        onClick={handleToggleMeasurementForm}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                    >
                        {showAddMeasurement ? "Hủy" : "Thêm số đo mới"}
                    </button>
                </div>

                {showAddMeasurement && (
                    <form
                        onSubmit={handleSubmit(handleCreateMeasurement)}
                        className="mb-6 rounded-xl border border-indigo-100 bg-indigo-50/50 p-5 space-y-5"
                    >
                        {measurementError && (
                            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                                {measurementError}
                            </div>
                        )}

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {measurementFields.map((field) => (
                                <div key={field.name}>
                                    <label className="mb-2 block text-sm font-medium text-gray-700">
                                        {field.label}
                                    </label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        {...register(field.name, { valueAsNumber: true })}
                                        className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                                        placeholder={field.placeholder}
                                    />
                                    {measurementErrors[field.name] && (
                                        <p className="mt-1 text-sm text-red-600">
                                            {measurementErrors[field.name]?.message}
                                        </p>
                                    )}
                                </div>
                            ))}

                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-700">
                                    Ngày đo
                                </label>
                                <input
                                    type="date"
                                    {...register("measured_date")}
                                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                                />
                                {measurementErrors.measured_date && (
                                    <p className="mt-1 text-sm text-red-600">
                                        {measurementErrors.measured_date.message}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700">
                                Ghi chú số đo
                            </label>
                            <textarea
                                {...register("measurement_notes")}
                                rows={3}
                                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                                placeholder="Khách thích ôm vừa, cần lưu ý phần vai..."
                            />
                            {measurementErrors.measurement_notes && (
                                <p className="mt-1 text-sm text-red-600">
                                    {measurementErrors.measurement_notes.message}
                                </p>
                            )}
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={handleToggleMeasurementForm}
                                className="rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                disabled={createMeasurementMutation.isPending}
                                className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {createMeasurementMutation.isPending ? "Đang lưu..." : "Lưu số đo"}
                            </button>
                        </div>
                    </form>
                )}

                {/* Default Measurement Card */}
                {defaultMeasurement && (
                    <div className="mb-6 p-6 bg-amber-50 border-2 border-amber-200 rounded-xl">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <svg
                                    className="w-5 h-5 text-amber-600"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                >
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                <span className="font-semibold text-amber-800">Số đo mặc định</span>
                            </div>
                            <span className="text-sm text-gray-600">
                                Ngày đo: {new Date(defaultMeasurement.measured_date).toLocaleDateString("vi-VN")}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {defaultMeasurement.neck && (
                                <div>
                                    <p className="text-xs text-gray-600">Vòng cổ</p>
                                    <p className="font-medium">{defaultMeasurement.neck} cm</p>
                                </div>
                            )}
                            {defaultMeasurement.bust && (
                                <div>
                                    <p className="text-xs text-gray-600">Vòng ngực</p>
                                    <p className="font-medium">{defaultMeasurement.bust} cm</p>
                                </div>
                            )}
                            {defaultMeasurement.waist && (
                                <div>
                                    <p className="text-xs text-gray-600">Vòng eo</p>
                                    <p className="font-medium">{defaultMeasurement.waist} cm</p>
                                </div>
                            )}
                            {defaultMeasurement.hip && (
                                <div>
                                    <p className="text-xs text-gray-600">Vòng mông</p>
                                    <p className="font-medium">{defaultMeasurement.hip} cm</p>
                                </div>
                            )}
                            {defaultMeasurement.shoulder_width && (
                                <div>
                                    <p className="text-xs text-gray-600">Rộng vai</p>
                                    <p className="font-medium">{defaultMeasurement.shoulder_width} cm</p>
                                </div>
                            )}
                            {defaultMeasurement.top_length && (
                                <div>
                                    <p className="text-xs text-gray-600">Dài áo</p>
                                    <p className="font-medium">{defaultMeasurement.top_length} cm</p>
                                </div>
                            )}
                            {defaultMeasurement.ha_eo && (
                                <div>
                                    <p className="text-xs text-gray-600">Hạ eo</p>
                                    <p className="font-medium">{defaultMeasurement.ha_eo} cm</p>
                                </div>
                            )}
                            {defaultMeasurement.vong_nach && (
                                <div>
                                    <p className="text-xs text-gray-600">Vòng nách</p>
                                    <p className="font-medium">{defaultMeasurement.vong_nach} cm</p>
                                </div>
                            )}
                            {defaultMeasurement.sleeve_length && (
                                <div>
                                    <p className="text-xs text-gray-600">Dài tay áo</p>
                                    <p className="font-medium">{defaultMeasurement.sleeve_length} cm</p>
                                </div>
                            )}
                            {defaultMeasurement.vong_bap_tay && (
                                <div>
                                    <p className="text-xs text-gray-600">Vòng bắp tay</p>
                                    <p className="font-medium">{defaultMeasurement.vong_bap_tay} cm</p>
                                </div>
                            )}
                            {defaultMeasurement.wrist && (
                                <div>
                                    <p className="text-xs text-gray-600">Vòng cổ tay</p>
                                    <p className="font-medium">{defaultMeasurement.wrist} cm</p>
                                </div>
                            )}
                            {defaultMeasurement.height && (
                                <div>
                                    <p className="text-xs text-gray-600">Chiều cao</p>
                                    <p className="font-medium">{defaultMeasurement.height} cm</p>
                                </div>
                            )}
                            {defaultMeasurement.weight && (
                                <div>
                                    <p className="text-xs text-gray-600">Cân nặng</p>
                                    <p className="font-medium">{defaultMeasurement.weight} kg</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Measurements Table */}
                {measurements.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Ngày đo
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Cổ
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Vai
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Ngực
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Eo
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Dài áo
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Hạ eo
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Nách
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Dài tay
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Bắp tay
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Cổ tay
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Trạng thái
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                        Hành động
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {measurements.map((measurement: MeasurementResponse) => (
                                    <tr key={measurement.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {new Date(measurement.measured_date).toLocaleDateString("vi-VN")}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {measurement.neck || "—"}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {measurement.shoulder_width || "—"}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {measurement.bust || "—"}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {measurement.waist || "—"}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {measurement.top_length || "—"}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {measurement.ha_eo || "—"}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {measurement.vong_nach || "—"}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {measurement.sleeve_length || "—"}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {measurement.vong_bap_tay || "—"}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {measurement.wrist || "—"}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            {measurement.is_default ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                                    Mặc định
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                    Lưu trữ
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end gap-2">
                                                {!measurement.is_default && (
                                                    <button
                                                        onClick={() => handleSetDefault(measurement.id)}
                                                        className="text-indigo-600 hover:text-indigo-900"
                                                    >
                                                        Đặt mặc định
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDelete(measurement.id)}
                                                    className="text-red-600 hover:text-red-900"
                                                >
                                                    Xóa
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <svg
                            className="mx-auto w-16 h-16 text-gray-300 mb-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                            />
                        </svg>
                        <p className="text-gray-500 text-lg">Chưa có số đo nào</p>
                        <p className="text-gray-400 text-sm mt-1">
                            Nhấn &quot;Thêm số đo mới&quot; để bắt đầu
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
