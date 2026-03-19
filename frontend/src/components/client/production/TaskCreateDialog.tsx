"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";

import {
  createTask,
  fetchOrdersForAssignment,
} from "@/app/actions/owner-task-actions";
import type { ActiveStaffUser } from "@/types/staff";
import type { TaskCreateRequest } from "@/types/tailor-task";

interface TaskCreateDialogProps {
  open: boolean;
  onClose: () => void;
  tailors: ActiveStaffUser[];
}

export default function TaskCreateDialog({
  open,
  onClose,
  tailors,
}: TaskCreateDialogProps) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);

  const [orderId, setOrderId] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [deadline, setDeadline] = useState("");
  const [notes, setNotes] = useState("");
  const [pieceRate, setPieceRate] = useState("");

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ["orders-for-assignment"],
    queryFn: () => fetchOrdersForAssignment(),
    staleTime: 60_000,
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: (req: TaskCreateRequest) => createTask(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-tasks"] });
      onClose();
    },
    onError: (err: Error) => {
      setFormError(err.message);
    },
  });

  const activeTailors = tailors.filter(
    (t) => t.role === "Tailor" && t.is_active
  );
  const orders = ordersData?.data ?? [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!orderId) {
      setFormError("Vui lòng chọn đơn hàng");
      return;
    }
    if (!assignedTo) {
      setFormError("Vui lòng chọn thợ may");
      return;
    }

    const request: TaskCreateRequest = {
      order_id: orderId,
      assigned_to: assignedTo,
    };

    if (deadline) {
      request.deadline = new Date(deadline).toISOString();
    }
    if (notes.trim()) {
      request.notes = notes.trim();
    }
    if (pieceRate) {
      request.piece_rate = parseFloat(pieceRate);
    }

    mutation.mutate(request);
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 z-50" />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-white rounded-xl shadow-xl p-6"
          data-testid="task-create-dialog"
        >
          <Dialog.Title className="text-lg font-semibold text-[#1A1A2E] mb-4">
            Giao việc mới
          </Dialog.Title>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Order selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Đơn hàng đang sản xuất *
              </label>
              <select
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-[#1A1A2E] focus:ring-2 focus:ring-[#1A2B4C]/20 focus:border-[#1A2B4C]"
                data-testid="select-order"
                disabled={ordersLoading}
              >
                <option value="">
                  {ordersLoading ? "Đang tải..." : "Chọn đơn hàng"}
                </option>
                {orders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.customer_name} — {formatCurrency(order.total_amount)}
                  </option>
                ))}
              </select>
            </div>

            {/* Tailor selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Thợ may *
              </label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-[#1A1A2E] focus:ring-2 focus:ring-[#1A2B4C]/20 focus:border-[#1A2B4C]"
                data-testid="select-tailor"
              >
                <option value="">Chọn thợ may</option>
                {activeTailors.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name || t.email}
                  </option>
                ))}
              </select>
            </div>

            {/* Deadline */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hạn chót
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-[#1A1A2E] focus:ring-2 focus:ring-[#1A2B4C]/20 focus:border-[#1A2B4C]"
                data-testid="input-deadline"
              />
            </div>

            {/* Piece rate */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tiền công (VNĐ)
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                value={pieceRate}
                onChange={(e) => setPieceRate(e.target.value)}
                placeholder="VD: 500000"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-[#1A1A2E] focus:ring-2 focus:ring-[#1A2B4C]/20 focus:border-[#1A2B4C]"
                data-testid="input-piece-rate"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ghi chú cho thợ may
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="Hướng dẫn, yêu cầu đặc biệt..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-[#1A1A2E] focus:ring-2 focus:ring-[#1A2B4C]/20 focus:border-[#1A2B4C] resize-none"
                data-testid="input-notes"
              />
            </div>

            {/* Error */}
            {formError && (
              <p className="text-sm text-red-600" data-testid="form-error">
                {formError}
              </p>
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
                disabled={mutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-[#1A2B4C] rounded-lg hover:bg-[#1A2B4C]/90 disabled:opacity-50"
                data-testid="btn-submit-task"
              >
                {mutation.isPending ? "Đang giao..." : "Giao việc"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "—";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}
