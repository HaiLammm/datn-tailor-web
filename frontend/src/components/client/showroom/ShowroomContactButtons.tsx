/**
 * ShowroomContactButtons — dùng khi CART_ENABLED = false (quyết định 25/11/2026).
 *
 * Showroom chỉ trưng áo kèm giá; khách giữ áo / hẹn thử qua Zalo hoặc gọi tiệm,
 * không qua giỏ hàng. Áo dài cần mặc thử cho vừa, tiệm chỉ nhận tiền mặt.
 */

import { STORE, telHref, zaloHref } from "@/lib/store-info";

interface ShowroomContactButtonsProps {
  garmentName: string;
  isAvailable: boolean;
  /** Bản gọn cho thẻ áo trong lưới */
  compact?: boolean;
}

export function ShowroomContactButtons({ garmentName, isAvailable, compact = false }: ShowroomContactButtonsProps) {
  const size = compact ? "text-sm px-3" : "text-base px-6";
  return (
    <div className="flex flex-col gap-2">
      <div className={compact ? "flex gap-2" : "flex flex-col gap-3"}>
        <a
          href={zaloHref(STORE.zalo)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Nhắn Zalo tiệm để ${isAvailable ? "giữ" : "hỏi"} áo ${garmentName}`}
          className={`flex-1 inline-flex items-center justify-center min-h-[44px] py-2 rounded-lg font-semibold bg-[#1A2B4C] text-white hover:bg-[#2A3B5C] transition-colors ${size}`}
        >
          {isAvailable ? "Nhắn Zalo giữ áo" : "Nhắn Zalo hỏi áo"}
        </a>
        <a
          href={telHref(STORE.phone)}
          className={`flex-1 inline-flex items-center justify-center min-h-[44px] py-2 rounded-lg font-semibold border-2 border-[#1A2B4C] text-[#1A2B4C] hover:bg-[#1A2B4C]/5 transition-colors ${size}`}
        >
          Gọi tiệm
        </a>
      </div>
      {!compact && (
        <p className="text-sm text-[#4A4540]">
          Nhắn kèm tên áo &ldquo;{garmentName}&rdquo;. Tiệm giữ áo và hẹn bạn đến mặc thử. Tiệm chỉ nhận tiền mặt.
        </p>
      )}
    </div>
  );
}
