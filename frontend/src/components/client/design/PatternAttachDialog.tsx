"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useAttachPattern, useCustomerPatternSessions } from "@/hooks/usePatternSession";
import { PATTERN_SESSION_STATUS_LABELS, type PatternSessionListItem } from "@/types/pattern";

interface PatternAttachDialogProps {
  orderId: string;
  customerId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAttached: () => void;
}

const GARMENT_TYPE_LABELS: Record<string, string> = {
  ao_dai: "Áo dài",
  vest: "Vest",
  ao_ba_lo: "Áo ba lỗ",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function PatternAttachDialog({
  orderId,
  customerId,
  open,
  onOpenChange,
  onAttached,
}: PatternAttachDialogProps) {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { sessions, isLoading } = useCustomerPatternSessions(open ? customerId : "");
  const attachMutation = useAttachPattern({
    onSuccess: () => {
      onAttached();
      onOpenChange(false);
      setSelectedSessionId(null);
      setError(null);
    },
    onError: (err) => {
      setError(err);
    },
  });

  function handleAttach() {
    if (!selectedSessionId) return;
    setError(null);
    attachMutation.mutate({ orderId, patternSessionId: selectedSessionId });
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      setSelectedSessionId(null);
      setError(null);
    }
    onOpenChange(open);
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-xl shadow-xl p-6 max-h-[85vh] overflow-y-auto">
          <Dialog.Title className="text-lg font-semibold text-[#1A1A2E] mb-4">
            Chọn phiên thiết kế
          </Dialog.Title>

          <Dialog.Description className="text-sm text-gray-500 mb-4">
            Chọn một phiên rập đã hoàn thành để đính kèm vào đơn hàng này.
          </Dialog.Description>

          {isLoading ? (
            <div className="py-8 text-center text-sm text-gray-500">
              Đang tải...
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-gray-500">
                Chưa có phiên thiết kế hoàn thành cho khách hàng này.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {sessions.map((session: PatternSessionListItem) => (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => setSelectedSessionId(session.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedSessionId === session.id
                      ? "border-[#D4AF37] bg-[#D4AF37]/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-[#1A1A2E]">
                      Phiên #{session.id.slice(0, 8)}
                    </p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                      {PATTERN_SESSION_STATUS_LABELS[session.status] ?? session.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span>{GARMENT_TYPE_LABELS[session.garment_type] ?? session.garment_type}</span>
                    <span>·</span>
                    <span>{session.piece_count} mảnh</span>
                    <span>·</span>
                    <span>{formatDate(session.created_at)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 mt-3">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Dialog.Close asChild>
              <button
                type="button"
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Hủy
              </button>
            </Dialog.Close>
            <button
              type="button"
              onClick={handleAttach}
              disabled={!selectedSessionId || attachMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-[#D4AF37] rounded-lg hover:bg-[#C4A030] disabled:opacity-50 transition-colors"
            >
              {attachMutation.isPending ? "Đang đính kèm..." : "Xác nhận đính kèm"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}