"use client";

/**
 * MeasurementGate - Story 10.2
 * Client component for bespoke measurement verification.
 * Shows measurement summary if available, or redirects to booking.
 */

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { checkMeasurement, type MeasurementCheckResult } from "@/app/actions/order-actions";
import { useCartStore } from "@/store/cartStore";

const MEASUREMENT_LABELS: Record<string, string> = {
  neck: "Vòng cổ",
  shoulder_width: "Vai",
  bust: "Ngực",
  waist: "Eo",
  hip: "Mông",
  top_length: "Dài áo",
  height: "Chiều cao",
};

export function MeasurementGate() {
  const router = useRouter();
  const setMeasurementConfirmed = useCartStore((s) => s.setMeasurementConfirmed);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<MeasurementCheckResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    startTransition(async () => {
      try {
        const data = await checkMeasurement();
        if (data === null) {
          setError("Vui lòng đăng nhập để tiếp tục đặt may.");
          return;
        }
        setResult(data);
      } catch {
        setError("Không thể kiểm tra số đo. Vui lòng thử lại.");
      } finally {
        setLoading(false);
      }
    });
  }, []);

  if (loading || isPending) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-purple-600" />
        <span className="ml-3 text-gray-600">Đang kiểm tra số đo...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-700">{error}</p>
        <button
          onClick={() => router.push("/login")}
          className="mt-4 rounded-lg bg-red-600 px-6 py-2 text-white hover:bg-red-700"
        >
          Đăng nhập
        </button>
      </div>
    );
  }

  // No measurements — redirect to booking
  if (result && !result.has_measurements) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
        <div className="mb-4 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-amber-800">
            Bạn chưa có số đo trong hệ thống
          </h2>
          <p className="mt-2 text-sm text-amber-700">
            Để đặt may, bạn cần có số đo chính xác. Vui lòng đặt lịch hẹn đo tại tiệm.
          </p>
        </div>
        <div className="flex justify-center">
          <button
            onClick={() => router.push("/booking")}
            className="rounded-lg bg-purple-600 px-6 py-3 font-medium text-white hover:bg-purple-700"
          >
            Đặt lịch hẹn đo số đo
          </button>
        </div>
      </div>
    );
  }

  // Has measurements — show summary + confirm/re-measure
  if (result && result.has_measurements && result.measurements_summary) {
    const lastUpdated = result.last_updated
      ? new Date(result.last_updated).toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : "Không rõ";

    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-6">
        <div className="mb-4 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-green-800">
            Số đo hiện có
          </h2>
          <p className="mt-1 text-sm text-green-700">
            Cập nhật gần nhất: {lastUpdated}
          </p>
        </div>

        {/* Measurement summary table */}
        <div className="mb-6 overflow-hidden rounded-lg border border-green-200 bg-white">
          <table className="w-full text-sm">
            <tbody>
              {Object.entries(MEASUREMENT_LABELS).map(([key, label]) => {
                const value = result.measurements_summary?.[key];
                return (
                  <tr key={key} className="border-b border-green-100 last:border-0">
                    <td className="px-4 py-2 font-medium text-gray-700">{label}</td>
                    <td className="px-4 py-2 text-right text-gray-900">
                      {value != null ? `${value} cm` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={() => {
              setMeasurementConfirmed(true);
              router.push("/checkout");
            }}
            className="rounded-lg bg-green-600 px-6 py-3 font-medium text-white hover:bg-green-700"
          >
            Xác nhận số đo này
          </button>
          <button
            onClick={() => router.push("/booking")}
            className="rounded-lg border border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 hover:bg-gray-50"
          >
            Yêu cầu đo lại
          </button>
        </div>
      </div>
    );
  }

  return null;
}
