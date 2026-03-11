/**
 * Story 2.2: Shared garment constants — tránh DRY violations giữa page.tsx và ProductDetailClient.tsx.
 */

export const CATEGORY_LABEL: Record<string, string> = {
  ao_dai_truyen_thong: "Áo Dài Truyền Thống",
  ao_dai_cach_tan: "Áo Dài Cách Tân",
  ao_dai_cuoi: "Áo Dài Cưới",
  ao_dai_te_nhi: "Áo Dài Tế Nhị",
};

export const MATERIAL_LABEL: Record<string, string> = {
  lua: "Lụa",
  giam: "Gấm",
  nhung: "Nhung",
  voan: "Voan",
  satin: "Satin",
  cotton: "Cotton",
  pha: "Pha",
};

export const OCCASION_LABEL: Record<string, string> = {
  le_cuoi: "Lễ Cưới",
  khai_truong: "Khai Trương",
  tet: "Tết",
  cong_so: "Công Sở",
  tiec_tung: "Tiệc Tùng",
  sinh_nhat: "Sinh Nhật",
};

export const SIZE_OPTIONS = ["S", "M", "L", "XL", "XXL"] as const;
