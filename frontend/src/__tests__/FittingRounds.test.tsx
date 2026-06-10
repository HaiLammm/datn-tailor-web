/**
 * Story 12.6 — Fitting Rounds & Alteration Loop.
 * Covers:
 * - Customer fitting strip state mapping (3 states, AC7) in OrderDetailModal
 * - Tailor fitting recorder interaction + conflict path (AC8) in TaskDetailModal
 */

import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const mockFetchFittingRounds = jest.fn();
jest.mock("@/app/actions/order-actions", () => ({
  fetchFittingRounds: (...args: unknown[]) => mockFetchFittingRounds(...args),
  downloadOrderInvoice: jest.fn(),
  payRemaining: jest.fn(),
}));

const mockFetchTaskDetail = jest.fn();
const mockRecordFittingRound = jest.fn();
jest.mock("@/app/actions/tailor-task-actions", () => ({
  fetchTaskDetail: (...args: unknown[]) => mockFetchTaskDetail(...args),
  recordFittingRound: (...args: unknown[]) => mockRecordFittingRound(...args),
  requestTaskCancellation: jest.fn(),
  acceptTask: jest.fn(),
  rejectTask: jest.fn(),
  startTask: jest.fn(),
  holdTask: jest.fn(),
  resumeTask: jest.fn(),
  submitForQC: jest.fn(),
  completeStage: jest.fn(),
}));

jest.mock("@/hooks/usePatternSession", () => ({
  usePatternSession: jest.fn(() => ({ session: null, isLoading: false, error: null })),
  useExportPiece: jest.fn(() => ({ mutateAsync: jest.fn(), isPending: false })),
  useExportSession: jest.fn(() => ({ mutateAsync: jest.fn(), isPending: false })),
}));

jest.mock("@/components/client/design/PatternPreview", () => ({
  __esModule: true,
  PatternPreview: () => <div data-testid="pattern-preview" />,
}));

jest.mock("@/components/client/design/PatternExportBar", () => ({
  __esModule: true,
  PatternExportBar: () => <div data-testid="pattern-export-bar" />,
}));

import OrderDetailModal from "@/components/client/orders/OrderDetailModal";
import TaskDetailModal from "@/components/client/tailor/TaskDetailModal";
import type { CustomerOrderDetail, FittingRound } from "@/types/order";
import type { TailorTask, TailorTaskDetailResponse, TaskStageLog } from "@/types/tailor-task";

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeRound(roundNumber: number, outcome: FittingRound["outcome"], notes: string | null = null): FittingRound {
  return {
    id: `round-${roundNumber}`,
    order_id: "order-1",
    task_id: "task-1",
    round_number: roundNumber,
    appointment_id: null,
    outcome,
    notes,
    fitted_at: "2026-06-10T09:00:00Z",
    created_at: "2026-06-10T09:00:00Z",
  };
}

const BESPOKE_ORDER: CustomerOrderDetail = {
  id: "order-1",
  order_number: "ORD-20260610-ABC123",
  total_amount: 2000000,
  status: "in_production",
  payment_status: "paid",
  order_type: "buy",
  created_at: "2026-06-01T10:00:00Z",
  payment_method: "cod",
  shipping_note: null,
  service_type: "bespoke",
  items: [
    {
      garment_id: "g-1",
      garment_name: "Áo dài lụa",
      image_url: null,
      transaction_type: "buy",
      quantity: 1,
      unit_price: 2000000,
      total_price: 2000000,
    },
  ],
  delivery_info: {
    recipient_name: "Nguyễn Thị Linh",
    phone: "0901234567",
    address: "123 Nguyễn Huệ, Quận 1",
  },
  timeline: [],
  tailor_info: null,
};

const baseTask: TailorTask = {
  id: "task-1",
  tenant_id: "tenant-1",
  order_id: "order-1",
  order_item_id: null,
  assigned_to: "tailor-1",
  assigned_by: "owner-1",
  garment_name: "Áo dài lụa",
  customer_name: "Nguyễn Văn A",
  status: "in_progress",
  production_step: "cutting",
  deadline: null,
  notes: null,
  piece_rate: null,
  design_id: null,
  completed_at: null,
  version: 3,
  accepted_at: null,
  started_at: "2026-06-02T10:00:00Z",
  submitted_at: null,
  hold_reason: null,
  on_hold_at: null,
  resumed_at: null,
  assignment_deadline_at: null,
  expected_finish_at: null,
  is_rework: false,
  rework_count: 0,
  qc_issues: null,
  rejection_reason: null,
  rejection_category: null,
  reassignment_reason: null,
  priority: "normal",
  is_overdue: false,
  days_until_deadline: null,
  created_at: "2026-06-01T10:00:00Z",
  updated_at: "2026-06-03T10:00:00Z",
};

