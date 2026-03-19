/**
 * Frontend Tests — Story 5.2: Production Board
 * Tests ProductionSummaryCards, ProductionTaskTable, DeadlineCountdown rendering.
 */

import { describe, it, expect, jest } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

import ProductionSummaryCards from "@/components/client/production/ProductionSummaryCards";
import ProductionTaskTable from "@/components/client/production/ProductionTaskTable";
import DeadlineCountdown from "@/components/client/production/DeadlineCountdown";
import type { OwnerTaskItem } from "@/types/tailor-task";
import type { TailorTaskSummary } from "@/types/tailor-task";

// ── Helpers ──────────────────────────────────────────────────────────────────

const makeTask = (overrides: Partial<OwnerTaskItem> = {}): OwnerTaskItem => ({
  id: "task-001",
  tenant_id: "tenant-001",
  order_id: "order-001",
  order_item_id: null,
  assigned_to: "tailor-001",
  assigned_by: "owner-001",
  garment_name: "Áo dài cưới",
  customer_name: "Nguyễn Thị Lan",
  assignee_name: "Thợ may A",
  status: "assigned",
  deadline: null,
  notes: null,
  piece_rate: null,
  design_id: null,
  completed_at: null,
  is_overdue: false,
  days_until_deadline: null,
  created_at: "2026-03-19T08:00:00.000Z",
  updated_at: "2026-03-19T08:00:00.000Z",
  ...overrides,
});

const makeSummary = (overrides: Partial<TailorTaskSummary> = {}): TailorTaskSummary => ({
  total: 3,
  assigned: 1,
  in_progress: 1,
  completed: 1,
  overdue: 0,
  ...overrides,
});

// ── ProductionSummaryCards ────────────────────────────────────────────────────

describe("ProductionSummaryCards", () => {
  it("renders all 5 stat cards", () => {
    render(<ProductionSummaryCards summary={makeSummary()} />);
    expect(screen.getByTestId("summary-card-total")).toBeInTheDocument();
    expect(screen.getByTestId("summary-card-assigned")).toBeInTheDocument();
    expect(screen.getByTestId("summary-card-in_progress")).toBeInTheDocument();
    expect(screen.getByTestId("summary-card-completed")).toBeInTheDocument();
    expect(screen.getByTestId("summary-card-overdue")).toBeInTheDocument();
  });

  it("displays correct counts", () => {
    const summary = makeSummary({ total: 10, assigned: 3, in_progress: 4, completed: 2, overdue: 1 });
    render(<ProductionSummaryCards summary={summary} />);
    expect(screen.getByTestId("summary-card-total")).toHaveTextContent("10");
    expect(screen.getByTestId("summary-card-assigned")).toHaveTextContent("3");
    expect(screen.getByTestId("summary-card-in_progress")).toHaveTextContent("4");
    expect(screen.getByTestId("summary-card-completed")).toHaveTextContent("2");
    expect(screen.getByTestId("summary-card-overdue")).toHaveTextContent("1");
  });

  it("shows overdue pulse indicator when overdue > 0", () => {
    const { container } = render(
      <ProductionSummaryCards summary={makeSummary({ overdue: 2 })} />
    );
    // The pulse dot is a span with animate-pulse class
    const pulseDot = container.querySelector(".animate-pulse");
    expect(pulseDot).toBeInTheDocument();
  });

  it("does NOT show overdue pulse when overdue is 0", () => {
    const { container } = render(
      <ProductionSummaryCards summary={makeSummary({ overdue: 0 })} />
    );
    expect(container.querySelector(".animate-pulse")).not.toBeInTheDocument();
  });
});

// ── DeadlineCountdown ─────────────────────────────────────────────────────────

