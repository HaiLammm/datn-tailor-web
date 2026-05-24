import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";

jest.mock("@/app/actions/tailor-task-actions", () => ({
  fetchTaskDetail: jest.fn(() => Promise.resolve(null)),
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
  usePatternSession: jest.fn(),
  useExportPiece: jest.fn(() => ({ mutateAsync: jest.fn(), isPending: false })),
  useExportSession: jest.fn(() => ({ mutateAsync: jest.fn(), isPending: false })),
}));

jest.mock("@/components/client/design/PatternPreview", () => ({
  __esModule: true,
  default: ({ pieces }: { pieces: unknown[] }) => (
    <div data-testid="pattern-preview">PatternPreview ({pieces.length} pieces)</div>
  ),
}));

jest.mock("@/components/client/design/PatternExportBar", () => ({
  __esModule: true,
  default: () => <div data-testid="pattern-export-bar">PatternExportBar</div>,
}));

import TaskDetailModal from "@/components/client/tailor/TaskDetailModal";
import { usePatternSession } from "@/hooks/usePatternSession";
import type { TailorTask } from "@/types/tailor-task";

const mockUsePatternSession = usePatternSession as jest.MockedFunction<typeof usePatternSession>;

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
  deadline: "2026-06-01T00:00:00Z",
  notes: null,
  piece_rate: 500000,
  design_id: null,
  completed_at: null,
  version: 1,
  accepted_at: null,
  started_at: "2026-05-02T10:00:00Z",
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
  days_until_deadline: 25,
  created_at: "2026-05-01T10:00:00Z",
  updated_at: "2026-05-03T10:00:00Z",
};

describe("TaskDetailModal - Pattern integration (Story 11.6)", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUsePatternSession.mockReturnValue({
      session: null,
      isLoading: false,
      error: null,
    });
  });

  it("does not render pattern section when task has no order", () => {
    render(
      <TaskDetailModal
        task={baseTask}
        onClose={() => {}}
        onTaskUpdated={() => {}}
      />
    );

    expect(screen.queryByText("Bản rập đính kèm")).toBeNull();
  });

  it("does not render pattern section when order.pattern_session_id is null", () => {
    const taskWithNullPattern = {
      ...baseTask,
      order: { pattern_session_id: null },
    };

    render(
      <TaskDetailModal
        task={taskWithNullPattern}
        onClose={() => {}}
        onTaskUpdated={() => {}}
      />
    );

    expect(screen.queryByText("Bản rập đính kèm")).toBeNull();
  });

  it("renders pattern section when order has pattern_session_id", () => {
    mockUsePatternSession.mockReturnValue({
      session: {
        id: "ps-1",
        tenant_id: "tenant-1",
        customer_id: "customer-1",
        created_by: "owner-1",
        garment_type: "ao_dai",
        status: "exported" as const,
        pieces: [
          {
            id: "piece-1",
            session_id: "ps-1",
            piece_type: "front_bodice" as const,
            svg_data: "<svg></svg>",
            geometry_params: {},
            created_at: "2026-05-01T10:00:00Z",
          },
        ],
        created_at: "2026-05-01T10:00:00Z",
        updated_at: "2026-05-01T10:00:00Z",
        do_dai_ao: 65,
        ha_eo: 20,
        vong_co: 35,
        vong_nach: 40,
        vong_nguc: 88,
        vong_eo: 70,
        vong_mong: 95,
        do_dai_tay: 55,
        vong_bap_tay: 30,
        vong_co_tay: 15,
        notes: null,
      },
      isLoading: false,
      error: null,
    });

    const taskWithPattern = {
      ...baseTask,
      order: { pattern_session_id: "ps-1" },
    };

    render(
      <TaskDetailModal
        task={taskWithPattern}
        onClose={() => {}}
        onTaskUpdated={() => {}}
      />
    );

    expect(screen.getByText("Bản rập đính kèm")).toBeTruthy();
    expect(screen.getByTestId("pattern-preview")).toBeTruthy();
    expect(screen.getByTestId("pattern-export-bar")).toBeTruthy();
  });

  it("shows loading state when pattern session is loading", () => {
    mockUsePatternSession.mockReturnValue({
      session: null,
      isLoading: true,
      error: null,
    });

    const taskWithPattern = {
      ...baseTask,
      order: { pattern_session_id: "ps-1" },
    };

    render(
      <TaskDetailModal
        task={taskWithPattern}
        onClose={() => {}}
        onTaskUpdated={() => {}}
      />
    );

    expect(screen.getByText("Bản rập đính kèm")).toBeTruthy();
  });
});
