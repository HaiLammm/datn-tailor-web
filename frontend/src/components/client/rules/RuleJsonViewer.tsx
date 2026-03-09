"use client";

/**
 * Rule JSON Viewer - Story 2.5
 *
 * Read-only raw JSON toggle view of rule data (AC2).
 */

import type { RulePillarDetail } from "@/types/rule";

interface RuleJsonViewerProps {
    data: RulePillarDetail;
}

export default function RuleJsonViewer({ data }: RuleJsonViewerProps) {
    return (
        <div className="p-4">
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-xs font-mono leading-relaxed max-h-[600px] overflow-y-auto">
                {JSON.stringify(data, null, 2)}
            </pre>
        </div>
    );
}
