"use client";

import { useState, useTransition } from "react";
import { sendReturnReminders } from "@/app/actions/garment-actions";

/**
 * SendRemindersButton - Story 5.4: Manual trigger for return reminders.
 * Owner-only button to send return reminder emails for garments due tomorrow.
 */
export default function SendRemindersButton() {
    const [isPending, startTransition] = useTransition();
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

    const handleClick = () => {
        startTransition(async () => {
            const result = await sendReturnReminders();

            if (result.success && result.data) {
                const { sent, failed, skipped } = result.data;
                if (sent === 0 && failed === 0 && skipped === 0) {
                    setToast({ message: "Không có đơn thuê nào cần nhắc nhở", type: "success" });
                } else {
                    setToast({
                        message: `Đã gửi ${sent} thông báo${failed > 0 ? `, ${failed} thất bại` : ""}`,
                        type: failed > 0 ? "error" : "success",
                    });
                }
            } else {
                setToast({
                    message: result.error || "Gửi nhắc nhở thất bại. Vui lòng thử lại",
                    type: "error",
                });
            }

            // Auto-dismiss toast after 4 seconds
            setTimeout(() => setToast(null), 4000);
        });
    };

    return (
        <>
            <button
                onClick={handleClick}
                disabled={isPending}
                aria-label="Gửi nhắc nhở trả đồ cho khách thuê"
                className="inline-flex items-center h-12 px-5 bg-[#D4AF37] text-white rounded-lg font-medium text-sm hover:bg-[#C4A030] active:scale-95 transition-all touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
                {isPending ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                    </svg>
                )}
                Gửi nhắc nhở trả đồ
            </button>

            {toast && (
                <div
                    role="status"
                    aria-live="polite"
                    className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-2xl text-sm font-medium animate-in fade-in slide-in-from-bottom-4 duration-300 ${
                        toast.type === "success"
                            ? "bg-indigo-900 text-white"
                            : "bg-red-700 text-white"
                    }`}
                >
                    {toast.message}
                </div>
            )}
        </>
    );
}
