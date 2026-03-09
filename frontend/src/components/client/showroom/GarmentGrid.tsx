"use client";

/**
 * GarmentGrid component - Story 5.1
 * Responsive grid layout for garment cards
 * Mobile-first: 1 column on mobile, 2 on tablet, 3 on desktop
 */

import { Garment } from "@/types/garment";
import { GarmentCard } from "./GarmentCard";

interface GarmentGridProps {
  garments: Garment[];
}

export function GarmentGrid({ garments }: GarmentGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {garments.map((garment) => (
        <GarmentCard key={garment.id} garment={garment} />
      ))}
    </div>
  );
}
