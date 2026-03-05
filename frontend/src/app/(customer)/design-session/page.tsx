/**
 * Design Session Page - Server Component
 * Story 2.1: Lựa chọn Trụ cột Phong cách
 *
 * Entry page for design session where customers select style pillars.
 * Fetches style pillars from Backend (authoritative source).
 */

import { Suspense } from "react";

import type { StylePillarListResponse } from "@/types/style";

import { DesignSessionClient } from "./DesignSessionClient";

/**
 * Fetch style pillars from Backend API
 */
async function fetchStylePillars(): Promise<StylePillarListResponse> {
  const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";

  try {
    const response = await fetch(`${backendUrl}/api/v1/styles/pillars`, {
      cache: "no-store", // Always fetch fresh data
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch style pillars: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error("Error fetching style pillars:", error);
    return { pillars: [], total: 0 };
  }
}

/**
 * Loading skeleton for design session
 */
function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-amber-50">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-8">
          <div className="h-10 w-64 bg-gray-200 rounded" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 h-96 bg-gray-200 rounded-xl" />
            <div className="h-96 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Design Session Page
 *
 * Server Component that fetches style pillars and passes to client.
 */
export default async function DesignSessionPage() {
  const pillarsData = await fetchStylePillars();

  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <DesignSessionClient initialPillars={pillarsData.pillars} />
    </Suspense>
  );
}
