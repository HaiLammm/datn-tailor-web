"use client";

/**
 * ShippingFormClient - Story 3.3: Checkout Information & Payment Gateway
 * Main client component for Step 2: shipping info + payment method + order submit.
 */

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cartStore";
import { createOrder } from "@/app/actions/order-actions";
import { previewVoucherDiscount } from "@/app/actions/voucher-actions";
import { PaymentMethodSelector } from "./PaymentMethodSelector";
import { formatPrice } from "@/utils/format";
import type { PaymentMethod, ShippingAddress } from "@/types/order";

/** Validate that a payment URL is a safe relative path (mock MVP) or known gateway domain. */
function isSafePaymentUrl(url: string): boolean {
  // Allow relative paths (mock MVP URLs like /checkout/confirmation?...)
  if (url.startsWith("/")) return true;
  // Allow known payment gateway domains
  try {
    const parsed = new URL(url);
    const allowedHosts = ["pay.vnpay.vn", "payment.momo.vn", "test-payment.momo.vn", "sandbox.vnpayment.vn"];
    return allowedHosts.includes(parsed.hostname);
  } catch {
    return false;
  }
}

interface ShippingFormData {
  fullName: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  addressDetail: string;
  shippingNote: string;
}

type FormErrors = Partial<Record<keyof ShippingFormData, string>>;

// Inline validation helpers (no Zod library)
function validateFullName(v: string): string | null {
  const trimmed = v.trim();
  if (!trimmed) return "Vui lòng nhập họ tên";
  if (trimmed.length < 2) return "Họ tên phải có ít nhất 2 ký tự";
  return null;
}

function validatePhone(v: string): string | null {
  const trimmed = v.trim();
  if (!trimmed) return "Vui lòng nhập số điện thoại";
  if (!/^(0[35789])\d{8}$/.test(trimmed))
    return "Số điện thoại không hợp lệ (VD: 0912345678)";
  return null;
}

function validateRequired(v: string, label: string): string | null {
  if (!v.trim()) return `Vui lòng nhập ${label}`;
  return null;
}

function validateAddressDetail(v: string): string | null {
  const trimmed = v.trim();
  if (!trimmed) return "Vui lòng nhập địa chỉ chi tiết";
  if (trimmed.length < 5) return "Địa chỉ chi tiết phải có ít nhất 5 ký tự";
  return null;
}

function validateForm(data: ShippingFormData): FormErrors {
  const errors: FormErrors = {};
  const fullNameErr = validateFullName(data.fullName);
  if (fullNameErr) errors.fullName = fullNameErr;
  const phoneErr = validatePhone(data.phone);
  if (phoneErr) errors.phone = phoneErr;
  const provinceErr = validateRequired(data.province, "tỉnh/thành phố");
  if (provinceErr) errors.province = provinceErr;
  const districtErr = validateRequired(data.district, "quận/huyện");
  if (districtErr) errors.district = districtErr;
  const wardErr = validateRequired(data.ward, "phường/xã");
  if (wardErr) errors.ward = wardErr;
  const addrErr = validateAddressDetail(data.addressDetail);
  if (addrErr) errors.addressDetail = addrErr;
  return errors;
}

const INITIAL_FORM: ShippingFormData = {
  fullName: "",
  phone: "",
  province: "",
  district: "",
  ward: "",
  addressDetail: "",
  shippingNote: "",
};

