"use client";

import type { AppointmentToday } from "@/types/kpi";

interface AppointmentsTodayCardProps {
  appointments: AppointmentToday[];
  onClick?: () => void;
}

const slotLabels: Record<string, string> = {
  morning: "Sáng",
  afternoon: "Chiều",
};

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "Chờ xác nhận", className: "bg-amber-100 text-amber-800" },
  confirmed: { label: "Đã xác nhận", className: "bg-blue-100 text-blue-800" },
  completed: { label: "Hoàn thành", className: "bg-emerald-100 text-emerald-800" },
  cancelled: { label: "Đã hủy", className: "bg-red-100 text-red-800" },
};

export default function AppointmentsTodayCard({ appointments, onClick }: AppointmentsTodayCardProps) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-lg border border-gray-200 p-4 text-left hover:shadow-md hover:border-indigo-200 transition-all w-full"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700">Lịch hẹn hôm nay</h3>
        <span className="text-lg font-semibold text-[#1A1A2E]">{appointments.length}</span>
      </div>

      {appointments.length === 0 ? (
        <p className="text-xs text-gray-400">Không có lịch hẹn hôm nay</p>
      ) : (
        <div className="space-y-2">
          {appointments.map((apt) => (
            <div
              key={apt.id}
              className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0"
            >
              <div className="min-w-0">
                <p className="text-sm text-gray-800 font-medium truncate">{apt.customer_name}</p>
                <p className="text-xs text-gray-500">{apt.customer_phone}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-gray-500">{slotLabels[apt.slot] || apt.slot}</span>
                <span
                  className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${
                    (statusConfig[apt.status] || { className: "bg-gray-100 text-gray-700" }).className
                  }`}
                >
                  {(statusConfig[apt.status] || { label: apt.status }).label}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </button>
  );
}
