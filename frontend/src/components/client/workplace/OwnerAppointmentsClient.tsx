"use client";

import { useCallback, useEffect, useState } from "react";
import type { AppointmentResponse, AppointmentStatus } from "@/types/booking";
import {
  fetchTenantAppointments,
  confirmAppointment,
  cancelAppointmentOwner,
} from "@/app/actions/appointment-actions";

type FilterStatus = "" | AppointmentStatus;

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  cancelled: "Đã hủy",
};

const STATUS_BADGE_CLASSES: Record<AppointmentStatus, string> = {
  pending: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  confirmed: "bg-blue-50 text-blue-700 border border-blue-200",
  cancelled: "bg-red-50 text-red-700 border border-red-200",
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getCountdown(dateStr: string): string | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const apptDate = new Date(dateStr + "T00:00:00");
  const diff = Math.floor((apptDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return null;
  if (diff === 0) return "Hôm nay";
  if (diff === 1) return "Ngày mai";
  return `Còn ${diff} ngày`;
}

export default function OwnerAppointmentsClient() {
  const [appointments, setAppointments] = useState<AppointmentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("");
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmDialogId, setConfirmDialogId] = useState<string | null>(null);
  const [cancelDialogId, setCancelDialogId] = useState<string | null>(null);

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await fetchTenantAppointments(
      statusFilter ? { status: statusFilter } : {}
    );
    if (result.success && result.data) {
      setAppointments(result.data.appointments);
    } else {
      setError(result.error || "Không thể tải danh sách lịch hẹn");
    }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleConfirm = async (id: string) => {
    setConfirmDialogId(null);
    setConfirmingId(id);
    const result = await confirmAppointment(id);
    setConfirmingId(null);
    if (result.success && result.data) {
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: result.data!.status } : a))
      );
      setToast({ type: "success", message: "Đã xác nhận lịch hẹn" });
    } else {
      setToast({ type: "error", message: result.error || "Lỗi xác nhận" });
    }
  };

  const handleCancel = async (id: string) => {
    setCancelDialogId(null);
    setCancellingId(id);
    const result = await cancelAppointmentOwner(id);
    setCancellingId(null);
    if (result.success && result.data) {
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: result.data!.status } : a))
      );
      setToast({ type: "success", message: "Đã hủy lịch hẹn" });
    } else {
      setToast({ type: "error", message: result.error || "Lỗi hủy lịch hẹn" });
    }
  };

  // Separate upcoming vs past
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = appointments.filter((a) => {
    const d = new Date(a.appointment_date + "T00:00:00");
    return d >= today && a.status !== "cancelled";
  });
  const past = appointments.filter((a) => {
    const d = new Date(a.appointment_date + "T00:00:00");
    return d < today || a.status === "cancelled";
  });

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
            toast.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Filter bar */}
      <div className="mb-6 flex flex-wrap gap-2">
        {(["", "pending", "confirmed", "cancelled"] as FilterStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              statusFilter === s
                ? "bg-[#1A2B4C] text-white border-[#1A2B4C]"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {s === "" ? "Tất cả" : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-1/3" />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700 mb-3">{error}</p>
          <button
            onClick={loadAppointments}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && appointments.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-gray-500 text-lg">Chưa có lịch hẹn nào</p>
        </div>
      )}

      {/* Appointments list */}
      {!loading && !error && appointments.length > 0 && (
        <>
          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-[#1A1A2E] mb-4">
                Lịch hẹn sắp tới ({upcoming.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcoming.map((appt) => (
                  <AppointmentCard
                    key={appt.id}
                    appointment={appt}
                    confirmingId={confirmingId}
                    cancellingId={cancellingId}
                    confirmDialogId={confirmDialogId}
                    cancelDialogId={cancelDialogId}
                    onConfirmClick={() => setConfirmDialogId(appt.id)}
                    onConfirmCancel={() => setConfirmDialogId(null)}
                    onConfirm={() => handleConfirm(appt.id)}
                    onCancelClick={() => setCancelDialogId(appt.id)}
                    onCancelCancel={() => setCancelDialogId(null)}
                    onCancel={() => handleCancel(appt.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Past */}
          {past.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-[#1A1A2E] mb-4">
                Đã qua / Đã hủy ({past.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {past.map((appt) => (
                  <AppointmentCard
                    key={appt.id}
                    appointment={appt}
                    isPast
                    confirmingId={confirmingId}
                    cancellingId={cancellingId}
                    confirmDialogId={confirmDialogId}
                    cancelDialogId={cancelDialogId}
                    onConfirmClick={() => setConfirmDialogId(appt.id)}
                    onConfirmCancel={() => setConfirmDialogId(null)}
                    onConfirm={() => handleConfirm(appt.id)}
                    onCancelClick={() => setCancelDialogId(appt.id)}
                    onCancelCancel={() => setCancelDialogId(null)}
                    onCancel={() => handleCancel(appt.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface AppointmentCardProps {
  appointment: AppointmentResponse;
  isPast?: boolean;
  confirmingId: string | null;
  cancellingId: string | null;
  confirmDialogId: string | null;
  cancelDialogId: string | null;
  onConfirmClick: () => void;
  onConfirmCancel: () => void;
  onConfirm: () => void;
  onCancelClick: () => void;
  onCancelCancel: () => void;
  onCancel: () => void;
}

function AppointmentCard({
  appointment,
  isPast,
  confirmingId,
  cancellingId,
  confirmDialogId,
  cancelDialogId,
  onConfirmClick,
  onConfirmCancel,
  onConfirm,
  onCancelClick,
  onCancelCancel,
  onCancel,
}: AppointmentCardProps) {
  const countdown = getCountdown(appointment.appointment_date);
  const isConfirming = confirmingId === appointment.id;
  const isCancelling = cancellingId === appointment.id;
  const showConfirmDialog = confirmDialogId === appointment.id;
  const showCancelDialog = cancelDialogId === appointment.id;

  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 p-5 transition-shadow hover:shadow-md ${
        isPast ? "opacity-60" : ""
      }`}
    >
      {/* Header: date + status */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-[#1A1A2E]">
            {formatDate(appointment.appointment_date)}
          </p>
          <p className="text-sm text-gray-500 mt-0.5">
            {appointment.slot === "morning" ? "Buổi Sáng" : "Buổi Chiều"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {countdown && !isPast && (
            <span className="bg-indigo-50 text-indigo-700 text-xs font-medium px-2 py-0.5 rounded-full">
              {countdown}
            </span>
          )}
          <span
            className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              STATUS_BADGE_CLASSES[appointment.status]
            }`}
          >
            {STATUS_LABELS[appointment.status]}
          </span>
        </div>
      </div>

      {/* Customer info */}
      <div className="text-sm text-gray-600 space-y-1 mb-3">
        <p>
          <span className="text-gray-400">Khách:</span>{" "}
          <span className="font-medium text-gray-800">{appointment.customer_name}</span>
        </p>
        <p>
          <span className="text-gray-400">SĐT:</span> {appointment.customer_phone}
        </p>
        <p>
          <span className="text-gray-400">Email:</span> {appointment.customer_email}
        </p>
      </div>

      {/* Special requests */}
      {appointment.special_requests && (
        <div className="bg-gray-50 rounded-lg px-3 py-2 mb-3">
          <p className="text-xs text-gray-400 mb-0.5">Yêu cầu đặc biệt</p>
          <p className="text-sm text-gray-700">{appointment.special_requests}</p>
        </div>
      )}

      {/* Action buttons */}
      {appointment.status !== "cancelled" && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
          {appointment.status === "pending" && (
            <>
              {showConfirmDialog ? (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">Xác nhận?</span>
                  <button
                    onClick={onConfirm}
                    disabled={isConfirming}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50"
                  >
                    {isConfirming ? "..." : "Có"}
                  </button>
                  <button
                    onClick={onConfirmCancel}
                    className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm"
                  >
                    Không
                  </button>
                </div>
              ) : (
                <button
                  onClick={onConfirmClick}
                  disabled={isConfirming}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
                >
                  Xác nhận
                </button>
              )}
            </>
          )}

          {showCancelDialog ? (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600">Hủy lịch hẹn?</span>
              <button
                onClick={onCancel}
                disabled={isCancelling}
                className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm disabled:opacity-50"
              >
                {isCancelling ? "..." : "Có"}
              </button>
              <button
                onClick={onCancelCancel}
                className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm"
              >
                Không
              </button>
            </div>
          ) : (
            <button
              onClick={onCancelClick}
              disabled={isCancelling}
              className="px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 text-sm font-medium disabled:opacity-50"
            >
              Hủy
            </button>
          )}
        </div>
      )}
    </div>
  );
}
