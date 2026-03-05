"use client";

/**
 * FabricCard Component - Story 2.3
 *
 * Displays a single fabric recommendation with texture image,
 * Vietnamese name, properties, and compatibility badge.
 * Heritage Gold accent for "Rất phù hợp" badges.
 */

import type { FabricResponse } from "@/types/fabric";
import { FABRIC_LEVEL_LABELS, FABRIC_PROPERTY_LABELS } from "@/types/fabric";
import type { FabricProperty } from "@/types/fabric";

const HERITAGE_GOLD = "#D4AF37";

function CompatibilityBadge({ label, score }: { label: string; score: number }) {
  const isTopMatch = label === "Rất phù hợp";
  const isMidMatch = label === "Phù hợp";

  return (
    <span
      data-testid="compatibility-badge"
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={
        isTopMatch
          ? { backgroundColor: `${HERITAGE_GOLD}20`, color: HERITAGE_GOLD, border: `1px solid ${HERITAGE_GOLD}40` }
          : isMidMatch
            ? { backgroundColor: "#EEF2FF", color: "#4F46E5", border: "1px solid #C7D2FE" }
            : { backgroundColor: "#F3F4F6", color: "#6B7280", border: "1px solid #E5E7EB" }
      }
    >
      {label} — {Math.round(score)}%
    </span>
  );
}

function PropertyTag({ propKey, value }: { propKey: keyof FabricProperty; value: string }) {
  const label = FABRIC_PROPERTY_LABELS[propKey];
  const valueLabel = FABRIC_LEVEL_LABELS[value] ?? value;

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
      {label}: {valueLabel}
    </span>
  );
}

interface FabricCardProps {
  fabric: FabricResponse;
}

export function FabricCard({ fabric }: FabricCardProps) {
  return (
    <div
      data-testid={`fabric-card-${fabric.id}`}
      className="border border-gray-200 rounded-lg overflow-hidden bg-white hover:shadow-md transition-shadow"
    >
      {/* Texture image / placeholder */}
      <div className="h-32 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
        {fabric.image_url ? (
          <img
            src={fabric.image_url}
            alt={fabric.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <svg
            className="w-10 h-10 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
            />
          </svg>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Name and badge */}
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-semibold text-gray-900">{fabric.name}</h4>
          <CompatibilityBadge
            label={fabric.compatibility_label}
            score={fabric.compatibility_score}
          />
        </div>

        {/* Description */}
        <p className="text-xs text-gray-600 line-clamp-2">{fabric.description}</p>

        {/* Properties */}
        <div className="flex flex-wrap gap-1">
          {(Object.keys(FABRIC_PROPERTY_LABELS) as (keyof FabricProperty)[]).map((key) => (
            <PropertyTag key={key} propKey={key} value={fabric.properties[key]} />
          ))}
        </div>
      </div>
    </div>
  );
}