function makeStageLog(stageOrder: number, stage: string, status: TaskStageLog["status"]): TaskStageLog {
  return {
    id: `stage-${stageOrder}`,
    task_id: "task-1",
    stage,
    stage_order: stageOrder,
    status,
    started_at: null,
    completed_at: null,
    notes: null,
    created_at: "2026-06-01T10:00:00Z",
  };
}

function makeDetail(stageLogs: TaskStageLog[]): TailorTaskDetailResponse {
  return {
    ...baseTask,
    assignee_name: "Thợ A",
    order_info: null,
    stage_logs: stageLogs,
    history: [],
  };
}

const FITTING_STAGES = [
  makeStageLog(0, "cutting", "completed"),
  makeStageLog(1, "assembly", "completed"),
  makeStageLog(2, "fitting", "in_progress"),
  makeStageLog(3, "finishing", "pending"),
];

// ── Customer strip (AC7) ─────────────────────────────────────────────────────

describe("OrderDetailModal — fitting strip state mapping (AC7)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows 'Chờ bạn tới thử' + booking CTA when fitting is active with no rounds", async () => {
    mockFetchFittingRounds.mockResolvedValue({
      success: true,
      data: { rounds: [], fitting_stage_status: "in_progress" },
    });

    render(<OrderDetailModal order={BESPOKE_ORDER} isOpen={true} onClose={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId("fitting-strip")).toHaveTextContent("Chờ bạn tới thử");
    });
    const cta = screen.getByTestId("fitting-booking-cta");
    expect(cta).toHaveTextContent("Đặt lịch thử đồ");
    expect(cta).toHaveAttribute("href", "/booking");
    expect(mockFetchFittingRounds).toHaveBeenCalledWith("order-1");
  });

  it("shows 'Đang chỉnh sửa theo góp ý của bạn' when the last round needs alteration", async () => {
    mockFetchFittingRounds.mockResolvedValue({
      success: true,
      data: {
        rounds: [makeRound(1, "needs_alteration", "Nới eo 1cm")],
        fitting_stage_status: "in_progress",
      },
    });

    render(<OrderDetailModal order={BESPOKE_ORDER} isOpen={true} onClose={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId("fitting-strip")).toHaveTextContent(
        "Đang chỉnh sửa theo góp ý của bạn"
      );
    });
    // Round list renders plain Vietnamese rounds with notes
    expect(screen.getByText("Vòng thử 1")).toBeInTheDocument();
    expect(screen.getByText("Nới eo 1cm")).toBeInTheDocument();
    expect(screen.getByTestId("fitting-booking-cta")).toBeInTheDocument();
  });

  it("shows 'Thử đạt — đang hoàn thiện' without CTA when the last round passed", async () => {
    mockFetchFittingRounds.mockResolvedValue({
      success: true,
      data: {
        rounds: [makeRound(1, "needs_alteration"), makeRound(2, "passed")],
        fitting_stage_status: "completed",
      },
    });

    render(<OrderDetailModal order={BESPOKE_ORDER} isOpen={true} onClose={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId("fitting-strip")).toHaveTextContent("Thử đạt — đang hoàn thiện");
    });
    expect(screen.getByText("Vòng thử 1")).toBeInTheDocument();
    expect(screen.getByText("Vòng thử 2")).toBeInTheDocument();
    expect(screen.queryByTestId("fitting-booking-cta")).not.toBeInTheDocument();
  });

  it("shows 'Chờ bạn tới thử' + CTA during a rework fitting cycle even when an old round passed", async () => {
    // QC rework recreates stage logs (fitting back to in_progress) while
    // fitting_rounds are immutable — the stage status wins over the last round.
    mockFetchFittingRounds.mockResolvedValue({
      success: true,
      data: {
        rounds: [makeRound(1, "needs_alteration"), makeRound(2, "passed")],
        fitting_stage_status: "in_progress",
      },
    });

    render(<OrderDetailModal order={BESPOKE_ORDER} isOpen={true} onClose={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId("fitting-strip")).toHaveTextContent("Chờ bạn tới thử");
    });
    expect(screen.getByTestId("fitting-booking-cta")).toBeInTheDocument();
  });

  it("hides the strip when there is no fitting stage status, but still lists past rounds", async () => {
    mockFetchFittingRounds.mockResolvedValue({
      success: true,
      data: { rounds: [makeRound(1, "passed")], fitting_stage_status: null },
    });

    render(<OrderDetailModal order={BESPOKE_ORDER} isOpen={true} onClose={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Vòng thử 1")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("fitting-strip")).not.toBeInTheDocument();
  });

  it("fetches rounds for a bespoke order at 'in_progress' (task created, not yet accepted)", async () => {
    mockFetchFittingRounds.mockResolvedValue({
      success: true,
      data: { rounds: [], fitting_stage_status: "pending" },
    });
    const inProgressOrder: CustomerOrderDetail = { ...BESPOKE_ORDER, status: "in_progress" };

    render(<OrderDetailModal order={inProgressOrder} isOpen={true} onClose={jest.fn()} />);

    await waitFor(() => {
      expect(mockFetchFittingRounds).toHaveBeenCalledWith("order-1");
    });
    // pending fitting stage still reads as plain "waiting" for the customer
    await waitFor(() => {
      expect(screen.getByTestId("fitting-strip")).toHaveTextContent("Chờ bạn tới thử");
    });
  });

  it("does not fetch rounds nor render the section for non-bespoke orders", async () => {
    const buyOrder: CustomerOrderDetail = { ...BESPOKE_ORDER, service_type: "buy", status: "delivered" };
    render(<OrderDetailModal order={buyOrder} isOpen={true} onClose={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Chi tiết đơn hàng")).toBeInTheDocument();
    });
    expect(mockFetchFittingRounds).not.toHaveBeenCalled();
    expect(screen.queryByTestId("fitting-section")).not.toBeInTheDocument();
  });
});