export function ShippingFormClient() {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const cartTotal = useCartStore((state) => state.cartTotal);
  const clearCart = useCartStore((state) => state.clearCart);
  const appliedVouchers = useCartStore((state) => state.appliedVouchers);
  const clearVouchers = useCartStore((state) => state.clearVouchers);
  const totalDiscount = useCartStore((state) => state.totalDiscount);
  const finalTotal = useCartStore((state) => state.finalTotal);

  // Guard: redirect to showroom if cart is empty
  useEffect(() => {
    if (items.length === 0) {
      router.replace("/showroom");
    }
  }, [items.length, router]);

  const [formData, setFormData] = useState<ShippingFormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isSubmittingRef = useRef(false);

  const handleChange =
    (field: keyof ShippingFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));
      // Clear field error on change
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    };

  const handleBlur = (field: keyof ShippingFormData) => () => {
    const fieldErrors = validateForm(formData);
    if (fieldErrors[field]) {
      setErrors((prev) => ({ ...prev, [field]: fieldErrors[field] }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Double-submit guard
    if (isSubmittingRef.current) return;

    const validationErrors = validateForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    if (items.length === 0) {
      router.replace("/showroom");
      return;
    }

    setSubmitError(null);
    isSubmittingRef.current = true;

    const shippingAddress: ShippingAddress = {
      province: formData.province.trim(),
      district: formData.district.trim(),
      ward: formData.ward.trim(),
      address_detail: formData.addressDetail.trim(),
    };

    const orderItems = items.map((item) => ({
      garment_id: item.garment_id,
      transaction_type: item.transaction_type,
      size: item.size,
      start_date: item.start_date,
      end_date: item.end_date,
      rental_days: item.rental_days,
    }));

    startTransition(async () => {
      try {
        // Re-validate vouchers before order submission
        let voucherCodes = appliedVouchers.map((v) => v.code);
        if (voucherCodes.length > 0) {
          const previewResult = await previewVoucherDiscount(voucherCodes, cartTotal());
          if (!previewResult.success) {
            clearVouchers();
            setSubmitError(
              (previewResult.error || "Voucher không còn hiệu lực") +
              ". Voucher đã được gỡ — vui lòng kiểm tra lại đơn hàng."
            );
            return;
          }
          voucherCodes = previewResult.data!.vouchers.map((v) => v.code);
        }
        const result = await createOrder({
          customer_name: formData.fullName.trim(),
          customer_phone: formData.phone.trim(),
          shipping_address: shippingAddress,
          shipping_note: formData.shippingNote.trim() || undefined,
          payment_method: paymentMethod,
          items: orderItems,
          voucher_codes: voucherCodes.length > 0 ? voucherCodes : undefined,
        });

        if (!result.success || !result.data) {
          setSubmitError(
            result.error || "Không thể tạo đơn hàng. Vui lòng thử lại."
          );
          return;
        }

        const { order_id, payment_url } = result.data;

        if (payment_url && paymentMethod !== "cod") {
          // VNPay / Momo: validate URL before redirect (prevent open redirect)
          if (!isSafePaymentUrl(payment_url)) {
            setSubmitError("URL thanh toán không hợp lệ. Vui lòng thử lại.");
            return;
          }
          // Do NOT clear cart for online payments — cart is cleared on confirmation page
          // after verifying payment succeeded
          window.location.href = payment_url;
        } else {
          // COD: clear cart and redirect to confirmation
          clearCart();
          router.push(`/checkout/confirmation?orderId=${order_id}`);
        }
      } finally {
        isSubmittingRef.current = false;
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#F9F7F2]">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1
          className="text-2xl md:text-3xl font-semibold text-[#1A2B4C] mb-6"
          style={{ fontFamily: "Cormorant Garamond, serif", fontWeight: 600 }}
        >
          Thông Tin Giao Hàng
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Form */}
          <div className="lg:col-span-8">
            <form
              onSubmit={handleSubmit}
              noValidate
              data-testid="shipping-form"
            >
              {/* Shipping Information */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 mb-6">
                <h2
                  className="text-lg font-semibold text-[#1A2B4C] mb-4"
                  style={{ fontFamily: "Cormorant Garamond, serif" }}
                >
                  Địa Chỉ Giao Hàng
                </h2>

                <div className="space-y-4">
                  {/* Full Name */}
                  <div>
                    <label
                      htmlFor="fullName"
                      className="block text-sm font-medium text-[#1A1A2E] mb-1"
                    >
                      Họ và Tên <span className="text-[#DC2626]">*</span>
                    </label>
                    <input
                      id="fullName"
                      type="text"
                      value={formData.fullName}
                      onChange={handleChange("fullName")}
                      onBlur={handleBlur("fullName")}
                      placeholder="Nguyễn Văn A"
                      className={`w-full px-4 py-3 rounded-lg border bg-white text-[#1A1A2E] text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37] transition-colors min-h-[44px] ${
                        errors.fullName
                          ? "border-[#DC2626]"
                          : "border-gray-300"
                      }`}
                      aria-invalid={!!errors.fullName}
                      aria-describedby={
                        errors.fullName ? "fullName-error" : undefined
                      }
                    />
                    {errors.fullName && (
                      <p
                        id="fullName-error"
                        role="alert"
                        className="mt-1 text-xs text-[#DC2626]"
                        data-testid="fullName-error"
                      >
                        {errors.fullName}
                      </p>
                    )}
                  </div>

                  {/* Phone */}
                  <div>
                    <label
                      htmlFor="phone"
                      className="block text-sm font-medium text-[#1A1A2E] mb-1"
                    >
                      Số Điện Thoại <span className="text-[#DC2626]">*</span>
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange("phone")}
                      onBlur={handleBlur("phone")}
                      placeholder="0912345678"
                      className={`w-full px-4 py-3 rounded-lg border bg-white text-[#1A1A2E] text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37] transition-colors min-h-[44px] ${
                        errors.phone ? "border-[#DC2626]" : "border-gray-300"
                      }`}
                      aria-invalid={!!errors.phone}
                      aria-describedby={
                        errors.phone ? "phone-error" : undefined
                      }
                    />
                    {errors.phone && (
                      <p
                        id="phone-error"
                        role="alert"
                        className="mt-1 text-xs text-[#DC2626]"
                        data-testid="phone-error"
                      >
                        {errors.phone}
                      </p>
                    )}
                  </div>

                  {/* Province / District / Ward */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label
                        htmlFor="province"
                        className="block text-sm font-medium text-[#1A1A2E] mb-1"
                      >
                        Tỉnh/Thành Phố <span className="text-[#DC2626]">*</span>
                      </label>
                      <input
                        id="province"
                        type="text"
                        value={formData.province}
                        onChange={handleChange("province")}
                        onBlur={handleBlur("province")}
                        placeholder="TP. Hồ Chí Minh"
                        className={`w-full px-4 py-3 rounded-lg border bg-white text-[#1A1A2E] text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37] transition-colors min-h-[44px] ${
                          errors.province
                            ? "border-[#DC2626]"
                            : "border-gray-300"
                        }`}
                        aria-invalid={!!errors.province}
                        aria-describedby={
                          errors.province ? "province-error" : undefined
                        }
                      />
                      {errors.province && (
                        <p
                          id="province-error"
                          role="alert"
                          className="mt-1 text-xs text-[#DC2626]"
                          data-testid="province-error"
                        >
                          {errors.province}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="district"
                        className="block text-sm font-medium text-[#1A1A2E] mb-1"
                      >
                        Quận/Huyện <span className="text-[#DC2626]">*</span>
                      </label>
                      <input
                        id="district"
                        type="text"
                        value={formData.district}
                        onChange={handleChange("district")}
                        onBlur={handleBlur("district")}
                        placeholder="Quận 1"
                        className={`w-full px-4 py-3 rounded-lg border bg-white text-[#1A1A2E] text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37] transition-colors min-h-[44px] ${
                          errors.district
                            ? "border-[#DC2626]"
                            : "border-gray-300"
                        }`}
                        aria-invalid={!!errors.district}
                        aria-describedby={
                          errors.district ? "district-error" : undefined
                        }
                      />
                      {errors.district && (
                        <p
                          id="district-error"
                          role="alert"
                          className="mt-1 text-xs text-[#DC2626]"
                          data-testid="district-error"
                        >
                          {errors.district}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="ward"
                        className="block text-sm font-medium text-[#1A1A2E] mb-1"
                      >
                        Phường/Xã <span className="text-[#DC2626]">*</span>
                      </label>
                      <input
                        id="ward"
                        type="text"
                        value={formData.ward}
                        onChange={handleChange("ward")}
                        onBlur={handleBlur("ward")}
                        placeholder="Phường Bến Nghé"
                        className={`w-full px-4 py-3 rounded-lg border bg-white text-[#1A1A2E] text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37] transition-colors min-h-[44px] ${
                          errors.ward
                            ? "border-[#DC2626]"
                            : "border-gray-300"
                        }`}
                        aria-invalid={!!errors.ward}
                        aria-describedby={
                          errors.ward ? "ward-error" : undefined
                        }
                      />
                      {errors.ward && (
                        <p
                          id="ward-error"
                          role="alert"
                          className="mt-1 text-xs text-[#DC2626]"
                          data-testid="ward-error"
                        >
                          {errors.ward}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Address Detail */}
                  <div>
                    <label
                      htmlFor="addressDetail"
                      className="block text-sm font-medium text-[#1A1A2E] mb-1"
                    >
                      Địa Chỉ Chi Tiết <span className="text-[#DC2626]">*</span>
                    </label>
                    <input
                      id="addressDetail"
                      type="text"
                      value={formData.addressDetail}
                      onChange={handleChange("addressDetail")}
                      onBlur={handleBlur("addressDetail")}
                      placeholder="123 Nguyễn Huệ"
                      className={`w-full px-4 py-3 rounded-lg border bg-white text-[#1A1A2E] text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37] transition-colors min-h-[44px] ${
                        errors.addressDetail
                          ? "border-[#DC2626]"
                          : "border-gray-300"
                      }`}
                      aria-invalid={!!errors.addressDetail}
                      aria-describedby={
                        errors.addressDetail
                          ? "addressDetail-error"
                          : undefined
                      }
                    />
                    {errors.addressDetail && (
                      <p
                        id="addressDetail-error"
                        role="alert"
                        className="mt-1 text-xs text-[#DC2626]"
                        data-testid="addressDetail-error"
                      >
                        {errors.addressDetail}
                      </p>
                    )}
                  </div>

                  {/* Shipping Note */}
                  <div>
                    <label
                      htmlFor="shippingNote"
                      className="block text-sm font-medium text-[#1A1A2E] mb-1"
                    >
                      Ghi Chú Giao Hàng{" "}
                      <span className="text-[#6B7280] font-normal">
                        (Không bắt buộc)
                      </span>
                    </label>
                    <textarea
                      id="shippingNote"
                      value={formData.shippingNote}
                      onChange={handleChange("shippingNote")}
                      placeholder="Giao hàng vào buổi sáng, gọi trước khi đến..."
                      rows={3}
                      maxLength={500}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-[#1A1A2E] text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37] transition-colors resize-none"
                    />
                    <p className="mt-1 text-xs text-[#6B7280] text-right">
                      {formData.shippingNote.length}/500
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 mb-6">
                <PaymentMethodSelector
                  value={paymentMethod}
                  onChange={setPaymentMethod}
                />
              </div>

              {/* Submit error */}
              {submitError && (
                <div
                  className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg"
                  role="alert"
                  data-testid="submit-error"
                >
                  <p className="text-sm text-[#DC2626]">{submitError}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => router.push("/checkout")}
                  className="flex-1 sm:flex-none px-6 py-3 rounded-lg border border-gray-300 text-[#6B7280] text-sm font-medium hover:border-gray-400 hover:text-[#1A1A2E] transition-colors min-h-[44px]"
                  data-testid="back-button"
                >
                  ← Quay Lại
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className={`flex-1 py-3 px-6 rounded-lg font-semibold text-sm transition-all duration-200 min-h-[44px] ${
                    isPending
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-[#D4AF37] text-white hover:bg-amber-600 hover:shadow-lg cursor-pointer"
                  }`}
                  data-testid="submit-button"
                >
                  {isPending ? "Đang xử lý..." : "Xác Nhận Đơn Hàng"}
                </button>
              </div>
            </form>
          </div>

          {/* Order Summary sidebar */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-4">
              <h2
                className="text-lg font-semibold text-[#1A2B4C] mb-4"
                style={{ fontFamily: "Cormorant Garamond, serif" }}
              >
                Tóm Tắt Đơn Hàng
              </h2>
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#6B7280]">Số lượng</span>
                  <span className="text-[#1A1A2E] font-medium">
                    {items.length}
                  </span>
                </div>
                {appliedVouchers.length > 0 && (
                  <div className="space-y-1.5">
                    {appliedVouchers.map((v) => (
                      <div key={v.voucher_id} className="flex items-center justify-between text-sm">
                        <span className="text-[#6B7280] flex items-center gap-1">
                          <span className={`inline-block w-1.5 h-1.5 rounded-full ${v.type === "percent" ? "bg-indigo-500" : "bg-emerald-500"}`} />
                          {v.code}
                        </span>
                        <span className="text-green-600 font-medium" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                          -{formatPrice(v.discount_amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <hr className="border-gray-200" />
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold text-[#1A1A2E]">
                    Tổng cộng
                  </span>
                  <span
                    className="text-lg font-bold text-[#D4AF37]"
                    style={{ fontFamily: "JetBrains Mono, monospace" }}
                    data-testid="order-total"
                  >
                    {formatPrice(finalTotal())}
                  </span>
                </div>
                {totalDiscount() > 0 && (
                  <p className="text-xs text-green-600 text-right">
                    Tiết kiệm {formatPrice(totalDiscount())}
                  </p>
                )}
              </div>
              {/* Item list compact */}
              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 text-xs text-[#6B7280]"
                  >
                    <span className="truncate flex-1">{item.garment_name}</span>
                    <span
                      style={{ fontFamily: "JetBrains Mono, monospace" }}
                      className="flex-shrink-0"
                    >
                      {formatPrice(item.total_price)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
