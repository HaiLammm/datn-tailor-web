/**
 * Story 15.2: ShowroomEditorial — boutique storytelling line above the grid.
 * Static Server Component.
 */

export function ShowroomEditorial() {
  return (
    <div className="bg-white border-l-[3px] border-[#D4AF37] rounded-r-xl px-6 py-6 shadow-sm">
      <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-[#D4AF37] mb-2">
        Giữ nếp Việt
      </span>
      <p
        className="text-xl md:text-2xl italic text-[#1A2B4C]"
        style={{ fontFamily: "Cormorant Garamond, serif" }}
      >
        Mỗi tà áo là một câu chuyện — chọn câu chuyện của riêng bạn.
      </p>
    </div>
  );
}
