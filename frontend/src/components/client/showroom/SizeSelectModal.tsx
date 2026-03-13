"use client";

/**
 * SizeSelectModal - Story 3.1: Cart State Management
 * Modal for selecting garment size for purchase.
 */

import { useState, useEffect } from "react";
import type { Garment } from "@/types/garment";
import { useCartStore } from "@/store/cartStore";
import { formatPrice, parsePrice } from "@/utils/format";
import { useFocusTrap } from "@/utils/useFocusTrap";
import type { CartItem } from "@/types/cart";

interface SizeSelectModalProps {
  garment: Garment;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function SizeSelectModal({ garment, isOpen, onClose, onSuccess }: SizeSelectModalProps) {
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [sizeError, setSizeError] = useState("");
  const addItem = useCartStore((state) => state.addItem);
  const focusTrapRef = useFocusTrap(isOpen);

  // M2: Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const salePrice = parsePrice(garment.sale_price);

  const handleSubmit = () => {
    if (!selectedSize) {
      setSizeError("Vui lòng chọn kích cỡ");
      return;
    }

    const cartItem: CartItem = {
      id: crypto.randomUUID(),
      garment_id: garment.id,
      garment_name: garment.name,
      image_url: garment.image_url ?? "",
      transaction_type: "buy",
      size: selectedSize,
      unit_price: salePrice,
      total_price: salePrice,
    };

    addItem(cartItem);
    onSuccess();
    onClose();
    setSelectedSize("");
    setSizeError("");
  };

  const handleClose = () => {
    setSelectedSize("");
    setSizeError("");
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-50"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-label="Chọn kích cỡ"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div ref={focusTrapRef} className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[#1A2B4C]" style={{ fontFamily: "Cormorant Garamond, serif" }}>
              Chọn kích cỡ
            </h3>
            <button
              onClick={handleClose}
              aria-label="Đóng"
              className="p-2 text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p className="text-sm text-gray-600 mb-1">{garment.name}</p>
          {garment.sale_price && (
            <p className="text-lg font-bold text-[#D4AF37] mb-4">
              {formatPrice(salePrice)}
            </p>
          )}

          {/* Size options */}
          <div>
            <p className="text-sm font-medium text-[#1A2B4C] mb-2">Kích cỡ có sẵn</p>
            <div
              role="radiogroup"
              aria-label="Chọn kích cỡ"
              className="flex flex-wrap gap-2"
            >
              {garment.size_options.map((size) => (
                <label key={size} className="cursor-pointer">
                  <input
                    type="radio"
                    name="size"
                    value={size}
                    checked={selectedSize === size}
                    onChange={() => {
                      setSelectedSize(size);
                      setSizeError("");
                    }}
                    className="sr-only"
                  />
                  <span
                    className={`inline-flex items-center justify-center w-12 h-12 border-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedSize === size
                        ? "border-[#D4AF37] bg-amber-50 text-[#1A2B4C]"
                        : "border-gray-200 text-gray-700 hover:border-[#D4AF37]"
                    }`}
                  >
                    {size}
                  </span>
                </label>
              ))}
            </div>
            {sizeError && (
              <p className="text-xs text-red-500 mt-2" role="alert">{sizeError}</p>
            )}
          </div>

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={handleClose}
              className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors min-h-[44px]"
            >
              Huỷ
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 py-2 px-4 bg-[#D4AF37] text-white rounded-lg text-sm font-semibold hover:bg-amber-600 transition-colors min-h-[44px]"
            >
              Thêm vào Giỏ
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
