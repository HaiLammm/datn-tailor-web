"use client";

import { useState } from "react";
import { Garment } from "@/types/garment";

interface DeleteConfirmDialogProps {
  garment: Garment;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

/**
 * DeleteConfirmDialog - Story 2.4 AC #3:
 * Hiển thị dialog xác nhận xóa sản phẩm bằng tiếng Việt trước khi thực hiện xóa.
 */
export default function DeleteConfirmDialog({
  garment,
  onConfirm,
  onCancel,
}: DeleteConfirmDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleConfirm() {
    setIsDeleting(true);
    try {
      await onConfirm();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Icon */}
        <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>

        <h2
          id="delete-dialog-title"
          className="text-xl font-serif font-bold text-stone-900 text-center mb-2"
        >
          Xác nhận xóa sản phẩm
        </h2>

        <p className="text-stone-600 text-center text-sm mb-6">
          Bạn có chắc chắn muốn xóa{" "}
          <span className="font-semibold text-stone-800">&quot;{garment.name}&quot;</span>?
          <br />
          <span className="text-red-600 text-xs mt-1 block">
            Hành động này không thể hoàn tác.
          </span>
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 min-h-[44px] px-4 py-2 border border-stone-200 rounded-xl text-stone-700 font-medium hover:bg-stone-50 transition-colors disabled:opacity-50"
          >
            Hủy bỏ
          </button>
          <button
            onClick={handleConfirm}
            disabled={isDeleting}
            className="flex-1 min-h-[44px] px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? "Đang xóa..." : "Xóa sản phẩm"}
          </button>
        </div>
      </div>
    </div>
  );
}
