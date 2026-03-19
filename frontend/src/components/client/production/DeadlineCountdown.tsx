"use client";

interface DeadlineCountdownProps {
  deadline: string | null;
  daysUntilDeadline: number | null;
  isOverdue: boolean;
}

export default function DeadlineCountdown({
  deadline,
  daysUntilDeadline,
  isOverdue,
}: DeadlineCountdownProps) {
  if (!deadline) {
    return (
      <span className="text-xs text-gray-400" data-testid="deadline-none">
        Không có hạn
      </span>
    );
  }

  const days = daysUntilDeadline ?? 0;

  if (isOverdue) {
    return (
      <span
        className="inline-flex items-center gap-1 text-xs font-medium bg-red-100 text-red-800 px-2 py-0.5 rounded-full animate-pulse"
        data-testid="deadline-overdue"
      >
        Quá hạn {Math.abs(days)} ngày
      </span>
    );
  }

  if (days < 2) {
    return (
      <span
        className="inline-flex items-center gap-1 text-xs font-medium bg-red-100 text-red-800 px-2 py-0.5 rounded-full"
        data-testid="deadline-urgent"
      >
        Còn {days} ngày ⚠️
      </span>
    );
  }

  if (days <= 7) {
    return (
      <span
        className="inline-flex items-center gap-1 text-xs font-medium bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full"
        data-testid="deadline-warning"
      >
        Còn {days} ngày
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-medium bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full"
      data-testid="deadline-safe"
    >
      Còn {days} ngày
    </span>
  );
}
