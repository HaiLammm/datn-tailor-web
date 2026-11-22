/**
 * Shared store/boutique contact info (Story 15.4).
 *
 * Single source of truth for the SiteFooter (Story 15.1) and the Contact page.
 * Owner can edit these placeholder values later.
 */

/**
 * Showroom online (bộ sưu tập + giỏ hàng). Tắt khi chưa có sản phẩm thật:
 * ẩn Showroom khỏi menu/footer/trang chủ/sitemap, ẩn giỏ hàng, noindex trang
 * /showroom. Bật lại (true) khi đã nhập hàng thật qua dashboard.
 */
export const SHOWROOM_ENABLED = false;

export const STORE = {
  name: "Áo Dài Thanh Lộc",
  address: "187B/1 Mai Hắc Đế, Phường Tân Thành, TP. Buôn Ma Thuột, tỉnh Đắk Lắk",
  phone: "0947 516 881",
  zalo: "0947 516 881",
  /**
   * Để trống = ẩn email khỏi site. Địa chỉ cũ lienhe@nhamaythanhloc.vn là domain
   * không tồn tại (mail bị trả lại). Gắn lienhe@aodaithanhloc.com khi đã tạo
   * chuyển tiếp ở Namecheap và gửi thử thành công.
   */
  email: "" as string,
  facebook: "https://facebook.com/dangloc",
  hours: "Thứ 2–CN: 7:00 – 19:00",
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
