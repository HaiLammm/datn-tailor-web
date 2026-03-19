import { auth } from "@/auth";
import { redirect } from "next/navigation";
import ProductionBoardClient from "@/components/client/production/ProductionBoardClient";

/**
 * Owner Production Board Page (Story 5.2)
 *
 * Server component: auth guard + role check, renders production board.
 * Auth is also enforced at (workplace)/layout.tsx level.
 */
export default async function ProductionPage() {
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
        <h1 className="text-2xl font-semibold text-[#1A1A2E]">Sản Xuất</h1>
        <p className="text-sm text-gray-500 mt-1">
          Phân công và theo dõi tiến độ sản xuất
        </p>
      </div>
      <ProductionBoardClient />
    </div>
  );
}
