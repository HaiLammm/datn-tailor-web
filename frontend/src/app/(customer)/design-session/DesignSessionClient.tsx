"use client";

/**
 * Design Session Client Component
 * Story 2.1, 2.2, 2.3 & 2.4: Phong cách, Cường độ, Gợi ý Vải & Master Geometry
 *
 * Client-side component that manages design session UI.
 * Uses Zustand for state management.
 */

import { useCallback } from "react";

import {
  AdaptiveCanvas,
  FabricRecommendationPanel,
  IntensitySliders,
  StylePillarSelector,
} from "@/components/client/design";
import { useDesignStore } from "@/store/designStore";
import type { StylePillarResponse } from "@/types/style";

import { translateDesign } from "@/app/actions/design-actions";

interface DesignSessionClientProps {
  initialPillars: StylePillarResponse[];
}

/**
 * Design Session Client
 *
 * Manages:
 * - Style pillar selection (FR1)
 * - Intensity slider display (FR2)
 * - Canvas placeholder (FR3)
 * - Master Geometry translation (Story 2.4)
 */
export function DesignSessionClient({
  initialPillars,
}: DesignSessionClientProps) {
  // Story 2.4: Translation state from store
  const selectedPillar = useDesignStore((state) => state.selected_pillar);
  const intensityValues = useDesignStore((state) => state.intensity_values);
  const isTranslating = useDesignStore((state) => state.is_translating);
  const translateError = useDesignStore((state) => state.translate_error);
  const masterGeometry = useDesignStore((state) => state.master_geometry);
  const setTranslating = useDesignStore((state) => state.setTranslating);
  const setMasterGeometry = useDesignStore((state) => state.setMasterGeometry);
  const setTranslateError = useDesignStore((state) => state.setTranslateError);
  const lastSubmittedSequence = useDesignStore(
    (state) => state.last_submitted_sequence
  );

  /**
   * Handle "Tạo bản vẽ" button click.
   * Invokes the Emotional Compiler Engine to translate intensities to deltas.
   */
  const handleTranslate = useCallback(async () => {
    if (!selectedPillar) return;

    setTranslating(true);
    setTranslateError(null);

    // Convert intensities to array format expected by API
    const intensitiesArray = Object.entries(intensityValues).map(
      ([key, value]) => ({ key, value })
    );

    const result = await translateDesign(
      selectedPillar.id,
      intensitiesArray,
      lastSubmittedSequence + 1
    );

    if (result.success && result.snapshot) {
      setMasterGeometry(result.snapshot);
    } else {
      setTranslateError(result.error ?? "Lỗi không xác định");
    }
  }, [
    selectedPillar,
    intensityValues,
    lastSubmittedSequence,
    setTranslating,
    setMasterGeometry,
    setTranslateError,
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-amber-50">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-serif font-bold text-indigo-900 mb-2">
            Phiên Thiết kế
          </h1>
          <p className="text-gray-600">
            Chọn phong cách và điều chỉnh các thông số để tạo thiết kế phù hợp
            với bạn.
          </p>
        </div>

        {/* Main content - two column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column - Canvas and Pillar Selection */}
          <div className="lg:col-span-2 space-y-8">
            {/* Canvas */}
            <AdaptiveCanvas height={400} />

            {/* Style Pillar Selector */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <StylePillarSelector pillars={initialPillars} />
            </div>
          </div>

          {/* Right column - Intensity Sliders & Fabric Recommendations */}
          <div className="lg:col-span-1 space-y-8">
            <div className="sticky top-8 space-y-8">
              <IntensitySliders />
              <FabricRecommendationPanel />

              {/* Story 2.4: Translation Button and Result */}
              {selectedPillar && (
                <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Tạo bản vẽ kỹ thuật
                  </h3>

                  {/* Translation Button */}
                  <button
                    type="button"
                    onClick={handleTranslate}
                    disabled={isTranslating}
                    className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors ${
                      isTranslating
                        ? "bg-indigo-400 cursor-not-allowed"
                        : "bg-indigo-600 hover:bg-indigo-700"
                    }`}
                    aria-busy={isTranslating}
                  >
                    {isTranslating ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg
                          className="animate-spin h-5 w-5"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Đang xử lý...
                      </span>
                    ) : (
                      "Tạo bản vẽ"
                    )}
                  </button>

                  {/* Translation Error */}
                  {translateError && (
                    <div
                      className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
                      role="alert"
                    >
                      {translateError}
                    </div>
                  )}

                  {/* Master Geometry Result */}
                  {masterGeometry && (
                    <div className="space-y-3">
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-green-700 text-sm font-medium">
                          Bản vẽ đã được tạo thành công!
                        </p>
                        <p className="text-green-600 text-xs mt-1">
                          Thời gian xử lý:{" "}
                          {masterGeometry.sequence_id > 0
                            ? `< 1 giây`
                            : "N/A"}
                        </p>
                      </div>

                      {/* Delta Values Display */}
                      <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
                        <div className="p-3 bg-gray-50">
                          <h4 className="text-sm font-medium text-gray-700">
                            Các điều chỉnh (Deltas)
                          </h4>
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {masterGeometry.deltas.map((delta) => (
                            <div
                              key={delta.key}
                              className="flex justify-between items-center px-3 py-2 text-sm"
                            >
                              <span className="text-gray-600">
                                {delta.label_vi}
                              </span>
                              <span
                                className={`font-mono ${
                                  delta.value > 0
                                    ? "text-green-600"
                                    : delta.value < 0
                                      ? "text-red-600"
                                      : "text-gray-500"
                                }`}
                              >
                                {delta.value > 0 ? "+" : ""}
                                {delta.value.toFixed(1)} {delta.unit}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Geometry Hash (for debugging/verification) */}
                      <div className="text-xs text-gray-400 font-mono truncate">
                        Hash: {masterGeometry.geometry_hash.slice(0, 16)}...
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Session info footer */}
        <div className="mt-12 p-4 bg-white/50 backdrop-blur-sm rounded-lg border border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Story 2.4: Dịch thuật Cảm xúc sang Ease Delta</span>
            <span className="text-indigo-600 font-medium">
              {initialPillars.length} phong cách có sẵn
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
