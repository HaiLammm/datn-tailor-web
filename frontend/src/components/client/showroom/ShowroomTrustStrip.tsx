/**
 * Story 15.2: ShowroomTrustStrip — boutique trust signals below the grid.
 * Static Server Component. Inline SVG icons (no icon library installed).
 */

const TRUST_ITEMS = [
  { title: "May vừa in dáng bạn", subtext: "Theo số đo của riêng bạn" },
  { title: "Yên tâm đổi trả", subtext: "Trong vòng 7 ngày" },
  { title: "Vải đẹp tuyển chọn", subtext: "Lụa & gấm thượng hạng" },
  { title: "Luôn bên cạnh bạn", subtext: "Trò chuyện qua Zalo bất cứ lúc nào" },
] as const;

function CheckIcon() {
  return (
    <svg
      className="w-6 h-6 text-[#059669] shrink-0 mt-0.5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

export function ShowroomTrustStrip() {
  return (
    <section
      aria-label="Cam kết của chúng tôi"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm"
    >
      {TRUST_ITEMS.map((item) => (
        <div key={item.title} className="flex gap-3">
          <CheckIcon />
          <div>
            <p className="text-sm font-semibold text-[#1A2B4C]">{item.title}</p>
            <p className="text-xs text-gray-500 mt-0.5">{item.subtext}</p>
          </div>
        </div>
      ))}
    </section>
  );
}
