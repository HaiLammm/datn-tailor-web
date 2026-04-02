"use client";

import { useState, useTransition } from "react";
import { Garment, GarmentStatus } from "@/types/garment";
import { updateGarmentStatus } from "@/app/actions/garment-actions";

interface StatusUpdatePanelProps {
    garment: Garment;
    onSuccess?: (updatedGarment: Garment) => void;
    onError?: (error: string) => void;
}

/**
 * StatusUpdatePanel - Story 5.3: '2-Touch' Update component.
 * Rendered inline inside InventoryCard when expanded.
 */
export default function StatusUpdatePanel({
    garment,
    onSuccess,
    onError,
}: StatusUpdatePanelProps) {
    const [isPending, startTransition] = useTransition();
    const [pendingStatus, setPendingStatus] = useState<GarmentStatus | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string>("");
    const [renterName, setRenterName] = useState<string>("");
    const [renterEmail, setRenterEmail] = useState<string>("");
    const [emailError, setEmailError] = useState<string>("");
    const [rentalQuantity, setRentalQuantity] = useState<number>(1);

    // Map backend status to Vietnamese labels and Heritage colors
    const statusOptions = [
        {
            id: GarmentStatus.AVAILABLE,
            label: "Sẵn sàng",
            bgColor: "bg-emerald-600",
            activeBg: "bg-emerald-700",
            textColor: "text-white",
            ariaLabel: "Chuyển sang trạng thái sẵn sàng cho thuê",
        },
        {
            id: GarmentStatus.RENTED,
            label: "Đang thuê",
            bgColor: "bg-amber-500",
            activeBg: "bg-amber-600",
            textColor: "text-white",
            ariaLabel: "Chuyển sang trạng thái đang cho khách thuê",
        },
        {
            id: GarmentStatus.MAINTENANCE,
            label: "Bảo trì",
            bgColor: "bg-slate-500",
            activeBg: "bg-slate-600",
            textColor: "text-white",
            ariaLabel: "Chuyển sang trạng thái đang bảo trì hoặc sửa chữa",
        },
    ];

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const handleStatusClick = (newStatus: GarmentStatus) => {
        if (newStatus === garment.status && !showDatePicker) return;

        if (newStatus === GarmentStatus.RENTED && !showDatePicker) {
            setShowDatePicker(true);
            // Default to tomorrow
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            setSelectedDate(tomorrow.toISOString().split("T")[0]);
            setRenterName("");
            setRenterEmail("");
            setEmailError("");
            setRentalQuantity(1);
            return;
        }

        // For rented status, validate renter fields before submitting
        if (newStatus === GarmentStatus.RENTED) {
            if (!renterName.trim() || !renterEmail.trim()) return;
            if (!emailRegex.test(renterEmail.trim())) {
                setEmailError("Email không hợp lệ");
                return;
            }
            setEmailError("");
        }

        setPendingStatus(newStatus);
        startTransition(async () => {
            const result = await updateGarmentStatus(
                garment.id,
                newStatus,
                newStatus === GarmentStatus.RENTED ? selectedDate : undefined,
                newStatus === GarmentStatus.RENTED ? renterName.trim() : undefined,
                newStatus === GarmentStatus.RENTED ? renterEmail.trim() : undefined,
                newStatus === GarmentStatus.RENTED ? rentalQuantity : undefined
            );

            setPendingStatus(null);
            if (result.success && result.data) {
                setShowDatePicker(false);
                setRenterName("");
                setRenterEmail("");
                setEmailError("");
                setRentalQuantity(1);
                onSuccess?.(result.data);
            } else {
                onError?.(result.error || "Cập nhật thất bại. Vui lòng thử lại");
            }
        });
    };

    return (
        <div className="mt-4 p-4 bg-stone-50 rounded-lg border border-stone-200 animate-in fade-in slide-in-from-top-2">
            <p className="text-xs font-medium text-stone-500 mb-3 uppercase tracking-wider">
                Cập nhật trạng thái (Chạm 2)
            </p>

            <div className="flex flex-wrap gap-2">
                {statusOptions.map((opt) => (
                    <button
                        key={opt.id}
                        onClick={() => handleStatusClick(opt.id as GarmentStatus)}
                        disabled={isPending || (opt.id === garment.status && !showDatePicker)}
                        aria-label={opt.ariaLabel}
                        className={`
              flex-1 min-w-[100px] h-12 rounded-md font-medium text-sm transition-all
              active:scale-95 touch-manipulation flex items-center justify-center
              ${opt.bgColor} ${opt.textColor}
              ${opt.id === garment.status ? "ring-2 ring-offset-2 ring-stone-400 opacity-60" : "hover:brightness-110"}
              ${isPending && pendingStatus === opt.id ? "opacity-50 cursor-not-allowed" : ""}
              ${isPending && pendingStatus !== opt.id ? "opacity-70 cursor-not-allowed" : ""}
            `}
                    >
                        {isPending && pendingStatus === opt.id && !showDatePicker ? (
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                        ) : null}
                        {opt.label}
                    </button>
                ))}
            </div>

            {showDatePicker && (
                <div className="mt-4 pt-4 border-t border-stone-200 animate-in zoom-in-95">
                    <label htmlFor="return-date" className="block text-sm font-medium text-stone-700 mb-2">
                        Ngày dự kiến khách trả đồ:
                    </label>
                    <input
                        id="return-date"
                        type="date"
                        min={new Date(Date.now() + 86400000).toISOString().split("T")[0]}
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full h-12 px-3 rounded-md border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                    />

                    <label htmlFor="renter-name" className="block text-sm font-medium text-stone-700 mb-2 mt-3">
                        Tên khách thuê:
                    </label>
                    <input
                        id="renter-name"
                        type="text"
                        placeholder="Nhập tên khách thuê"
                        value={renterName}
                        onChange={(e) => setRenterName(e.target.value)}
                        className="w-full h-12 px-3 rounded-md border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                    />

                    <label htmlFor="renter-email" className="block text-sm font-medium text-stone-700 mb-2 mt-3">
                        Email khách thuê:
                    </label>
                    <input
                        id="renter-email"
                        type="email"
                        placeholder="Nhập email khách thuê"
                        value={renterEmail}
                        onChange={(e) => {
                            setRenterEmail(e.target.value);
                            if (emailError) setEmailError("");
                        }}
                        className={`w-full h-12 px-3 rounded-md border outline-none transition-all focus:ring-2 focus:ring-amber-500 focus:border-amber-500 ${emailError ? "border-red-400" : "border-stone-300"}`}
                    />
                    {emailError && (
                        <p className="text-xs text-red-500 mt-1">{emailError}</p>
                    )}

                    <label htmlFor="rental-quantity" className="block text-sm font-medium text-stone-700 mb-2 mt-3">
                        Số lượng cho thuê:
                    </label>
                    <input
                        id="rental-quantity"
                        type="number"
                        min={1}
                        max={garment.quantity}
                        value={rentalQuantity}
                        onChange={(e) => setRentalQuantity(Math.max(1, Math.min(garment.quantity, parseInt(e.target.value) || 1)))}
                        className="w-full h-12 px-3 rounded-md border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                    />
                    <p className="text-xs text-stone-400 mt-1">Tồn kho hiện tại: {garment.quantity}</p>

                    <div className="flex gap-2 mt-4">
                        <button
                            onClick={() => handleStatusClick(GarmentStatus.RENTED)}
                            disabled={isPending || !selectedDate || !renterName.trim() || !renterEmail.trim() || rentalQuantity < 1 || rentalQuantity > garment.quantity}
                            className="flex-1 h-12 bg-amber-600 text-white px-6 rounded-md font-bold hover:bg-amber-700 active:scale-95 transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isPending ? (
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                            ) : null}
                            Xác nhận
                        </button>
                    </div>
                    <button
                        onClick={() => {
                            setShowDatePicker(false);
                            setRenterName("");
                            setRenterEmail("");
                            setEmailError("");
                            setRentalQuantity(1);
                        }}
                        className="mt-2 text-xs text-stone-500 hover:text-stone-800 transition-colors"
                    >
                        Hủy bỏ
                    </button>
                </div>
            )}
        </div>
    );
}
