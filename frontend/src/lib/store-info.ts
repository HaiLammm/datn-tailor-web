/**
 * Shared store/boutique contact info (Story 15.4).
 *
 * Single source of truth for the SiteFooter (Story 15.1) and the Contact page.
 * Owner can edit these placeholder values later.
 */

export const STORE = {
  name: "Nhà May Thanh Lộc",
  address: "187B/1 Mai Hắc Đế, Phường Tân Thành, TP. Buôn Ma Thuột, tỉnh Đắk Lắk",
  phone: "0947 516 861",
  zalo: "0947 516 861",
  email: "lienhe@nhamaythanhloc.vn",
  hours: "Thứ 2–CN: 8:00 – 20:00",
} as const;

/** Google Maps embed URL for the store address (no API key needed). */
export const STORE_MAP_EMBED_URL =
  "https://maps.google.com/maps?q=" +
  encodeURIComponent(STORE.address) +
  "&output=embed";

export function telHref(phone: string): string {
  return `tel:${phone.replace(/\s+/g, "")}`;
}

export function zaloHref(phone: string): string {
  return `https://zalo.me/${phone.replace(/\s+/g, "")}`;
}