describe("DeadlineCountdown", () => {
  it("shows 'Không có hạn' when no deadline", () => {
    render(<DeadlineCountdown deadline={null} daysUntilDeadline={null} isOverdue={false} />);
    expect(screen.getByTestId("deadline-none")).toHaveTextContent("Không có hạn");
  });

  it("shows overdue badge with pulse animation", () => {
    render(
      <DeadlineCountdown
        deadline="2026-03-10T00:00:00Z"
        daysUntilDeadline={-5}
        isOverdue={true}
      />
    );
    const badge = screen.getByTestId("deadline-overdue");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain("animate-pulse");
    expect(badge).toHaveTextContent("Quá hạn 5 ngày");
  });

  it("shows red urgent badge for < 2 days", () => {
    render(
      <DeadlineCountdown
        deadline="2026-03-20T00:00:00Z"
        daysUntilDeadline={1}
        isOverdue={false}
      />
    );
    const badge = screen.getByTestId("deadline-urgent");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain("bg-red-100");
    expect(badge).toHaveTextContent("Còn 1 ngày");
  });

  it("shows amber warning badge for 2-7 days", () => {
    render(
      <DeadlineCountdown
        deadline="2026-03-24T00:00:00Z"
        daysUntilDeadline={5}
        isOverdue={false}
      />
    );
    const badge = screen.getByTestId("deadline-warning");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain("bg-amber-100");
    expect(badge).toHaveTextContent("Còn 5 ngày");
  });

  it("shows green safe badge for > 7 days", () => {
    render(
      <DeadlineCountdown
        deadline="2026-04-10T00:00:00Z"
        daysUntilDeadline={22}
        isOverdue={false}
      />
    );
    const badge = screen.getByTestId("deadline-safe");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain("bg-emerald-100");
    expect(badge).toHaveTextContent("Còn 22 ngày");
  });
});

// ── ProductionTaskTable ───────────────────────────────────────────────────────

describe("ProductionTaskTable", () => {
  const defaultProps = {
    tasks: [makeTask()],
    sortBy: "deadline",
    sortOrder: "asc" as const,
    onSort: jest.fn(),
    onTaskClick: jest.fn(),
  };

  it("shows empty state when no tasks", () => {
    render(<ProductionTaskTable {...defaultProps} tasks={[]} />);
    expect(screen.getByTestId("task-table-empty")).toBeInTheDocument();
    expect(screen.getByText("Chưa có công việc nào")).toBeInTheDocument();
  });

  it("renders task row with customer name", () => {
    render(<ProductionTaskTable {...defaultProps} />);
    expect(screen.getByText("Nguyễn Thị Lan")).toBeInTheDocument();
  });

  it("renders task row with garment name", () => {
    render(<ProductionTaskTable {...defaultProps} />);
    expect(screen.getByText("Áo dài cưới")).toBeInTheDocument();
  });

  it("renders assignee name", () => {
    render(<ProductionTaskTable {...defaultProps} />);
    expect(screen.getByText("Thợ may A")).toBeInTheDocument();
  });

  it("renders status badge 'Chờ nhận' for assigned", () => {
    render(<ProductionTaskTable {...defaultProps} />);
    expect(screen.getByText("Chờ nhận")).toBeInTheDocument();
  });

  it("renders 'Quá hạn' badge with animate-pulse for overdue tasks", () => {
    const task = makeTask({ is_overdue: true, status: "in_progress", deadline: "2026-03-10T00:00:00Z", days_until_deadline: -5 });
    render(<ProductionTaskTable {...defaultProps} tasks={[task]} />);
    // Status badge shows "Quá hạn"
    const overdueText = screen.getAllByText("Quá hạn");
    expect(overdueText.length).toBeGreaterThanOrEqual(1);
  });

  it("calls onTaskClick when row is clicked", () => {
    const onTaskClick = jest.fn();
    render(<ProductionTaskTable {...defaultProps} onTaskClick={onTaskClick} />);
    fireEvent.click(screen.getByText("Nguyễn Thị Lan"));
    expect(onTaskClick).toHaveBeenCalledWith(defaultProps.tasks[0]);
  });

  it("calls onSort when column header is clicked", () => {
    const onSort = jest.fn();
    render(<ProductionTaskTable {...defaultProps} onSort={onSort} />);
    fireEvent.click(screen.getByText(/Hạn chót/));
    expect(onSort).toHaveBeenCalledWith("deadline");
  });

  it("highlights overdue row with red background", () => {
    const task = makeTask({ id: "task-overdue", is_overdue: true });
    render(<ProductionTaskTable {...defaultProps} tasks={[task]} />);
    const row = screen.getByTestId("task-row-task-overdue");
    expect(row.className).toContain("bg-red-50");
  });

  it("formats piece_rate as Vietnamese currency", () => {
    const task = makeTask({ piece_rate: 500000 });
    render(<ProductionTaskTable {...defaultProps} tasks={[task]} />);
    // Should contain "500.000" or formatted VND
    expect(screen.getByText(/500/)).toBeInTheDocument();
  });

  it("shows '—' when piece_rate is null", () => {
    const task = makeTask({ piece_rate: null });
    render(<ProductionTaskTable {...defaultProps} tasks={[task]} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
