"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Garment, GarmentCategory, GarmentMaterial, GarmentOccasion } from "@/types/garment";
import {
  CATEGORY_LABEL,
  MATERIAL_LABEL,
  OCCASION_LABEL,
  SIZE_OPTIONS,
} from "@/components/client/showroom/garmentConstants";
import { createGarment, updateGarment } from "@/app/actions/garment-actions";

// --- Zod Schema ---
const URL_REGEX = /^https?:\/\/.+/;

const productSchema = z.object({
  name: z.string().min(2, "Tên phải có ít nhất 2 ký tự"),
  description: z.string().optional().nullable(),
  category: z.string().min(1, "Vui lòng chọn loại áo dài"),
  occasion: z.string().optional().nullable(),
  material: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  size_options: z.array(z.string()).min(1, "Vui lòng chọn ít nhất một size"),
  rental_price: z
    .string()
    .min(1, "Vui lòng nhập giá thuê")
    .refine(
      (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
      "Giá thuê phải lớn hơn 0"
    ),
  sale_price: z
    .string()
    .optional()
    .nullable()
    .refine(
      (val) => !val || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0),
      "Giá bán không hợp lệ"
    ),
  image_url: z
    .string()
    .optional()
    .nullable()
    .refine(
      (val) => !val || URL_REGEX.test(val),
      "URL ảnh phải bắt đầu bằng http:// hoặc https://"
    ),
  image_urls_raw: z.string().optional().nullable(), // newline-separated URLs
});

export type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormProps {
  /** Nếu có garment → form ở chế độ sửa, ngược lại → tạo mới */
  garment?: Garment;
  onSuccess?: () => void;
}

/**
 * ProductForm - Story 2.4 AC #1, #2, #5:
 * Form tạo/sửa sản phẩm với React Hook Form + Zod validation.
 * Validation messages bằng tiếng Việt.
 */