// ── Tailor recorder (AC8) ────────────────────────────────────────────────────

describe("TaskDetailModal — fitting round recorder (AC8)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchTaskDetail.mockResolvedValue({ success: true, data: makeDetail(FITTING_STAGES) });
    mockFetchFittingRounds.mockResolvedValue({
      success: true,
      data: { rounds: [], fitting_stage_status: "in_progress" },
    });
  });

  it("renders the recorder instead of a 'Hoàn thành' button on the fitting stage", async () => {
    render(<TaskDetailModal task={baseTask} onClose={jest.fn()} onTaskUpdated={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId("fitting-recorder")).toBeInTheDocument();
    });
    // No direct stage completion button while fitting is the current stage
    expect(screen.queryByText("Hoàn thành")).not.toBeInTheDocument();
    expect(screen.getByTestId("fitting-outcome-passed")).toHaveTextContent("Đạt");
    expect(screen.getByTestId("fitting-outcome-alteration")).toHaveTextContent("Cần chỉnh sửa");
  });

  it("records a needs_alteration round with notes and refetches detail", async () => {
    mockRecordFittingRound.mockResolvedValue({
      success: true,
      data: makeRound(1, "needs_alteration", "Nới eo 1cm"),
    });
    const onTaskUpdated = jest.fn();

    render(<TaskDetailModal task={baseTask} onClose={jest.fn()} onTaskUpdated={onTaskUpdated} />);

    await waitFor(() => {
      expect(screen.getByTestId("fitting-recorder")).toBeInTheDocument();
    });

    // Confirm disabled until an outcome is selected
    expect(screen.getByTestId("fitting-record-btn")).toBeDisabled();

    fireEvent.click(screen.getByTestId("fitting-outcome-alteration"));
    fireEvent.change(screen.getByTestId("fitting-notes-input"), {
      target: { value: "Nới eo 1cm" },
    });
    fireEvent.click(screen.getByTestId("fitting-record-btn"));

    await waitFor(() => {
      expect(mockRecordFittingRound).toHaveBeenCalledWith(
        "order-1",
        "needs_alteration",
        3,
        "Nới eo 1cm"
      );
    });
    await waitFor(() => {
      // Initial load + refetch after the mutation
      expect(mockFetchTaskDetail).toHaveBeenCalledTimes(2);
      expect(onTaskUpdated).toHaveBeenCalled();
    });
  });

  it("shows previously recorded rounds inside the recorder", async () => {
    mockFetchFittingRounds.mockResolvedValue({
      success: true,
      data: {
        rounds: [makeRound(1, "needs_alteration", "Nới eo 1cm")],
        fitting_stage_status: "in_progress",
      },
    });

    render(<TaskDetailModal task={baseTask} onClose={jest.fn()} onTaskUpdated={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId("fitting-recorder-round")).toHaveTextContent(
        "Vòng thử 1: Cần chỉnh sửa — Nới eo 1cm"
      );
    });
  });

  it("handles 409 conflict: toast + refetch + parent invalidation", async () => {
    mockRecordFittingRound.mockResolvedValue({
      success: false,
      conflict: true,
      error: "Dữ liệu đã thay đổi bởi người khác. Vui lòng tải lại.",
    });
    const onTaskUpdated = jest.fn();

    render(<TaskDetailModal task={baseTask} onClose={jest.fn()} onTaskUpdated={onTaskUpdated} />);

    await waitFor(() => {
      expect(screen.getByTestId("fitting-recorder")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("fitting-outcome-passed"));
    fireEvent.click(screen.getByTestId("fitting-record-btn"));

    await waitFor(() => {
      expect(screen.getByText("Dữ liệu đã thay đổi. Đang tải lại...")).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(mockFetchTaskDetail).toHaveBeenCalledTimes(2);
      expect(onTaskUpdated).toHaveBeenCalled();
    });
  });
});
