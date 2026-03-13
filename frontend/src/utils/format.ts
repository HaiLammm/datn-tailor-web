/**
 * Formatting utilities shared across components.
 */

/**
 * Format a number as Vietnamese Dong currency string.
 * Returns "0 ₫" for NaN or invalid values.
 */
export function formatPrice(amount: number): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(safeAmount);
}

/**
 * Safely parse a price string to number. Returns 0 for invalid values.
 */
export function parsePrice(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
