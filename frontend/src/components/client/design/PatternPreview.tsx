"use client";

import DOMPurify from "dompurify";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  GEOMETRY_PARAM_LABELS,
  PIECE_GEOMETRY_PARAM_KEYS,
  PIECE_TYPE_LABELS,
  type PatternPieceResponse,
  type PieceType,
} from "@/types/pattern";

interface PatternPreviewProps {
  pieces: PatternPieceResponse[];
  initialPieceType?: PieceType;
  onActivePieceChange?: (pieceType: PieceType) => void;
}

const PIECE_ORDER: PieceType[] = ["front_bodice", "back_bodice", "sleeve"];
const MIN_SCALE = 0.5;
const MAX_SCALE = 5;

function clampScale(value: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));
}

function formatGeometryValue(value: number) {
  return `${value.toFixed(1)} cm`;
}

function sanitizeSvg(raw: string | null): string {
  if (!raw) return "";
  return DOMPurify.sanitize(raw, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_TAGS: ["use"],
  });
}

function getTouchDistance(touches: Pick<React.TouchList, "length" | "item">) {
  if (touches.length < 2) return 0;
  const firstTouch = touches.item(0);
  const secondTouch = touches.item(1);
  if (!firstTouch || !secondTouch) return 0;
  const dx = firstTouch.clientX - secondTouch.clientX;
  const dy = firstTouch.clientY - secondTouch.clientY;
  return Math.hypot(dx, dy);
}

