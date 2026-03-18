"use client";

/**
 * VoucherList — Story 4.4g: Kho Voucher (Customer Voucher Wallet)
 *
 * Client Component: receives initial data from Server Component page.
 * Features:
 *  - 2-column grid on md+, single column mobile (AC1, AC5)
 *  - Voucher cards with code, discount, conditions, expiry, status (AC1, AC2)
 *  - Copy code to clipboard with 2s feedback (AC3)
 *  - Empty state (AC4)
 *  - Skeleton loading and error + retry (AC5)
 */

import { useRef, useState } from "react";

import type { VoucherItem, VoucherStatus, VoucherType } from "@/types/voucher";
import { getMyVouchers } from "@/app/actions/profile-actions";

// ─── Formatting helpers ───────────────────────────────────────────────────────

function formatDiscount(type: VoucherType, value: string): string {
  const num = parseFloat(value);
  if (type === "percent") return `Giảm ${num}%`;
  return `Giảm ${num.toLocaleString("vi-VN")}đ`;
}

function formatMinOrder(minOrderValue: string): string {
  const val = parseFloat(minOrderValue);
  if (val === 0) return "Không giới hạn";
  return `Đơn tối thiểu ${val.toLocaleString("vi-VN")}đ`;
}

function formatMaxDiscount(maxDiscountValue: string | null): string | null {
  if (!maxDiscountValue) return null;
  const val = parseFloat(maxDiscountValue);
  return `Giảm tối đa ${val.toLocaleString("vi-VN")}đ`;
}

function formatExpiryDate(dateStr: string): string {
  // Add time component so Date doesn't shift by timezone offset
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ─── Status badge config ──────────────────────────────────────────────────────

const STATUS_CONFIG: Record<VoucherStatus, { label: string; className: string }> = {
  active:  { label: "Còn hiệu lực", className: "bg-green-100 text-green-700" },
  expired: { label: "Đã hết hạn",   className: "bg-gray-100 text-gray-500"  },
  used:    { label: "Đã sử dụng",   className: "bg-amber-100 text-amber-700" },
};

// ─── Icon components ──────────────────────────────────────────────────────────

function VoucherIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
    </svg>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

// ─── Skeleton loading ─────────────────────────────────────────────────────────

function VoucherSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-gray-200 overflow-hidden flex">
      <div className="w-2 bg-gray-200 shrink-0" />
      <div className="flex-1 p-4 space-y-3">
        <div className="flex justify-between items-start">
          <div className="h-4 bg-gray-200 rounded w-24" />
          <div className="h-5 bg-gray-200 rounded w-20" />
        </div>
        <div className="h-6 bg-gray-200 rounded w-32" />
        <div className="h-3 bg-gray-200 rounded w-40" />
        <div className="flex gap-3">
          <div className="h-3 bg-gray-200 rounded w-28" />
          <div className="h-3 bg-gray-200 rounded w-24" />
        </div>
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="col-span-full text-center py-12">
      <div className="mx-auto w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mb-6">
        <VoucherIcon className="w-10 h-10 text-indigo-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Chưa có voucher nào</h3>
      <p className="text-sm text-gray-500 max-w-xs mx-auto">
        Voucher giảm giá sẽ được gửi đến bạn qua thông báo hoặc chiến dịch khuyến mãi
      </p>
    </div>
  );
}

// ─── VoucherCard ──────────────────────────────────────────────────────────────

interface VoucherCardProps {
  item: VoucherItem;
  copiedId: string | null;
  onCopy: (id: string, code: string) => void;
}

