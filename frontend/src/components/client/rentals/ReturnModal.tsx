"use client";

/**
 * Return Modal Component (Story 4.3)
 * Process rental return with condition assessment and deposit deduction
 * Includes Zod validation and optimistic update with TanStack Query
 */

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { processReturn } from "@/app/actions/rental-actions";
import type { RentalListItem, ReturnCondition } from "@/types/rental";
import { z } from "zod";

interface ReturnModalProps {
  rental: RentalListItem;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const ReturnSchema = z.object({
  return_condition: z.enum(["good", "damaged", "lost"]),
  damage_notes: z.string().optional(),
  deposit_deduction: z.string(),
});

export function ReturnModal({
  rental,
  isOpen,
  onClose,
  onSuccess,
}: ReturnModalProps) {
  const queryClient = useQueryClient();
  const [condition, setCondition] = useState<ReturnCondition>("good");
  const [damageNotes, setDamageNotes] = useState("");
  const [depositDeduction, setDepositDeduction] = useState("0");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const depositAmount = parseFloat(rental.deposit_amount);

  // Pre-calculate deposit deduction based on condition
  const handleConditionChange = (newCondition: ReturnCondition) => {
    setCondition(newCondition);

    if (newCondition === "good") {
      setDepositDeduction("0");
    } else if (newCondition === "damaged") {
      // 50% of deposit
      setDepositDeduction((depositAmount * 0.5).toFixed(2));
    } else if (newCondition === "lost") {
      // 100% of deposit
      setDepositDeduction(depositAmount.toFixed(2));
    }
  };

  // Mutation for processing return
  const mutation = useMutation({
    mutationFn: async () => {
      // Validate
      const validation = ReturnSchema.safeParse({
        return_condition: condition,
        damage_notes: damageNotes || undefined,
        deposit_deduction: depositDeduction,
      });

      if (!validation.success) {
        const fieldErrors: Record<string, string> = {};
        validation.error.errors.forEach((err) => {
          const path = err.path.join(".");
          fieldErrors[path] = err.message;
        });
        setErrors(fieldErrors);
        throw new Error("Validation failed");
      }

      const result = await processReturn(rental.order_item_id, {
        return_condition: condition,
        damage_notes: damageNotes || undefined,
        deposit_deduction: depositDeduction,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to process return");
      }

      return result.data;
    },
    onSuccess: () => {
      // Invalidate queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ["rentals"] });
      queryClient.invalidateQueries({ queryKey: ["rental-stats"] });
      onSuccess?.();
    },
    onError: (error) => {
      setErrors({ submit: error.message });
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 p-6">
        <h2 className="text-2xl font-bold mb-4">Nhận Trả: {rental.garment_name}</h2>

        {/* Condition Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Tình Trạng Áo
          </label>
          <div className="space-y-2">
            {[
              { value: "good", label: "Tốt" },
              { value: "damaged", label: "Hư Hỏng" },
              { value: "lost", label: "Mất" },
            ].map((opt) => (
              <label
                key={opt.value}
                className="flex items-center cursor-pointer"
              >
                <input
                  type="radio"
                  name="condition"
                  value={opt.value}
                  checked={condition === opt.value}
                  onChange={() => handleConditionChange(opt.value as ReturnCondition)}
                  className="mr-2"
                />
                <span className="text-gray-700">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Damage Notes (conditional) */}
        {(condition === "damaged" || condition === "lost") && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ghi Chú Hư Hỏng
            </label>
            <textarea
              value={damageNotes}
              onChange={(e) => setDamageNotes(e.target.value)}
              placeholder="Mô tả chi tiết tình trạng hư hỏng..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}

        {/* Deposit Deduction */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Khấu Trừ Cọc (VNĐ)
          </label>
          <input
            type="number"
            value={depositDeduction}
            onChange={(e) => setDepositDeduction(e.target.value)}
            min="0"
            max={depositAmount}
            step="0.01"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="text-xs text-gray-500 mt-1">
            Cọc ban đầu: {parseFloat(rental.deposit_amount).toLocaleString("vi-VN")} VNĐ
          </div>
        </div>

        {/* Error Messages */}
        {Object.entries(errors).map(([key, message]) => (
          <div
            key={key}
            className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm"
          >
            {message}
          </div>
        ))}

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={mutation.isPending}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:bg-gray-100"
          >
            Hủy
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
          >
            {mutation.isPending ? "Xử Lý..." : "Xác Nhận"}
          </button>
        </div>
      </div>
    </div>
  );
}
