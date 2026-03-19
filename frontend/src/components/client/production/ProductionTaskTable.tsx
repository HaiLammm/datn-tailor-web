"use client";

import type { OwnerTaskItem } from "@/types/tailor-task";
import DeadlineCountdown from "./DeadlineCountdown";

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  assigned: { label: "Chờ nhận", className: "bg-amber-100 text-amber-800" },
  in_progress: { label: "Đang làm", className: "bg-indigo-100 text-indigo-800" },
  completed: { label: "Hoàn thành", className: "bg-emerald-100 text-emerald-800" },
};

interface ProductionTaskTableProps {
  tasks: OwnerTaskItem[];
  sortBy: string;
  sortOrder: "asc" | "desc";
  onSort: (column: string) => void;
  onTaskClick: (task: OwnerTaskItem) => void;
}

function SortIcon({ active, order }: { active: boolean; order: "asc" | "desc" }) {
  if (!active) return <span className="text-gray-300 ml-1">↕</span>;
  return <span className="text-[#1A2B4C] ml-1">{order === "asc" ? "↑" : "↓"}</span>;
}

function formatCurrency(amount: number | null): string {
  if (amount === null || amount === undefined) return "—";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function ProductionTaskTable({
  tasks,
  sortBy,
  sortOrder,
  onSort,
  onTaskClick,
}: ProductionTaskTableProps) {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500" data-testid="task-table-empty">
        <p className="text-lg font-medium">Chưa có công việc nào</p>
        <p className="text-sm mt-1">Bấm &ldquo;Giao việc mới&rdquo; để bắt đầu phân công</p>
      </div>
    );
  }

  const columns = [
    { key: "customer_name", label: "Khách hàng" },
    { key: "garment_name", label: "Sản phẩm" },
    { key: "assignee_name", label: "Thợ may" },
    { key: "status", label: "Trạng thái" },
    { key: "deadline", label: "Hạn chót" },
    { key: "piece_rate", label: "Tiền công" },
  ];

  return (
    <div className="overflow-x-auto" data-testid="task-table">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            {columns.map((col) => (
              <th
                key={col.key}
                onClick={() => onSort(col.key)}
                className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-[#1A1A2E] select-none"
              >
                {col.label}
                <SortIcon active={sortBy === col.key} order={sortOrder} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => {
            const badge = STATUS_BADGE[task.status] || {
              label: task.status,
              className: "bg-gray-100 text-gray-800",
            };
            const isOverdueRow = task.is_overdue;

            return (
              <tr
                key={task.id}
                onClick={() => onTaskClick(task)}
                className={`border-b border-gray-100 cursor-pointer transition-colors hover:bg-gray-50 ${
                  isOverdueRow ? "bg-red-50/50" : ""
                }`}
                data-testid={`task-row-${task.id}`}
              >
                <td className="py-3 px-3 font-medium text-[#1A1A2E]">
                  {task.customer_name}
                </td>
                <td className="py-3 px-3 text-gray-700">{task.garment_name}</td>
                <td className="py-3 px-3 text-gray-700">{task.assignee_name}</td>
                <td className="py-3 px-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      task.is_overdue
                        ? "bg-red-100 text-red-800 animate-pulse"
                        : badge.className
                    }`}
                  >
                    {task.is_overdue ? "Quá hạn" : badge.label}
                  </span>
                </td>
                <td className="py-3 px-3">
                  <DeadlineCountdown
                    deadline={task.deadline}
                    daysUntilDeadline={task.days_until_deadline}
                    isOverdue={task.is_overdue}
                  />
                </td>
                <td className="py-3 px-3 text-gray-700 font-medium">
                  {formatCurrency(task.piece_rate)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
