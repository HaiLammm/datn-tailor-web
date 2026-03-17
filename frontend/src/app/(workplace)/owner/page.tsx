import { auth } from "@/auth";
import { redirect } from "next/navigation";
import OwnerDashboardClient from "@/components/client/dashboard/OwnerDashboardClient";

/**
 * Owner Dashboard — Morning Command Center (Story 5.1)
 *
 * Server component: handles auth guard, renders client dashboard.
 * Auth is also enforced at (workplace)/layout.tsx level.
 */
export default async function OwnerDashboard() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user?.role !== "Owner") {
    redirect("/");
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#1A1A2E]">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Xin chào, <span className="font-medium text-[#1A2B4C]">{session.user.name || session.user.email}</span>
        </p>
      </div>

      {/* KPI Dashboard */}
      <OwnerDashboardClient />
    </div>
  );
}
