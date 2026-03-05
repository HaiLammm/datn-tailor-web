"use client";

/**
 * Adaptive Canvas Placeholder Component
 * Story 2.1: Lựa chọn Trụ cột Phong cách
 *
 * Placeholder for SVG pattern rendering.
 * Full implementation in Story 3.1: Adaptive Canvas - Khởi tạo Rập chuẩn.
 *
 * Will use Refs and requestAnimationFrame for transforms (per project rules).
 */

import { useDesignStore } from "@/store/designStore";

interface AdaptiveCanvasProps {
  width?: number;
  height?: number;
}

/**
 * Adaptive Canvas - Placeholder
 *
 * Future functionality:
 * - Display base SVG pattern
 * - Apply real-time transforms based on intensity values
 * - Support zoom and pan interactions
 */
export function AdaptiveCanvas({
  width = 600,
  height = 400,
}: AdaptiveCanvasProps) {
  const { selected_pillar, intensity_values, is_pillar_selected } =
    useDesignStore();

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Canvas header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">
          Bản vẽ Thiết kế
        </h3>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            Sẵn sàng
          </span>
        </div>
      </div>

      {/* Canvas area */}
      <div
        className="relative flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100"
        style={{ width: "100%", height }}
      >
        {!is_pillar_selected ? (
          // No pillar selected state
          <div className="text-center p-8">
            <svg
              className="w-16 h-16 mx-auto text-gray-300 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-gray-500">
              Chọn phong cách để xem bản vẽ thiết kế
            </p>
          </div>
        ) : (
          // Placeholder SVG
          <div className="relative w-full h-full flex flex-col items-center justify-center">
            {/* Placeholder pattern */}
            <svg
              width={width * 0.8}
              height={height * 0.8}
              viewBox="0 0 200 300"
              className="drop-shadow-sm"
            >
              {/* Simple shirt pattern placeholder */}
              <defs>
                <linearGradient
                  id="fabricGradient"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#f0f0f0" />
                  <stop offset="100%" stopColor="#e0e0e0" />
                </linearGradient>
              </defs>

              {/* Body shape */}
              <path
                d="M100 30 L140 50 L150 80 L145 200 L130 280 L70 280 L55 200 L50 80 L60 50 Z"
                fill="url(#fabricGradient)"
                stroke="#d0d0d0"
                strokeWidth="1"
              />

              {/* Collar */}
              <path
                d="M80 30 Q100 50 120 30 Q100 45 80 30"
                fill="#f5f5f5"
                stroke="#d0d0d0"
                strokeWidth="1"
              />

              {/* Shoulder lines */}
              <line
                x1="60"
                y1="50"
                x2="80"
                y2="30"
                stroke="#c0c0c0"
                strokeWidth="1"
                strokeDasharray="4 2"
              />
              <line
                x1="140"
                y1="50"
                x2="120"
                y2="30"
                stroke="#c0c0c0"
                strokeWidth="1"
                strokeDasharray="4 2"
              />

              {/* Center line */}
              <line
                x1="100"
                y1="50"
                x2="100"
                y2="280"
                stroke="#c0c0c0"
                strokeWidth="1"
                strokeDasharray="4 2"
              />
            </svg>

            {/* Info overlay */}
            <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 text-xs">
              <div className="flex items-center justify-between text-gray-600">
                <span>Phong cách: {selected_pillar?.name}</span>
                <span className="text-indigo-600 font-medium">
                  Story 3.1: Triển khai đầy đủ
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Canvas footer - zoom controls placeholder */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled
            className="p-1.5 text-gray-400 rounded hover:bg-gray-200 disabled:opacity-50"
          >
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
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
              />
            </svg>
          </button>
          <span className="text-xs text-gray-400">100%</span>
          <button
            type="button"
            disabled
            className="p-1.5 text-gray-400 rounded hover:bg-gray-200 disabled:opacity-50"
          >
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
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"
              />
            </svg>
          </button>
        </div>
        <span className="text-xs text-gray-400">
          Placeholder - Full implementation in Story 3.1
        </span>
      </div>
    </div>
  );
}
