import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { fetchInventoryList } from "@/app/actions/garment-actions";
import { InventoryList } from "@/components/client/inventory";

/**
 * Inventory Management Page - Story 5.3: '2-Touch' Update.
 * Primary interface for Shop Owner to manage garment availability.
 */
export default async function InventoryPage() {
    const session = await auth();

    // Role-based Access Control (RBAC)
    if (!session) {
        redirect("/login");
    }

    if (session.user?.role !== "Owner") {
        redirect("/");
    }

    // Fetch initial data (sorted by status: Rented -> Maintenance -> Available)
    const { data: garments, total, error } = await fetchInventoryList(true);

    return (
        <div className="min-h-screen bg-[#F9F7F2]"> {/* Silk Ivory background */}
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Header with Back Navigation */}
                <header className="mb-8">
                    <Link
                        href="/owner"
                        className="inline-flex items-center text-stone-500 hover:text-indigo-900 transition-colors mb-4"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                            <path d="m15 18-6-6 6-6" />
                        </svg>
                        <span className="text-sm font-medium">Quay lại Dashboard</span>
                    </Link>

                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-serif font-bold text-indigo-950 mb-1">
                                Quản lý Kho đồ thuê
                            </h1>
                            <p className="text-stone-500 text-sm">
                                Cập nhật trạng thái "2 chạm" nhanh chóng
                            </p>
                        </div>

                        <div className="bg-white px-4 py-2 rounded-lg border border-stone-200 shadow-sm">
                            <span className="text-xs text-stone-400 block uppercase tracking-tighter font-bold">Tổng số lượng</span>
                            <span className="text-2xl font-mono font-bold text-indigo-900">
                                {total.toString().padStart(2, '0')}
                            </span>
                        </div>
                    </div>
                </header>

                {/* Inventory Content */}
                {error ? (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
                        <p className="text-red-800 font-medium mb-2">Đã xảy ra lỗi khi tải dữ liệu</p>
                        <p className="text-red-600 text-sm">{error}</p>
                    </div>
                ) : (
                    <InventoryList initialGarments={garments} />
                )}
            </div>

            {/* Mobile-first bottom spacing for easier touch access */}
            <div className="h-20" />
        </div>
    );
}
