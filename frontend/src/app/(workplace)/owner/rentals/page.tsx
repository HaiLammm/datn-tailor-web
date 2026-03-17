/**
 * Rental Management Board Page (Story 4.3)
 * Server component with auth guard → renders client-side orchestrator
 */

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { RentalBoardClient } from "@/components/client/rentals/RentalBoardClient";

export const metadata = {
  title: "Quản Lý Thuê/Mượn - Tailor",
  description: "Bảng quản trị thuê/mượn dài hạn áo dài",
};

export default async function RentalBoardPage() {
  const session = await auth();

  // Auth guard: redirect non-authenticated or non-owner users
  if (!session || session.user?.role !== "Owner") {
    redirect("/auth/login");
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Thuê/Mượn Dài Hạn</h1>
        <p className="text-gray-600 mt-2">
          Quản lý các áo dài cho thuê, theo dõi hạn trả, và xử lý trả hàng
        </p>
      </div>

      {/* Client-side orchestrator with TanStack Query */}
      <RentalBoardClient />
    </div>
  );
}
