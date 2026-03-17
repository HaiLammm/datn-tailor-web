import { auth } from "@/auth";
import { redirect } from "next/navigation";
import TailorDashboardClient from "@/components/client/tailor/TailorDashboardClient";

/**
 * Tailor Dashboard — Workstation Production Flow (Story 5.3)
 *
 * Server component: handles auth guard, renders client dashboard.
 * Auth is also enforced at (workplace)/layout.tsx level.
 */
export default async function TailorDashboard() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user?.role !== "Tailor" && session.user?.role !== "Owner") {
    redirect("/");
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#1A1A2E]">Công việc</h1>
        <p className="text-sm text-gray-500 mt-1">
          Xin chào,{" "}
          <span className="font-medium text-[#1A2B4C]">
            {session.user.name || session.user.email}
          </span>
        </p>
      </div>

      {/* Tailor Dashboard */}
      <TailorDashboardClient />
    </div>
  );
}