function VoucherCard({ item, copiedId, onCopy }: VoucherCardProps) {
  const isInactive = item.status !== "active";
  const statusCfg = STATUS_CONFIG[item.status];
  const isCopied = copiedId === item.id;
  const maxDiscountLabel = formatMaxDiscount(item.max_discount_value);

  return (
    <div
      className={`rounded-lg border overflow-hidden flex transition-opacity ${
        isInactive
          ? "border-gray-200 bg-white opacity-60"
          : "border-indigo-200 bg-white"
      }`}
    >
      {/* Accent bar */}
      <div
        className={`w-2 shrink-0 ${isInactive ? "bg-gray-300" : "bg-indigo-600"}`}
        aria-hidden="true"
      />

      {/* Card body */}
      <div className="flex-1 p-4">
        {/* Header: discount label + status badge */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="text-sm font-medium text-gray-700">
            {formatDiscount(item.type, item.value)}
          </span>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.className}`}
          >
            {statusCfg.label}
          </span>
        </div>

        {/* Voucher code + copy button */}
        <div className="flex items-center gap-2 mb-3">
          <code className="font-mono text-base font-bold tracking-widest text-indigo-700">
            {item.code}
          </code>
          <button
            type="button"
            onClick={() => onCopy(item.id, item.code)}
            disabled={isInactive}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
              isCopied
                ? "bg-green-100 text-green-700"
                : isInactive
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
            }`}
            aria-label={isCopied ? "Đã sao chép" : `Sao chép mã ${item.code}`}
          >
            {isCopied ? (
              <>
                <CheckIcon className="w-3.5 h-3.5" />
                Đã sao chép ✓
              </>
            ) : (
              <>
                <CopyIcon className="w-3.5 h-3.5" />
                Sao chép
              </>
            )}
          </button>
        </div>

        {/* Conditions */}
        <div className="space-y-1 text-xs text-gray-500">
          <p>Đơn tối thiểu: {formatMinOrder(item.min_order_value)}</p>
          {maxDiscountLabel && <p>{maxDiscountLabel}</p>}
          {item.description && <p className="italic">{item.description}</p>}
        </div>

        {/* Expiry */}
        <p className="mt-2 text-xs text-gray-400">
          Hạn dùng: {formatExpiryDate(item.expiry_date)}
        </p>
      </div>
    </div>
  );
}

// ─── VoucherList (main export) ────────────────────────────────────────────────

interface VoucherListProps {
  initialVouchers: VoucherItem[];
  initialError?: string;
}

export function VoucherList({ initialVouchers, initialError }: VoucherListProps) {
  const [vouchers, setVouchers] = useState<VoucherItem[]>(initialVouchers);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(initialError);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup copy timer on unmount
  // (useRef timer not registered with useEffect as it's created manually)

  async function handleRetry() {
    setIsLoading(true);
    setError(undefined);
    const result = await getMyVouchers();
    if (result.success && result.data) {
      setVouchers(result.data.vouchers);
    } else {
      setError(result.error ?? "Không thể tải danh sách voucher");
    }
    setIsLoading(false);
  }

  function handleCopy(id: string, code: string) {
    // Clear any existing timer
    if (copyTimerRef.current) {
      clearTimeout(copyTimerRef.current);
    }

    navigator.clipboard.writeText(code).then(() => {
      setCopiedId(id);
      copyTimerRef.current = setTimeout(() => {
        setCopiedId(null);
        copyTimerRef.current = null;
      }, 2000);
    }).catch(() => {
      // Clipboard access denied (non-HTTPS, permission denied, etc.)
      // Silently fail — button stays in default state as feedback
    });
  }

  // ── Loading state ──
  if (isLoading) {
    return (
      <div>
        <h2 className="text-xl font-serif font-bold text-gray-900 mb-6">Kho Voucher</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <VoucherSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (error && vouchers.length === 0) {
    return (
      <div>
        <h2 className="text-xl font-serif font-bold text-gray-900 mb-6">Kho Voucher</h2>
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            type="button"
            onClick={handleRetry}
            className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-serif font-bold text-gray-900 mb-6">Kho Voucher</h2>

      {/* Empty state (AC4) */}
      {vouchers.length === 0 ? (
        <div className="grid grid-cols-1">
          <EmptyState />
        </div>
      ) : (
        /* Voucher grid: single column mobile, 2 columns md+ (AC5) */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vouchers.map((item) => (
            <VoucherCard
              key={item.id}
              item={item}
              copiedId={copiedId}
              onCopy={handleCopy}
            />
          ))}
        </div>
      )}
    </div>
  );
}