export default function ProductForm({ garment, onSuccess }: ProductFormProps) {
  const router = useRouter();
  const isEditing = !!garment;

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, []);

  // Pre-fill from existing garment (edit mode)
  const defaultValues: ProductFormValues = {
    name: garment?.name ?? "",
    description: garment?.description ?? "",
    category: garment?.category ?? "",
    occasion: garment?.occasion ?? "",
    material: garment?.material ?? "",
    color: garment?.color ?? "",
    size_options: garment?.size_options ?? [],
    rental_price: garment?.rental_price ?? "",
    sale_price: garment?.sale_price ?? "",
    image_url: garment?.image_url ?? "",
    image_urls_raw: garment?.image_urls?.join("\n") ?? "",
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues,
  });

  const selectedSizes = watch("size_options");

  function toggleSize(size: string) {
    const current = selectedSizes ?? [];
    if (current.includes(size)) {
      setValue("size_options", current.filter((s) => s !== size), { shouldValidate: true });
    } else {
      setValue("size_options", [...current, size], { shouldValidate: true });
    }
  }

  function showToast(message: string, type: "success" | "error") {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  }

  async function onSubmit(data: ProductFormValues) {
    // Parse image_urls from newline-separated input
    const image_urls = data.image_urls_raw
      ? data.image_urls_raw
          .split("\n")
          .map((u) => u.trim())
          .filter((u) => u.length > 0)
      : [];

    // Validate image_urls are valid URLs - show inline field error (AC #5)
    for (const url of image_urls) {
      if (!URL_REGEX.test(url)) {
        setError("image_urls_raw", {
          message: `URL không hợp lệ: "${url}". Mỗi URL phải bắt đầu bằng http:// hoặc https://`,
        });
        return;
      }
    }

    const payload = {
      name: data.name,
      description: data.description || null,
      category: data.category,
      occasion: data.occasion || null,
      material: data.material || null,
      color: data.color || null,
      size_options: data.size_options,
      rental_price: data.rental_price,
      sale_price: data.sale_price || null,
      image_url: data.image_url || null,
      image_urls,
    };

    if (isEditing && garment) {
      const result = await updateGarment(garment.id, payload);
      if (result.success) {
        showToast("Đã cập nhật sản phẩm thành công!", "success");
        redirectTimerRef.current = setTimeout(() => {
          if (onSuccess) onSuccess();
          router.push("/owner/products");
        }, 1000);
      } else {
        showToast(`Lỗi: ${result.error ?? "Không thể cập nhật sản phẩm"}`, "error");
      }
    } else {
      const result = await createGarment(payload);
      if (result.success) {
        showToast("Đã tạo sản phẩm thành công!", "success");
        redirectTimerRef.current = setTimeout(() => {
          if (onSuccess) onSuccess();
          router.push("/owner/products");
        }, 1000);
      } else {
        showToast(`Lỗi: ${result.error ?? "Không thể tạo sản phẩm"}`, "error");
      }
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Tên sản phẩm */}
        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-1">
            Tên sản phẩm <span className="text-red-500">*</span>
          </label>
          <input
            {...register("name")}
            type="text"
            placeholder="VD: Áo Dài Lụa Đỏ Thêu Hoa"
            className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-stone-800 placeholder-stone-300"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>

        {/* Mô tả */}
        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-1">
            Mô tả
          </label>
          <textarea
            {...register("description")}
            rows={3}
            placeholder="Mô tả chi tiết về sản phẩm..."
            className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-stone-800 placeholder-stone-300 resize-none"
          />
        </div>

        {/* Loại áo dài (required) + Dịp mặc + Chất liệu */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Loại */}
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1">
              Loại áo dài <span className="text-red-500">*</span>
            </label>
            <select
              {...register("category")}
              className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-stone-800 bg-white"
            >
              <option value="">-- Chọn loại --</option>
              {Object.values(GarmentCategory).map((val) => (
                <option key={val} value={val}>
                  {CATEGORY_LABEL[val] ?? val}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
            )}
          </div>

          {/* Dịp mặc */}
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1">
              Dịp mặc
            </label>
            <select
              {...register("occasion")}
              className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-stone-800 bg-white"
            >
              <option value="">-- Chọn dịp --</option>
              {Object.values(GarmentOccasion).map((val) => (
                <option key={val} value={val}>
                  {OCCASION_LABEL[val] ?? val}
                </option>
              ))}
            </select>
          </div>

          {/* Chất liệu */}
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1">
              Chất liệu
            </label>
            <select
              {...register("material")}
              className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-stone-800 bg-white"
            >
              <option value="">-- Chọn chất liệu --</option>
              {Object.values(GarmentMaterial).map((val) => (
                <option key={val} value={val}>
                  {MATERIAL_LABEL[val] ?? val}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Màu sắc */}
        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-1">
            Màu sắc
          </label>
          <input
            {...register("color")}
            type="text"
            placeholder="VD: Đỏ thẫm, Xanh ngọc..."
            className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-stone-800 placeholder-stone-300"
          />
        </div>

        {/* Kích cỡ (multi-select chips) */}
        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-2">
            Kích cỡ có sẵn <span className="text-red-500">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {SIZE_OPTIONS.map((size) => {
              const isSelected = (selectedSizes ?? []).includes(size);
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => toggleSize(size)}
                  className={`min-h-[44px] px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                    isSelected
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : "border-stone-200 bg-white text-stone-600 hover:border-indigo-300"
                  }`}
                  aria-pressed={isSelected}
                >
                  {size}
                </button>
              );
            })}
          </div>
          {errors.size_options && (
            <p className="mt-1 text-sm text-red-600">{errors.size_options.message}</p>
          )}
        </div>

        {/* Giá thuê + Giá bán */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1">
              Giá thuê (VNĐ) <span className="text-red-500">*</span>
            </label>
            <input
              {...register("rental_price")}
              type="number"
              min="0"
              step="1000"
              placeholder="VD: 500000"
              className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-stone-800 placeholder-stone-300"
            />
            {errors.rental_price && (
              <p className="mt-1 text-sm text-red-600">{errors.rental_price.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1">
              Giá bán (VNĐ)
            </label>
            <input
              {...register("sale_price")}
              type="number"
              min="0"
              step="1000"
              placeholder="Để trống nếu chỉ cho thuê"
              className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-stone-800 placeholder-stone-300"
            />
            {errors.sale_price && (
              <p className="mt-1 text-sm text-red-600">{errors.sale_price.message}</p>
            )}
          </div>
        </div>

        {/* URL ảnh chính */}
        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-1">
            URL ảnh chính
          </label>
          <input
            {...register("image_url")}
            type="url"
            placeholder="https://example.com/anh-ao-dai.jpg"
            className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-stone-800 placeholder-stone-300"
          />
          {errors.image_url && (
            <p className="mt-1 text-sm text-red-600">{errors.image_url.message}</p>
          )}
          <p className="mt-1 text-xs text-stone-400">URL phải bắt đầu bằng https://</p>
        </div>

        {/* URLs ảnh bổ sung */}
        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-1">
            URLs ảnh bổ sung
          </label>
          <textarea
            {...register("image_urls_raw")}
            rows={3}
            placeholder={"https://example.com/anh1.jpg\nhttps://example.com/anh2.jpg"}
            className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-stone-800 placeholder-stone-300 resize-none font-mono text-xs"
          />
          {errors.image_urls_raw && (
            <p className="mt-1 text-sm text-red-600">{errors.image_urls_raw.message}</p>
          )}
          <p className="mt-1 text-xs text-stone-400">Mỗi URL trên một dòng, bắt đầu bằng http:// hoặc https://</p>
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push("/owner/products")}
            className="flex-1 min-h-[44px] px-6 py-3 border border-stone-200 rounded-xl text-stone-700 font-medium hover:bg-stone-50 transition-colors"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 min-h-[44px] px-6 py-3 bg-indigo-900 text-white rounded-xl font-semibold hover:bg-indigo-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting
              ? isEditing
                ? "Đang cập nhật..."
                : "Đang tạo..."
              : isEditing
              ? "Cập nhật sản phẩm"
              : "Tạo sản phẩm"}
          </button>
        </div>
      </form>

      {/* Micro-toast notification */}
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
