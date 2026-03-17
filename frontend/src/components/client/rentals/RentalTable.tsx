"use client";

/**
 * Rental Table Component (Story 4.3)
 * Sortable table with countdown badges, overdue highlighting, and actions
 */

import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { RentalListItem, RentalListParams } from "@/types/rental";
import { CountdownBadge } from "./CountdownBadge";
import { ReturnModal } from "./ReturnModal";
import { RentalDetailDrawer } from "./RentalDetailDrawer";
import { Pagination } from "../orders/Pagination";

interface RentalTableProps {
  data: RentalListItem[];
  meta?: {
    pagination?: {
      total: number;
      page: number;
      page_size: number;
      total_pages: number;
    };
  };
  params: RentalListParams;
  onFilterChange: (params: Partial<RentalListParams>) => void;
  isLoading?: boolean;
  onRefresh?: () => Promise<void>;
}

export function RentalTable({
  data,
  meta,
  params,
  onFilterChange,
  isLoading = false,
  onRefresh,
}: RentalTableProps) {
  const [selectedRental, setSelectedRental] = useState<RentalListItem | null>(
    null
  );
  const [returnModalOpen, setReturnModalOpen] = useState(false);

  const pagination = meta?.pagination;

  const handlePageChange = (newPage: number) => {
    onFilterChange({ page: newPage });
  };

  if (isLoading && data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Tên Áo
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Khách Hàng
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Ngày Thuê
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Hạn Trả
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Trạng Thái
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Hành Động
                </th>
              </tr>
            </thead>
            <tbody>
              {[...Array(5)].map((_, i) => (
                <tr key={i} className="border-b">
                  <td className="px-6 py-4">
                    <Skeleton className="h-4 w-32" />
                  </td>
                  <td className="px-6 py-4">
                    <Skeleton className="h-4 w-24" />
                  </td>
                  <td className="px-6 py-4">
                    <Skeleton className="h-4 w-24" />
                  </td>
                  <td className="px-6 py-4">
                    <Skeleton className="h-4 w-24" />
                  </td>
                  <td className="px-6 py-4">
                    <Skeleton className="h-6 w-20" />
                  </td>
                  <td className="px-6 py-4">
                    <Skeleton className="h-8 w-16" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-600">Không có mục cho thuê nào</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Tên Áo
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Khách Hàng
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Ngày Thuê
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Hạn Trả
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Trạng Thái
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Hành Động
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((rental) => {
                const isOverdue = rental.days_remaining < 0;
                const rowClass = isOverdue ? "bg-red-50" : "";

                return (
                  <tr key={rental.order_item_id} className={`border-b hover:bg-gray-50 ${rowClass}`}>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {rental.garment_name}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      <div className="text-sm">{rental.customer_name}</div>
                      <div className="text-xs text-gray-500">
                        {rental.customer_phone}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {new Date(rental.start_date).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 font-medium">
                      {new Date(rental.end_date).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="px-6 py-4">
                      <CountdownBadge
                        daysRemaining={rental.days_remaining}
                        status={rental.rental_status}
                      />
                    </td>
                    <td className="px-6 py-4 space-x-2">
                      <button
                        onClick={() => setSelectedRental(rental)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Chi Tiết
                      </button>
                      {rental.rental_status !== "returned" && (
                        <button
                          onClick={() => {
                            setSelectedRental(rental);
                            setReturnModalOpen(true);
                          }}
                          className="text-green-600 hover:text-green-800 text-sm font-medium"
                        >
                          Nhận Trả
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.total_pages > 1 && (
          <div className="bg-gray-50 border-t px-6 py-4">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.total_pages}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>

      {/* Modals and Drawers */}
      {selectedRental && !returnModalOpen && (
        <RentalDetailDrawer
          rental={selectedRental}
          isOpen={!!selectedRental}
          onClose={() => setSelectedRental(null)}
        />
      )}

      {selectedRental && returnModalOpen && (
        <ReturnModal
          rental={selectedRental}
          isOpen={returnModalOpen}
          onClose={() => {
            setReturnModalOpen(false);
            setSelectedRental(null);
          }}
          onSuccess={() => {
            setReturnModalOpen(false);
            setSelectedRental(null);
            onRefresh?.();
          }}
        />
      )}
    </>
  );
}
