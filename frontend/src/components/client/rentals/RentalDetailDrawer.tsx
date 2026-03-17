"use client";

/**
 * Rental Detail Drawer Component (Story 4.3)
 * Shows detailed information about a rental item
 */

import { useQuery } from "@tanstack/react-query";
import { fetchRentalDetail } from "@/app/actions/rental-actions";
import type { RentalListItem } from "@/types/rental";
import { Skeleton } from "@/components/ui/skeleton";

interface RentalDetailDrawerProps {
  rental: RentalListItem;
  isOpen: boolean;
  onClose: () => void;
}

export function RentalDetailDrawer({
  rental,
  isOpen,
  onClose,
}: RentalDetailDrawerProps) {
  const { data: detail, isLoading } = useQuery({
    queryKey: ["rental-detail", rental.order_item_id],
    queryFn: async () => {
      const result = await fetchRentalDetail(rental.order_item_id);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    enabled: isOpen,
  });

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-screen w-full max-w-md bg-white shadow-lg z-50 overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Chi Tiết Cho Thuê</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-4 w-32" />
            </div>
          ) : detail ? (
            <div className="space-y-6">
              {/* Garment Info */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Thông Tin Áo Dài</h3>
                {detail.image_url && (
                  <img
                    src={detail.image_url}
                    alt={detail.garment_name}
                    className="w-full h-48 object-cover rounded-lg mb-3"
                  />
                )}
                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm text-gray-600">Tên</dt>
                    <dd className="text-gray-900 font-medium">
                      {detail.garment_name}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-600">Loại</dt>
                    <dd className="text-gray-900">{detail.category}</dd>
                  </div>
                </dl>
              </div>

              {/* Customer Info */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Thông Tin Khách Hàng</h3>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm text-gray-600">Tên</dt>
                    <dd className="text-gray-900">{detail.customer_name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-600">Điện Thoại</dt>
                    <dd className="text-gray-900">{detail.customer_phone}</dd>
                  </div>
                  {detail.customer_email && (
                    <div>
                      <dt className="text-sm text-gray-600">Email</dt>
                      <dd className="text-gray-900">{detail.customer_email}</dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Rental Period */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Thời Gian Cho Thuê</h3>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm text-gray-600">Ngày Thuê</dt>
                    <dd className="text-gray-900">
                      {new Date(detail.start_date).toLocaleDateString("vi-VN")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-600">Hạn Trả</dt>
                    <dd className="text-gray-900">
                      {new Date(detail.end_date).toLocaleDateString("vi-VN")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-600">Ngày Còn Lại</dt>
                    <dd className="text-gray-900">{detail.days_remaining} ngày</dd>
                  </div>
                </dl>
              </div>

              {/* Financial Info */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Thông Tin Giá</h3>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm text-gray-600">Giá Cho Thuê/Ngày</dt>
                    <dd className="text-gray-900">
                      {parseFloat(detail.unit_price).toLocaleString("vi-VN")} VNĐ
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-600">Cọc</dt>
                    <dd className="text-gray-900">
                      {parseFloat(detail.deposit_amount).toLocaleString("vi-VN")} VNĐ
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Return History */}
              {detail.return_history && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-900 mb-2">Lịch Sử Trả</h3>
                  <dl className="space-y-2 text-sm">
                    <div>
                      <dt className="text-green-700">Tình Trạng</dt>
                      <dd className="text-green-900">
                        {detail.return_history.return_condition === "good" && "Tốt"}
                        {detail.return_history.return_condition === "damaged" && "Hư Hỏng"}
                        {detail.return_history.return_condition === "lost" && "Mất"}
                      </dd>
                    </div>
                    {detail.return_history.damage_notes && (
                      <div>
                        <dt className="text-green-700">Ghi Chú</dt>
                        <dd className="text-green-900">
                          {detail.return_history.damage_notes}
                        </dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-green-700">Ngày Trả</dt>
                      <dd className="text-green-900">
                        {new Date(
                          detail.return_history.returned_at
                        ).toLocaleDateString("vi-VN")}
                      </dd>
                    </div>
                  </dl>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-600">Không thể tải chi tiết</p>
          )}
        </div>
      </div>
    </>
  );
}
