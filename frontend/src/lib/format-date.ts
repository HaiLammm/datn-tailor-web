/** Format a YYYY-MM-DD blog date as Vietnamese long form, e.g. "11 tháng 6, 2026". */
export function formatBlogDate(iso: string): string {
  if (!iso) return "";
  // Parse as a plain date (avoid TZ shifts from `new Date("YYYY-MM-DD")` at UTC midnight).
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(Date.UTC(y, m - 1, d, 12)));
}
