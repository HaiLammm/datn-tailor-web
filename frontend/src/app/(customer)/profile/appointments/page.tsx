/**
 * Profile Appointments Page — Story 4.4e (Lịch hẹn sắp tới)
 *
 * Server Component: fetches appointments via Server Action, passes data to
 * AppointmentList client component.
 * Auth guard is handled by parent profile/layout.tsx.
 */

import { getMyAppointments } from "@/app/actions/profile-actions";
import AppointmentList from "@/components/client/profile/AppointmentList";

export default async function ProfileAppointmentsPage() {
  const result = await getMyAppointments();

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 md:p-8">
      {/* Page header */}
      <div className="mb-6">
        <h2 className="text-2xl font-serif font-bold text-indigo-900">Lịch hẹn sắp tới</h2>
        <p className="text-gray-500 text-sm mt-1">
          Quản lý lịch hẹn tư vấn của bạn tại tiệm.
        </p>
      </div>

      {/* Appointment content */}
      <AppointmentList
        initialData={result.success ? (result.data ?? null) : null}
        initialError={result.success ? undefined : result.error}
      />
    </div>
  );
}
