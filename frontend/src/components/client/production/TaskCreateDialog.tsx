"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";

import {
  createTask,
  fetchMatchingScores,
  fetchOrdersForAssignment,
} from "@/app/actions/owner-task-actions";
import type { ActiveStaffUser } from "@/types/staff";
import type { TaskCreateRequest, TailorMatchingScore } from "@/types/tailor-task";

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

  const { data: matchingScores, isLoading: scoresLoading } = useQuery({
    queryKey: ["matching-scores", orderId],
    queryFn: () => fetchMatchingScores(orderId),
    staleTime: 60_000,
    enabled: open && !!orderId,
  });

  const mutation = useMutation({
    mutationFn: (req: TaskCreateRequest) => createTask(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-tasks"] });
      resetForm();
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
  const scores: TailorMatchingScore[] = matchingScores ?? [];

  function resetForm() {
    setOrderId("");
    setAssignedTo("");
    setDeadline("");
    setNotes("");
    setPieceRate("");
    setFormError(null);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!orderId) {
      setFormError("Vui lòng chọn đơn hàng");
      return;
    }

    const request: TaskCreateRequest = {
      order_id: orderId,
      assigned_to: assignedTo || null,
    };

    if (deadline) {
      request.deadline = new Date(deadline).toISOString();
    }
    if (notes.trim()) {
      request.notes = notes.trim();
    }
    if (pieceRate) {
      const parsed = parseFloat(pieceRate);
      if (!isNaN(parsed)) {
        request.piece_rate = parsed;
      }
    }

    mutation.mutate(request);
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) { resetForm(); onClose(); } }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 z-50" />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-xl p-6"
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
                onChange={(e) => { setOrderId(e.target.value); setAssignedTo(""); }}
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

            {/* Matching scores */}
            {orderId && scores.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Điểm phù hợp thợ may
                </label>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left py-1.5 px-2 font-medium text-gray-500">Thợ may</th>
                        <th className="text-right py-1.5 px-2 font-medium text-gray-500">Tải</th>
                        <th className="text-right py-1.5 px-2 font-medium text-gray-500">Đúng hạn</th>
                        <th className="text-right py-1.5 px-2 font-medium text-gray-500">Điểm</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scores.map((s) => (
                        <tr
                          key={s.tailor_id}
                          onClick={() => setAssignedTo(s.tailor_id)}
                          className={`border-b border-gray-100 cursor-pointer transition-colors hover:bg-blue-50 ${
                            assignedTo === s.tailor_id ? "bg-blue-100" : ""
                          }`}
                        >
                          <td className="py-1.5 px-2 font-medium">{s.tailor_name}</td>
                          <td className="py-1.5 px-2 text-right">{(s.workload_score * 100).toFixed(0)}%</td>
                          <td className="py-1.5 px-2 text-right">{(s.on_time_rate * 100).toFixed(0)}%</td>
                          <td className="py-1.5 px-2 text-right font-semibold">{s.score.toFixed(0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {scoresLoading && <p className="text-xs text-gray-400 mt-1">Đang tải điểm...</p>}
              </div>
            )}

            {/* Tailor selector (fallback / manual) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Thợ may <span className="text-gray-400 text-xs">(để trống = chờ giao việc)</span>
              </label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-[#1A1A2E] focus:ring-2 focus:ring-[#1A2B4C]/20 focus:border-[#1A2B4C]"
                data-testid="select-tailor"
              >
                <option value="">Chưa giao (unassigned)</option>
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
                {mutation.isPending ? "Đang giao..." : assignedTo ? "Giao việc" : "Tạo việc"}
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
