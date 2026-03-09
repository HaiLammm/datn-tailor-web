"use client";

/**
 * Pillar Rule Table - Story 2.5
 *
 * Table view of delta mappings with editable fields.
 * AC2: Structured table display + JSON toggle
 * AC3: Edit & Save with validation
 * AC4: Vietnamese error messages
 */

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
    RulePillarDetail,
    DeltaMappingDetail,
    DeltaMappingUpdateItem,
} from "@/types/rule";
import { deltaMappingUpdateItemSchema } from "@/types/rule";
import { fetchPillarDetail, updatePillarRules } from "@/app/actions/rule-actions";
import RuleJsonViewer from "./RuleJsonViewer";

const HERITAGE_GOLD = "#D4AF37";
const INDIGO_DEPTH = "#4f46e5";

interface PillarRuleTableProps {
    pillarId: string;
}

export default function PillarRuleTable({ pillarId }: PillarRuleTableProps) {
    const queryClient = useQueryClient();
    const [isEditing, setIsEditing] = useState(false);
    const [showJson, setShowJson] = useState(false);
    const [editData, setEditData] = useState<DeltaMappingDetail[]>([]);
    const [validationErrors, setValidationErrors] = useState<Record<number, string[]>>({});
    const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

    // AC2: Fetch pillar detail
    const { data: detail, isLoading, error } = useQuery<RulePillarDetail>({
        queryKey: ["rule-pillar-detail", pillarId],
        queryFn: async () => {
            const result = await fetchPillarDetail(pillarId);
            if ("error" in result) {
                throw new Error(result.error);
            }
            return result;
        },
    });

    // AC3: Save mutation
    const saveMutation = useMutation({
        mutationFn: async (mappings: DeltaMappingUpdateItem[]) => {
            const result = await updatePillarRules(pillarId, mappings);
            if ("error" in result) {
                throw new Error(result.error);
            }
            return result;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["rule-pillar-detail", pillarId] });
            queryClient.invalidateQueries({ queryKey: ["rule-pillars"] });
            setIsEditing(false);
            setValidationErrors({});
            setSaveSuccess(data.message || "Đã lưu thành công!");
            setTimeout(() => setSaveSuccess(null), 3000);
        },
    });

    const startEditing = useCallback(() => {
        if (detail) {
            setEditData(detail.mappings.map((m) => ({ ...m })));
            setIsEditing(true);
            setSaveSuccess(null);
            setValidationErrors({});
        }
    }, [detail]);

    const cancelEditing = useCallback(() => {
        setIsEditing(false);
        setEditData([]);
        setValidationErrors({});
    }, []);

    const updateField = useCallback(
        (index: number, field: keyof DeltaMappingDetail, value: string | number) => {
            setEditData((prev) => {
                const updated = [...prev];
                updated[index] = { ...updated[index], [field]: value };
                return updated;
            });
        },
        []
    );

    // AC4: Validate and save
    const handleSave = useCallback(() => {
        const errors: Record<number, string[]> = {};
        const updateItems: DeltaMappingUpdateItem[] = [];

        editData.forEach((mapping, index) => {
            const result = deltaMappingUpdateItemSchema.safeParse(mapping);
            if (!result.success) {
                errors[index] = result.error.issues.map((e) => e.message);
            } else {
                updateItems.push(mapping);
            }
        });

        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            return;
        }

        setValidationErrors({});
        saveMutation.mutate(updateItems);
    }, [editData, saveMutation]);

    if (isLoading) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto" />
                <p className="text-gray-500 mt-3 text-sm">Đang tải chi tiết...</p>
            </div>
        );
    }

    if (error || !detail) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                <p className="text-red-700 font-medium">Lỗi tải dữ liệu</p>
                <p className="text-red-500 text-sm">{(error as Error)?.message}</p>
            </div>
        );
    }

    const displayData = isEditing ? editData : detail.mappings;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-serif font-bold text-indigo-900">
                        {detail.pillar_name_vi}
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                        Cập nhật lần cuối:{" "}
                        {new Date(detail.last_modified).toLocaleString("vi-VN")}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {/* AC2: JSON toggle */}
                    <button
                        onClick={() => setShowJson(!showJson)}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                        {showJson ? "Bảng" : "JSON"}
                    </button>

                    {!isEditing ? (
                        <button
                            onClick={startEditing}
                            className="px-4 py-1.5 text-xs font-medium rounded-lg text-white transition-colors"
                            style={{ backgroundColor: INDIGO_DEPTH }}
                        >
                            Chỉnh sửa
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={cancelEditing}
                                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saveMutation.isPending}
                                className="px-4 py-1.5 text-xs font-medium rounded-lg text-white transition-colors disabled:opacity-50"
                                style={{ backgroundColor: HERITAGE_GOLD }}
                            >
                                {saveMutation.isPending ? "Đang lưu..." : "Lưu thay đổi"}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Success message */}
            {saveSuccess && (
                <div className="px-6 py-2 bg-green-50 border-b border-green-200 text-green-700 text-sm">
                    {saveSuccess}
                </div>
            )}

            {/* Save error */}
            {saveMutation.isError && (
                <div className="px-6 py-2 bg-red-50 border-b border-red-200 text-red-700 text-sm">
                    {(saveMutation.error as Error).message}
                </div>
            )}

            {/* Content: Table or JSON */}
            {showJson ? (
                <RuleJsonViewer data={detail} />
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-600">
                            <tr>
                                <th className="px-4 py-2 text-left font-medium">Slider</th>
                                <th className="px-4 py-2 text-left font-medium">Delta</th>
                                <th className="px-4 py-2 text-left font-medium">Nhãn</th>
                                <th className="px-4 py-2 text-right font-medium">Min</th>
                                <th className="px-4 py-2 text-right font-medium">Max</th>
                                <th className="px-4 py-2 text-right font-medium">Hệ số</th>
                                <th className="px-4 py-2 text-right font-medium">Offset</th>
                                <th className="px-4 py-2 text-right font-medium">Điểm Vàng</th>
                                <th className="px-4 py-2 text-center font-medium">ĐV</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {displayData.map((mapping, index) => (
                                <tr
                                    key={`${mapping.slider_key}-${mapping.delta_key}-${index}`}
                                    className={validationErrors[index] ? "bg-red-50" : "hover:bg-gray-50"}
                                >
                                    <td className="px-4 py-2 font-mono text-xs text-gray-700">
                                        {mapping.slider_key}
                                    </td>
                                    <td className="px-4 py-2 font-mono text-xs text-gray-700">
                                        {mapping.delta_key}
                                    </td>
                                    <td className="px-4 py-2 text-gray-900">
                                        {mapping.delta_label_vi}
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                        {isEditing ? (
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={editData[index]?.slider_range_min ?? ""}
                                                onChange={(e) =>
                                                    updateField(index, "slider_range_min", parseFloat(e.target.value) || 0)
                                                }
                                                className="w-20 px-2 py-1 text-right border border-gray-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                        ) : (
                                            <span className="font-mono text-xs">{mapping.slider_range_min}</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                        {isEditing ? (
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={editData[index]?.slider_range_max ?? ""}
                                                onChange={(e) =>
                                                    updateField(index, "slider_range_max", parseFloat(e.target.value) || 0)
                                                }
                                                className="w-20 px-2 py-1 text-right border border-gray-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                        ) : (
                                            <span className="font-mono text-xs">{mapping.slider_range_max}</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                        {isEditing ? (
                                            <input
                                                type="number"
                                                step="0.001"
                                                value={editData[index]?.scale_factor ?? ""}
                                                onChange={(e) =>
                                                    updateField(index, "scale_factor", parseFloat(e.target.value) || 0)
                                                }
                                                className="w-24 px-2 py-1 text-right border border-gray-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                        ) : (
                                            <span className="font-mono text-xs">{mapping.scale_factor}</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                        {isEditing ? (
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={editData[index]?.offset ?? ""}
                                                onChange={(e) =>
                                                    updateField(index, "offset", parseFloat(e.target.value) || 0)
                                                }
                                                className="w-20 px-2 py-1 text-right border border-gray-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                        ) : (
                                            <span className="font-mono text-xs">{mapping.offset}</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                        {isEditing ? (
                                            <input
                                                type="number"
                                                step="1"
                                                min="0"
                                                max="100"
                                                value={editData[index]?.golden_point ?? 50}
                                                onChange={(e) =>
                                                    updateField(index, "golden_point", parseFloat(e.target.value) || 50)
                                                }
                                                className="w-20 px-2 py-1 text-right border border-gray-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                                style={{ borderColor: `${HERITAGE_GOLD}60` }}
                                            />
                                        ) : (
                                            <span className="font-mono text-xs" style={{ color: HERITAGE_GOLD }}>
                                                {mapping.golden_point}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2 text-center text-xs text-gray-500">
                                        {mapping.delta_unit}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* AC4: Validation errors */}
                    {Object.keys(validationErrors).length > 0 && (
                        <div className="px-6 py-3 bg-red-50 border-t border-red-200">
                            <p className="text-red-700 font-medium text-sm mb-1">
                                Lỗi xác thực:
                            </p>
                            {Object.entries(validationErrors).map(([idx, errors]) => (
                                <div key={idx} className="text-red-600 text-xs">
                                    Dòng {parseInt(idx) + 1}: {errors.join(", ")}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
