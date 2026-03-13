import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { fetchGarments } from "@/app/actions/garment-actions";
import ProductManagementClient from "@/components/client/products/ProductManagementClient";

const PAGE_SIZE = 10;

interface ProductsPageProps {
  searchParams: Promise<{ page?: string; search?: string }>;
}

/**
 * Owner Products Management Page - Story 2.4: Dashboard Owner CRUD Sản Phẩm Áo Dài.
 * Server Component: fetch dữ liệu ban đầu, pass xuống client component.
 */
export default async function OwnerProductsPage({ searchParams }: ProductsPageProps) {
  const session = await auth();

  // RBAC
  if (!session) {
    redirect("/login");
  }
  if (session.user?.role !== "Owner") {
    redirect("/");
  }

  const params = await searchParams;
  const currentPage = Math.max(1, parseInt(params.page ?? "1", 10));
  const searchQuery = params.search ?? "";

  // Fetch dữ liệu ban đầu (SSR)
  const response = await fetchGarments({
    page: currentPage,
    page_size: PAGE_SIZE,
    name: searchQuery || null,
  });

  const garments = response?.data?.items ?? [];
  const total = response?.data?.total ?? 0;

  return (
    <div className="min-h-screen bg-[#F9F7F2]">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <Link
            href="/owner"
            className="inline-flex items-center text-stone-500 hover:text-indigo-900 transition-colors mb-4"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-1"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span className="text-sm font-medium">Quay lại Dashboard</span>
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-serif font-bold text-indigo-950 mb-1">
                Quản lý Sản Phẩm
              </h1>
              <p className="text-stone-500 text-sm">
                Thêm, sửa, xóa áo dài trong danh mục tiệm
              </p>
            </div>

            <div className="bg-white px-4 py-2 rounded-lg border border-stone-200 shadow-sm">
              <span className="text-xs text-stone-400 block uppercase tracking-tighter font-bold">
                Tổng sản phẩm
              </span>
              <span className="text-2xl font-mono font-bold text-indigo-900">
                {total.toString().padStart(2, "0")}
              </span>
            </div>
          </div>
        </header>

        {/* Client component xử lý interactivity */}
        <ProductManagementClient
          initialGarments={garments}
          initialTotal={total}
          initialPage={currentPage}
          initialSearch={searchQuery}
        />
      </div>

      <div className="h-20" />
    </div>
  );
}
