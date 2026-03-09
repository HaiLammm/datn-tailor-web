"use client";

/**
 * Intensity Sliders Component
 * Story 2.1 & 2.2: Lựa chọn & Tinh chỉnh Trụ cột Phong cách
 *
 * Displays intensity sliders with Haptic Golden Points (Heritage Gold markers),
 * debounced backend submission, and inline soft constraint warnings (FR2, Story 2.2).
 */

import { useCallback, useEffect, useRef } from "react";
import { submitIntensity } from "@/app/actions/design-actions";
import { useDesignStore } from "@/store/designStore";
import type { IntensityWarning } from "@/types/style";

/** Heritage Gold color for golden point markers (per UX Design System) */
const HERITAGE_GOLD = "#D4AF37";
/** Indigo Depth — filled portion of slider track */
const INDIGO_DEPTH = "#4f46e5";
/** Proximity threshold: thumb is "near" a golden point if within ±2% of range */
const GOLDEN_POINT_PROXIMITY_PERCENT = 2;

/**
 * Individual slider control with Haptic Golden Points (Story 2.2)
 */
function SliderControl({
  sliderKey,
  label,
  description,
  value,
  minValue,
  maxValue,
  step,
  unit,
  goldenPoints,
  onChange,
  onCommit,
  warning,
}: {
  sliderKey: string;
  label: string;
  description: string | null;
  value: number;
  minValue: number;
  maxValue: number;
  step: number;
  unit: string | null;
  goldenPoints: number[];
  onChange: (value: number) => void;
  onCommit?: (value: number) => void;
  warning: IntensityWarning | undefined;
}) {
  // Story 4.1b: Guardrail warnings and violations
  const guardrailWarnings = useDesignStore((state) => state.guardrail_warnings);
  const guardrailViolations = useDesignStore((state) => state.guardrail_violations);

  const range = maxValue - minValue;
  const percentage = range > 0 ? ((value - minValue) / range) * 100 : 0;

  // Check if thumb is near any golden point (within ±2% of the range, in value space)
  const proximityThreshold = range * GOLDEN_POINT_PROXIMITY_PERCENT / 100;
  const isNearGoldenPoint = goldenPoints.some((gp) =>
    Math.abs(value - gp) <= proximityThreshold
  );

  const thumbColor = isNearGoldenPoint ? HERITAGE_GOLD : INDIGO_DEPTH;

  return (
    <div className="space-y-2">
      {/* Label and value */}
      <div className="flex items-center justify-between">
        <label
          htmlFor={sliderKey}
          className="text-sm font-medium text-gray-700"
        >
          {label}
        </label>
        <span
          className="text-sm font-semibold transition-colors"
          style={{ color: isNearGoldenPoint ? HERITAGE_GOLD : INDIGO_DEPTH }}
        >
          {value}
          {unit && <span className="text-gray-500 ml-0.5">{unit}</span>}
        </span>
      </div>

      {/* Description */}
      {description && (
        <p className="text-xs text-gray-500">{description}</p>
      )}

      {/* Slider track with Golden Point markers */}
      <div className="relative h-8 flex items-center" data-testid={`slider-wrapper-${sliderKey}`}>
        {/* Golden point markers rendered on top of the track */}
        {goldenPoints.map((gp) => {
          const gpPercent =
            range > 0 ? ((gp - minValue) / range) * 100 : 0;
          return (
            <div
              key={gp}
              data-testid={`golden-point-${sliderKey}-${gp}`}
              aria-hidden="true"
              title="Tỷ lệ vàng của nghệ nhân"
              className="absolute w-1 h-4 rounded-sm pointer-events-none z-10 transition-opacity"
              style={{
                left: `${gpPercent}%`,
                transform: "translateX(-50%)",
                backgroundColor: HERITAGE_GOLD,
                opacity: 0.8,
              }}
            />
          );
        })}

        {/* Range input */}
        <input
          id={sliderKey}
          type="range"
          min={minValue}
          max={maxValue}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          onPointerUp={(e) => onCommit?.(Number((e.target as HTMLInputElement).value))}
          aria-label={label}
          aria-valuemin={minValue}
          aria-valuemax={maxValue}
          aria-valuenow={value}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer relative z-20"
          style={{
            background: `linear-gradient(to right, ${thumbColor} 0%, ${thumbColor} ${percentage}%, #e5e7eb ${percentage}%, #e5e7eb 100%)`,
          }}
        />
      </div>

      {/* Min/Max labels */}
      <div className="flex justify-between text-xs text-gray-400">
        <span>{minValue}</span>
        <span>{maxValue}</span>
      </div>

      {/* Inline soft constraint warning (no Modal per UX spec) */}
      {warning && (
        <div
          role="alert"
          data-testid={`warning-${sliderKey}`}
          className="flex items-start gap-1.5 text-xs px-2 py-1.5 rounded-md"
          style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}
        >
          <svg
            className="w-3.5 h-3.5 mt-0.5 shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
          <span>{warning.message}</span>
        </div>
      )}

      {/* Story 4.1b: Guardrail constraint warnings — match by violated_values keys */}
      {guardrailWarnings
        .filter((w) => Object.keys(w.violated_values).some((k) => k === sliderKey || sliderKey.includes(k) || k.includes(sliderKey)))
        .map((w) => (
          <div
            key={w.constraint_id}
            role="alert"
            className="flex items-start gap-1.5 text-xs px-2 py-1.5 rounded-md mt-1"
            style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}
          >
            <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{w.message_vi}</span>
          </div>
        ))}
      {/* Story 4.1b: Hard constraint violations — match by violated_values keys */}
      {guardrailViolations
        .filter((v) => Object.keys(v.violated_values).some((k) => k === sliderKey || sliderKey.includes(k) || k.includes(sliderKey)))
        .map((v) => (
          <div
            key={v.constraint_id}
            role="alert"
            className="flex items-start gap-1.5 text-xs px-2 py-1.5 rounded-md mt-1 border border-red-300"
            style={{ backgroundColor: "#FEF2F2", color: "#991B1B" }}
          >
            <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{v.message_vi}</span>
          </div>
        ))}
    </div>
  );
}

