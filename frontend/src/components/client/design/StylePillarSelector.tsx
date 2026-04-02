"use client";

/**
 * Style Pillar Selector Component
 * Story 2.1: Lựa chọn Phong cách
 *
 * Displays available style pillars and allows selection.
 * Updates Zustand store when pillar is selected (FR1, FR2).
 */

import { useDesignStore } from "@/store/designStore";
import type { StylePillarResponse } from "@/types/style";

interface StylePillarSelectorProps {
  pillars: StylePillarResponse[];
  isLoading?: boolean;
}

/**
 * Card component for individual style pillar
 */
function PillarCard({
  pillar,
  isSelected,
  onSelect,
}: {
  pillar: StylePillarResponse;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`
        relative w-full p-6 rounded-xl border-2 text-left transition-all duration-200
        hover:shadow-lg hover:scale-[1.02]
        ${
          isSelected
            ? "border-indigo-500 bg-indigo-50 shadow-md"
            : "border-gray-200 bg-white hover:border-indigo-300"
        }
      `}
    >
      {/* Default badge */}
      {pillar.is_default && (
        <span className="absolute top-2 right-2 px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
          Mặc định
        </span>
      )}

      {/* Selected indicator */}
      {isSelected && (
        <span className="absolute top-2 left-2 w-6 h-6 flex items-center justify-center bg-indigo-500 text-white rounded-full">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </span>
      )}

      {/* Pillar image placeholder */}
      <div className="w-full h-32 mb-4 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
        {pillar.image_url ? (
          <img
            src={pillar.image_url}
            alt={pillar.name}
            className="w-full h-full object-cover rounded-lg"
          />
        ) : (
          <svg
            className="w-12 h-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
        )}
      </div>

      {/* Pillar info */}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {pillar.name}
      </h3>
      <p className="text-sm text-gray-600 line-clamp-2">{pillar.description}</p>

      {/* Slider count */}
      <div className="mt-4 flex items-center text-xs text-gray-500">
        <svg
          className="w-4 h-4 mr-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
          />
        </svg>
        {pillar.sliders.length} thanh điều chỉnh
      </div>
    </button>
  );
}

/**
 * Style Pillar Selector
 *
 * Displays grid of style pillars for user selection.
 * On selection, updates the design store with pillar and default slider values.
 */
export function StylePillarSelector({
  pillars,
  isLoading = false,
}: StylePillarSelectorProps) {
  const { selected_pillar, selectPillar } = useDesignStore();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse bg-gray-200 rounded-xl h-64"
          />
        ))}
      </div>
    );
  }

  if (pillars.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="w-16 h-16 mx-auto text-gray-400 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Chưa có phong cách nào
        </h3>
        <p className="text-gray-600">
          Vui lòng liên hệ quản trị viên để thêm phong cách thiết kế.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Chọn Phong cách Thiết kế
        </h2>
        <p className="text-gray-600">
          Mỗi phong cách có bộ quy tắc thẩm mỹ riêng, ảnh hưởng đến kiểu dáng và
          chi tiết của thiết kế.
        </p>
      </div>

      {/* Pillar grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pillars.map((pillar) => (
          <PillarCard
            key={pillar.id}
            pillar={pillar}
            isSelected={selected_pillar?.id === pillar.id}
            onSelect={() => selectPillar(pillar)}
          />
        ))}
      </div>

      {/* Selected pillar info */}
      {selected_pillar && (
        <div className="mt-8 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
          <div className="flex items-center gap-2 text-indigo-700">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="font-medium">
              Đã chọn: {selected_pillar.name}
            </span>
          </div>
          <p className="mt-2 text-sm text-indigo-600">
            {selected_pillar.sliders.length} thanh điều chỉnh cường độ đã được
            kích hoạt.
          </p>
        </div>
      )}
    </div>
  );
}
