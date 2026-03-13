import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import ProductForm from "@/components/client/products/ProductForm";

/**
 * New Product Page - Story 2.4 AC #1, #5:
 * Form tạo sản phẩm mới, chỉ Owner truy cập được.
 */
export default async function NewProductPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }
  if (session.user?.role !== "Owner") {
    redirect("/");
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
            Thêm Sản Phẩm Mới
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            Điền thông tin để thêm áo dài vào danh mục tiệm
          </p>
        </header>

        {/* Form */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
          <ProductForm />
        </div>
      </div>

      <div className="h-20" />
    </div>
  );
}
