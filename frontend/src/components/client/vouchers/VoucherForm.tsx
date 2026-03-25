"use client";

/**
 * VoucherForm - Story 6.3: Shared form for create/edit voucher.
 *
 * Zod validation on client, backend validates independently.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { OwnerVoucher, VoucherFormData, VoucherType, VoucherVisibility } from "@/types/voucher";
import { createVoucher, updateVoucher } from "@/app/actions/voucher-actions";

const voucherSchema = z
  .object({
    code: z
      .string()
      .min(1, "Mã voucher là bắt buộc")
      .max(50, "Mã voucher tối đa 50 ký tự")
      .transform((v) => v.trim().toUpperCase()),
    type: z.enum(["percent", "fixed"] as const),
    value: z.number().positive("Giá trị phải lớn hơn 0"),
    min_order_value: z.number().min(0, "Không được âm"),
    max_discount_value: z.number().positive("Phải lớn hơn 0").nullable(),
    description: z.string(),
    expiry_date: z
      .string()
      .min(1, "Ngày hết hạn là bắt buộc")
      .refine(
        (val) => new Date(val) > new Date(),
        { message: "Ngày hết hạn phải ở tương lai" }
      ),
    total_uses: z.number().int().min(1, "Tối thiểu 1"),
    visibility: z.enum(["public", "private"] as const).default("private"),
  })
  .refine(
    (data) => {
      if (data.type === "percent" && data.value > 100) return false;
      return true;
    },
    { message: "Phần trăm giảm giá tối đa 100%", path: ["value"] }
  )
  .refine(
    (data) => {
      if (data.type === "fixed" && data.max_discount_value !== null) return false;
      return true;
    },
    { message: "Giảm giá cố định không cần giới hạn tối đa", path: ["max_discount_value"] }
  );

interface VoucherFormProps {
  voucher?: OwnerVoucher;
}

export default function VoucherForm({ voucher }: VoucherFormProps) {
  const router = useRouter();
  const isEdit = !!voucher;

  const [formData, setFormData] = useState<VoucherFormData>({
    code: voucher?.code ?? "",
    type: (voucher?.type as VoucherType) ?? "percent",
    value: voucher ? parseFloat(voucher.value) : 0,
    min_order_value: voucher ? parseFloat(voucher.min_order_value) : 0,
    max_discount_value: voucher?.max_discount_value
      ? parseFloat(voucher.max_discount_value)
      : null,
    description: voucher?.description ?? "",
    expiry_date: voucher?.expiry_date ?? "",
    total_uses: voucher?.total_uses ?? 1,
    visibility: (voucher?.visibility as VoucherVisibility) ?? "private",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const handleChange = (
    field: keyof VoucherFormData,
    value: string | number | null
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setServerError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const parsed = voucherSchema.safeParse(formData);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0]?.toString();
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);

    const result = isEdit
      ? await updateVoucher(voucher!.id, parsed.data)
      : await createVoucher(parsed.data);

    if (result.success) {
      router.push("/owner/vouchers");
      router.refresh();
    } else {
      setServerError(result.error || "Đã xảy ra lỗi");
    }

    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {serverError && (
        <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {serverError}
        </div>
      )}

      {/* Code */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">
          Mã voucher <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.code}
          onChange={(e) => handleChange("code", e.target.value)}
          placeholder="VD: TETLUXV26"
          disabled={isEdit}
          className={`w-full px-4 py-2.5 rounded-lg border text-sm font-mono uppercase ${
            errors.code ? "border-red-400 bg-red-50" : isEdit ? "border-stone-200 bg-stone-100 text-stone-500 cursor-not-allowed" : "border-stone-300 bg-white"
          } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
          maxLength={50}
        />
        {isEdit && (
          <p className="text-xs text-stone-400 mt-1">Mã voucher không thể thay đổi sau khi tạo</p>
        )}
        {errors.code && <p className="text-xs text-red-500 mt-1">{errors.code}</p>}
      </div>

      {/* Visibility */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-2">
          Phạm vi voucher <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => handleChange("visibility", "private")}
            className={`flex-1 py-2.5 px-3 rounded-lg border-2 text-sm font-medium transition-all ${
              formData.visibility === "private"
                ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                : "border-stone-300 bg-white text-stone-600 hover:border-stone-400"
            }`}
          >
            Riêng tư (Private)
          </button>
          <button
            type="button"
            onClick={() => handleChange("visibility", "public")}
            className={`flex-1 py-2.5 px-3 rounded-lg border-2 text-sm font-medium transition-all ${
              formData.visibility === "public"
                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                : "border-stone-300 bg-white text-stone-600 hover:border-stone-400"
            }`}
          >
            Công khai (Public)
          </button>
        </div>
        <p className="text-xs text-stone-400 mt-1">
          {formData.visibility === "private"
            ? "Chỉ gán cho khách hàng cụ thể qua chiến dịch hoặc thủ công."
            : "Tất cả khách hàng có thể dùng nếu biết mã. Mỗi khách dùng 1 lần."}
        </p>
      </div>

      {/* Type + Value row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Loại giảm giá <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.type}
            onChange={(e) => {
              handleChange("type", e.target.value as VoucherType);
              if (e.target.value === "fixed") {
                handleChange("max_discount_value", null);
              }
            }}
            className="w-full px-4 py-2.5 rounded-lg border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="percent">Phần trăm (%)</option>
            <option value="fixed">Cố định (VND)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Giá trị <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={formData.value || ""}
            onChange={(e) => handleChange("value", parseFloat(e.target.value) || 0)}
            placeholder={formData.type === "percent" ? "VD: 20" : "VD: 50000"}
            min={0}
            step={formData.type === "percent" ? 1 : 1000}
            className={`w-full px-4 py-2.5 rounded-lg border text-sm ${
              errors.value ? "border-red-400 bg-red-50" : "border-stone-300 bg-white"
            } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
          />
          {errors.value && <p className="text-xs text-red-500 mt-1">{errors.value}</p>}
        </div>
      </div>

      {/* Min order + Max discount row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Đơn tối thiểu (VND)
          </label>
          <input
            type="number"
            value={formData.min_order_value || ""}
            onChange={(e) =>
              handleChange("min_order_value", parseFloat(e.target.value) || 0)
            }
            placeholder="0"
            min={0}
            step={10000}
            className={`w-full px-4 py-2.5 rounded-lg border text-sm ${
              errors.min_order_value ? "border-red-400 bg-red-50" : "border-stone-300 bg-white"
            } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
          />
          {errors.min_order_value && (
            <p className="text-xs text-red-500 mt-1">{errors.min_order_value}</p>
          )}
        </div>

        {formData.type === "percent" && (
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Giảm tối đa (VND)
            </label>
            <input
              type="number"
              value={formData.max_discount_value ?? ""}
              onChange={(e) =>
                handleChange(
                  "max_discount_value",
                  e.target.value ? parseFloat(e.target.value) : null
                )
              }
              placeholder="Không giới hạn"
              min={0}
              step={10000}
              className={`w-full px-4 py-2.5 rounded-lg border text-sm ${
                errors.max_discount_value ? "border-red-400 bg-red-50" : "border-stone-300 bg-white"
              } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
            />
            {errors.max_discount_value && (
              <p className="text-xs text-red-500 mt-1">{errors.max_discount_value}</p>
            )}
          </div>
        )}
      </div>

      {/* Expiry + Total uses row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Ngày hết hạn <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={formData.expiry_date}
            onChange={(e) => handleChange("expiry_date", e.target.value)}
            className={`w-full px-4 py-2.5 rounded-lg border text-sm ${
              errors.expiry_date ? "border-red-400 bg-red-50" : "border-stone-300 bg-white"
            } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
          />
          {errors.expiry_date && (
            <p className="text-xs text-red-500 mt-1">{errors.expiry_date}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Số lượt sử dụng <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={formData.total_uses}
            onChange={(e) =>
              handleChange("total_uses", parseInt(e.target.value, 10) || 1)
            }
            min={1}
            className={`w-full px-4 py-2.5 rounded-lg border text-sm ${
              errors.total_uses ? "border-red-400 bg-red-50" : "border-stone-300 bg-white"
            } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
          />
          {errors.total_uses && (
            <p className="text-xs text-red-500 mt-1">{errors.total_uses}</p>
          )}
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">
          Mô tả
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => handleChange("description", e.target.value)}
          placeholder="VD: Giảm 20% nhân dịp Tết Nguyên Đán 2026"
          rows={3}
          className="w-full px-4 py-2.5 rounded-lg border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        />
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.push("/owner/vouchers")}
          className="px-5 py-2.5 rounded-lg border border-stone-300 text-sm font-medium hover:bg-stone-50 transition-colors"
        >
          Hủy
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-5 py-2.5 rounded-lg bg-indigo-900 text-white text-sm font-medium hover:bg-indigo-800 transition-colors disabled:opacity-50"
        >
          {submitting
            ? isEdit
              ? "Đang cập nhật..."
              : "Đang tạo..."
            : isEdit
              ? "Cập nhật Voucher"
              : "Tạo Voucher"}
        </button>
      </div>
    </form>
  );
}
