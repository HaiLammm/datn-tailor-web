"use client";

import type { PaginationMeta } from "@/types/order";

interface PaginationProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
}

export default function Pagination({ meta, onPageChange }: PaginationProps) {
  const { page, total_pages, total, page_size } = meta;
  const start = (page - 1) * page_size + 1;
  const end = Math.min(page * page_size, total);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
      <p className="text-sm text-gray-600">
        Hiển thị <span className="font-medium">{start}</span>–
        <span className="font-medium">{end}</span> trong{" "}
        <span className="font-medium">{total}</span> đơn hàng
      </p>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
        >
          ‹ Trước
        </button>

        {/* Page number pills */}
        {Array.from({ length: Math.min(5, total_pages) }, (_, i) => {
          let pageNum: number;
          if (total_pages <= 5) {
            pageNum = i + 1;
          } else if (page <= 3) {
            pageNum = i + 1;
          } else if (page >= total_pages - 2) {
            pageNum = total_pages - 4 + i;
          } else {
            pageNum = page - 2 + i;
          }
          return (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={`w-8 h-8 text-sm rounded-md border transition-colors ${
                pageNum === page
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {pageNum}
            </button>
          );
        })}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= total_pages}
          className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
        >
          Sau ›
        </button>
      </div>
    </div>
  );
}
