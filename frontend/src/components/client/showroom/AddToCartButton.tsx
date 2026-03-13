"use client";

/**
 * AddToCartButton - Story 3.1: Cart State Management
 * Button to add garment to cart. Opens RentalDateModal (rent) or SizeSelectModal (buy).
 */

import { useState, useEffect } from "react";
import type { Garment } from "@/types/garment";
import { RentalDateModal } from "./RentalDateModal";
import { SizeSelectModal } from "./SizeSelectModal";

interface AddToCartButtonProps {
  garment: Garment;
  mode: "buy" | "rent";
  className?: string;
}

export function AddToCartButton({ garment, mode, className }: AddToCartButtonProps) {
  const [isRentModalOpen, setIsRentModalOpen] = useState(false);
  const [isSizeModalOpen, setIsSizeModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const isAvailable = garment.status === "available";
  const canBuy = garment.sale_price !== null;

  const handleClick = () => {
    if (!isAvailable) return;
    if (mode === "buy" && !canBuy) return;
    if (mode === "rent") {
      setIsRentModalOpen(true);
    } else {
      setIsSizeModalOpen(true);
    }
  };

  const handleSuccess = () => {
    const action = mode === "rent" ? "thuê" : "mua";
    setToast({ message: `Đã thêm ${garment.name} vào giỏ hàng (${action})`, type: "success" });
  };

  const label =
    mode === "rent"
      ? isAvailable ? "Thêm Thuê" : "Hết hàng"
      : isAvailable && canBuy ? "Thêm Mua" : "Không hỗ trợ mua";

  const isDisabled = !isAvailable || (mode === "buy" && !canBuy);

  return (
    <>
      <button
        onClick={handleClick}
        disabled={isDisabled}
        aria-label={`${label} ${garment.name}`}
        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed ${
          mode === "rent"
            ? "bg-[#1A2B4C] text-white hover:bg-[#2A3B5C]"
            : "bg-[#D4AF37] text-white hover:bg-amber-600"
        } ${className ?? ""}`}
      >
        {label}
      </button>

      {/* Toast notification */}
      {toast && (
        <div
          role="alert"
          className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg text-white text-sm shadow-lg transition-all ${
            toast.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {toast.message}
        </div>
      )}

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
    </>
  );
}
