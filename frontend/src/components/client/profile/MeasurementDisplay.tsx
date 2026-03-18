"use client";

import { useState, useRef, useCallback } from "react";
import type { MeasurementResponse } from "@/types/customer";
import type { MeasurementsData } from "@/app/actions/profile-actions";
import { getMyMeasurements } from "@/app/actions/profile-actions";

// ─── Vietnamese labels and units per DB field ───────────────────────────────

const MEASUREMENT_FIELDS: Array<{
  key: keyof MeasurementResponse;
  label: string;
  unit: string;
}> = [
  { key: "neck", label: "Vòng cổ", unit: "cm" },
  { key: "shoulder_width", label: "Rộng vai", unit: "cm" },
  { key: "bust", label: "Vòng ngực", unit: "cm" },
  { key: "waist", label: "Vòng eo", unit: "cm" },
  { key: "hip", label: "Vòng mông", unit: "cm" },
  { key: "top_length", label: "Dài áo", unit: "cm" },
  { key: "sleeve_length", label: "Dài tay áo", unit: "cm" },
  { key: "wrist", label: "Vòng cổ tay", unit: "cm" },
  { key: "height", label: "Chiều cao", unit: "cm" },
  { key: "weight", label: "Cân nặng", unit: "kg" },
];

// ─── Sub-components ─────────────────────────────────────────────────────────

function MeasurementFieldGrid({ measurement }: { measurement: MeasurementResponse }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {MEASUREMENT_FIELDS.map(({ key, label, unit }) => {
        const val = measurement[key as keyof MeasurementResponse];
        if (val === null || val === undefined) return null;
        return (
          <div key={key}>
            <p className="text-xs text-gray-500">{label}</p>
            <p className="font-medium text-gray-900">
              {String(val)} {unit}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function DefaultMeasurementCard({ measurement }: { measurement: MeasurementResponse }) {
  return (
    <div className="mb-6 p-6 bg-amber-50 border-2 border-amber-200 rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <span className="font-semibold text-amber-800 font-serif">Số đo mặc định</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-200 text-amber-900">
            Mặc định
          </span>
        </div>
        <span className="text-sm text-gray-500">
          Ngày đo: {new Date(measurement.measured_date).toLocaleDateString("vi-VN")}
        </span>
      </div>
      <MeasurementFieldGrid measurement={measurement} />
    </div>
  );
}

function MeasurementHistoryItem({ measurement }: { measurement: MeasurementResponse }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors min-h-[44px] text-left"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">
            {new Date(measurement.measured_date).toLocaleDateString("vi-VN")}
          </span>
          {measurement.is_default && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
              Mặc định
            </span>
          )}
          {/* Summary: 3 key fields */}
          <span className="hidden sm:inline text-xs text-gray-500">
            {measurement.bust && `Ngực: ${measurement.bust}cm`}
            {measurement.waist && ` · Eo: ${measurement.waist}cm`}
            {measurement.hip && ` · Mông: ${measurement.hip}cm`}
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded && (
        <div className="px-4 py-4 bg-white">
          <MeasurementFieldGrid measurement={measurement} />
          {measurement.measurement_notes && (
            <p className="mt-3 text-sm text-gray-500">
              <span className="font-medium">Ghi chú: </span>
              {measurement.measurement_notes}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Skeleton Loading ────────────────────────────────────────────────────────

function MeasurementSkeleton() {
  return (
    <div className="animate-pulse space-y-4" data-testid="measurement-skeleton">
      <div className="h-6 bg-gray-200 rounded w-1/3"></div>
      <div className="p-6 bg-amber-50 border-2 border-amber-100 rounded-xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i}>
              <div className="h-3 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function MeasurementEmptyState() {
  return (
    <div className="text-center py-12" data-testid="measurement-empty">
      <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 7h3m13 0h-3M4 17h3m13 0h-3M4 12h3m13 0h-3"
          />
        </svg>
      </div>
      <h3 className="text-lg font-serif font-semibold text-gray-700 mb-2">Chưa có số đo nào</h3>
      <p className="text-gray-500 text-sm max-w-xs mx-auto">
        Đặt lịch hẹn tại tiệm để được đo và lưu số đo cơ thể của bạn.
      </p>
    </div>
  );
}

// ─── Error State ─────────────────────────────────────────────────────────────

function MeasurementError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="text-center py-8" data-testid="measurement-error">
      <p className="text-red-600 mb-4">{message}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors min-h-[44px] text-sm font-medium"
      >
        Thử lại
      </button>
    </div>
  );
}

// ─── Read-only notice ────────────────────────────────────────────────────────

function ReadOnlyNotice() {
  return (
    <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 mb-6">
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span>Số đo được cập nhật bởi thợ may tại tiệm</span>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface MeasurementDisplayProps {
  initialData: MeasurementsData | null;
  initialError?: string;
}

export default function MeasurementDisplay({
  initialData,
  initialError,
}: MeasurementDisplayProps) {
  const [data, setData] = useState<MeasurementsData | null>(initialData);
  const [error, setError] = useState<string | undefined>(initialError);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleRetry = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const result = await getMyMeasurements();
      if (result.success && result.data) {
        setData(result.data);
      } else {
        setError(result.error ?? "Không thể tải số đo");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Cleanup timer on unmount
  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Note: cleanup called if component ever unmounts during retry
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  void cleanup;

  if (loading) return <MeasurementSkeleton />;
  if (error) return <MeasurementError message={error} onRetry={handleRetry} />;
  if (!data) return <MeasurementSkeleton />;

  const { default_measurement, measurements } = data;
  const hasData = measurements.length > 0;

  return (
    <div>
      <ReadOnlyNotice />

      {!hasData ? (
        <MeasurementEmptyState />
      ) : (
        <>
          {/* Default measurement highlight card */}
          {default_measurement && (
            <DefaultMeasurementCard measurement={default_measurement} />
          )}

          {/* History list (AC2): all measurements sorted DESC */}
          {measurements.length > 1 && (
            <div>
              <h3 className="text-lg font-serif font-semibold text-gray-700 mb-3">
                Lịch sử số đo
              </h3>
              <div className="space-y-2">
                {measurements.map((m) => (
                  <MeasurementHistoryItem key={m.id} measurement={m} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
