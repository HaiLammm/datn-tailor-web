"use client";

/**
 * Design Session Client Component
 * Story 2.1, 2.2, 2.3 & 2.4: Phong cách, Cường độ, Gợi ý Vải & Master Geometry
 *
 * Client-side component that manages design session UI.
 * Uses Zustand for state management.
 */

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";

import {
  AdaptiveCanvas,
  FabricRecommendationPanel,
  IntensitySliders,
  SanityCheckDashboard,
  StylePillarSelector,
  OverrideHistoryPanel,
} from "@/components/client/design";
import { useDesignStore } from "@/store/designStore";
import type { StylePillarResponse } from "@/types/style";
import type { MasterGeometry, SanityCheckResponse } from "@/types/geometry";
import type { OverrideHistoryItem } from "@/types/override";

import { translateDesign } from "@/app/actions/design-actions";
import { lockDesign, checkGuardrails, fetchSanityCheck } from "@/app/actions/geometry-actions";
import { submitOverride, fetchOverrideHistory } from "@/app/actions/override-actions";

function LoadingSpinner() {
  return (
    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

interface DesignSessionClientProps {
  initialPillars: StylePillarResponse[];
  initialGeometry: MasterGeometry | null;
  /** Body measurements in Vietnamese keys for guardrail checks */
  baseMeasurements?: Record<string, number>;
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
  initialGeometry,
  baseMeasurements = {},
}: DesignSessionClientProps) {
  const { data: session } = useSession();

  // Story 2.4: Translation state from store
  const selectedPillar = useDesignStore((state) => state.selected_pillar);
  const intensityValues = useDesignStore((state) => state.intensity_values);
  const isTranslating = useDesignStore((state) => state.is_translating);
  const translateError = useDesignStore((state) => state.translate_error);
  const masterGeometry = useDesignStore((state) => state.master_geometry);
  const currentPattern = useDesignStore((state) => state.current_pattern);
  const setTranslating = useDesignStore((state) => state.setTranslating);
  const setMasterGeometry = useDesignStore((state) => state.setMasterGeometry);
  const setCurrentPattern = useDesignStore((state) => state.setCurrentPattern);
  const setTranslateError = useDesignStore((state) => state.setTranslateError);
  const lastSubmittedSequence = useDesignStore(
    (state) => state.last_submitted_sequence
  );

  // Story 3.2: Current morph delta
  const currentMorphDelta = useDesignStore((state) => state.current_morph_delta);

  // Story 3.4: Lock Design state
  const isDesignLocked = useDesignStore((state) => state.is_design_locked);
  const isLocking = useDesignStore((state) => state.is_locking);
  const lockError = useDesignStore((state) => state.lock_error);
  const lockedDesignId = useDesignStore((state) => state.locked_design_id);
  const lockedGeometryHash = useDesignStore((state) => state.locked_geometry_hash);
  const setLocking = useDesignStore((state) => state.setLocking);
  const setLockResult = useDesignStore((state) => state.setLockResult);
  const setLockError = useDesignStore((state) => state.setLockError);

  // Story 4.1b: Guardrail state
  const guardrailStatus = useDesignStore((state) => state.guardrail_status);
  const guardrailViolations = useDesignStore((state) => state.guardrail_violations);
  const guardrailWarnings = useDesignStore((state) => state.guardrail_warnings);
  const setGuardrailResult = useDesignStore((state) => state.setGuardrailResult);
  const snapBackToSafe = useDesignStore((state) => state.snapBackToSafe);

  // Story 4.2: Sanity Check Dashboard state
  const [sanityCheckData, setSanityCheckData] = useState<SanityCheckResponse | null>(null);
  const [isSanityCheckLoading, setIsSanityCheckLoading] = useState(false);
  const [isSanityCheckExpanded, setIsSanityCheckExpanded] = useState(true);

  // Story 4.3: Manual Override state
  const [overrides, setOverrides] = useState<Record<string, { value: number; original: number }>>({});
  const [overrideHistory, setOverrideHistory] = useState<OverrideHistoryItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // Initialize current pattern from server (Story 3.1)
  useEffect(() => {
    if (initialGeometry && !currentPattern) {
      setCurrentPattern(initialGeometry);
    }
  }, [initialGeometry, currentPattern, setCurrentPattern]);

  /**
   * Story 4.3: Fetch override history when design is locked
   */
  useEffect(() => {
    const fetchHistory = async () => {
      if (lockedDesignId) {
        setIsHistoryLoading(true);
        const history = await fetchOverrideHistory(lockedDesignId);
        setOverrideHistory(history);
        setIsHistoryLoading(false);
      }
    };
    fetchHistory();
  }, [lockedDesignId]);


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

      // Story 4.1b: Run guardrail check with actual measurements and deltas
      const deltasForCheck = result.snapshot.deltas.map((d) => ({ key: d.key, value: d.value, unit: d.unit }));
      const guardrailResult = await checkGuardrails(baseMeasurements, deltasForCheck, lastSubmittedSequence + 1);
      setGuardrailResult(guardrailResult);
      if (guardrailResult.status === "rejected") {
        snapBackToSafe();
      }

      // Story 4.2: Fetch sanity check data for Artisan Dashboard
      setIsSanityCheckLoading(true);
      const sanityResult = await fetchSanityCheck(undefined, result.snapshot.sequence_id);
      setSanityCheckData({
        ...sanityResult,
        guardrail_status: guardrailResult.status,
        is_locked: isDesignLocked,
        geometry_hash: lockedGeometryHash ?? null,
      });
      setIsSanityCheckLoading(false);
    } else {
      setTranslateError(result.error ?? "Lỗi không xác định");
    }
  }, [
    selectedPillar,
    intensityValues,
    lastSubmittedSequence,
    baseMeasurements,
    isDesignLocked,
    lockedGeometryHash,
    setTranslating,
    setMasterGeometry,
    setTranslateError,
    setGuardrailResult,
    snapBackToSafe,
  ]);

  /**
   * Story 4.3: Handle manual override from Sanity Check Dashboard.
   * Calls backend to re-validate and persist the override.
   */
  const handleOverride = async (deltaKey: string, value: number, reason?: string) => {
    if (!lockedDesignId) {
      throw new Error("Vui lòng khóa thiết kế trước khi thực hiện ghi đè");
    }

    const result = await submitOverride(lockedDesignId, {
      delta_key: deltaKey,
      overridden_value: value,
      reason_vi: reason,
      sequence_id: masterGeometry?.sequence_id ?? 0,
    });

    if (!result) {
      throw new Error("Không thể lưu ghi đè. Vui lòng kiểm tra lại ràng buộc vật lý.");
    }

    // Update local overrides map
    setOverrides((prev) => ({
      ...prev,
      [deltaKey]: { value: result.overridden_value, original: result.original_value },
    }));

    // Update sanity check data locally for immediate feedback
    if (sanityCheckData) {
      const updatedRows = sanityCheckData.rows.map((row) => {
        if (row.key === deltaKey) {
          const newDelta = result.overridden_value - row.base_value;
          return {
            ...row,
            suggested_value: result.overridden_value,
            delta: newDelta,
            // severity is handled by backend in full refresh, but we can approximate
            severity: (Math.abs(newDelta) >= 5.0 ? "danger" : Math.abs(newDelta) >= 2.0 ? "warning" : "normal") as any,
          };
        }
        return row;
      });

      setSanityCheckData({
        ...sanityCheckData,
        rows: updatedRows,
        guardrail_status: result.guardrail_result.status,
      });

      // Update global store guardrail status
      setGuardrailResult(result.guardrail_result);

      // Refresh history
      const history = await fetchOverrideHistory(lockedDesignId);
      setOverrideHistory(history);
    }
  };

  /**
   * Story 3.4: Handle "Lock Design" button click.
   * Sends current morph deltas to backend to create SSOT Master Geometry JSON.
   * Story 4.3: Includes designId if already locked to merge overrides.
   */
  const handleLockDesign = useCallback(async () => {
    if (!masterGeometry || (isDesignLocked && Object.keys(overrides).length === 0)) return;

    if (!currentMorphDelta) {
      setLockError("Chưa có dữ liệu hình học để khóa");
      return;
    }

    // Story 4.1b: Block lock if hard constraints violated
    if (guardrailStatus === "rejected") {
      setLockError("Không thể khóa thiết kế khi có vi phạm ràng buộc vật lý. Vui lòng khôi phục giá trị an toàn.");
      return;
    }

    setLocking(true);

    // If already locked, we pass the designId to update/merge overrides
    // We also pass measurement_deltas for SSOT completeness
    const measurementDeltas = masterGeometry.deltas.map(d => ({
      key: d.key,
      value: overrides[d.key] ? overrides[d.key].value - (sanityCheckData?.rows.find(r => r.key === d.key)?.base_value ?? 0) : d.value,
      unit: d.unit,
      label_vi: d.label_vi
    }));

    const result = await lockDesign(currentMorphDelta, null, lockedDesignId, measurementDeltas);

    if (result.success && result.design_id && result.geometry_hash) {
      setLockResult(result.design_id, result.geometry_hash);
      
      // Story 4.2: Update sanity check data with locked state
      if (sanityCheckData) {
        setSanityCheckData({
          ...sanityCheckData,
          is_locked: true,
          geometry_hash: result.geometry_hash,
        });
      }
    } else {
      setLockError(result.error ?? "Không thể khóa thiết kế");
    }
  }, [masterGeometry, isDesignLocked, currentMorphDelta, guardrailStatus, sanityCheckData, lockedDesignId, overrides, setLocking, setLockResult, setLockError]);

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

        {/* Story 4.1b: Hard constraint violation banner */}
        {guardrailStatus === "rejected" && guardrailViolations.length > 0 && (
          <div className="mb-6 p-4 rounded-xl border border-red-300" style={{ backgroundColor: "#FEF2F2" }}>
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 mt-0.5 shrink-0" style={{ color: "#991B1B" }} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <h4 className="text-sm font-semibold" style={{ color: "#991B1B" }}>
                  Vi phạm ràng buộc vật lý
                </h4>
                <ul className="mt-1 space-y-1">
                  {guardrailViolations.map((v) => (
                    <li key={v.constraint_id} className="text-xs" style={{ color: "#991B1B" }}>
                      {v.message_vi}
                      {v.safe_suggestion && (
                        <span className="text-gray-500 ml-1">
                          (Gợi ý: {Object.entries(v.safe_suggestion).map(([k, val]) => `${k}: ${val}`).join(", ")})
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={snapBackToSafe}
                  className="mt-2 text-xs px-3 py-1 rounded bg-red-100 hover:bg-red-200 transition-colors font-medium"
                  style={{ color: "#991B1B" }}
                >
                  Khôi phục giá trị an toàn
                </button>
              </div>
            </div>
          </div>
        )}

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
                        <LoadingSpinner />
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

                      {/* Story 3.4: Lock Design Button */}
                      {!isDesignLocked ? (
                        <button
                          type="button"
                          onClick={handleLockDesign}
                          disabled={isLocking}
                          className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors ${
                            isLocking
                              ? "bg-amber-400 cursor-not-allowed"
                              : "bg-amber-600 hover:bg-amber-700"
                          }`}
                          aria-busy={isLocking}
                        >
                          {isLocking ? (
                            <span className="flex items-center justify-center gap-2">
                              <LoadingSpinner />
                              Đang khóa thiết kế...
                            </span>
                          ) : (
                            "Khóa thiết kế (Lock Design)"
                          )}
                        </button>
                      ) : (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <p className="text-amber-700 text-sm font-medium flex items-center gap-2">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                            Thiết kế đã được khóa
                          </p>
                          {lockedGeometryHash && (
                            <p className="text-amber-600 text-xs mt-1 font-mono truncate">
                              Hash: {lockedGeometryHash.slice(0, 16)}...
                            </p>
                          )}
                        </div>
                      )}

                      {/* Lock Error */}
                      {lockError && (
                        <div
                          className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
                          role="alert"
                        >
                          {lockError}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Story 4.2: Sanity Check Dashboard - Collapsible Section */}
        {(masterGeometry || sanityCheckData) && (
          <div className="mt-8">
            <button
              type="button"
              onClick={() => setIsSanityCheckExpanded(!isSanityCheckExpanded)}
              className="w-full flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
              aria-expanded={isSanityCheckExpanded}
              aria-controls="sanity-check-content"
            >
              <div className="flex items-center gap-3">
                <svg
                  className={`w-5 h-5 text-gray-500 transition-transform ${isSanityCheckExpanded ? "rotate-90" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900">
                  Bảng đối soát kỹ thuật
                </h3>
                {sanityCheckData && sanityCheckData.guardrail_status && sanityCheckData.guardrail_status !== "passed" && (
                  <span
                    className="px-2 py-0.5 text-xs font-medium rounded-full"
                    style={{
                      backgroundColor: sanityCheckData.guardrail_status === "rejected" ? "#FEF2F2" : "#FEF3C7",
                      color: sanityCheckData.guardrail_status === "rejected" ? "#991B1B" : "#92400E",
                    }}
                  >
                    {sanityCheckData.guardrail_status === "rejected" ? "Vi phạm" : "Cảnh báo"}
                  </span>
                )}
              </div>
              <span className="text-sm text-gray-500">
                {isSanityCheckExpanded ? "Thu gọn" : "Mở rộng"}
              </span>
            </button>

            {isSanityCheckExpanded && (
              <div id="sanity-check-content" className="mt-4 space-y-6">
                <SanityCheckDashboard
                  data={sanityCheckData}
                  isLoading={isSanityCheckLoading}
                  guardrailWarnings={guardrailWarnings}
                  guardrailViolations={guardrailViolations}
                  onOverride={handleOverride}
                  overrides={overrides}
                  isOverrideEnabled={session?.user?.role === "Tailor" || session?.user?.role === "Owner"}
                />
                
                {lockedDesignId && (
                  <OverrideHistoryPanel 
                    overrides={overrideHistory} 
                    isLoading={isHistoryLoading} 
                  />
                )}
              </div>
            )}
          </div>
        )}

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
