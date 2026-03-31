"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
import { createGarment, updateGarment, uploadGarmentImages } from "@/app/actions/garment-actions";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

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
});

export type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormProps {
  garment?: Garment;
  onSuccess?: () => void;
}

interface ImageItem {
  file?: File;         // new file to upload (undefined for existing URLs)
  previewUrl: string;  // blob URL for new files, server URL for existing
  existingUrl?: string; // original URL from server (for existing images)
}

function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return `File "${file.name}" không hợp lệ. Chỉ chấp nhận JPEG, PNG, WebP.`;
  }
  if (file.size > MAX_FILE_SIZE) {
    return `File "${file.name}" vượt quá 5MB.`;
  }
  return null;
}

export default function ProductForm({ garment, onSuccess }: ProductFormProps) {
  const router = useRouter();
  const isEditing = !!garment;

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Unified image state (F7: single source of truth)
  const [primaryItem, setPrimaryItem] = useState<ImageItem | null>(
    garment?.image_url ? { previewUrl: garment.image_url, existingUrl: garment.image_url } : null
  );
  const [additionalItems, setAdditionalItems] = useState<ImageItem[]>(
    garment?.image_urls?.map((url) => ({ previewUrl: url, existingUrl: url })) ?? []
  );
  const [imageError, setImageError] = useState<string | null>(null);

  const primaryInputRef = useRef<HTMLInputElement>(null);
  const additionalInputRef = useRef<HTMLInputElement>(null);

  // Cleanup blob URLs on unmount (F8)
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
      // Revoke all blob URLs
      if (primaryItem?.file) URL.revokeObjectURL(primaryItem.previewUrl);
      additionalItems.forEach((item) => {
        if (item.file) URL.revokeObjectURL(item.previewUrl);
      });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
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

  const handlePrimaryImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const error = validateFile(file);
    if (error) {
      setImageError(error);
      e.target.value = "";
      return;
    }

    setPrimaryItem((prev) => {
      if (prev?.file) URL.revokeObjectURL(prev.previewUrl);
      return { file, previewUrl: URL.createObjectURL(file) };
    });
    e.target.value = "";
  }, []);

  const removePrimaryImage = useCallback(() => {
    setPrimaryItem((prev) => {
      if (prev?.file) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
  }, []);

  const handleAdditionalImagesChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newItems: ImageItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const error = validateFile(file);
      if (error) {
        setImageError(error);
        // Revoke any already-created URLs in this batch
        newItems.forEach((item) => URL.revokeObjectURL(item.previewUrl));
        e.target.value = "";
        return;
      }
      newItems.push({ file, previewUrl: URL.createObjectURL(file) });
    }

    setAdditionalItems((prev) => [...prev, ...newItems]);
    e.target.value = "";
  }, []);

  const removeAdditionalImage = useCallback((index: number) => {
    setAdditionalItems((prev) => {
      const item = prev[index];
      if (item?.file) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  async function onSubmit(data: ProductFormValues) {
    setImageError(null);

    // Collect all new files to upload (primary + additional)
    const filesToUpload: File[] = [];
    if (primaryItem?.file) filesToUpload.push(primaryItem.file);
    for (const item of additionalItems) {
      if (item.file) filesToUpload.push(item.file);
    }

    let uploadedUrls: string[] = [];

    if (filesToUpload.length > 0) {
      const formData = new FormData();
      for (const file of filesToUpload) {
        formData.append("files", file);
      }

      const uploadResult = await uploadGarmentImages(formData);
      if (!uploadResult.success) {
        showToast(`Lỗi upload: ${uploadResult.error}`, "error");
        return;
      }
      uploadedUrls = uploadResult.urls ?? [];
    }

    // Map uploaded URLs back to items
    let urlIdx = 0;
    let finalPrimaryUrl: string | null = null;

    if (primaryItem) {
      if (primaryItem.file) {
        finalPrimaryUrl = uploadedUrls[urlIdx++] ?? null;
      } else {
        finalPrimaryUrl = primaryItem.existingUrl ?? null;
      }
    }

    const finalAdditionalUrls: string[] = [];
    for (const item of additionalItems) {
      if (item.file) {
        if (urlIdx < uploadedUrls.length) {
          finalAdditionalUrls.push(uploadedUrls[urlIdx++]);
        }
      } else if (item.existingUrl) {
        finalAdditionalUrls.push(item.existingUrl);
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
      image_url: finalPrimaryUrl,
      image_urls: finalAdditionalUrls,
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

        {/* Ảnh chính */}
        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-2">
            Ảnh chính
          </label>
          <input
            ref={primaryInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handlePrimaryImageChange}
            className="hidden"
          />
          {primaryItem ? (
            <div className="relative inline-block">
              <img
                src={primaryItem.previewUrl}
                alt="Ảnh chính"
                className="w-28 h-28 object-cover rounded-xl border border-stone-200"
              />
              <button
                type="button"
                onClick={removePrimaryImage}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold hover:bg-red-600 transition-colors"
              >
                X
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => primaryInputRef.current?.click()}
              className="min-h-[44px] px-6 py-3 border-2 border-dashed border-stone-300 rounded-xl text-stone-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
            >
              Chọn ảnh chính
            </button>
          )}
        </div>

        {/* Ảnh bổ sung */}
        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-2">
            Ảnh bổ sung
          </label>
          <input
            ref={additionalInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleAdditionalImagesChange}
            className="hidden"
          />
          <div className="flex flex-wrap gap-3">
            {additionalItems.map((item, index) => (
              <div key={`${item.previewUrl}-${index}`} className="relative inline-block">
                <img
                  src={item.previewUrl}
                  alt={`Ảnh ${index + 1}`}
                  className="w-28 h-28 object-cover rounded-xl border border-stone-200"
                />
                <button
                  type="button"
                  onClick={() => removeAdditionalImage(index)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold hover:bg-red-600 transition-colors"
                >
                  X
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => additionalInputRef.current?.click()}
              className="w-28 h-28 border-2 border-dashed border-stone-300 rounded-xl text-stone-400 hover:border-indigo-400 hover:text-indigo-600 transition-colors flex items-center justify-center text-2xl"
            >
              +
            </button>
          </div>
        </div>

        {/* Image error */}
        {imageError && (
          <p className="text-sm text-red-600">{imageError}</p>
        )}

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
