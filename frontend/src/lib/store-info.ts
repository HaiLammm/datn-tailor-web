/**
 * Shared store/boutique contact info (Story 15.4).
 *
 * Single source of truth for the SiteFooter (Story 15.1) and the Contact page.
 * Owner can edit these placeholder values later.
 */

export const STORE = {
  name: "Nhà May Thanh Lộc",
  address: "123 Đường Lê Lợi, Quận 1, TP. Hồ Chí Minh",
  phone: "0901 234 567",
  zalo: "0901 234 567",
  email: "lienhe@nhamaythanhloc.vn",
  hours: "Thứ 2–CN: 8:00 – 20:00",
} as const;

/** Google Maps embed URL for the store address (no API key needed). */
export const STORE_MAP_EMBED_URL =
  "https://www.google.com/maps?q=" +
  encodeURIComponent(STORE.address) +
  "&output=embed";

export function telHref(phone: string): string {
  return `tel:${phone.replace(/\s+/g, "")}`;
}

export function zaloHref(phone: string): string {
  return `https://zalo.me/${phone.replace(/\s+/g, "")}`;
}
