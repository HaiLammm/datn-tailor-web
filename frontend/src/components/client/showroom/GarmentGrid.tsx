"use client";

/**
 * GarmentGrid component - Story 5.1 + Voucher Discount Preview
 * Responsive grid layout for garment cards
 * Mobile-first: 1 column on mobile, 2 on tablet, 3 on desktop
 */

import { Garment } from "@/types/garment";
import { GarmentCard } from "./GarmentCard";
import type { VoucherItem } from "@/types/voucher";

interface GarmentGridProps {
  garments: Garment[];
  bestVouchers?: { percent?: VoucherItem; fixed?: VoucherItem };
}

export function GarmentGrid({ garments, bestVouchers }: GarmentGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {garments.map((garment) => (
        <GarmentCard key={garment.id} garment={garment} bestVouchers={bestVouchers} />
      ))}
    </div>
  );
}
