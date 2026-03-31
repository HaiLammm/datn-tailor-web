"use client";

/**
 * Story 2.2: BuyRentToggle — Toggle Mua / Thuê và CTA Actions
 *
 * - Toggle switch: Mua | Thuê
 * - Khi "Thuê": hiển thị date picker ngày mượn/trả
 * - Nút "Tiến hành thanh toán" (Heritage Gold) ≥44x44px
 *   -> mode=thue: mở RentalDateModal
 *   -> mode=mua: mở SizeSelectModal
 * - Nút "Đặt lịch Bespoke" (Indigo Depth) — link to /booking
 */

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import type { Garment } from "@/types/garment";
import { RentalDateModal } from "./RentalDateModal";
import { SizeSelectModal } from "./SizeSelectModal";

type Mode = "thue" | "mua";

const formatPrice = (raw: string) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    parseFloat(raw)
  );

interface BuyRentToggleProps {
  /** Sản phẩm */
  garment: Garment;
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
  garment,
  productName,
  rentalPrice,
  salePrice,
  isAvailable,
  supportsBespoke = true,
}: BuyRentToggleProps) {
  const [mode, setMode] = useState<Mode>("thue");
  const [rentFrom, setRentFrom] = useState("");
  const [rentTo, setRentTo] = useState("");
  const [isRentModalOpen, setIsRentModalOpen] = useState(false);
  const [isSizeModalOpen, setIsSizeModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const today = new Date().toISOString().split("T")[0];

  const canBuy = salePrice !== null;

  const handleCtaClick = () => {
    if (mode === "thue") {
      setIsRentModalOpen(true);
    } else {
      setIsSizeModalOpen(true);
    }
  };

  const handleSuccess = () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    const action = mode === "thue" ? "thuê" : "mua";
    setToast(`Đã thêm ${productName} vào giỏ hàng (${action})`);
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Toast thông báo */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ backgroundColor: "#1A2B4C", fontFamily: "Inter, sans-serif" }}
        >
          {toast}
        </div>
      )}

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
        {/* Tiến hành thanh toán */}
        <button
          disabled={!isAvailable || (mode === "mua" && !canBuy)}
          onClick={handleCtaClick}
          aria-label={
            isAvailable
              ? `Tiến hành thanh toán ${productName}`
              : `${productName} hiện không có sẵn`
          }
          className="w-full min-h-[48px] px-6 py-3 rounded-lg text-white font-semibold text-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: isAvailable ? "#D4AF37" : "#9CA3AF",
            fontFamily: "Inter, sans-serif",
          }}
        >
          {isAvailable ? "Tiến hành thanh toán" : "Hết hàng"}
        </button>

        {/* Đặt lịch Bespoke — link to /booking */}
        {supportsBespoke && (
          <Link
            href="/booking"
            aria-label={`Đặt lịch tư vấn Bespoke cho ${productName}`}
            className="w-full min-h-[48px] px-6 py-3 rounded-lg text-[#F9F7F2] font-semibold text-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] focus-visible:ring-offset-2 hover:opacity-90 text-center inline-flex items-center justify-center"
            style={{
              backgroundColor: "#1A2B4C",
              fontFamily: "Inter, sans-serif",
            }}
          >
            Đặt lịch Bespoke
          </Link>
        )}
      </div>

      {/* Modals */}
      <RentalDateModal
        garment={garment}
        isOpen={isRentModalOpen}
        onClose={() => setIsRentModalOpen(false)}
        onSuccess={handleSuccess}
      />
      <SizeSelectModal
        garment={garment}
        isOpen={isSizeModalOpen}
        onClose={() => setIsSizeModalOpen(false)}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