/**
 * Intensity Sliders Panel
 *
 * Shows all sliders for the selected pillar with Haptic Golden Points.
 * Submits intensity values to backend (debounced 300ms) after each change.
 * Displays inline soft constraint warnings from backend.
 */
interface IntensitySlidersProps {
  /** Story 3.2: Real-time callback for morphing (fires on every slider move). */
  onRealtimeChange?: (key: string, value: number) => void;
  /** Story 3.2: Commit callback when user releases slider (AC5). */
  onValueCommit?: (key: string, value: number) => void;
}

export function IntensitySliders({ onRealtimeChange, onValueCommit }: IntensitySlidersProps = {}) {
  const {
    selected_pillar,
    intensity_values,
    is_submitting,
    submission_warnings,
    last_submitted_sequence,
    updateIntensity,
    resetToDefaults,
    setSubmitting,
    setSubmissionResult,
  } = useDesignStore();

  // Debounce timer ref for backend submission
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Sequence counter for race condition protection
  const sequenceCounterRef = useRef<number>(last_submitted_sequence);
  // Mounted guard to prevent state updates on unmounted component
  const isMountedRef = useRef<boolean>(true);

  /**
   * Debounced submit: fires 300ms after the last slider change.
   * Uses sequence_id to ensure backend only processes the latest request.
   */
  const triggerDebouncedSubmit = useCallback(() => {
    if (!selected_pillar) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      const store = useDesignStore.getState();
      if (!store.selected_pillar) return;

      sequenceCounterRef.current += 1;
      const currentSequence = sequenceCounterRef.current;

      store.setSubmitting(true);

      const intensities = Object.entries(store.intensity_values).map(
        ([key, value]) => ({ key, value })
      );

      const result = await submitIntensity(
        store.selected_pillar.id,
        intensities,
        currentSequence
      );

      // Only update state if component is still mounted and this is latest sequence
      if (currentSequence >= sequenceCounterRef.current && isMountedRef.current) {
        store.setSubmissionResult(result.sequence_id, result.warnings ?? []);
      }
    }, 300);
  }, [selected_pillar]);

  // Clear debounce timer and mark unmounted on cleanup
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleSliderChange = (key: string, value: number) => {
    updateIntensity(key, value);
    onRealtimeChange?.(key, value);
    triggerDebouncedSubmit();
  };

  const handleSliderCommit = (key: string, value: number) => {
    onValueCommit?.(key, value);
  };

  // Build warning lookup by slider_key
  const warningByKey = submission_warnings.reduce<Record<string, IntensityWarning>>(
    (acc, w) => {
      acc[w.slider_key] = w;
      return acc;
    },
    {}
  );

  if (!selected_pillar) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
        <svg
          className="w-12 h-12 mx-auto text-gray-400 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
          />
        </svg>
        <h3 className="text-lg font-medium text-gray-700 mb-2">
          Chưa chọn phong cách
        </h3>
        <p className="text-gray-500">
          Vui lòng chọn một phong cách thiết kế để điều chỉnh cường độ.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Điều chỉnh Cường độ
          </h3>
          <p className="text-sm text-gray-600">
            Phong cách: {selected_pillar.name}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Submission indicator */}
          {is_submitting && (
            <span
              data-testid="submission-indicator"
              className="text-xs text-gray-400 animate-pulse"
            >
              Đang lưu...
            </span>
          )}
          <button
            type="button"
            onClick={resetToDefaults}
            className="px-3 py-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
          >
            Đặt lại mặc định
          </button>
        </div>
      </div>

      {/* Golden Points legend */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <div
          className="w-3 h-3 rounded-sm"
          style={{ backgroundColor: HERITAGE_GOLD }}
          aria-hidden="true"
        />
        <span>Mốc tỷ lệ vàng của nghệ nhân</span>
      </div>

      {/* Sliders */}
      <div className="space-y-6">
        {selected_pillar.sliders.map((slider) => (
          <SliderControl
            key={slider.key}
            sliderKey={slider.key}
            label={slider.label}
            description={slider.description}
            value={intensity_values[slider.key] ?? slider.default_value}
            minValue={slider.min_value}
            maxValue={slider.max_value}
            step={slider.step}
            unit={slider.unit}
            goldenPoints={slider.golden_points ?? []}
            onChange={(value) => handleSliderChange(slider.key, value)}
            onCommit={(value) => handleSliderCommit(slider.key, value)}
            warning={warningByKey[slider.key]}
          />
        ))}
      </div>

      {/* Current values summary */}
      <div className="pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-2">
          Giá trị hiện tại:
        </h4>
        <div className="flex flex-wrap gap-2">
          {selected_pillar.sliders.map((slider) => (
            <span
              key={slider.key}
              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-md"
            >
              {slider.label}: {intensity_values[slider.key] ?? slider.default_value}
              {slider.unit}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