export function PatternPreview({
  pieces,
  initialPieceType,
  onActivePieceChange,
}: PatternPreviewProps) {
  const orderedPieces = useMemo(
    () =>
      PIECE_ORDER.map((type) => pieces.find((piece) => piece.piece_type === type)).filter(
        Boolean
      ) as PatternPieceResponse[],
    [pieces]
  );

  const [activePieceType, setActivePieceType] = useState<PieceType | null>(
    initialPieceType ?? orderedPieces[0]?.piece_type ?? null
  );
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const viewportRef = useRef<HTMLDivElement>(null);
  const dragPointerRef = useRef<{ x: number; y: number } | null>(null);
  const touchPanRef = useRef<{ x: number; y: number } | null>(null);
  const pinchRef = useRef<{ distance: number; scale: number } | null>(null);

  const resolvedActivePieceType =
    activePieceType &&
    orderedPieces.some((piece) => piece.piece_type === activePieceType)
      ? activePieceType
      : initialPieceType &&
          orderedPieces.some((piece) => piece.piece_type === initialPieceType)
        ? initialPieceType
        : orderedPieces[0]?.piece_type ?? null;

  const activePiece =
    orderedPieces.find((piece) => piece.piece_type === resolvedActivePieceType) ??
    orderedPieces[0] ??
    null;

  // P5: depend on primitive piece_type, not object reference
  const activePieceTypeResolved = activePiece?.piece_type ?? null;

  useEffect(() => {
    if (activePieceTypeResolved) {
      onActivePieceChange?.(activePieceTypeResolved);
    }
  }, [activePieceTypeResolved, onActivePieceChange]);

  // P3: attach wheel listener imperatively with { passive: false }
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      setScale((current) => clampScale(current + (event.deltaY < 0 ? 0.1 : -0.1)));
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  const resetViewport = () => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  };

  const selectPiece = (pieceType: PieceType) => {
    setActivePieceType(pieceType);
    resetViewport();
  };

  const startDrag = (clientX: number, clientY: number) => {
    dragPointerRef.current = { x: clientX, y: clientY };
    setIsDragging(true);
  };

  const updatePan = useCallback(
    (clientX: number, clientY: number, previous: { x: number; y: number }) => {
      const deltaX = clientX - previous.x;
      const deltaY = clientY - previous.y;
      setTranslate((current) => ({
        x: current.x + deltaX,
        y: current.y + deltaY,
      }));
    },
    []
  );

  const endDrag = () => {
    dragPointerRef.current = null;
    touchPanRef.current = null;
    pinchRef.current = null;
    setIsDragging(false);
  };

  // P2: sanitize SVG
  const sanitizedSvg = useMemo(
    () => sanitizeSvg(activePiece?.svg_data ?? null),
    [activePiece?.svg_data]
  );

  if (!activePiece) {
    return (
      <div className="rounded-3xl border border-dashed border-stone-300 bg-white p-6 text-center text-sm text-stone-500">
        Chưa có mảnh rập để xem trước.
      </div>
    );
  }

  return (
    <section className="space-y-4 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#1A2B4C]">Bản xem trước SVG</h2>
          <p className="text-sm text-stone-500">
            Cuộn để thu phóng, kéo để di chuyển, chạm hai ngón để phóng to.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            data-testid="pattern-scale-label"
            className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600"
          >
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={resetViewport}
            className="rounded-full border border-stone-200 px-3 py-1 text-xs font-medium text-stone-600 transition hover:border-indigo-300 hover:text-indigo-700"
          >
            Reset zoom
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-stone-200 pb-3">
        {orderedPieces.map((piece) => {
          const isActive = piece.piece_type === activePiece.piece_type;
          return (
            <button
              key={piece.id}
              type="button"
              onClick={() => selectPiece(piece.piece_type)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                isActive
                  ? "border-indigo-700 bg-indigo-50 text-indigo-700"
                  : "border-stone-200 text-stone-500 hover:border-stone-300 hover:text-stone-800"
              }`}
              aria-pressed={isActive}
            >
              {PIECE_TYPE_LABELS[piece.piece_type]}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div
          ref={viewportRef}
          data-testid="pattern-preview-viewport"
          className={`relative min-h-[360px] overflow-hidden rounded-3xl border border-stone-200 bg-[radial-gradient(circle_at_center,_rgba(26,43,76,0.06),_transparent_55%),linear-gradient(180deg,_#fff,_#f7f3ea)] p-6 ${
            isDragging ? "cursor-grabbing" : "cursor-grab"
          }`}
          style={{ touchAction: "none" }}
          onMouseDown={(event) => startDrag(event.clientX, event.clientY)}
          onMouseMove={(event) => {
            if (!dragPointerRef.current) return;
            updatePan(event.clientX, event.clientY, dragPointerRef.current);
            dragPointerRef.current = { x: event.clientX, y: event.clientY };
          }}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
          onTouchStart={(event) => {
            if (event.touches.length >= 3) {
              endDrag();
              return;
            }
            if (event.touches.length === 2) {
              pinchRef.current = {
                distance: getTouchDistance(event.touches),
                scale,
              };
              touchPanRef.current = null;
              return;
            }
            if (event.touches.length === 1) {
              touchPanRef.current = {
                x: event.touches[0].clientX,
                y: event.touches[0].clientY,
              };
            }
          }}
          onTouchMove={(event) => {
            event.preventDefault();
            // P4: guard division by zero
            if (event.touches.length === 2 && pinchRef.current) {
              const nextDistance = getTouchDistance(event.touches);
              if (nextDistance > 0 && pinchRef.current.distance > 0) {
                setScale(
                  clampScale(
                    pinchRef.current.scale * (nextDistance / pinchRef.current.distance)
                  )
                );
              }
              return;
            }
            if (event.touches.length === 1 && touchPanRef.current) {
              const touch = event.touches[0];
              updatePan(touch.clientX, touch.clientY, touchPanRef.current);
              touchPanRef.current = { x: touch.clientX, y: touch.clientY };
            }
          }}
          onTouchEnd={endDrag}
        >
          <div className="flex h-full items-center justify-center">
            {/* P10: show message for empty SVG */}
            {sanitizedSvg ? (
              <div
                data-testid="pattern-preview-stage"
                className="max-h-full max-w-full [&_svg]:h-full [&_svg]:max-h-[420px] [&_svg]:w-full [&_svg]:max-w-full"
                style={{
                  transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
                  transformOrigin: "center center",
                }}
                dangerouslySetInnerHTML={{ __html: sanitizedSvg }}
              />
            ) : (
              <p className="text-sm text-stone-400">Không có dữ liệu SVG cho mảnh rập này</p>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-stone-200 bg-stone-50 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
            Thông số hình học
          </h3>
          <dl className="mt-4 space-y-3 text-sm">
            {PIECE_GEOMETRY_PARAM_KEYS[activePiece.piece_type].map((key) => {
              const value = activePiece.geometry_params?.[key];
              // P6: validate value is actually a finite number
              if (typeof value !== "number" || !Number.isFinite(value)) {
                return null;
              }

              return (
                <div
                  key={key}
                  className="flex items-start justify-between gap-3 rounded-2xl bg-white px-3 py-2"
                >
                  <dt className="text-stone-500">{GEOMETRY_PARAM_LABELS[key]}</dt>
                  <dd className="font-mono font-medium text-[#1A2B4C]">
                    {formatGeometryValue(value)}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      </div>
    </section>
  );
}
