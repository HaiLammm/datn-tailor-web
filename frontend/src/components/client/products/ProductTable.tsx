"use client";

import Image from "next/image";
import Link from "next/link";
import { Garment, GarmentStatus } from "@/types/garment";
import {
  CATEGORY_LABEL,
} from "@/components/client/showroom/garmentConstants";

interface ProductTableProps {
  garments: Garment[];
  onDeleteClick: (garment: Garment) => void;
}

/** Vietnamese status badge colors */
const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  [GarmentStatus.AVAILABLE]: {
    label: "Sẵn sàng",
    className: "bg-emerald-100 text-emerald-800",
  },
  [GarmentStatus.RENTED]: {
    label: "Đang thuê",
    className: "bg-amber-100 text-amber-800",
  },
  [GarmentStatus.MAINTENANCE]: {
    label: "Bảo trì",
    className: "bg-slate-100 text-slate-700",
  },
};

function formatPrice(price: string | null): string {
  if (!price) return "—";
  const num = parseFloat(price);
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * ProductTable - Story 2.4: Hiển thị danh sách sản phẩm dạng bảng (desktop) / card (mobile).
 * AC: #4 - cột Ảnh, Tên, Loại, Giá Thuê, Giá Bán, Trạng thái, Actions.
 */
export default function ProductTable({ garments, onDeleteClick }: ProductTableProps) {
  if (garments.length === 0) {
    return (
      <div className="text-center py-16 bg-stone-50 rounded-xl border border-dashed border-stone-200">
        <p className="text-stone-400 italic text-sm">Chưa có sản phẩm nào</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-stone-200">
        <table className="w-full text-sm" data-testid="product-table">
          <thead className="bg-stone-50 border-b border-stone-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-stone-600 w-16">Ảnh</th>
              <th className="text-left px-4 py-3 font-semibold text-stone-600">Tên sản phẩm</th>
              <th className="text-left px-4 py-3 font-semibold text-stone-600">Loại</th>
              <th className="text-right px-4 py-3 font-semibold text-stone-600">Giá thuê</th>
              <th className="text-right px-4 py-3 font-semibold text-stone-600">Giá bán</th>
              <th className="text-center px-4 py-3 font-semibold text-stone-600">Trạng thái</th>
              <th className="text-center px-4 py-3 font-semibold text-stone-600">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 bg-white">
            {garments.map((garment) => {
              const status = STATUS_CONFIG[garment.status] ?? {
                label: garment.status,
                className: "bg-gray-100 text-gray-700",
              };
              const categoryLabel = CATEGORY_LABEL[garment.category] ?? garment.category;

              return (
                <tr key={garment.id} className="hover:bg-stone-50 transition-colors">
                  {/* Ảnh thumbnail */}
                  <td className="px-4 py-3">
                    {garment.image_url ? (
                      <div className="w-12 h-12 relative rounded-lg overflow-hidden border border-stone-200 flex-shrink-0">
                        <Image
                          src={garment.image_url}
                          alt={garment.name}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center">
                        <svg className="w-5 h-5 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </td>
                  {/* Tên */}
                  <td className="px-4 py-3">
                    <span className="font-medium text-stone-800">{garment.name}</span>
                    {garment.color && (
                      <span className="text-xs text-stone-400 block">{garment.color}</span>
                    )}
                  </td>
                  {/* Loại - category badge */}
                  <td className="px-4 py-3">
                    <span className="inline-block bg-indigo-50 text-indigo-700 text-xs font-medium px-2 py-0.5 rounded-full">
                      {categoryLabel}
                    </span>
                  </td>
                  {/* Giá thuê */}
                  <td className="px-4 py-3 text-right font-mono text-stone-700">
                    {formatPrice(garment.rental_price)}
                  </td>
                  {/* Giá bán */}
                  <td className="px-4 py-3 text-right font-mono text-stone-500">
                    {formatPrice(garment.sale_price)}
                  </td>
                  {/* Trạng thái - StatusBadge */}
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block text-xs font-semibold px-2 py-1 rounded-full ${status.className}`}
                    >
                      {status.label}
                    </span>
                  </td>
                  {/* Hành động */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <Link
                        href={`/owner/products/${garment.id}/edit`}
                        className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center px-3 py-2 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                        aria-label={`Sửa ${garment.name}`}
                      >
                        Sửa
                      </Link>
                      <button
                        onClick={() => onDeleteClick(garment)}
                        className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center px-3 py-2 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                        aria-label={`Xóa ${garment.name}`}
                      >
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Layout */}
      <div className="md:hidden space-y-3" data-testid="product-cards">
        {garments.map((garment) => {
          const status = STATUS_CONFIG[garment.status] ?? {
            label: garment.status,
            className: "bg-gray-100 text-gray-700",
          };
          const categoryLabel = CATEGORY_LABEL[garment.category] ?? garment.category;

          return (
            <div
              key={garment.id}
              className="bg-white rounded-xl border border-stone-200 p-4 flex gap-3"
            >
              {/* Ảnh */}
              {garment.image_url ? (
                <div className="w-16 h-16 relative rounded-lg overflow-hidden border border-stone-200 flex-shrink-0">
                  <Image
                    src={garment.image_url}
                    alt={garment.name}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="font-semibold text-stone-800 text-sm truncate">{garment.name}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${status.className}`}>
                    {status.label}
                  </span>
                </div>
                <span className="inline-block bg-indigo-50 text-indigo-700 text-xs font-medium px-2 py-0.5 rounded-full mb-2">
                  {categoryLabel}
                </span>
                <div className="flex gap-3 text-xs text-stone-500">
                  <span>Thuê: <span className="font-mono text-stone-700">{formatPrice(garment.rental_price)}</span></span>
                  {garment.sale_price && (
                    <span>Bán: <span className="font-mono text-stone-700">{formatPrice(garment.sale_price)}</span></span>
                  )}
                </div>
              </div>

              {/* Actions (mobile) */}
              <div className="flex flex-col gap-2 flex-shrink-0">
                <Link
                  href={`/owner/products/${garment.id}/edit`}
                  className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center px-3 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                  aria-label={`Sửa ${garment.name}`}
                >
                  Sửa
                </Link>
                <button
                  onClick={() => onDeleteClick(garment)}
                  className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center px-3 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                  aria-label={`Xóa ${garment.name}`}
                >
                  Xóa
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
