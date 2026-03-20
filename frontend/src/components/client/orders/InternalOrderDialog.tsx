"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Dialog from "@radix-ui/react-dialog";
import Image from "next/image";
import {
  createInternalOrder,
  fetchGarmentsForInternalOrder,
} from "@/app/actions/order-actions";
import type { InternalOrderInput } from "@/types/order";
import { formatMoney } from "@/utils/format";

interface GarmentItem {
  id: string;
  name: string;
  rental_price: number;
  sale_price: number | null;
  image_url: string | null;
  size_options: string[];
}

interface SelectedItem {
  garment_id: string;
  size?: string;
}

interface InternalOrderDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function InternalOrderDialog({
  open,
  onClose,
}: InternalOrderDialogProps) {
  const queryClient = useQueryClient();
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const { data: garments, isLoading: garmentsLoading } = useQuery({
    queryKey: ["garments-for-internal-order"],
    queryFn: () => fetchGarmentsForInternalOrder(),
    staleTime: 60_000,
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: (data: InternalOrderInput) => createInternalOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-orders"] });
      resetForm();
      onClose();
    },
    onError: (err: Error) => {
      setFormError(err.message);
    },
  });

  function resetForm() {
    setSelectedItems([]);
    setNotes("");
    setFormError(null);
  }

  function toggleGarment(garmentId: string) {
    setSelectedItems((prev) => {
      const exists = prev.find((i) => i.garment_id === garmentId);
      if (exists) return prev.filter((i) => i.garment_id !== garmentId);
      return [...prev, { garment_id: garmentId }];
    });
  }

  function updateSize(garmentId: string, size: string) {
    setSelectedItems((prev) =>
      prev.map((i) =>
        i.garment_id === garmentId ? { ...i, size: size || undefined } : i
      )
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (selectedItems.length === 0) {
      setFormError("Vui lòng chọn ít nhất một sản phẩm");
      return;
    }

    const orderData: InternalOrderInput = {
      items: selectedItems.map((i) => ({
        garment_id: i.garment_id,
        transaction_type: "buy" as const,
        size: i.size,
      })),
      notes: notes.trim() || undefined,
    };

    mutation.mutate(orderData);
  }

  const availableGarments = garments ?? [];

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          resetForm();
          onClose();
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-white rounded-xl shadow-xl p-6 max-h-[90vh] overflow-y-auto">
          <Dialog.Title className="text-lg font-semibold text-[#1A1A2E] mb-4">
            Tạo đơn nội bộ
          </Dialog.Title>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Garment selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chọn sản phẩm *
              </label>
              {garmentsLoading ? (
                <div className="text-sm text-gray-500">Đang tải...</div>
              ) : availableGarments.length === 0 ? (
                <div className="text-sm text-gray-500">
                  Không có sản phẩm nào trong kho
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {availableGarments.map((g: GarmentItem) => {
                    const selected = selectedItems.find(
                      (i) => i.garment_id === g.id
                    );
                    return (
                      <div
                        key={g.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          selected
                            ? "border-[#D4AF37] bg-[#D4AF37]/5"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                        onClick={() => toggleGarment(g.id)}
                      >
                        {g.image_url ? (
                          <div className="relative w-10 h-10 flex-shrink-0 rounded overflow-hidden bg-gray-100">
                            <Image
                              src={g.image_url}
                              alt={g.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 flex-shrink-0 rounded bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                            --
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {g.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatMoney(g.sale_price ?? g.rental_price)}
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={!!selected}
                          onChange={() => toggleGarment(g.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-4 w-4 text-[#D4AF37] border-gray-300 rounded"
                        />
                        {selected && g.size_options?.length > 0 && (
                          <select
                            value={selected.size ?? ""}
                            onChange={(e) => {
                              e.stopPropagation();
                              updateSize(g.id, e.target.value);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs border border-gray-300 rounded px-2 py-1"
                          >
                            <option value="">Kích cỡ</option>
                            {g.size_options.map((s: string) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {selectedItems.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Đã chọn {selectedItems.length} sản phẩm
                </p>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ghi chú
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Ghi chú sản xuất (tùy chọn)..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-[#1A1A2E] focus:ring-2 focus:ring-[#1A2B4C]/20 focus:border-[#1A2B4C] resize-none"
              />
            </div>

            {/* Error */}
            {formError && (
              <p className="text-sm text-red-600">{formError}</p>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Hủy
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={mutation.isPending || selectedItems.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-[#D4AF37] rounded-lg hover:bg-[#C4A030] disabled:opacity-50 transition-colors"
              >
                {mutation.isPending ? "Đang tạo..." : "Tạo đơn"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
