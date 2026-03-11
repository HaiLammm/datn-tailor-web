"use client";

/**
 * Story 2.2: ProductImageGallery — Image Gallery với Zoom Support
 *
 * - Desktop: hover zoom qua react-medium-image-zoom
 * - Mobile: pinch-to-zoom & double-tap via react-medium-image-zoom
 * - Thumbnail strip: horizontal scroll mobile, vertical strip desktop
 * - Keyboard navigation: arrow keys
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Image from "next/image";
import Zoom from "react-medium-image-zoom";
import "react-medium-image-zoom/dist/styles.css";

interface ProductImageGalleryProps {
  /** Ảnh chính (backward-compatible) */
  imageUrl: string | null;
  /** Danh sách ảnh HD (Story 2.2) */
  imageUrls: string[];
  /** Tên sản phẩm dùng cho alt text */
  productName: string;
}

export function ProductImageGallery({
  imageUrl,
  imageUrls,
  productName,
}: ProductImageGalleryProps) {
  // Gộp imageUrls + imageUrl fallback thành danh sách hiển thị
  const allImages = useMemo(
    () => (imageUrls.length > 0 ? imageUrls : imageUrl ? [imageUrl] : []),
    [imageUrls, imageUrl]
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const galleryRef = useRef<HTMLDivElement>(null);

  const goTo = useCallback(
    (index: number) => {
      if (index < 0 || index >= allImages.length) return;
      setActiveIndex(index);
    },
    [allImages.length]
  );

  // Keyboard navigation (arrow keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement === galleryRef.current || galleryRef.current?.contains(document.activeElement)) {
        if (e.key === "ArrowLeft") goTo(activeIndex - 1);
        if (e.key === "ArrowRight") goTo(activeIndex + 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, goTo]);

  if (allImages.length === 0) {
    return (
      <div className="w-full h-full min-h-[384px] flex items-center justify-center bg-[#F9F7F2] rounded-lg border border-gray-200">
        <span className="text-gray-400 text-sm">Chưa có hình ảnh</span>
      </div>
    );
  }

  const activeImage = allImages[activeIndex];

  return (
    <div
      ref={galleryRef}
      className="flex flex-col md:flex-row gap-3"
      aria-label={`Thư viện ảnh ${productName}`}
      tabIndex={0}
    >
      {/* Thumbnail strip — vertical trên desktop, horizontal scroll trên mobile */}
      {allImages.length > 1 && (
        <div
          className="flex md:flex-col gap-2 overflow-x-auto md:overflow-y-auto md:overflow-x-hidden md:max-h-[500px] pb-1 md:pb-0 md:pr-1 shrink-0"
          role="tablist"
          aria-label="Danh sách ảnh thu nhỏ"
        >
          {allImages.map((url, i) => (
            <button
              key={url}
              role="tab"
              aria-selected={i === activeIndex}
              aria-label={`Ảnh ${i + 1} của ${allImages.length}`}
              onClick={() => goTo(i)}
              className={`relative shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] ${
                i === activeIndex
                  ? "border-[#D4AF37]"
                  : "border-gray-200 hover:border-gray-400"
              }`}
            >
              <Image
                src={url}
                alt={`${productName} - ảnh thu nhỏ ${i + 1}`}
                fill
                sizes="64px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Main image viewer */}
      <div className="relative flex-1 min-h-[320px] md:min-h-[420px] rounded-lg overflow-hidden bg-gray-100">
        <Zoom>
          <div className="relative w-full h-full min-h-[320px] md:min-h-[420px]">
            <Image
              src={activeImage}
              alt={`${productName} - ảnh ${activeIndex + 1}`}
              fill
              sizes="(max-width: 768px) 100vw, 60vw"
              className="object-cover"
              priority={activeIndex === 0}
            />
          </div>
        </Zoom>

        {/* Arrow navigation overlay (mobile friendly) */}
        {allImages.length > 1 && (
          <>
            <button
              onClick={() => goTo(activeIndex - 1)}
              disabled={activeIndex === 0}
              aria-label="Ảnh trước"
              className="absolute left-2 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full bg-white/80 text-[#1A2B4C] shadow hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
            >
              ‹
            </button>
            <button
              onClick={() => goTo(activeIndex + 1)}
              disabled={activeIndex === allImages.length - 1}
              aria-label="Ảnh tiếp theo"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full bg-white/80 text-[#1A2B4C] shadow hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
            >
              ›
            </button>

            {/* Dot indicator */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5" aria-hidden="true">
              {allImages.map((_, i) => (
                <span
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    i === activeIndex ? "bg-[#D4AF37] w-3" : "bg-white/70"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
