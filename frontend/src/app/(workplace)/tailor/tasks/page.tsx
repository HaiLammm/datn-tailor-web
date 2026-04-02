import { auth } from "@/auth";
import { redirect } from "next/navigation";
import TailorTasksClient from "@/components/client/tailor/TailorTasksClient";

/**
 * Tailor Tasks Page — Filtered Task Management (Dashboard Restructure)
 *
 * Server component: handles auth guard, renders client tasks page with filters.
 * Auth is also enforced at (workplace)/layout.tsx level.
 */
export default async function TailorTasksPage() {
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
          Quản lý và theo dõi các công việc được giao
        </p>
      </div>

      {/* Tailor Tasks with Filters */}
      <TailorTasksClient />
    </div>
  );
}
