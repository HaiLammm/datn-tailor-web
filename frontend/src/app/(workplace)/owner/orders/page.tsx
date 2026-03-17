import { auth } from "@/auth";
import { redirect } from "next/navigation";
import OrderBoardClient from "@/components/client/orders/OrderBoardClient";

/**
 * Owner Orders Board Page (Story 4.2)
 *
 * Server component: auth guard + role check, renders client board.
 * Auth is also enforced at (workplace)/layout.tsx level.
 */
export default async function OrdersPage() {
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
        <h1 className="text-2xl font-semibold text-[#1A1A2E]">Đơn Hàng</h1>
        <p className="text-sm text-gray-500 mt-1">
          Quản lý và theo dõi toàn bộ đơn đặt hàng
        </p>
      </div>
      <OrderBoardClient />
    </div>
  );
}
