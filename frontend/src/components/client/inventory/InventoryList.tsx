"use client";

import { useState, useEffect, useCallback } from "react";
import { Garment, GarmentStatus } from "@/types/garment";
import InventoryCard from "./InventoryCard";

/** Vietnamese status labels for micro-toast */
const STATUS_LABELS: Record<string, string> = {
    [GarmentStatus.AVAILABLE]: "Sẵn sàng",
    [GarmentStatus.RENTED]: "Đang thuê",
    [GarmentStatus.MAINTENANCE]: "Bảo trì",
};

interface ToastState {
    message: string;
    visible: boolean;
}

interface InventoryListProps {
    initialGarments: Garment[];
}

/**
 * InventoryList - Story 5.3: Grouped list of garments for inventory management.
 * Handles grouping, local state updates, and micro-toast notifications.
 */
export default function InventoryList({ initialGarments }: InventoryListProps) {
    const [garments, setGarments] = useState<Garment[]>(initialGarments);
    const [toast, setToast] = useState<ToastState>({ message: "", visible: false });

    // Auto-dismiss toast after 3 seconds
    useEffect(() => {
        if (!toast.visible) return;
        const timer = setTimeout(() => setToast({ message: "", visible: false }), 3000);
        return () => clearTimeout(timer);
    }, [toast.visible]);

    const handleUpdate = useCallback((updatedGarment: Garment) => {
        setGarments((prev) =>
            prev.map((g) => g.id === updatedGarment.id ? updatedGarment : g)
        );
        // Show micro-toast confirmation (AC #3)
        const statusLabel = STATUS_LABELS[updatedGarment.status] || updatedGarment.status;
        setToast({
            message: `Đã cập nhật: ${updatedGarment.name} → ${statusLabel}`,
            visible: true,
        });
    }, []);

    // Group by status
    const groups = [
        {
            id: GarmentStatus.RENTED,
            title: "Đang cho thuê",
            color: "text-amber-700",
            items: garments.filter((g) => g.status === GarmentStatus.RENTED),
        },
        {
            id: GarmentStatus.MAINTENANCE,
            title: "Đang bảo trì",
            color: "text-slate-700",
            items: garments.filter((g) => g.status === GarmentStatus.MAINTENANCE),
        },
        {
            id: GarmentStatus.AVAILABLE,
            title: "Sẵn sàng",
            color: "text-emerald-700",
            items: garments.filter((g) => g.status === GarmentStatus.AVAILABLE),
        },
    ];

    return (
        <>
            <div className="space-y-8 pb-20">
                {groups.map((group) => (
                    <section key={group.id} className="space-y-3">
                        <div className="flex items-center gap-3 px-1">
                            <h2 className={`font-serif text-xl ${group.color} flex-shrink-0`}>
                                {group.title}
                            </h2>
                            <div className="h-px bg-stone-200 flex-1" />
                            <span className="text-xs font-bold text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">
                                {group.items.length}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            {group.items.length > 0 ? (
                                group.items.map((garment) => (
                                    <InventoryCard
                                        key={garment.id}
                                        garment={garment}
                                        onUpdate={handleUpdate}
                                    />
                                ))
                            ) : (
                                <p className="text-sm italic text-stone-400 px-4 py-8 text-center bg-stone-50 rounded-xl border border-dashed border-stone-200">
                                    Không có sản phẩm nào
                                </p>
                            )}
                        </div>
                    </section>
                ))}
            </div>

            {/* Micro-toast notification (AC #3) */}
            {toast.visible && (
                <div
                    role="status"
                    aria-live="polite"
                    className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-indigo-900 text-white rounded-xl shadow-2xl text-sm font-medium animate-in fade-in slide-in-from-bottom-4 duration-300"
                >
                    {toast.message}
                </div>
            )}
        </>
    );
}
