"use client";

/**
 * OrderConfirmation - Story 3.3: Checkout Information & Payment Gateway
 * Displays order success details after a successful order creation.
 */

import { useRouter } from "next/navigation";
import { formatPrice } from "@/utils/format";
import type { OrderResponse } from "@/types/order";

interface OrderConfirmationProps {
  order: OrderResponse;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cod: "Thanh Toán Khi Nhận Hàng (COD)",
  vnpay: "VNPay",
  momo: "Ví Điện Tử MoMo",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Chờ Xác Nhận",
  confirmed: "Đã Xác Nhận",
  in_production: "Đang Sản Xuất",
  shipped: "Đang Giao",
  delivered: "Đã Giao",
  cancelled: "Đã Hủy",
};

export function OrderConfirmation({ order }: OrderConfirmationProps) {
  const router = useRouter();
  const addr = order.shipping_address;

  return (
    <div className="min-h-screen bg-[#F9F7F2]">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Celebration header */}
        <div className="text-center mb-8" data-testid="confirmation-header">
          <div className="w-20 h-20 rounded-full bg-[#059669]/10 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-10 h-10 text-[#059669]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1
            className="text-2xl md:text-3xl font-semibold text-[#1A2B4C] mb-2"
            style={{ fontFamily: "Cormorant Garamond, serif" }}
          >
            Đơn Hàng Đã Được Tạo Thành Công!
          </h1>
          <p className="text-[#6B7280] text-sm">
            Cảm ơn bạn đã đặt hàng. Chúng tôi sẽ liên hệ sớm để xác nhận.
          </p>
        </div>

        {/* Order details */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2
              className="text-lg font-semibold text-[#1A2B4C]"
              style={{ fontFamily: "Cormorant Garamond, serif" }}
            >
              Thông Tin Đơn Hàng
            </h2>
            <span
              className="px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700"
              data-testid="order-status"
            >
              {STATUS_LABELS[order.status] ?? order.status}
            </span>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-[#6B7280]">Mã đơn hàng</span>
              <span
                className="text-[#1A1A2E] font-medium font-mono text-xs truncate max-w-[200px]"
                data-testid="order-id"
              >
                {order.id}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#6B7280]">Phương thức thanh toán</span>
              <span className="text-[#1A1A2E]">
                {PAYMENT_METHOD_LABELS[order.payment_method] ??
                  order.payment_method}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#6B7280]">Người nhận</span>
              <span className="text-[#1A1A2E]">{order.customer_name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#6B7280]">Số điện thoại</span>
              <span className="text-[#1A1A2E]">{order.customer_phone}</span>
            </div>
            {addr && (
              <div className="flex flex-col gap-1">
                <span className="text-[#6B7280]">Địa chỉ giao hàng</span>
                <span className="text-[#1A1A2E] text-right">
                  {addr.address_detail}, {addr.ward}, {addr.district},{" "}
                  {addr.province}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2
            className="text-lg font-semibold text-[#1A2B4C] mb-4"
            style={{ fontFamily: "Cormorant Garamond, serif" }}
          >
            Sản Phẩm Đã Đặt
          </h2>
          <div className="space-y-3" data-testid="order-items">
            {order.items.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-sm py-2 border-b border-gray-100 last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#1A1A2E] truncate">
                    {item.garment_name}
                  </p>
                  <p className="text-xs text-[#6B7280]">
                    {item.transaction_type === "buy" ? "Mua" : "Thuê"}
                    {item.size && ` · Size ${item.size}`}
                    {item.rental_days && ` · ${item.rental_days} ngày`}
                  </p>
                </div>
                <span
                  className="text-[#1A1A2E] font-medium flex-shrink-0 ml-4"
                  style={{ fontFamily: "JetBrains Mono, monospace" }}
                >
                  {formatPrice(Number(item.total_price))}
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
            <span className="text-base font-semibold text-[#1A1A2E]">
              Tổng Cộng
            </span>
            <span
              className="text-xl font-bold text-[#D4AF37]"
              style={{ fontFamily: "JetBrains Mono, monospace" }}
              data-testid="order-total"
            >
              {formatPrice(Number(order.total_amount))}
            </span>
          </div>
        </div>

        {/* CTAs */}
        <div
          className="flex flex-col sm:flex-row gap-3"
          data-testid="cta-buttons"
        >
          <button
            onClick={() => router.push("/showroom")}
            className="flex-1 py-3 px-6 rounded-lg border-2 border-[#D4AF37] text-[#D4AF37] font-semibold text-sm hover:bg-[#D4AF37] hover:text-white transition-all duration-200 min-h-[44px]"
            data-testid="continue-shopping-btn"
          >
            Tiếp Tục Mua Sắm
          </button>
          <button
            onClick={() => router.push("/profile/orders")}
            className="flex-1 py-3 px-6 rounded-lg bg-[#1A2B4C] text-white font-semibold text-sm hover:bg-[#1A1A2E] transition-all duration-200 min-h-[44px]"
            data-testid="view-orders-btn"
          >
            Xem Đơn Hàng
          </button>
        </div>
      </div>
    </div>
  );
}
