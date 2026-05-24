"use client";

import { useState } from "react";

import { useExportPiece, useExportSession } from "@/hooks/usePatternSession";
import type { ExportFormat, PatternPieceResponse } from "@/types/pattern";

interface PatternExportBarProps {
  sessionId: string;
  pieces: PatternPieceResponse[];
  activePiece: PatternPieceResponse | null;
  onToast?: (message: string, type: "success" | "error") => void;
}

interface DownloadPayload {
  content: string;
  filename: string;
  contentType: string;
}

function decodeBase64ToBlob(base64: string, contentType: string) {
  const binary = window.atob(base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new Blob([bytes], { type: contentType });
}

// P8: wrap in try-finally to prevent blob URL leaks
function triggerDownload(payload: DownloadPayload) {
  const blob = decodeBase64ToBlob(payload.content, payload.contentType);
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = payload.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
}

// P9: clamp speed/power to safe ranges
function clampSpeed(value: number): number {
  return Math.max(100, Math.min(10000, Math.round(value)));
}

function clampPower(value: number): number {
  return Math.max(1, Math.min(100, Math.round(value)));
}

export function PatternExportBar({
  sessionId,
  pieces,
  activePiece,
  onToast,
}: PatternExportBarProps) {
  const exportPieceMutation = useExportPiece();
  const exportSessionMutation = useExportSession();

  const [isGcodeOpen, setIsGcodeOpen] = useState(false);
  const [batchFormat, setBatchFormat] = useState<ExportFormat>("svg");
  const [speed, setSpeed] = useState(1000);
  const [power, setPower] = useState(80);

  const hasPieces = pieces.length > 0;
  const isBusy = exportPieceMutation.isPending || exportSessionMutation.isPending;

  const showToast = (message: string, type: "success" | "error") => {
    onToast?.(message, type);
  };

  const handlePieceExport = async (format: ExportFormat) => {
    if (!activePiece || isBusy) return;

    try {
      const payload = await exportPieceMutation.mutateAsync({
        pieceId: activePiece.id,
        format,
        speed: format === "gcode" ? clampSpeed(speed) : undefined,
        power: format === "gcode" ? clampPower(power) : undefined,
      });
      triggerDownload(payload);
      showToast(`Đã tải ${format === "svg" ? "SVG" : "G-code"} xuống`, "success");
      if (format === "gcode") {
        setIsGcodeOpen(false);
      }
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Không thể xuất file",
        "error"
      );
    }
  };

  const handleSessionExport = async () => {
    if (isBusy) return;

    try {
      const payload = await exportSessionMutation.mutateAsync({
        sessionId,
        format: batchFormat,
        speed: batchFormat === "gcode" ? clampSpeed(speed) : undefined,
        power: batchFormat === "gcode" ? clampPower(power) : undefined,
      });
      triggerDownload(payload);
      showToast(`Đã tải gói ${batchFormat === "svg" ? "SVG" : "G-code"}`, "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Không thể xuất toàn bộ mảnh rập",
        "error"
      );
    }
  };

  return (
    <div className="space-y-3 rounded-3xl border border-stone-200 bg-stone-50 p-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => handlePieceExport("svg")}
          disabled={!activePiece || isBusy}
          className="inline-flex flex-1 items-center justify-center rounded-2xl border border-indigo-200 bg-white px-4 py-3 text-sm font-medium text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {exportPieceMutation.isPending ? "Đang xuất..." : "Xuất SVG"}
        </button>

        <button
          type="button"
          onClick={() => setIsGcodeOpen((current) => !current)}
          disabled={!activePiece || isBusy}
          className="inline-flex flex-1 items-center justify-center rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm font-medium text-amber-700 transition hover:border-amber-300 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
          aria-expanded={isGcodeOpen}
        >
          Xuất G-code
        </button>

        <button
          type="button"
          onClick={handleSessionExport}
          disabled={!hasPieces || isBusy}
          className="inline-flex flex-1 items-center justify-center rounded-2xl bg-[#1A2B4C] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#16233d] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {exportSessionMutation.isPending ? "Đang xuất..." : "Xuất tất cả"}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm text-stone-600">
          <span className="mb-1 block font-medium">Định dạng xuất tất cả</span>
          <select
            value={batchFormat}
            onChange={(event) => setBatchFormat(event.target.value as ExportFormat)}
            className="w-full rounded-2xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 outline-none transition focus:border-indigo-300"
            aria-label="Định dạng xuất tất cả"
          >
            <option value="svg">SVG (.zip)</option>
            <option value="gcode">G-code (.zip)</option>
          </select>
        </label>

        <div className="rounded-2xl border border-dashed border-stone-200 bg-white px-3 py-2 text-xs text-stone-500">
          {activePiece
            ? `Mảnh đang chọn: ${activePiece.piece_type}`
            : "Chưa có mảnh đang chọn"}
        </div>
      </div>

      {isGcodeOpen ? (
        <div
          role="dialog"
          aria-label="Cấu hình G-code"
          className="space-y-3 rounded-2xl border border-amber-200 bg-white p-4 shadow-sm"
        >
          <label className="block text-sm text-stone-600">
            <span className="mb-1 block font-medium">Tốc độ cắt (mm/phút)</span>
            <input
              type="number"
              min={100}
              max={10000}
              value={speed}
              onChange={(event) => setSpeed(clampSpeed(Number(event.target.value) || 1000))}
              className="w-full rounded-2xl border border-stone-200 px-3 py-2 text-sm text-stone-700 outline-none transition focus:border-indigo-300"
            />
          </label>

          <label className="block text-sm text-stone-600">
            <span className="mb-1 block font-medium">Công suất laser (%)</span>
            <input
              type="number"
              min={1}
              max={100}
              value={power}
              onChange={(event) => setPower(clampPower(Number(event.target.value) || 80))}
              className="w-full rounded-2xl border border-stone-200 px-3 py-2 text-sm text-stone-700 outline-none transition focus:border-indigo-300"
            />
          </label>

          <button
            type="button"
            onClick={() => handlePieceExport("gcode")}
            disabled={!activePiece || isBusy}
            className="inline-flex w-full items-center justify-center rounded-2xl bg-amber-500 px-4 py-3 text-sm font-medium text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Tải xuống
          </button>
        </div>
      ) : null}
    </div>
  );
}
