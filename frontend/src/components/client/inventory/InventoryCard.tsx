"use client";

import { useState } from "react";
import Image from "next/image";
import { Garment, GarmentStatus } from "@/types/garment";
import { StatusBadge } from "@/components/client/showroom/StatusBadge";
import StatusUpdatePanel from "./StatusUpdatePanel";

interface InventoryCardProps {
    garment: Garment;
    onUpdate?: (updatedGarment: Garment) => void;
}

/**
 * InventoryCard - Story 5.3: '2-Touch' Update card component.
 * Displays garment info and expands StatusUpdatePanel on tap (Touch 1).
 */
export default function InventoryCard({ garment, onUpdate }: InventoryCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const toggleExpand = () => {
        setIsExpanded(!isExpanded);
        setError(null);
    };

    const handleUpdateSuccess = (updatedGarment: Garment) => {
        setIsExpanded(false);
        onUpdate?.(updatedGarment);
    };

    const handleError = (errMsg: string) => {
        setError(errMsg);
        // Auto clear error after 3 seconds
        setTimeout(() => setError(null), 3000);
    };

    const formattedDate = garment.expected_return_date
        ? new Date(garment.expected_return_date).toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        })
        : null;

    return (
        <div
            className={`
        bg-white rounded-xl shadow-sm border transition-all duration-300 overflow-hidden
        ${isExpanded ? "ring-2 ring-indigo-900 border-indigo-200 shadow-md" : "border-stone-200 hover:border-stone-300"}
      `}
        >
            {/* Touch 1: Main info area */}
            <div
                onClick={toggleExpand}
                className="p-4 flex items-start gap-4 cursor-pointer active:bg-stone-50 touch-manipulation"
            >
                <div className="relative w-20 h-28 flex-shrink-0 bg-stone-100 rounded-md overflow-hidden border border-stone-200 shadow-sm">
                    {garment.image_url ? (
                        <Image
                            src={garment.image_url}
                            alt={garment.name}
                            fill
                            className="object-cover"
                            sizes="80px"
                            priority={isExpanded}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-stone-400">
                            <span className="text-xs">No Img</span>
                        </div>
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                        <h3 className="font-serif text-lg text-indigo-950 truncate leading-tight">
                            {garment.name}
                        </h3>
                        <StatusBadge status={garment.status as GarmentStatus} />
                    </div>

                    <p className="text-xs text-stone-500 mb-2 truncate">
                        {garment.category.replace(/_/g, " ").toUpperCase()}
                    </p>

                    <div className="space-y-1">
                        {garment.status === GarmentStatus.RENTED && formattedDate && (
                            <p className="text-[11px] font-medium text-amber-800 flex items-center bg-amber-50 px-2 py-0.5 rounded-full w-fit">
                                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mr-1.5 animate-pulse" />
                                Trả đồ: {formattedDate}
                            </p>
                        )}

                        {(garment.status === GarmentStatus.RENTED || garment.status === GarmentStatus.MAINTENANCE) && garment.days_until_available !== null && (
                            <p className={`text-[11px] font-medium ${garment.is_overdue ? "text-red-700 font-bold" : "text-stone-600"}`}>
                                {garment.is_overdue
                                    ? `QUÁ HẠN ${Math.abs(garment.days_until_available)} NGÀY`
                                    : `Cần trong: ${garment.days_until_available} ngày`}
                            </p>
                        )}
                    </div>
                </div>

                <div className={`transition-transform duration-300 self-center ${isExpanded ? "rotate-180" : ""}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-400">
                        <path d="m6 9 6 6 6-6" />
                    </svg>
                </div>
            </div>

            {/* Touch 2 Expansion Panel */}
            {isExpanded && (
                <div className="px-4 pb-4 border-t border-stone-100 bg-white">
                    <StatusUpdatePanel
                        garment={garment}
                        onSuccess={handleUpdateSuccess}
                        onError={handleError}
                    />
                    {error && (
                        <div className="mt-2 text-[11px] text-red-600 bg-red-50 p-2 rounded border border-red-100 animate-pulse">
                            {error}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
