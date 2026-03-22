"use client";

/**
 * VoucherManagementClient - Story 6.3: Voucher Creator UI
 *
 * Client component for voucher table with search, pagination,
 * toggle active, delete confirmation, and link to create/edit.
 */

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { OwnerVoucher } from "@/types/voucher";
import {
  fetchVouchers,
  toggleVoucherActive,
  deleteVoucher,
} from "@/app/actions/voucher-actions";

const PAGE_SIZE = 20;

interface VoucherManagementClientProps {
  initialVouchers: OwnerVoucher[];
  initialTotal: number;
  initialPage: number;
  initialSearch: string;
}

export default function VoucherManagementClient({
  initialVouchers,
  initialTotal,
  initialPage,
  initialSearch,
}: VoucherManagementClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [vouchers, setVouchers] = useState(initialVouchers);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const [search, setSearch] = useState(initialSearch);
  const [searchInput, setSearchInput] = useState(initialSearch);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<OwnerVoucher | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const loadVouchers = useCallback(
    async (p: number, s: string) => {
      const response = await fetchVouchers({
        page: p,
        page_size: PAGE_SIZE,
        search: s || undefined,
      });
      if (response) {
        setVouchers(response.data);
        setTotal(response.meta.total);
      }
    },
    []
  );

  const handleSearch = () => {
    setPage(1);
    setSearch(searchInput);
    startTransition(() => {
      loadVouchers(1, searchInput);
    });
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    startTransition(() => {
      loadVouchers(newPage, search);
    });
  };

  const handleToggleActive = async (voucher: OwnerVoucher) => {
    const result = await toggleVoucherActive(voucher.id);
    if (result.success && result.voucher) {
      setVouchers((prev) =>
        prev.map((v) => (v.id === voucher.id ? result.voucher! : v))
      );
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);

    const result = await deleteVoucher(deleteTarget.id);
    if (result.success) {
      setVouchers((prev) => prev.filter((v) => v.id !== deleteTarget.id));
      setTotal((prev) => prev - 1);
      setDeleteTarget(null);
    } else {
      alert(result.error || "Không thể xóa voucher");
    }

    setDeleteLoading(false);
  };

  const formatValue = (voucher: OwnerVoucher) => {
    const val = parseFloat(voucher.value);
    if (voucher.type === "percent") return `${val}%`;
    return val.toLocaleString("vi-VN") + " VND";
  };

  const formatMinOrder = (voucher: OwnerVoucher) => {
    const val = parseFloat(voucher.min_order_value);
    if (val === 0) return "-";
    return val.toLocaleString("vi-VN") + " VND";
  };

  const isExpired = (voucher: OwnerVoucher) => {
    return new Date(voucher.expiry_date) < new Date();
  };

  return (
    <div>
      {/* Toolbar: Search + Create */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            placeholder="Tìm theo mã hoặc mô tả..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1 px-4 py-2.5 rounded-lg border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <button
            onClick={handleSearch}
            disabled={isPending}
            className="px-4 py-2.5 rounded-lg bg-stone-100 border border-stone-300 text-sm font-medium hover:bg-stone-200 transition-colors disabled:opacity-50"
          >
            Tìm
          </button>
        </div>

        <Link
          href="/owner/vouchers/new"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-900 text-white text-sm font-medium hover:bg-indigo-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Tạo Voucher
        </Link>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50">
                <th className="text-left px-4 py-3 font-semibold text-stone-600">Mã</th>
                <th className="text-left px-4 py-3 font-semibold text-stone-600">Loại</th>
                <th className="text-right px-4 py-3 font-semibold text-stone-600">Giá trị</th>
                <th className="text-right px-4 py-3 font-semibold text-stone-600">Đơn tối thiểu</th>
                <th className="text-left px-4 py-3 font-semibold text-stone-600">Hết hạn</th>
                <th className="text-center px-4 py-3 font-semibold text-stone-600">Trạng thái</th>
                <th className="text-center px-4 py-3 font-semibold text-stone-600">Sử dụng</th>
                <th className="text-right px-4 py-3 font-semibold text-stone-600">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {vouchers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-stone-400">
                    {search
                      ? `Không tìm thấy voucher phù hợp "${search}"`
                      : "Chưa có voucher nào. Nhấn \"Tạo Voucher\" để bắt đầu."}
                  </td>
                </tr>
              ) : (
                vouchers.map((v) => (
                  <tr key={v.id} className="border-b border-stone-100 hover:bg-stone-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-indigo-900">{v.code}</span>
                      {v.description && (
                        <p className="text-xs text-stone-400 mt-0.5 truncate max-w-[200px]">
                          {v.description}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                          v.type === "percent"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-purple-50 text-purple-700"
                        }`}
                      >
                        {v.type === "percent" ? "%" : "VND"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{formatValue(v)}</td>
                    <td className="px-4 py-3 text-right text-stone-500">{formatMinOrder(v)}</td>
                    <td className="px-4 py-3">
                      <span className={isExpired(v) ? "text-red-500" : "text-stone-600"}>
                        {new Date(v.expiry_date).toLocaleDateString("vi-VN")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isExpired(v) ? (
                        <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-stone-100 text-stone-500">
                          Hết hạn
                        </span>
                      ) : v.is_active ? (
                        <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700">
                          Hoạt động
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700">
                          Tạm dừng
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-stone-500">
                      {v.used_count}/{v.total_uses}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/owner/vouchers/${v.id}/edit`}
                          className="px-2 py-1 text-xs text-indigo-700 hover:bg-indigo-50 rounded transition-colors"
                        >
                          Sửa
                        </Link>
                        <button
                          onClick={() => handleToggleActive(v)}
                          className="px-2 py-1 text-xs text-amber-700 hover:bg-amber-50 rounded transition-colors"
                        >
                          {v.is_active ? "Tạm dừng" : "Kích hoạt"}
                        </button>
                        {v.used_count === 0 && (
                          <button
                            onClick={() => setDeleteTarget(v)}
                            className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            Xóa
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-stone-200">
            <p className="text-sm text-stone-500">
              Trang {page}/{totalPages} ({total} voucher)
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1 || isPending}
                className="px-3 py-1.5 text-sm rounded border border-stone-300 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Trước
              </button>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages || isPending}
                className="px-3 py-1.5 text-sm rounded border border-stone-300 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirm Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-serif font-bold text-indigo-950 mb-2">
              Xác nhận xóa voucher
            </h3>
            <p className="text-sm text-stone-600 mb-4">
              Bạn có chắc muốn xóa voucher{" "}
              <span className="font-mono font-bold text-indigo-900">{deleteTarget.code}</span>?
              Hành động này không thể hoàn tác.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleteLoading}
                className="px-4 py-2 text-sm rounded-lg border border-stone-300 hover:bg-stone-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleteLoading ? "Đang xóa..." : "Xóa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
