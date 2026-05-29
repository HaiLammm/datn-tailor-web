"use client";

/**
 * ContactForm — Story 15.4: public website contact form → CRM Lead.
 *
 * react-hook-form + Zod (publicLeadSchema). Submits via the public
 * `submitContactLead` server action (no auth). Graceful Recovery: on failure
 * the entered values are preserved and the user can retry. Includes a hidden
 * honeypot (`company`) field for anti-spam.
 */

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { submitContactLead } from "@/app/actions/lead-actions";
import {
  publicLeadSchema,
  type PublicLeadFormInput,
  type PublicLeadInput,
} from "@/types/lead";

const CORMORANT = { fontFamily: "Cormorant Garamond, serif" } as const;

const fieldBase =
  "w-full min-h-[44px] rounded-lg border bg-white px-4 py-2.5 text-[#1A2B4C] placeholder:text-[#9CA3AF] " +
  "focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]";

export default function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(
    null
  );

  // Auto-dismiss the toast 3s after it appears.
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PublicLeadFormInput, undefined, PublicLeadInput>({
    resolver: zodResolver(publicLeadSchema) as never,
  });

  const onSubmit = async (data: PublicLeadInput) => {
    setIsSubmitting(true);
    setErrorMsg(null);

    const result = await submitContactLead({
      name: data.name,
      phone: data.phone ?? null,
      email: data.email ?? null,
      notes: data.notes ?? null,
      company: data.company ?? null,
    });

    setIsSubmitting(false);

    if (result.success) {
      reset();
      showToast("Cảm ơn bạn, chúng tôi sẽ liên hệ sớm", "success");
    } else {
      // Graceful Recovery: keep entered values, let the user retry.
      const msg = result.error ?? "Không gửi được. Vui lòng thử lại.";
      setErrorMsg(msg);
      showToast(msg, "error");
    }
  };

  const errClass = (hasError: boolean) =>
    `${fieldBase} ${hasError ? "border-red-400" : "border-[#E5E1D8]"}`;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <h2 className="text-2xl font-serif font-semibold text-[#1A2B4C]" style={CORMORANT}>
        Gửi lời nhắn cho chúng tôi
      </h2>

      {errorMsg && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {errorMsg} — vui lòng nhấn “Gửi lời nhắn” để thử lại.
        </div>
      )}

      {/* Họ tên */}
      <div>
        <label htmlFor="contact-name" className="mb-1.5 block text-sm font-medium text-[#1A2B4C]">
          Họ tên <span className="text-red-500">*</span>
        </label>
        <input
          id="contact-name"
          type="text"
          placeholder="Nguyễn Thị A"
          aria-invalid={errors.name ? "true" : undefined}
          aria-describedby={errors.name ? "contact-name-error" : undefined}
          className={errClass(!!errors.name)}
          {...register("name")}
        />
        {errors.name && (
          <p id="contact-name-error" className="mt-1.5 text-sm text-red-600">
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Số điện thoại */}
      <div>
        <label htmlFor="contact-phone" className="mb-1.5 block text-sm font-medium text-[#1A2B4C]">
          Số điện thoại
        </label>
        <input
          id="contact-phone"
          type="tel"
          placeholder="0901 234 567"
          aria-invalid={errors.phone ? "true" : undefined}
          aria-describedby={errors.phone ? "contact-phone-error" : undefined}
          className={errClass(!!errors.phone)}
          {...register("phone")}
        />
        {errors.phone && (
          <p id="contact-phone-error" className="mt-1.5 text-sm text-red-600">
            {errors.phone.message}
          </p>
        )}
      </div>

      {/* Email */}
      <div>
        <label htmlFor="contact-email" className="mb-1.5 block text-sm font-medium text-[#1A2B4C]">
          Email
        </label>
        <input
          id="contact-email"
          type="email"
          placeholder="ban@email.com"
          aria-invalid={errors.email ? "true" : undefined}
          aria-describedby={errors.email ? "contact-email-error" : undefined}
          className={errClass(!!errors.email)}
          {...register("email")}
        />
        {errors.email && (
          <p id="contact-email-error" className="mt-1.5 text-sm text-red-600">
            {errors.email.message}
          </p>
        )}
      </div>

      {/* Lời nhắn */}
      <div>
        <label htmlFor="contact-notes" className="mb-1.5 block text-sm font-medium text-[#1A2B4C]">
          Lời nhắn
        </label>
        <textarea
          id="contact-notes"
          rows={4}
          placeholder="Bạn muốn may áo dài cho dịp gì? Hãy kể cho chúng tôi nghe..."
          className={`${errClass(false)} resize-y`}
          {...register("notes")}
        />
      </div>

      {/* Honeypot — hidden from humans; bots fill it and get silently dropped. */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="contact-company">Company</label>
        <input
          id="contact-company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          {...register("company")}
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-[#D4AF37] px-6 py-3 font-semibold text-[#1A2B4C] transition-colors hover:bg-[#c4a032] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A2B4C]"
      >
        {isSubmitting && (
          <svg
            className="h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {isSubmitting ? "Đang gửi..." : "Gửi lời nhắn"}
      </button>

      {/* Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg px-5 py-3 text-sm font-medium shadow-lg ${
            toast.type === "success"
              ? "bg-[#059669] text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}
    </form>
  );
}
