/**
 * Profile Measurements Page — Story 4.4d (Số đo cơ thể)
 *
 * Server Component: fetches measurements via Server Action, passes data to
 * MeasurementDisplay client component.
 * Auth guard is handled by parent profile/layout.tsx.
 */

import { getMyMeasurements } from "@/app/actions/profile-actions";
import MeasurementDisplay from "@/components/client/profile/MeasurementDisplay";

export default async function ProfileMeasurementsPage() {
  const result = await getMyMeasurements();

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 md:p-8">
      {/* Page header */}
      <div className="mb-6">
        <h2 className="text-2xl font-serif font-bold text-indigo-900">Số đo cơ thể</h2>
        <p className="text-gray-500 text-sm mt-1">
          Thông tin số đo của bạn được lưu tại tiệm may.
        </p>
      </div>

      {/* Measurement content */}
      <MeasurementDisplay
        initialData={result.success ? (result.data ?? null) : null}
        initialError={result.success ? undefined : result.error}
      />
    </div>
  );
}
