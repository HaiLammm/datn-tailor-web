/**
 * Tiện ích SEO dùng chung: địa chỉ gốc của site, đường dẫn sản phẩm dạng slug,
 * và dữ liệu có cấu trúc (JSON-LD) cho tiệm.
 */
import { STORE } from "@/lib/store-info";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://aodaithanhloc.com").replace(/\/$/, "");

const UUID_RE = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

/** "Áo dài cưới lụa Đỏ" → "ao-dai-cuoi-lua-do" */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");
}

/** Đường dẫn chuẩn của một sản phẩm: /showroom/<slug-tên>-<uuid>. */
export function garmentPath(garment: { id: string; name: string }): string {
  const slug = slugify(garment.name);
  return `/showroom/${slug ? `${slug}-` : ""}${garment.id}`;
}

/** Lấy UUID ở cuối tham số đường dẫn (chấp nhận cả dạng cũ chỉ có UUID). */
export function garmentIdFromParam(param: string): string | null {
  const m = decodeURIComponent(param).match(UUID_RE);
  return m ? m[1].toLowerCase() : null;
}

/** JSON-LD cho tiệm (doanh nghiệp địa phương) — hiển thị trên trang chủ. */
export function storeJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "ClothingStore",
    "@id": `${SITE_URL}/#store`,
    name: STORE.name,
    url: SITE_URL,
    image: `${SITE_URL}/shop/storefront.jpg`,
    telephone: `+84${STORE.phone.replace(/\s+/g, "").replace(/^0/, "")}`,
    priceRange: "₫₫",
    address: {
      "@type": "PostalAddress",
      streetAddress: "187B/1 Mai Hắc Đế, Phường Tân Thành",
      addressLocality: "Buôn Ma Thuột",
      addressRegion: "Đắk Lắk",
      addressCountry: "VN",
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        opens: "07:00",
        closes: "19:00",
      },
    ],
    areaServed: "Đắk Lắk",
    knowsAbout: ["May áo dài", "Áo dài cưới", "Cho thuê áo dài"],
  };
}

/** Chèn JSON-LD an toàn vào <script> (chặn chuỗi "</script>"). */
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
