"use client";

import { useState, useCallback } from "react";
import type { AppointmentResponse } from "@/types/booking";
import type { AppointmentsData } from "@/app/actions/profile-actions";
import { getMyAppointments, cancelMyAppointment } from "@/app/actions/profile-actions";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateVN(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("vi-VN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function getCountdown(dateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const apptDate = new Date(dateStr + "T00:00:00");
  apptDate.setHours(0, 0, 0, 0);
  const diffMs = apptDate.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Hôm nay";
  if (diffDays === 1) return "Ngày mai";
  return `Còn ${diffDays} ngày`;
}

function isWithin24h(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const apptDate = new Date(dateStr + "T00:00:00");
  apptDate.setHours(0, 0, 0, 0);
  return apptDate <= today;
}

function isUpcoming(appt: AppointmentResponse): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const apptDate = new Date(appt.appointment_date + "T00:00:00");
  apptDate.setHours(0, 0, 0, 0);
  return apptDate >= today && appt.status !== "cancelled";
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: AppointmentResponse["status"] }) {
  if (status === "pending") {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">
        Chờ xác nhận
      </span>
    );
  }
  if (status === "confirmed") {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
        Đã xác nhận
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
      Đã hủy
    </span>
  );
}

function AppointmentSkeleton() {
  return (
    <div className="animate-pulse space-y-4" data-testid="appointment-skeleton">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/3"></div>
            </div>
            <div className="h-6 bg-gray-200 rounded-full w-20"></div>
          </div>
          <div className="h-3 bg-gray-200 rounded w-2/3"></div>
        </div>
      ))}
    </div>
  );
}

function AppointmentError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="text-center py-8" data-testid="appointment-error">
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

function AppointmentEmptyState() {
  return (
    <div className="text-center py-12" data-testid="appointment-empty">
      <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-serif font-semibold text-gray-700 mb-2">Chưa có lịch hẹn nào</h3>
      <p className="text-gray-500 text-sm mb-6">Đặt lịch tư vấn để được thợ may hỗ trợ trực tiếp tại tiệm.</p>
      <a
        href="/booking"
        className="inline-flex items-center bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-6 py-2.5 text-sm font-medium transition-colors min-h-[44px]"
      >
        Đặt lịch tư vấn
      </a>
    </div>
  );
}

interface AppointmentCardProps {
  appointment: AppointmentResponse;
  onCancel: (id: string) => void;
  cancellingId: string | null;
}

