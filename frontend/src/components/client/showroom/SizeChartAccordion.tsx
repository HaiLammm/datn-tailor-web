"use client";

/**
 * Story 2.2: SizeChartAccordion — Bảng Kích Cỡ dạng Accordion
 *
 * Dùng HTML <details>/<summary> — nhẹ, WCAG 2.1 AA compliant.
 * Mặc định collapse, click để mở rộng.
 * JetBrains Mono cho số liệu, Inter cho nhãn, thuật ngữ Việt.
 */

// Dữ liệu bảng size tĩnh — phase sau fetch từ backend per category
const SIZE_CHART: { size: string; chest: string; waist: string; hip: string; length: string }[] = [
  { size: "S",   chest: "80-84",  waist: "62-66",  hip: "86-90",  length: "135-138" },
  { size: "M",   chest: "84-88",  waist: "66-70",  hip: "90-94",  length: "138-141" },
  { size: "L",   chest: "88-92",  waist: "70-74",  hip: "94-98",  length: "141-144" },
  { size: "XL",  chest: "92-96",  waist: "74-78",  hip: "98-102", length: "144-147" },
  { size: "XXL", chest: "96-100", waist: "78-82",  hip: "102-106",length: "147-150" },
];

interface SizeChartAccordionProps {
  /** Kích cỡ sản phẩm này có sẵn — dùng để highlight */
  availableSizes: string[];
}

export function SizeChartAccordion({ availableSizes }: SizeChartAccordionProps) {
  return (
    <details className="border border-gray-200 rounded-lg overflow-hidden">
      <summary
        className="flex items-center justify-between px-4 py-3 cursor-pointer bg-[#F9F7F2] hover:bg-gray-100 transition-colors select-none"
        aria-label="Mở/đóng bảng kích cỡ"
      >
        <span
          className="font-medium text-[#1A2B4C] text-sm"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          Bảng Kích Cỡ
        </span>
        <span className="text-gray-400 text-xs" aria-hidden="true">▼</span>
      </summary>

      <div className="overflow-x-auto">
        <table className="w-full text-xs" aria-label="Bảng kích thước chi tiết">
          <thead>
            <tr className="bg-[#1A2B4C] text-[#F9F7F2]">
              <th scope="col" className="px-2 py-1.5 text-left" style={{ fontFamily: "Inter, sans-serif" }}>
                Cỡ
              </th>
              <th scope="col" className="px-2 py-1.5 text-right" style={{ fontFamily: "Inter, sans-serif" }}>
                Vòng Ngực (cm)
              </th>
              <th scope="col" className="px-2 py-1.5 text-right" style={{ fontFamily: "Inter, sans-serif" }}>
                Vòng Eo (cm)
              </th>
              <th scope="col" className="px-2 py-1.5 text-right" style={{ fontFamily: "Inter, sans-serif" }}>
                Vòng Mông (cm)
              </th>
              <th scope="col" className="px-2 py-1.5 text-right" style={{ fontFamily: "Inter, sans-serif" }}>
                Dài Áo (cm)
              </th>
            </tr>
          </thead>
          <tbody>
            {SIZE_CHART.map((row, i) => {
              const isAvailable = availableSizes.includes(row.size);
              return (
                <tr
                  key={row.size}
                  className={`border-t border-gray-100 ${
                    i % 2 === 0 ? "bg-white" : "bg-[#F9F7F2]"
                  } ${isAvailable ? "font-medium" : "opacity-50"}`}
                  aria-disabled={!isAvailable}
                >
                  <td className="px-2 py-1.5">
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-medium ${
                        isAvailable
                          ? "bg-[#1A2B4C] text-[#F9F7F2]"
                          : "bg-gray-100 text-gray-400"
                      }`}
                      style={{ fontFamily: "JetBrains Mono, monospace" }}
                    >
                      {row.size}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-right text-[#1A1A2E]" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                    {row.chest}
                  </td>
                  <td className="px-2 py-1.5 text-right text-[#1A1A2E]" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                    {row.waist}
                  </td>
                  <td className="px-2 py-1.5 text-right text-[#1A1A2E]" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                    {row.hip}
                  </td>
                  <td className="px-2 py-1.5 text-right text-[#1A1A2E]" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                    {row.length}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="px-2 py-1.5 text-xs text-gray-500" style={{ fontFamily: "Inter, sans-serif" }}>
          * Kích thước tính bằng cm. Cỡ được tô đậm là cỡ còn hàng.
        </p>
      </div>
    </details>
  );
}
