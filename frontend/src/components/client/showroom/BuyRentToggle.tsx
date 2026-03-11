"use client";

/**
 * Story 2.2: BuyRentToggle — Toggle Mua / Thuê và CTA Actions
 *
 * - Toggle switch: Mua | Thuê
 * - Khi "Thuê": hiển thị date picker ngày mượn/trả
 * - Nút "Thêm vào giỏ hàng" (Heritage Gold) ≥44x44px
 * - Nút "Đặt lịch Bespoke" (Indigo Depth) — conditional (placeholder Epic 3)
 */

import { useState } from "react";

type Mode = "thue" | "mua";

const formatPrice = (raw: string) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    parseFloat(raw)
  );

interface BuyRentToggleProps {
  /** Tên sản phẩm */
  productName: string;
  /** Giá thuê (chuỗi số VND) */
  rentalPrice: string;
  /** Giá bán (chuỗi số VND hoặc null) */
  salePrice: string | null;
  /** Có sẵn sàng không */
  isAvailable: boolean;
  /** Sản phẩm có hỗ trợ Bespoke không */
  supportsBespoke?: boolean;
}

export function BuyRentToggle({
  productName,
  rentalPrice,
  salePrice,
  isAvailable,
  supportsBespoke = true,
}: BuyRentToggleProps) {
  const [mode, setMode] = useState<Mode>("thue");
  const [rentFrom, setRentFrom] = useState("");
  const [rentTo, setRentTo] = useState("");

  const today = new Date().toISOString().split("T")[0];

  const canBuy = salePrice !== null;

  return (
    <div className="flex flex-col gap-4">
      {/* Toggle Mua / Thuê */}
      <div
        role="group"
        aria-label="Chọn hình thức: Mua hoặc Thuê"
        className="flex rounded-lg overflow-hidden border border-gray-200 w-fit"
      >
        <button
          role="radio"
          aria-checked={mode === "thue"}
          onClick={() => setMode("thue")}
          className={`px-5 py-2 text-sm font-medium transition-colors min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] ${
            mode === "thue"
              ? "bg-[#1A2B4C] text-[#F9F7F2]"
              : "bg-white text-[#1A2B4C] hover:bg-gray-50"
          }`}
        >
          Thuê
        </button>
        <button
          role="radio"
          aria-checked={mode === "mua"}
          onClick={() => setMode("mua")}
          disabled={!canBuy}
          title={!canBuy ? "Sản phẩm này chỉ cho thuê" : undefined}
          className={`px-5 py-2 text-sm font-medium transition-colors min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] ${
            mode === "mua"
              ? "bg-[#1A2B4C] text-[#F9F7F2]"
              : "bg-white text-[#1A2B4C] hover:bg-gray-50"
          } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          Mua
        </button>
      </div>

      {/* Hiển thị giá theo mode */}
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1" style={{ fontFamily: "Inter, sans-serif" }}>
          {mode === "thue" ? "Giá thuê" : "Giá bán"}
        </p>
        <p
          className="text-3xl font-bold"
          style={{ color: "#D4AF37", fontFamily: "JetBrains Mono, monospace" }}
        >
          {mode === "thue"
            ? formatPrice(rentalPrice)
            : salePrice
            ? formatPrice(salePrice)
            : "—"}
        </p>
      </div>

      {/* Date Picker khi mode = Thuê */}
      {mode === "thue" && (
        <div className="flex flex-col gap-2 p-3 bg-[#F9F7F2] border border-gray-200 rounded-lg">
          <p className="text-xs font-medium text-[#1A2B4C] uppercase tracking-wide" style={{ fontFamily: "Inter, sans-serif" }}>
            Ngày thuê
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <label className="flex flex-col gap-1 flex-1">
              <span className="text-xs text-gray-500">Ngày bắt đầu</span>
              <input
                type="date"
                value={rentFrom}
                min={today}
                onChange={(e) => setRentFrom(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 text-sm text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#D4AF37] min-h-[44px]"
                aria-label="Ngày bắt đầu thuê"
              />
            </label>
            <label className="flex flex-col gap-1 flex-1">
              <span className="text-xs text-gray-500">Ngày trả</span>
              <input
                type="date"
                value={rentTo}
                min={rentFrom || today}
                onChange={(e) => setRentTo(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 text-sm text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#D4AF37] min-h-[44px]"
                aria-label="Ngày trả đồ"
              />
            </label>
          </div>
        </div>
      )}

      {/* CTA Buttons */}
      <div className="flex flex-col gap-3">
        {/* Thêm vào giỏ hàng */}
        <button
          disabled={!isAvailable || (mode === "mua" && !canBuy)}
          aria-label={
            isAvailable
              ? `Thêm ${productName} vào giỏ hàng`
              : `${productName} hiện không có sẵn`
          }
          className="w-full min-h-[48px] px-6 py-3 rounded-lg text-white font-semibold text-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: isAvailable ? "#D4AF37" : "#9CA3AF",
            fontFamily: "Inter, sans-serif",
          }}
        >
          {isAvailable ? "Thêm vào giỏ hàng" : "Hết hàng"}
        </button>

        {/* Đặt lịch Bespoke — conditional */}
        {supportsBespoke && (
          <button
            aria-label={`Đặt lịch tư vấn Bespoke cho ${productName}`}
            className="w-full min-h-[48px] px-6 py-3 rounded-lg text-[#F9F7F2] font-semibold text-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] focus-visible:ring-offset-2 hover:opacity-90"
            style={{
              backgroundColor: "#1A2B4C",
              fontFamily: "Inter, sans-serif",
            }}
          >
            Đặt lịch Bespoke
          </button>
        )}
      </div>
    </div>
  );
}
