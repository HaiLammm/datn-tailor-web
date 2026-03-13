"use client";

import { useState, useEffect, useCallback, useTransition, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { Garment } from "@/types/garment";
import ProductTable from "./ProductTable";
import DeleteConfirmDialog from "./DeleteConfirmDialog";
import { deleteGarment } from "@/app/actions/garment-actions";

const PAGE_SIZE = 10;

interface ProductManagementClientProps {
  initialGarments: Garment[];
  initialTotal: number;
  initialPage: number;
  initialSearch: string;
}

interface ToastState {
  message: string;
  type: "success" | "error";
  visible: boolean;
}

/**
 * ProductManagementClient - Story 2.4 AC #3, #4, #6, #7:
 * Client component xử lý search (debounce 300ms), pagination, và delete flow.
 */
export default function ProductManagementClient({
  initialGarments,
  initialTotal,
  initialPage,
  initialSearch,
}: ProductManagementClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [searchInput, setSearchInput] = useState(initialSearch);
  const [garmentToDelete, setGarmentToDelete] = useState<Garment | null>(null);
  const [garments, setGarments] = useState<Garment[]>(initialGarments);
  const [total, setTotal] = useState(initialTotal);
  const [toast, setToast] = useState<ToastState>({ message: "", type: "success", visible: false });

  // Refs to hold latest searchParams/pathname for debounce closure (M2 fix)
  const searchParamsRef = useRef(searchParams);
  const pathnameRef = useRef(pathname);
  searchParamsRef.current = searchParams;
  pathnameRef.current = pathname;

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast.visible) return;
    const timer = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3000);
    return () => clearTimeout(timer);
  }, [toast.visible]);

  // Sync garments and total when initialGarments/initialTotal changes (after server re-render)
  useEffect(() => {
    setGarments(initialGarments);
  }, [initialGarments]);

  useEffect(() => {
    setTotal(initialTotal);
  }, [initialTotal]);

  // Debounce search - 300ms (AC #7)
  // Uses refs for searchParams/pathname to avoid stale closure without re-triggering on URL changes
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParamsRef.current.toString());
      if (searchInput) {
        params.set("search", searchInput);
      } else {
        params.delete("search");
      }
      params.set("page", "1");
      startTransition(() => {
        router.replace(`${pathnameRef.current}?${params.toString()}`);
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, router, startTransition]);

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.push(`${pathname}?${params.toString()}`);
  }

  function showToast(message: string, type: "success" | "error") {
    setToast({ message, type, visible: true });
  }

  const handleDeleteConfirm = useCallback(async () => {
    if (!garmentToDelete) return;
    const result = await deleteGarment(garmentToDelete.id);
    setGarmentToDelete(null);

    if (result.success) {
      // Optimistic update: remove from local list and update total
      setGarments((prev) => prev.filter((g) => g.id !== garmentToDelete.id));
      setTotal((prev) => Math.max(0, prev - 1));
      showToast(`Đã xóa "${garmentToDelete.name}" thành công`, "success");
      // Trigger server re-render to sync (revalidatePath was called in server action)
      router.refresh();
    } else {
      showToast(`Lỗi: ${result.error ?? "Không thể xóa sản phẩm"}`, "error");
    }
  }, [garmentToDelete, router]);

  return (
    <>
      {/* Toolbar: Search + Add Button */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search input with debounce */}
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Tìm kiếm theo tên sản phẩm..."
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-stone-800 placeholder-stone-300"
            aria-label="Tìm kiếm sản phẩm"
          />
        </div>

        {/* Nút Thêm sản phẩm */}
        <Link
          href="/owner/products/new"
          className="min-h-[44px] inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-900 text-white rounded-xl font-semibold hover:bg-indigo-800 transition-colors whitespace-nowrap"
          aria-label="Thêm sản phẩm mới"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Thêm Sản Phẩm
        </Link>
      </div>

      {/* Product Table */}
      <ProductTable
        garments={garments}
        onDeleteClick={setGarmentToDelete}
      />

      {/* Pagination (AC #7: show if > 10 items) */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => goToPage(initialPage - 1)}
            disabled={initialPage <= 1}
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center px-3 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Trang trước"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => goToPage(page)}
              className={`min-h-[44px] min-w-[44px] inline-flex items-center justify-center px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                page === initialPage
                  ? "bg-indigo-900 text-white"
                  : "border border-stone-200 text-stone-600 hover:bg-stone-50"
              }`}
              aria-label={`Trang ${page}`}
              aria-current={page === initialPage ? "page" : undefined}
            >
              {page}
            </button>
          ))}

          <button
            onClick={() => goToPage(initialPage + 1)}
            disabled={initialPage >= totalPages}
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center px-3 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Trang tiếp"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      {/* Delete Confirm Dialog */}
      {garmentToDelete && (
        <DeleteConfirmDialog
          garment={garmentToDelete}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setGarmentToDelete(null)}
        />
      )}

      {/* Micro-toast notification (pattern từ InventoryList) */}
      {toast.visible && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-2xl text-sm font-medium animate-in fade-in slide-in-from-bottom-4 duration-300 ${
            toast.type === "success" ? "bg-indigo-900 text-white" : "bg-red-700 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}
    </>
  );
}
