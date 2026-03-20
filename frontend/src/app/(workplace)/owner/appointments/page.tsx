import { auth } from "@/auth";
import { redirect } from "next/navigation";
import OwnerAppointmentsClient from "@/components/client/workplace/OwnerAppointmentsClient";

/**
 * Owner Appointments Management Page
 *
 * Server component: auth guard + role check, renders client board.
 * Auth is also enforced at (workplace)/layout.tsx level.
 */
export default async function OwnerAppointmentsPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user?.role !== "Owner") {
    redirect("/");
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#1A1A2E]">Lịch Hẹn</h1>
        <p className="text-sm text-gray-500 mt-1">
          Quản lý và theo dõi lịch hẹn tư vấn của khách hàng
        </p>
      </div>
      <OwnerAppointmentsClient />
    </div>
  );
}