function AppointmentCard({ appointment, onCancel, cancellingId }: AppointmentCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const upcoming = isUpcoming(appointment);
  const within24h = isWithin24h(appointment.appointment_date);
  const canCancel = appointment.status !== "cancelled" && !within24h;
  const isCancelling = cancellingId === appointment.id;

  const slotLabel = appointment.slot === "morning" ? "Buổi Sáng" : "Buổi Chiều";
  const isPast = !upcoming;

  const handleConfirmCancel = async () => {
    setCancelError(null);
    setConfirmOpen(false);
    onCancel(appointment.id);
  };

  return (
    <div
      className={`bg-white border border-gray-200 rounded-xl p-5 transition-opacity ${isPast ? "opacity-60" : ""}`}
      data-testid="appointment-card"
    >
      {/* Header: date + status */}
      <div className="flex items-start justify-between mb-3 gap-3">
        <div>
          <p className="font-medium text-gray-900 text-sm">{formatDateVN(appointment.appointment_date)}</p>
          <p className="text-gray-500 text-xs mt-0.5">{slotLabel}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isPast && appointment.status !== "cancelled" && (
            <span className="text-xs text-gray-400 font-medium">Đã qua</span>
          )}
          <StatusBadge status={appointment.status} />
        </div>
      </div>

      {/* Countdown pill — upcoming only */}
      {upcoming && (
        <div className="mb-3">
          <span className="inline-flex items-center bg-indigo-50 text-indigo-700 text-sm font-medium px-2 py-0.5 rounded-full">
            {getCountdown(appointment.appointment_date)}
          </span>
        </div>
      )}

      {/* Special requests */}
      {appointment.special_requests && appointment.special_requests !== "" && (
        <p className="text-sm text-gray-600 mb-3">
          <span className="font-medium">Yêu cầu đặc biệt: </span>
          {appointment.special_requests}
        </p>
      )}

      {/* Cancel button — only for non-cancelled appointments */}
      {appointment.status !== "cancelled" && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          {canCancel ? (
            <>
              {!confirmOpen ? (
                <button
                  onClick={() => setConfirmOpen(true)}
                  disabled={isCancelling}
                  className="text-red-600 hover:text-red-700 border border-red-200 hover:bg-red-50 rounded-lg px-4 py-2 text-sm font-medium transition-colors min-h-[44px] disabled:opacity-50 disabled:cursor-wait"
                >
                  {isCancelling ? "Đang hủy..." : "Hủy lịch hẹn"}
                </button>
              ) : (
                <div className="flex items-center gap-3 flex-wrap">
                  <p className="text-sm text-gray-700 flex-1">Bạn có chắc muốn hủy lịch hẹn này?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleConfirmCancel}
                      className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors min-h-[44px]"
                    >
                      Xác nhận hủy
                    </button>
                    <button
                      onClick={() => setConfirmOpen(false)}
                      className="border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-lg px-4 py-2 text-sm font-medium transition-colors min-h-[44px]"
                    >
                      Giữ lịch
                    </button>
                  </div>
                </div>
              )}
              {cancelError && <p className="text-red-600 text-xs mt-2">{cancelError}</p>}
            </>
          ) : (
            <div className="relative group inline-block">
              <button
                disabled
                className="text-gray-400 border border-gray-200 cursor-not-allowed rounded-lg px-4 py-2 text-sm font-medium min-h-[44px]"
                aria-label="Không thể hủy trong vòng 24h trước giờ hẹn"
              >
                Hủy lịch hẹn
              </button>
              <span className="absolute bottom-full left-0 mb-1 w-max max-w-xs bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                Không thể hủy trong vòng 24h trước giờ hẹn
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface AppointmentListProps {
  initialData: AppointmentsData | null;
  initialError?: string;
}

export default function AppointmentList({ initialData, initialError }: AppointmentListProps) {
  const [data, setData] = useState<AppointmentsData | null>(initialData);
  const [error, setError] = useState<string | undefined>(initialError);
  const [loading, setLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelToast, setCancelToast] = useState<string | null>(null);

  const handleRetry = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const result = await getMyAppointments();
      if (result.success && result.data) {
        setData(result.data);
      } else {
        setError(result.error ?? "Không thể tải lịch hẹn");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCancel = useCallback(async (appointmentId: string) => {
    setCancellingId(appointmentId);
    setCancelToast(null);
    try {
      const result = await cancelMyAppointment(appointmentId);
      if (result.success && result.data) {
        // Update local state: replace the cancelled appointment
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            appointments: prev.appointments.map((a) =>
              a.id === appointmentId ? { ...a, status: "cancelled" as const } : a
            ),
          };
        });
        setCancelToast("Đã hủy lịch hẹn thành công");
        setTimeout(() => setCancelToast(null), 3000);
      } else {
        setCancelToast(result.error ?? "Không thể hủy lịch hẹn");
        setTimeout(() => setCancelToast(null), 4000);
      }
    } finally {
      setCancellingId(null);
    }
  }, []);

  if (loading) return <AppointmentSkeleton />;
  if (error) return <AppointmentError message={error} onRetry={handleRetry} />;
  if (!data) return <AppointmentSkeleton />;

  const appointments = data.appointments;
  const upcomingAppts = appointments.filter(isUpcoming);
  const pastAppts = appointments.filter((a) => !isUpcoming(a));

  if (appointments.length === 0) return <AppointmentEmptyState />;

  return (
    <div>
      {/* Toast notification */}
      {cancelToast && (
        <div
          className={`mb-4 p-3 rounded-lg text-sm font-medium ${
            cancelToast.includes("thành công")
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
          role="status"
          aria-live="polite"
        >
          {cancelToast}
        </div>
      )}

      {/* Upcoming appointments */}
      {upcomingAppts.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-serif font-semibold text-gray-700 mb-3">
            Lịch hẹn sắp tới
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingAppts.map((appt) => (
              <AppointmentCard
                key={appt.id}
                appointment={appt}
                onCancel={handleCancel}
                cancellingId={cancellingId}
              />
            ))}
          </div>
        </div>
      )}

      {/* Past appointments */}
      {pastAppts.length > 0 && (
        <div>
          <h3 className="text-lg font-serif font-semibold text-gray-700 mb-3">
            Lịch hẹn đã qua
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pastAppts.map((appt) => (
              <AppointmentCard
                key={appt.id}
                appointment={appt}
                onCancel={handleCancel}
                cancellingId={cancellingId}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
