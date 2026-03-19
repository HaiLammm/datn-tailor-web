"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";

import { updateTask } from "@/app/actions/owner-task-actions";
import type { ActiveStaffUser } from "@/types/staff";
import type { OwnerTaskItem, TaskUpdateRequest } from "@/types/tailor-task";

interface TaskEditDialogProps {
  open: boolean;
  onClose: () => void;
  task: OwnerTaskItem;
  tailors: ActiveStaffUser[];
  onSuccess: () => void;
}

export default function TaskEditDialog({
  open,
  onClose,
  task,
  tailors,
  onSuccess,
}: TaskEditDialogProps) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);

  // Initialize form from existing task
  const [assignedTo, setAssignedTo] = useState(task.assigned_to);
  const [deadline, setDeadline] = useState(
    task.deadline ? task.deadline.slice(0, 10) : ""
  );
  const [notes, setNotes] = useState(task.notes || "");
  const [pieceRate, setPieceRate] = useState(
    task.piece_rate !== null ? String(task.piece_rate) : ""
  );

  const mutation = useMutation({
    mutationFn: (req: TaskUpdateRequest) => updateTask(task.id, req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-tasks"] });
      onSuccess();
    },
    onError: (err: Error) => {
      setFormError(err.message);
    },
  });

  const activeTailors = tailors.filter(
    (t) => t.role === "Tailor" && t.is_active
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const request: TaskUpdateRequest = {};

    if (assignedTo !== task.assigned_to) {
      request.assigned_to = assignedTo;
    }

    const newDeadline = deadline
      ? new Date(deadline).toISOString()
      : null;
    if (newDeadline !== task.deadline) {
      request.deadline = newDeadline;
    }

    if (notes !== (task.notes || "")) {
      request.notes = notes.trim() || null;
    }

    const newPieceRate = pieceRate ? parseFloat(pieceRate) : null;
    if (newPieceRate !== task.piece_rate) {
      request.piece_rate = newPieceRate;
    }

    // Only submit if something changed
    if (Object.keys(request).length === 0) {
      onClose();
      return;
    }

    mutation.mutate(request);
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 z-[60]" />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] w-full max-w-lg bg-white rounded-xl shadow-xl p-6"
          data-testid="task-edit-dialog"
        >
          <Dialog.Title className="text-lg font-semibold text-[#1A1A2E] mb-4">
            Chỉnh sửa công việc
          </Dialog.Title>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tailor reassign */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Thợ may
              </label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-[#1A1A2E] focus:ring-2 focus:ring-[#1A2B4C]/20 focus:border-[#1A2B4C]"
                data-testid="edit-select-tailor"
              >
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
                data-testid="edit-input-deadline"
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
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-[#1A1A2E] focus:ring-2 focus:ring-[#1A2B4C]/20 focus:border-[#1A2B4C]"
                data-testid="edit-input-piece-rate"
              />
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
                maxLength={2000}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-[#1A1A2E] focus:ring-2 focus:ring-[#1A2B4C]/20 focus:border-[#1A2B4C] resize-none"
                data-testid="edit-input-notes"
              />
            </div>

            {/* Error */}
            {formError && (
              <p className="text-sm text-red-600" data-testid="edit-form-error">
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
                data-testid="btn-save-edit"
              >
                {mutation.isPending ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
