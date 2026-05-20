"use client";

import { useEffect, useState } from "react";

import { useExportPiece, useExportSession } from "@/hooks/usePatternSession";
import type { ExportFormat, PatternPieceResponse } from "@/types/pattern";

interface PatternExportBarProps {
  sessionId: string;
  pieces: PatternPieceResponse[];
  activePiece: PatternPieceResponse | null;
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

function triggerDownload(payload: DownloadPayload) {
  const blob = decodeBase64ToBlob(payload.content, payload.contentType);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = payload.filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function PatternExportBar({ sessionId, pieces, activePiece }: PatternExportBarProps) {
  const exportPieceMutation = useExportPiece();
  const exportSessionMutation = useExportSession();

  const [isGcodeOpen, setIsGcodeOpen] = useState(false);
  const [batchFormat, setBatchFormat] = useState<ExportFormat>("svg");
  const [speed, setSpeed] = useState(1000);
  const [power, setPower] = useState(80);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const hasPieces = pieces.length > 0;
  const isBusy = exportPieceMutation.isPending || exportSessionMutation.isPending;

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const handlePieceExport = async (format: ExportFormat) => {
    if (!activePiece) {
      return;
    }

    try {
      const payload = await exportPieceMutation.mutateAsync({
        pieceId: activePiece.id,
        format,
        speed: format === "gcode" ? speed : undefined,
        power: format === "gcode" ? power : undefined,
      });
      triggerDownload(payload);
      setToast({ message: `Đã tải ${format === "svg" ? "SVG" : "G-code"} xuống`, type: "success" });
      if (format === "gcode") {
        setIsGcodeOpen(false);
      }
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : "Không thể xuất file",
        type: "error",
      });
    }
  };

  const handleSessionExport = async () => {
    try {
      const payload = await exportSessionMutation.mutateAsync({
        sessionId,
        format: batchFormat,
        speed: batchFormat === "gcode" ? speed : undefined,
        power: batchFormat === "gcode" ? power : undefined,
      });
      triggerDownload(payload);
      setToast({
        message: `Đã tải gói ${batchFormat === "svg" ? "SVG" : "G-code"}`,
        type: "success",
      });
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : "Không thể xuất toàn bộ mảnh rập",
        type: "error",
      });
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
          {activePiece ? `Mảnh đang chọn: ${activePiece.piece_type}` : "Chưa có mảnh đang chọn"}
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
              onChange={(event) => setSpeed(Number(event.target.value) || 0)}
              className="w-full rounded-2xl border border-stone-200 px-3 py-2 text-sm text-stone-700 outline-none transition focus:border-indigo-300"
            />
          </label>

          <label className="block text-sm text-stone-600">
            <span className="mb-1 block font-medium">Công suất laser (%)</span>
            <input
              type="number"
              min={0}
              max={100}
              value={power}
              onChange={(event) => setPower(Number(event.target.value) || 0)}
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

      {toast ? (
        <div
          role={toast.type === "error" ? "alert" : "status"}
          className={`rounded-2xl px-3 py-2 text-sm ${
            toast.type === "success"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {toast.message}
        </div>
      ) : null}
    </div>
  );
}
