"use client";

/**
 * FabricRecommendationPanel Component - Story 2.3
 *
 * Panel with "Xem gợi ý vải" button, loading state, and grid of FabricCards.
 * Non-blocking optional feature — user can skip and continue.
 */

import { useCallback } from "react";
import { fetchFabricRecommendations } from "@/app/actions/design-actions";
import { useDesignStore } from "@/store/designStore";
import { FabricCard } from "./FabricCard";

const HERITAGE_GOLD = "#D4AF37";

export function FabricRecommendationPanel() {
  const {
    selected_pillar,
    intensity_values,
    fabric_recommendations,
    is_loading_fabrics,
    setFabricRecommendations,
    setLoadingFabrics,
    clearFabricRecommendations,
    setError,
  } = useDesignStore();

  const handleFetchRecommendations = useCallback(async () => {
    if (!selected_pillar) return;

    setLoadingFabrics(true);
    clearFabricRecommendations();

    const result = await fetchFabricRecommendations(
      selected_pillar.id,
      intensity_values
    );

    if ("error" in result) {
      setError(result.error);
      setLoadingFabrics(false);
      return;
    }

    setFabricRecommendations(result.fabrics);
  }, [
    selected_pillar,
    intensity_values,
    setFabricRecommendations,
    setLoadingFabrics,
    clearFabricRecommendations,
    setError,
  ]);

  // Not ready: no pillar selected
  if (!selected_pillar) {
    return null;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Gợi ý Chất liệu Vải
          </h3>
          <p className="text-sm text-gray-500">
            Dựa trên phong cách và cường độ đã chọn
          </p>
        </div>

        <button
          type="button"
          data-testid="fetch-fabrics-btn"
          onClick={handleFetchRecommendations}
          disabled={is_loading_fabrics}
          className="px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          style={{
            backgroundColor: is_loading_fabrics ? "#E5E7EB" : `${HERITAGE_GOLD}15`,
            color: is_loading_fabrics ? "#9CA3AF" : HERITAGE_GOLD,
            border: `1px solid ${is_loading_fabrics ? "#D1D5DB" : HERITAGE_GOLD}40`,
          }}
        >
          {is_loading_fabrics ? "Đang tải..." : "Xem gợi ý vải"}
        </button>
      </div>

      {/* Loading spinner */}
      {is_loading_fabrics && (
        <div data-testid="fabric-loading" className="flex justify-center py-8">
          <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-indigo-600 rounded-full" />
        </div>
      )}

      {/* Fabric cards grid */}
      {fabric_recommendations.length > 0 && !is_loading_fabrics && (
        <div data-testid="fabric-grid" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fabric_recommendations.map((fabric) => (
            <FabricCard key={fabric.id} fabric={fabric} />
          ))}
        </div>
      )}

      {/* Empty state — before first fetch */}
      {fabric_recommendations.length === 0 && !is_loading_fabrics && (
        <div data-testid="fabric-empty" className="text-center py-6 text-sm text-gray-400">
          Nhấn &quot;Xem gợi ý vải&quot; để nhận gợi ý chất liệu phù hợp
        </div>
      )}
    </div>
  );
}
