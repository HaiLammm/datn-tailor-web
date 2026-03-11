"use client";

/**
 * Story 2.3: Pagination component for showroom product listing
 * Syncs with URL params for bookmarkability and back-button support
 */

import { useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  total: number;
}

export function Pagination({ currentPage, totalPages, total }: PaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handlePageChange = useCallback(
    (page: number) => {
      if (page < 1 || page > totalPages) return;
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", page.toString());
      router.push(`/showroom?${params.toString()}`);
    },
    [router, searchParams, totalPages],
  );

  const pageNumbers = useMemo(() => {
    const pages: (number | "before" | "after")[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("before");

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);

      if (currentPage < totalPages - 2) pages.push("after");
      pages.push(totalPages);
    }

    return pages;
  }, [currentPage, totalPages]);

  if (totalPages <= 1) return null;

  return (
    <nav
      className="flex flex-col items-center gap-3"
      role="navigation"
      aria-label="Phân trang sản phẩm"
    >
      <div className="flex items-center gap-1">
        {/* Previous button */}
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="flex items-center justify-center w-11 h-11 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors min-h-[44px] min-w-[44px]"
          aria-label="Trang trước"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Page numbers */}
        {pageNumbers.map((pageNum) =>
          typeof pageNum === "string" ? (
            <span
              key={`ellipsis-${pageNum}`}
              className="flex items-center justify-center w-11 h-11 text-gray-400"
              aria-hidden="true"
            >
              ...
            </span>
          ) : (
            <button
              key={pageNum}
              onClick={() => handlePageChange(pageNum)}
              className={`flex items-center justify-center w-11 h-11 rounded-lg text-sm font-medium transition-colors min-h-[44px] min-w-[44px]
                ${
                  pageNum === currentPage
                    ? "bg-[#1A2B4C] text-white"
                    : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                }
              `}
              aria-label={`Trang ${pageNum}`}
              aria-current={pageNum === currentPage ? "page" : undefined}
            >
              {pageNum}
            </button>
          ),
        )}

        {/* Next button */}
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="flex items-center justify-center w-11 h-11 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors min-h-[44px] min-w-[44px]"
          aria-label="Trang tiếp"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <p className="text-sm text-gray-500">
        Trang {currentPage} / {totalPages} ({total} sản phẩm)
      </p>
    </nav>
  );
}
