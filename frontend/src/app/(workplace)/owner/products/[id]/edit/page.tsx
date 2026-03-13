import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { fetchGarmentDetail } from "@/app/actions/garment-actions";
import ProductForm from "@/components/client/products/ProductForm";

interface EditProductPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Edit Product Page - Story 2.4 AC #2, #5:
 * Pre-fill form với dữ liệu hiện tại để sửa sản phẩm.
 */
export default async function EditProductPage({ params }: EditProductPageProps) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }
  if (session.user?.role !== "Owner") {
    redirect("/");
  }

  const { id } = await params;
  const garment = await fetchGarmentDetail(id);

  if (!garment) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#F9F7F2]">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <Link
            href="/owner/products"
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
            <span className="text-sm font-medium">Quay lại Danh sách</span>
          </Link>

          <h1 className="text-3xl font-serif font-bold text-indigo-950">
            Sửa Sản Phẩm
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            Cập nhật thông tin cho{" "}
            <span className="font-semibold text-stone-700">{garment.name}</span>
          </p>
        </header>

        {/* Form pre-filled với dữ liệu hiện tại */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
          <ProductForm garment={garment} />
        </div>
      </div>

      <div className="h-20" />
    </div>
  );
}
