"use client";

/**
 * Rule Editor Client Component - Story 2.5
 *
 * Main client component with pillar list sidebar and detail panel.
 * AC1: List display, AC2: Detail view, AC3: Edit & Save
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { RulePillarSummary } from "@/types/rule";
import { fetchRulePillars } from "@/app/actions/rule-actions";
import PillarRuleTable from "./PillarRuleTable";

const HERITAGE_GOLD = "#D4AF37";

export default function RuleEditorClient() {
    const [selectedPillarId, setSelectedPillarId] = useState<string | null>(null);

    // AC1: Fetch pillar list
    const {
        data: pillars,
        isLoading,
        error,
    } = useQuery<RulePillarSummary[]>({
        queryKey: ["rule-pillars"],
        queryFn: async () => {
            const result = await fetchRulePillars();
            if ("error" in result) {
                throw new Error(result.error);
            }
            return result;
        },
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
                <span className="ml-3 text-gray-600">Đang tải quy tắc...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                <p className="text-red-700 font-medium">Lỗi tải dữ liệu</p>
                <p className="text-red-500 text-sm mt-1">{(error as Error).message}</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar: Pillar List (AC1) */}
            <div className="lg:col-span-1">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-4 py-3 bg-indigo-900 text-white">
                        <h2 className="font-serif font-semibold text-sm">
                            Phong cách
                        </h2>
                    </div>
                    <ul className="divide-y divide-gray-100">
                        {pillars?.map((pillar) => (
                            <li key={pillar.pillar_id}>
                                <button
                                    onClick={() => setSelectedPillarId(pillar.pillar_id)}
                                    className={`w-full px-4 py-3 text-left hover:bg-indigo-50 transition-colors ${
                                        selectedPillarId === pillar.pillar_id
                                            ? "bg-indigo-50 border-l-4 border-indigo-600"
                                            : "border-l-4 border-transparent"
                                    }`}
                                >
                                    <div className="font-medium text-gray-900 text-sm">
                                        {pillar.pillar_name_vi}
                                    </div>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                        <span>{pillar.slider_count} slider</span>
                                        <span
                                            className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium"
                                            style={{
                                                backgroundColor: `${HERITAGE_GOLD}20`,
                                                color: HERITAGE_GOLD,
                                            }}
                                        >
                                            {pillar.delta_mapping_count} delta
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1">
                                        {new Date(pillar.last_modified).toLocaleDateString("vi-VN")}
                                    </div>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Main Panel: Detail / Edit (AC2, AC3) */}
            <div className="lg:col-span-3">
                {selectedPillarId ? (
                    <PillarRuleTable pillarId={selectedPillarId} />
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                        <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                            <svg
                                className="w-8 h-8 text-indigo-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                                />
                            </svg>
                        </div>
                        <p className="text-gray-500">
                            Chọn một trụ cột phong cách để xem và chỉnh sửa quy tắc
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
