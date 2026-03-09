"use client";

/**
 * GarmentCard component - Story 5.1
 * Product card displaying garment information with image, name, price, sizes, status
 * Heritage Palette: Indigo #1A2B4C, Silk Ivory #F9F7F2, Heritage Gold #D4AF37
 */

import Image from "next/image";
import { Garment } from "@/types/garment";
import { StatusBadge } from "./StatusBadge";

interface GarmentCardProps {
  garment: Garment;
}

export function GarmentCard({ garment }: GarmentCardProps) {
  const priceFormatted = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(parseFloat(garment.rental_price));

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300 border border-gray-200">
      {/* Image */}
      <div className="relative h-64 bg-gray-100">
        {garment.image_url ? (
          <Image
            src={garment.image_url}
            alt={garment.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#F9F7F2]">
            <span className="text-gray-400 text-sm">Chưa có hình ảnh</span>
          </div>
        )}
        {/* Status Badge Overlay */}
        <div className="absolute top-2 right-2">
          <StatusBadge status={garment.status} />
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Name */}
        <h3
          className="text-xl font-bold text-[#1A2B4C] mb-2 line-clamp-1"
          style={{ fontFamily: "Cormorant Garamond, serif" }}
        >
          {garment.name}
        </h3>

        {/* Description */}
        {garment.description && (
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
            {garment.description}
          </p>
        )}

        {/* Color & Occasion */}
        <div className="flex flex-wrap gap-2 mb-3">
          {garment.color && (
            <span className="text-xs px-2 py-1 bg-[#F9F7F2] text-gray-700 rounded">
              {garment.color}
            </span>
          )}
          {garment.occasion && (
            <span className="text-xs px-2 py-1 bg-[#FEF3C7] text-[#92400E] rounded">
              {garment.occasion.replace(/_/g, " ")}
            </span>
          )}
        </div>

        {/* Sizes */}
        <div className="mb-3">
          <p className="text-xs text-gray-500 mb-1">Kích cỡ:</p>
          <div className="flex flex-wrap gap-1">
            {garment.size_options.map((size) => (
              <span
                key={size}
                className="inline-flex items-center justify-center w-8 h-8 text-xs font-medium border border-gray-300 rounded"
              >
                {size}
              </span>
            ))}
          </div>
        </div>

        {/* Price */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-200">
          <div>
            <p className="text-xs text-gray-500">Giá thuê</p>
            <p className="text-lg font-bold text-[#D4AF37]">{priceFormatted}</p>
          </div>
          <button
            className="px-4 py-2 bg-[#1A2B4C] text-white text-sm font-medium rounded hover:bg-[#2A3B5C] transition-colors min-h-[44px] min-w-[44px]"
            aria-label={`Xem chi tiết ${garment.name}`}
          >
            Xem
          </button>
        </div>
      </div>
    </div>
  );
}
