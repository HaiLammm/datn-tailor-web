"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { MeasurementSummary } from "@/components/client/design/MeasurementSummary";
import { PatternExportBar } from "@/components/client/design/PatternExportBar";
import { PatternPreview } from "@/components/client/design/PatternPreview";
import { Skeleton } from "@/components/ui/skeleton";
import { useGeneratePattern, usePatternSession } from "@/hooks/usePatternSession";
import type { PatternSessionResponse, PieceType } from "@/types/pattern";

interface SessionDetailClientProps {
  sessionId: string;
  initialSession?: PatternSessionResponse | null;
  initialCustomerName?: string | null;
  initialError?: string | null;
  initialStatusCode?: number;
}

function SessionDetailSkeleton() {
  return (
    <div data-testid="session-detail-skeleton" className="grid grid-cols-1 gap-4 lg:grid-cols-[35%_65%]">
      <div className="space-y-4 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      </div>

      <div className="space-y-4 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-[420px] w-full rounded-3xl" />
      </div>
    </div>
  );
}

function NotFoundState() {
  return (
    <div className="rounded-3xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center shadow-sm">
      <h1 className="text-2xl font-semibold text-[#1A2B4C]">Phiên thiết kế không tồn tại</h1>
      <p className="mt-2 text-sm text-stone-500">Liên kết có thể đã hết hạn hoặc phiên đã bị xóa.</p>
      <Link
        href="/design-session"
        className="mt-6 inline-flex items-center rounded-full border border-indigo-200 px-4 py-2 text-sm font-medium text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-50"
      >
        Quay lại tạo phiên thiết kế
      </Link>
    </div>
  );
}

function EmptyPatternState() {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-dashed border-stone-300 bg-[linear-gradient(180deg,_#fff,_#f6f1e6)] px-6 py-10 text-center">
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-indigo-50 text-indigo-700">
        <svg viewBox="0 0 24 24" className="h-12 w-12" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M4 5h16v14H4z" />
          <path d="M8 9h8M8 13h5" strokeLinecap="round" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-[#1A2B4C]">Chưa có mẫu rập</h2>
      <p className="mt-2 max-w-md text-sm text-stone-500">Nhấn nút Tạo mẫu để bắt đầu dựng 3 mảnh rập kỹ thuật và xem bản SVG tương ứng.</p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-3xl border border-red-200 bg-red-50 px-6 py-8 text-center text-red-700 shadow-sm">
      <h1 className="text-xl font-semibold">Không thể tải phiên thiết kế</h1>
      <p className="mt-2 text-sm">{message}</p>
    </div>
  );
}

export default function SessionDetailClient({
  sessionId,
  initialSession,
  initialCustomerName,
  initialError,
  initialStatusCode,
}: SessionDetailClientProps) {
  const { session, isLoading, error } = usePatternSession(sessionId, {
    initialData: initialSession ?? undefined,
  });

  const generateMutation = useGeneratePattern(sessionId);

  const [activePieceType, setActivePieceType] = useState<PieceType | null>(
    initialSession?.pieces[0]?.piece_type ?? null
  );
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" } | null>(null);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const isNotFound = !session && (initialStatusCode === 404 || error === "Phiên thiết kế không tồn tại" || initialError === "Phiên thiết kế không tồn tại");

  if (isNotFound) {
    return <NotFoundState />;
  }

  if (isLoading && !session) {
    return <SessionDetailSkeleton />;
  }

  if (!session) {
    return <ErrorState message={error || initialError || "Không thể kết nối đến máy chủ"} />;
  }

  const resolvedActivePieceType =
    activePieceType && session.pieces.some((piece) => piece.piece_type === activePieceType)
      ? activePieceType
      : session.pieces[0]?.piece_type ?? null;

  const activePiece =
    session.pieces.find((piece) => piece.piece_type === resolvedActivePieceType) ?? session.pieces[0] ?? null;

  return (
    <div className="space-y-4">
      {toast ? (
        <div
          role={toast.type === "error" ? "alert" : "status"}
          className={`rounded-2xl px-4 py-3 text-sm shadow-sm ${
            toast.type === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {toast.message}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[35%_65%]">
        <div className="min-w-0">
          <MeasurementSummary
            session={session}
            customerName={initialCustomerName}
            isGenerating={generateMutation.isPending}
            onGenerate={
              session.status === "draft"
                ? async () => {
                    try {
                      await generateMutation.mutateAsync();
                      setToast({ message: "Đã tạo 3 mảnh rập thành công", type: "success" });
                    } catch (generateError) {
                      setToast({
                        message:
                          generateError instanceof Error
                            ? generateError.message
                            : "Không thể tạo mẫu rập",
                        type: "error",
                      });
                    }
                  }
                : undefined
            }
          >
            {session.status !== "draft" ? (
              <PatternExportBar
                sessionId={session.id}
                pieces={session.pieces}
                activePiece={activePiece}
              />
            ) : null}
          </MeasurementSummary>
        </div>

        <div className="min-w-0">
          {session.pieces.length > 0 ? (
            <PatternPreview
              pieces={session.pieces}
              initialPieceType={resolvedActivePieceType ?? undefined}
              onActivePieceChange={setActivePieceType}
            />
          ) : (
            <EmptyPatternState />
          )}
        </div>
      </div>
    </div>
  );
}
